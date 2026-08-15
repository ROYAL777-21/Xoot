# RLS And Database Security Review

**Verified: 2026-08-13**, by query against production (`mvlrkelahhsyjrwgsxaf`) and staging
(`fxmxyabdjqviqbcxmvlp`). Superseded the 2026-07-02 review.

> **This document does not keep itself true.** `scripts/security/authz-surface.mjs` does, and
> `docs/security/client-write-surface.json` is what it compares against. Run
> `SUPABASE_ACCESS_TOKEN=… npm run security:authz`.
>
> The previous version of this file said "Reviewed: 2026-07-02" and stayed accurate-looking through
> **eleven migrations** — the client write-surface lockdown, fare splits, and ZD-029 renaming 18
> tables and 25 columns. Nothing failed when it stopped being true. That is the failure this
> rewrite exists to stop repeating, so the numbers below are dated and the check is named.

## What was measured

| | production |
|---|---|
| tables in `public` | 83 |
| RLS enabled | **83 of 83** |
| policies | 122 |
| tables with a client `INSERT/UPDATE/DELETE` grant | 38 |
| `(table, command)` pairs the client holds a grant on | 98 |
| …of those, with **no policy at all** | **34** |

## The rule that makes this readable

**A write needs both a grant and a permissive policy.** Reading either alone gives the wrong
answer, and this database contains a live example of each direction:

- `xooters` carries `UPDATE ... USING (user_id = auth.uid())` with no column restriction — over
  `rating`, `jobs_completed`, `verified`, `tier`. Read alone, it looks like a Xooter can award
  themselves a tier and rewrite the job count the commission ladder reads. **It is unreachable:**
  the `UPDATE` grant was revoked by the lockdown migration.
- `xooter_earnings`, `subscription_plans`, `training_modules` and ~10 others hold client
  `INSERT/UPDATE/DELETE` **grants with zero policies**. Read alone, alarming. They are inert,
  because RLS default-denies.

## Findings

### Confirmed safe

- **No privilege-escalation path.** Every `user_roles` write requires `has_role(admin)`; `xooters`
  INSERT/DELETE likewise; `payment_records` and `bookings` carry no client write grant at all.
- **`public.has_role` and `private.has_role` agree by design.** `private` is `SECURITY DEFINER` and
  performs the lookup; `public` delegates to it but returns false unless `_user_id = auth.uid()`, so
  the public wrapper can only ever answer about the caller. Both `SET search_path TO ''`. Checked
  first, because a disagreement here would have invalidated every other conclusion.
- **Owner-scoped writes are correctly scoped.** `saved_addresses`, `push_tokens`, `favorites`,
  `user_encryption_keys`, `native_push_subscriptions`, `booking_tips` are all `user_id = auth.uid()`.
- **Sensitive reads are owner-or-admin**: `xooter_applications`, `xooter_documents`,
  `household_profiles`, `saved_addresses`.

### Open, in priority order

1. **34 client write grants with no governing policy.** Inert today. The grant is pre-placed, so the
   first permissive policy makes the write live with no second decision and no migration touching a
   grant. `xooter_earnings` (money) and `subscription_plans` (pricing) are in the set. **Recommend
   revoking**; until then, `authz-surface` fires if any of them gains a policy.
2. **Staging and production write surfaces differ**, and nothing reconciled them before this review.
3. **ZD-029 never renamed functions.** Production still has `zooter_job_transition_allowed` while
   `types.ts` expects `xooter_…` — which is why *Types match the live schema* fails on `main`. Read
   from `pg_proc`, not inferred.
4. `admin_review_queue` INSERT permits `user_id IS NULL` from any authenticated user.
5. `booking_tips` policies use bare `auth.uid()` and role `{public}` where this document's own
   "known safe patterns" say `(select auth.uid())` and `{authenticated}` — re-evaluated per row.
6. `xooter_payout_accounts.xooter_id` is a foreign key to **`auth.users.id`**, not `xooters.id`,
   despite the name. The policy is correct; the name will mislead whoever writes the next one.

### A false finding, recorded because the near-miss is instructive

The first pass classified reachability with `not ilike '%has_role%'`, intending "not admin-gated".
That excludes `(user_id = auth.uid()) OR has_role(admin)`, which **is** owner-reachable — so
`profiles:UPDATE` and `post_job_reviews:INSERT` appeared unreachable on production, one step from
filing *"editing your profile is broken in production"*. It is not.

The inverse heuristic, `bool_and(… ilike '%has_role%')`, is worse: it labels that same policy
"admin only", so a policy **widening** from admin-only to owner-or-admin would not move the flag and
the guard would stay silent through exactly the change it exists to catch.

No regex over policy SQL decides reachability correctly. `authz-surface.mjs` therefore fingerprints
the policy text and fires on **any** change, leaving the judgement to a human reading the diff.

## Known safe patterns

- `(select auth.uid())` in policies, not bare `auth.uid()` — evaluated once, not per row.
- Both `USING` and `WITH CHECK` on update policies.
- Sensitive mutation logic in Edge Functions or scoped RPCs, not in policies.
- `SET search_path TO ''` on every `SECURITY DEFINER` function.
- Append-only event tables for audit and provider callbacks.
- **Revoke the grant as well as omitting the policy.** Default-deny is a backstop, not the control.

## How to re-verify

```bash
SUPABASE_ACCESS_TOKEN=…  npm run security:authz              # production
SUPABASE_ACCESS_TOKEN=…  node scripts/security/authz-surface.mjs --staging
SUPABASE_ACCESS_TOKEN=…  node scripts/security/authz-surface.mjs --write   # after an intended change
```

`--write` regenerates the baseline for a human to read and commit; it is never run in CI, because a
guard that rewrites its own expectations is not a guard. `src/lib/authz-surface.test.ts` covers the
comparison logic offline — no agent session can reach a database, so the deciding half is tested
separately from the fetching half.
