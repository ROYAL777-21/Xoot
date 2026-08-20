-- `anon` holds INSERT, UPDATE and DELETE on a table that holds money.
--
-- ── What production actually shows ──────────────────────────────────────────────
-- Read from `mvlrkelahhsyjrwgsxaf` on 2026-08-20. The authz audit recorded only that these
-- policies use role `{public}`. The live read found something the audit did not:
--
--   grants     authenticated: INSERT, UPDATE, DELETE
--              anon:          INSERT, UPDATE, DELETE     <- not in the audit's finding
--
--   policies   all five are `to public`, which INCLUDES anon, and all five call bare `auth.uid()`
--
-- It fails closed today. For an anonymous session `auth.uid()` is NULL, so `user_id = auth.uid()`
-- evaluates to NULL rather than true and no row matches. That is the whole reason this is a
-- hardening migration and not an incident.
--
-- But it is a grant sitting against a permissive policy on the table that records money owed to a
-- Xooter, and that is exactly finding #1's shape: the half of a pair that becomes live the moment
-- somebody adjusts a predicate for an unrelated reason. `user_id = auth.uid()` is one edit away
-- from `user_id = auth.uid() or user_id is null`, which is precisely the mistake that made
-- `admin_review_queue` reachable — see `20260820130000`.
--
-- ── The predicates do not change ────────────────────────────────────────────────
-- Every policy below is transcribed from the live `pg_policies` output with exactly three edits,
-- and no fourth:
--
--   1. `to authenticated` instead of the default `{public}` — anon can no longer match at all,
--      rather than merely failing to.
--   2. `(select auth.uid())` instead of bare `auth.uid()` — evaluated once for the statement
--      instead of once per row. This is the repo's own documented safe pattern and what
--      `20260624121516_policy_performance_hardening` applied everywhere else.
--   3. `zooters view settled tips only` -> `xooters view settled tips only`. A rename does not
--      rewrite a policy NAME, only its body — the body already reads `xooters` because policy
--      expressions are stored as parsed trees. Renaming it here because this migration recreates
--      the policy anyway; leaving a policy half-renamed after touching it is how ZD-029 got nine
--      surfaces. This is one of the 27 policy names still saying `zoot*`, and the only one this
--      migration is entitled to touch.
--
-- The tip rules themselves — completed bookings only, settlement gates the Xooter's view,
-- unsettled tips only are editable — are unchanged. `enforce_tip_settlement_author()` still owns
-- settlement and is untouched.
--
-- SELECT grants are deliberately NOT revoked: they were not measured in the join above, and the
-- policies deny anon regardless. Revoking a read nobody proved unused is how a screen goes blank.

revoke insert, update, delete on public.booking_tips from anon;

-- ---------------------------------------------------------------------------
-- The customer's own tips
-- ---------------------------------------------------------------------------
drop policy if exists "customers view own tips" on public.booking_tips;
create policy "customers view own tips"
  on public.booking_tips for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "customers add tip to own completed booking" on public.booking_tips;
create policy "customers add tip to own completed booking"
  on public.booking_tips for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.bookings b
      where b.id = booking_tips.booking_id
        and b.user_id = (select auth.uid())
        -- A tip offered before the service is a different product with different
        -- consumer-law consequences. This is the only moment it may be added.
        and b.status = 'completed'::public.booking_status
    )
  );

drop policy if exists "customers change own unsettled tip" on public.booking_tips;
create policy "customers change own unsettled tip"
  on public.booking_tips for update
  to authenticated
  using (user_id = (select auth.uid()) and settled_at is null)
  with check (user_id = (select auth.uid()) and settled_at is null);

-- ---------------------------------------------------------------------------
-- The Xooter sees it only once it is settled
-- ---------------------------------------------------------------------------
--
-- Deliberately NOT "once the job is complete". Knowing about a tip must not colour the job or the
-- rating, and settlement is the first moment it cannot.
drop policy if exists "zooters view settled tips only" on public.booking_tips;
drop policy if exists "xooters view settled tips only" on public.booking_tips;
create policy "xooters view settled tips only"
  on public.booking_tips for select
  to authenticated
  using (
    settled_at is not null
    and exists (
      select 1 from public.xooters z
      where z.id = booking_tips.xooter_id and z.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------
--
-- Left on the PUBLIC `has_role` wrapper, not switched to `private.has_role`. The public wrapper
-- delegates to the private one but returns false unless `_user_id = auth.uid()`, so it can only
-- ever answer about the caller — which is what makes it safe to call with the caller's own uid.
-- Switching it would be a behaviour change dressed as tidying.
drop policy if exists "admins manage tips" on public.booking_tips;
create policy "admins manage tips"
  on public.booking_tips for all
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));

comment on table public.booking_tips
  is 'Tips are authenticated-only: anon held INSERT/UPDATE/DELETE grants until 2026-08-20 against '
     'policies that denied it only because auth.uid() is NULL for anonymous sessions. Both halves '
     'are now closed — the grant and the policy role.';
