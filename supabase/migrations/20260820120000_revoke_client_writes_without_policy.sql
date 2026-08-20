-- Revoke the 34 client write grants that no policy can ever satisfy.
--
-- ⚠️ RENUMBERED 2026-08-20 FROM `20260815150000`. DO NOT PUT IT BACK.
--
-- This file was written as `20260815150000_revoke_client_writes_without_policy.sql`. The Release
-- session independently wrote `20260815150000_rename_remaining_zooter_check_bodies.sql` — same
-- 14-digit version, different migration — and **theirs is already applied to production**:
--
--     version         name recorded in supabase_migrations.schema_migrations
--     20260815150000  rename_remaining_zooter_check_bodies      <- applied, on origin/main
--     20260815160000  xootcred_trigger_queries_a_dropped_table  <- applied
--
-- `supabase db push` keys on the version, never the name. With `20260815150000` already recorded,
-- this file would have been **skipped, and the push would have reported success** — 34 grants left
-- in place with nothing anywhere saying so. A revoke that silently does not happen is worse than
-- no revoke, because the ledger says it is done.
--
-- `src/lib/migration-version-collision.test.ts` now fails on this offline, with no credentials.
--
-- A client write needs **both** a table GRANT and a permissive RLS policy. Reading either alone
-- gives the wrong answer in both directions. These 34 have the grant and **zero** policies, so
-- `authenticated`/`anon` hold permission Postgres will never let them use.
--
-- Revoking them changes no behaviour today. It removes the half of a pair that would silently
-- become live the moment somebody adds a policy for an unrelated reason — a normal thing to do,
-- which would not look dangerous at review.
--
-- ── Verified against the live database, not the committed baseline ──────────────
-- Re-queried on production 2026-08-15 by joining `role_table_grants` to `pg_policies`. The result
-- matched `docs/security/client-write-revoke-plan.md` exactly: 34 grants, 13 tables. It also
-- sharpened one thing the baseline flattened — **`analytics_events` is granted to `anon` AND
-- `authenticated`**; every other table here is `authenticated` only. Revoking from one role would
-- have left the other holding it.
--
-- Each statement therefore names both roles. Revoking a grant that was never made is a no-op in
-- Postgres, so naming `anon` everywhere is safe and cheaper than being clever about it.
--
-- ── PER-OPERATION, NEVER `revoke all` ───────────────────────────────────────────
-- `profiles` is the reason. `src/pages/app/Profile.tsx:74` does a live UPDATE, and `profiles`
-- INSERT and UPDATE each have a policy. Only `profiles:DELETE` is unreachable. Both instinctive
-- readings are wrong:
--
--   "profiles has a writer, leave it alone" -> the DELETE grant stays, and the pair completes
--                                             itself the next time anyone adds a delete policy.
--   "revoke all on public.profiles"         -> **editing your own profile breaks in production.**
--
-- `booking_chat_typing_indicators` and `analytics_events` are the same shape: partly reachable, so
-- only the unreachable operations go.
--
-- Writer audit re-run against the merged `main` on 2026-08-15 — `grep` over `src/` and `mobile/`
-- for `.from("<table>")` followed by `.insert(`/`.update(`/`.upsert(`/`.delete(`. One writer, the
-- `profiles` UPDATE above. No new writers since the audit was first taken.
--
-- ── Ordering ───────────────────────────────────────────────────────────────────
-- Runs **after** `20260814230000`, which drops and recreates `analytics_contractor_quality` and
-- faithfully restores the grants it had. That migration deliberately did not tidy them — a rename
-- fix should not carry a permission change — so this one takes them off. Both go in the same push.
--
-- ⚠️ Cross-role: `supabase/migrations/**` is Release's path. **Not applied anywhere** — needs a
-- `db-push`. Behaviour-neutral by construction, and `authz-surface.test.ts` fails if the committed
-- baseline and the live schema disagree after it lands.

-- ── Fully unreachable: no policy on INSERT, UPDATE or DELETE ─────────────────────
revoke insert, update, delete on public.analytics_booking_summary from authenticated, anon;
revoke insert, update, delete on public.analytics_contractor_quality from authenticated, anon;
revoke insert, update, delete on public.automation_skills from authenticated, anon;
revoke insert, update, delete on public.booking_xooter_profiles from authenticated, anon;
revoke insert, update, delete on public.contractor_screening_questions from authenticated, anon;
revoke insert, update, delete on public.notification_templates from authenticated, anon;
revoke insert, update, delete on public.subscription_plans from authenticated, anon;
revoke insert, update, delete on public.training_modules from authenticated, anon;
revoke insert, update, delete on public.xooter_earnings from authenticated, anon;
revoke insert, update, delete on public.xooter_training_progress from authenticated, anon;

-- ── Partly reachable: only the operations with no policy ─────────────────────────

-- INSERT has a permissive policy and is how events are recorded. DELETE and UPDATE have none —
-- and an analytics event that can be edited after the fact is not evidence of anything.
revoke update, delete on public.analytics_events from authenticated, anon;

-- INSERT and UPDATE both have policies; a typing indicator is written and refreshed by its owner.
-- DELETE has none — the row is expiry-driven, not deleted by a client.
revoke delete on public.booking_chat_typing_indicators from authenticated, anon;

-- ⚠️ DELETE ONLY. INSERT and UPDATE each have a policy, and `Profile.tsx:74` depends on UPDATE.
-- `revoke all` here breaks profile editing in production.
revoke delete on public.profiles from authenticated, anon;
