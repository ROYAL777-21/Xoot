-- `xooter_id` references `auth.users` on three tables and `xooters` on sixteen.
--
-- ── Measured on production `mvlrkelahhsyjrwgsxaf`, 2026-08-20 ───────────────────
-- Nineteen tables carry a column called `xooter_id`. They do not all mean the same thing:
--
--   -> auth.users(id)   payout_change_requests, xooter_payout_accounts, xooter_payout_holds
--   -> xooters(id)      bookings, booking_tips, booking_completion_photos, favorites,
--                       post_job_reviews, recurring_schedules, trust_incidents, xooter_earnings,
--                       xooter_jobs, xooter_reliability_metrics, xooter_training_progress,
--                       xooter_commission_boosts, admin_review_queue, and the three xoot_black_*
--
-- The three exceptions are exactly the tables that move money.
--
-- ── Why this is a comment and not a rename ──────────────────────────────────────
-- The schema is correct and so are all three policies — each reads
-- `xooter_id = (select auth.uid())`, which is right for an `auth.users` foreign key. Verified live,
-- not assumed. Nothing is broken; the NAME is the hazard.
--
-- The hazard is directional. Copying the `xooters`-shaped predicate onto a payout table —
-- `exists (select 1 from xooters z where z.id = t.xooter_id and z.user_id = auth.uid())` — compares
-- a `xooters.id` to a user id, matches nothing, and fails closed. Survivable. The reverse is the
-- expensive one: "fixing" a payout policy that looks wrong by joining it through `xooters`, and
-- breaking a Xooter's access to their own bank details, or worse, attaching the wrong person's.
--
-- Renaming the column would touch three payout tables, their indexes, their constraints and every
-- Edge Function that reads them, to fix a readability problem — against a schema where the money
-- path currently works. The comment goes where the next policy author will actually be standing.

comment on column public.xooter_payout_accounts.xooter_id
  is 'FK to auth.users(id) — NOT xooters(id), despite the name. Compare it to auth.uid() directly. '
     'Joining through public.xooters here matches nothing.';

comment on column public.xooter_payout_holds.xooter_id
  is 'FK to auth.users(id) — NOT xooters(id), despite the name. Compare it to auth.uid() directly. '
     'Joining through public.xooters here matches nothing.';

comment on column public.payout_change_requests.xooter_id
  is 'FK to auth.users(id) — NOT xooters(id), despite the name. Compare it to auth.uid() directly. '
     'Joining through public.xooters here matches nothing.';
