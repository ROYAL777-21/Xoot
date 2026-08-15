# Revoking the 34 client write grants that have no policy

**Status: written as `supabase/migrations/20260815150000_revoke_client_writes_without_policy.sql`.
Not applied — needs a `db-push`.** PR #42 merged 2026-08-15, which lifted the hold.

Audit first run **2026-08-14** against `docs/security/client-write-surface.json`, and **re-verified
against the live production database on 2026-08-15** before the migration was written: 34 grants,
13 tables, unchanged. The writer greps were re-run against the merged `main` — still one writer,
the `profiles` UPDATE below.

The live re-check sharpened one thing this baseline flattens: **`analytics_events` is granted to
`anon` AND `authenticated`**, while every other table here is `authenticated` only. The baseline
records the pair, not the grantee, so revoking from one role would have left the other holding it.
Every statement in the migration names both.

`src/lib/client-write-revoke.test.ts` pins the migration against this document: no `revoke all`,
exactly the audited pairs and no others, both roles on every statement, and no client writer for
any table whose writes are fully revoked.

---

## What "no policy" means, and why it is not automatically safe to revoke

A client write needs **both** a table `GRANT` and a permissive RLS policy. Reading either alone gives
the wrong answer in both directions. The 34 grants below have a grant and **zero** policies, so they
are already unreachable — `authenticated` and `anon` hold permission Postgres will never let them
use.

Revoking them changes no behaviour. It removes the half of a pair that would silently become live
the moment somebody adds a policy for an unrelated reason — which is a normal thing to do and would
not look dangerous at review.

**The audit only covers `grantee in ('authenticated', 'anon')`** (`authz-surface.mjs:76`).
`service_role` is untouched, so every Edge Function keeps working regardless.

## The writer audit — the step that must never be skipped

> The last time someone tightened grants without checking the writers, it took production down.

`grep` over `src/` and `mobile/` for `.from("<table>")` followed within 3 lines by
`.insert(`/`.update(`/`.upsert(`/`.delete(`, excluding `node_modules`, `dist` and test files.

| table | operations with no policy | client writer found |
|---|---|---|
| `analytics_booking_summary` | DELETE, INSERT, UPDATE | none |
| `analytics_contractor_quality` | DELETE, INSERT, UPDATE | none |
| `analytics_events` | DELETE, UPDATE | none |
| `automation_skills` | DELETE, INSERT, UPDATE | none |
| `booking_chat_typing_indicators` | DELETE | none |
| `booking_xooter_profiles` | DELETE, INSERT, UPDATE | none |
| `contractor_screening_questions` | DELETE, INSERT, UPDATE | none |
| `notification_templates` | DELETE, INSERT, UPDATE | none |
| **`profiles`** | **DELETE only** | ⚠️ **`src/pages/app/Profile.tsx:74` — but it is an `UPDATE`** |
| `subscription_plans` | DELETE, INSERT, UPDATE | none |
| `training_modules` | DELETE, INSERT, UPDATE | none |
| `xooter_earnings` | DELETE, INSERT, UPDATE | none |
| `xooter_training_progress` | DELETE, INSERT, UPDATE | none |

## `profiles` is the whole reason this audit is per-operation

Both obvious readings of that row are wrong:

- *"`profiles` has a writer, leave it alone"* → the DELETE grant stays, and the pair completes itself
  the next time anyone adds a delete policy.
- *"`revoke all on public.profiles`"* → **editing your own profile breaks in production.**

The baseline separates them, and only `DELETE` is unreachable:

```
profiles:DELETE  {"policy_count": 0, "policy_fingerprint": "no-policy"}
profiles:INSERT  {"policy_count": 1, ...}
profiles:UPDATE  {"policy_count": 1, ...}   <- Profile.tsx:74 uses this
```

No client `DELETE` on `profiles` exists anywhere in `src/` or `mobile/`.

**So the migration must name operations, never `ALL`, on every table in this list.**

## Shape of the migration, when the hold lifts

```sql
-- one line per (table, operation) pair from the table above; never `revoke all`
revoke delete on public.profiles from authenticated, anon;
revoke delete, insert, update on public.xooter_earnings from authenticated, anon;
-- …
```

Then regenerate the baseline (`npm run security:authz -- --write`) and **read the diff**: every
revoked pair should disappear from `entries`, and nothing else should move. A fingerprint changing
on a row you did not touch means a policy changed underneath you.

## Re-run this audit before applying

It is a point-in-time measurement. A writer added between now and then would not be in the table
above, and `src/pages/**` is owned by neither session, so either may have added one.
`client-write-revoke.test.ts` now re-runs the writer grep in the suite, so the check happens on
every push rather than only when somebody remembers.

---

## ⚠️ Separate finding, deliberately NOT in this migration: TRUNCATE

Found while verifying the above on 2026-08-15:

```
grantee          privilege    tables
anon             TRUNCATE     50
authenticated    TRUNCATE     51
```

**`TRUNCATE` is not subject to RLS.** Unlike `DELETE`, no policy can filter it — a role holding it
can empty a table outright. That makes it categorically different from the 34 grants above, which
are inert precisely *because* no policy exists.

Three things keep it off this migration:

1. **Not reachable through the API.** PostgREST exposes SELECT/INSERT/UPDATE/DELETE over HTTP and
   has no verb for TRUNCATE. There is no client path to it today.
2. **It is the Supabase platform default.** `grant all on all tables in schema public to anon,
   authenticated` includes TRUNCATE/REFERENCES/TRIGGER. This is default posture, not a mistake
   anybody made here.
3. **The blast radius is 50 tables, not 13.** Revoking it is a much wider change than the audited
   34, and would need its own writer-equivalent audit — anything relying on TRUNCATE, including
   test fixtures and `supabase db reset` paths, has to be checked first.

Folding it in would have been mixing a broad posture change into a narrow, evidenced one. Recorded
here as its own decision rather than smuggled into this one.
