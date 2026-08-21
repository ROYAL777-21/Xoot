-- Eight SECURITY DEFINER functions are executable by `anon` and `authenticated`. They should be
-- service-role only, and two of them return customer home addresses.
--
-- ── The mechanism, which is a one-word difference ───────────────────────────────────────────
-- `REVOKE ... FROM PUBLIC` removes the PUBLIC default. It does **not** remove the direct grants
-- Supabase's platform bootstrap hands `anon` and `authenticated` — those come from the platform,
-- not from any migration in this repo (`grep "grant execute on all functions"` over supabase/
-- returns nothing). To take EXECUTE away from those two roles you have to name them.
--
-- This repo already knew that in three places:
--
--     20260620001000:11-12   revoke ... from public;  AND  revoke ... from anon, authenticated;
--     20260802170000:70      revoke all ... from public, anon;
--     20260808120000:47      revoke all ... from public, anon, authenticated;
--
-- and `20260813220000` — the ZD-029 rename — wrote `from public;` alone, eight times.
--
-- ── Why the rename is what reopened it ──────────────────────────────────────────────────────
-- `20260813220000` **dropped and recreated** each function under its new name, and a newly created
-- function gets fresh default ACLs. So the hardening in `20260701093000`, which correctly revoked
-- `can_release_zooter_payout` from public, anon AND authenticated, was undone by the rename — and
-- the replacement `can_release_xooter_payout` re-revoked only one of the three roles.
--
-- Measured on production 2026-08-21, not inferred:
--
--     get_xooter_job_cards_for_user(uuid)   prosecdef=t   postgres=X | anon=X | authenticated=X | service_role=X
--     set_safety_pin(text)                  prosecdef=t   postgres=X |         authenticated=X | service_role=X
--
-- `set_safety_pin` is the control: `20260802170000` named `anon` and the ACL has no `anon`.
--
-- ── What was actually reachable ─────────────────────────────────────────────────────────────
-- Two of the eight are SECURITY DEFINER, take an arbitrary id, and apply NO `auth.uid()` check:
--
--     get_xooter_job_cards_for_user(uuid)                    -> destination_address, price, user_id
--     get_accepted_xooter_job_destinations_for_user(uuid,..) -> address
--
-- Both return a customer's street address for any Xooter whose `user_id` the caller passes. Three
-- more answer booleans about arbitrary ids (`can_release_xooter_payout`, `is_xoot_black_eligible`,
-- `can_access_sensitive_data`) — payout-verification and tier oracles.
--
-- Stated at its real size: reaching it needs a valid `xooters.user_id`, a 128-bit uuid that is not
-- brute-forceable. But uuids leak through URLs, payloads and support threads, and `authenticated`
-- held the same grant — so any signed-up user who learned one got that Xooter's live job list.
-- That is a horizontal-authorization break, not a theoretical one. Both tables measured 0 rows on
-- 2026-08-15, so there was very likely nothing to leak yet.
--
-- ── Deliberately NOT overstated ─────────────────────────────────────────────────────────────
-- `assert_fare_split_sums()` and `enforce_booking_price_author()` carry PUBLIC EXECUTE, and the
-- advisor flags them. They return `trigger`, and PostgREST does not expose trigger functions as
-- RPC, so they were **never reachable**. Revoked below for hygiene. Nobody should later read this
-- migration as having closed a vulnerability on those three.
--
-- `enforce_tip_settlement_author()` is the third, and the ADVISOR NEVER FLAGGED IT — it was found
-- by `src/lib/security-definer-grants.test.ts` on its first run, before that guard had ever been
-- committed. Recorded because it is the argument for the guard existing: the advisor reports what
-- it happens to sample, and a replay of the migrations reports all of them.
--
-- `booking_sensitive_access` (20260813220000:140, same `from public` shape) is likewise not an
-- exposure: `security_invoker = true` means RLS on `bookings` and `household_profiles` applies to
-- the caller. Tightened below behind that RLS, not instead of it.
--
-- ── Why this is safe: nothing calls these as a user ─────────────────────────────────────────
-- Revoking from `authenticated` would break the Xooter job list if anything called these with a
-- user token. Verified it does not:
--
--   * `src/` issues ZERO `.rpc()` calls — `src/lib/rpc-names-exist.test.ts:55` already records
--     `.rpc("name"` as this codebase's only call style, and every match is under supabase/functions.
--   * Every caller is an Edge Function on a service-role client: `requireAuth`
--     (`_shared/action-utils.ts:118`) returns `getServiceClient()`, and the two that build their own
--     (`sensitive-access-read:78`, `ops-workflow:241`) use SUPABASE_SERVICE_ROLE_KEY. The anon
--     clients are used only for `auth.getUser()`, never for `.rpc()`.
--
-- `service_role` already holds an explicit grant on all eight, so nothing loses access.
--
-- ── Form ────────────────────────────────────────────────────────────────────────────────────
-- Written as plain per-function statements rather than generated in a `DO` block, for the reason
-- `20260815150000` landed on: `src/lib/security-definer-grants.test.ts` reads this directory to
-- learn the final grant state, and so does any reviewer. If the final state is not greppable, it
-- is not reviewable.

