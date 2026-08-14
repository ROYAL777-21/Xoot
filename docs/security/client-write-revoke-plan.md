# Revoking the 34 client write grants that have no policy

**Status: written and evidenced, deliberately NOT applied.** Held until PR #42 merges, by the
founder's call — #42 is already 28 files and a security-hardening migration does not belong inside
a payments PR. This document exists so that when the hold lifts, the migration can be written
immediately instead of the writer audit being done again from scratch.

Audit run **2026-08-14** against `docs/security/client-write-surface.json` (generated from the live
schema by `npm run security:authz`).

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