-- ── The eight from 20260813220000 ───────────────────────────────────────────────────────────
revoke all on function public.can_access_sensitive_data(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.can_access_sensitive_data(uuid, uuid) to service_role;

revoke all on function public.xooter_job_transition_allowed(text, text)
  from public, anon, authenticated;
grant execute on function public.xooter_job_transition_allowed(text, text) to service_role;

revoke all on function public.get_xooter_job_cards_for_user(uuid)
  from public, anon, authenticated;
grant execute on function public.get_xooter_job_cards_for_user(uuid) to service_role;

revoke all on function public.get_xooter_job_cards()
  from public, anon, authenticated;
grant execute on function public.get_xooter_job_cards() to service_role;

revoke all on function public.get_accepted_xooter_job_destinations(uuid[])
  from public, anon, authenticated;
grant execute on function public.get_accepted_xooter_job_destinations(uuid[]) to service_role;

revoke all on function public.get_accepted_xooter_job_destinations_for_user(uuid, uuid[])
  from public, anon, authenticated;
grant execute on function public.get_accepted_xooter_job_destinations_for_user(uuid, uuid[]) to service_role;

revoke all on function public.can_release_xooter_payout(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.can_release_xooter_payout(uuid, uuid) to service_role;

revoke all on function public.is_xoot_black_eligible(uuid, text)
  from public, anon, authenticated;
grant execute on function public.is_xoot_black_eligible(uuid, text) to service_role;

-- ── Hygiene: trigger functions, never RPC-reachable ─────────────────────────────────────────
revoke all on function public.assert_fare_split_sums()
  from public, anon, authenticated;

revoke all on function public.enforce_booking_price_author()
  from public, anon, authenticated;

revoke all on function public.enforce_tip_settlement_author()
  from public, anon, authenticated;

-- ── Defence in depth behind the view's own RLS ──────────────────────────────────────────────
revoke all on public.booking_sensitive_access from anon, authenticated;

comment on function public.get_xooter_job_cards_for_user(uuid) is
  'Service-role only. SECURITY DEFINER and takes an arbitrary p_user_id with no auth.uid() check, so it returns a customer destination_address to whoever can call it. EXECUTE was held by anon and authenticated between 2026-08-13 and 2026-08-21 because the ZD-029 rename recreated the function (resetting its ACL) and revoked only FROM PUBLIC.';

comment on function public.can_access_sensitive_data(uuid, uuid) is
  'Service-role only. Callers are Edge Functions on a service-role client; no client code calls this RPC. Revoked from anon and authenticated on 2026-08-21.';
