-- Commission is now a value the software knows, and every booking records the rate it was
-- struck at.
--
-- ── Why the rate is stored per booking rather than computed at payout ──────────────────────
--
-- Xoot's commission falls as a Xooter ranks higher on `zooters.reliability_score` — ratings,
-- punctuality, quality of work. The schedule lives in `src/lib/xooter-commission.ts` and is
-- mirrored in `supabase/functions/_shared/pricing.ts`.
--
-- A rank moves. If payout resolved the rate at payment time instead of reading it from the
-- booking, then a Xooter who accepted a job at 30% and picked up a late arrival the following
-- week would be paid at 35% for work they had already agreed and already done. The reverse is
-- just as bad: a promotion between acceptance and payment would silently change what Xoot
-- keeps on a job already priced.
--
-- Neither is a rounding argument. On a R296 clean the two ends of the ladder are R44.40 apart,
-- which is most of an hour's pay, and the Xooter has no way to audit a number that moved after
-- the fact. So the rate is struck once, stored, and never recomputed. This is the same
-- principle the price ladders already follow: `bookings.price` is what was agreed, not what
-- the ladder says today.
--
-- ── Why it is nullable ────────────────────────────────────────────────────────────────────
--
-- `create-booking` inserts with `zooter_id` null when the customer has not chosen anyone —
-- `bookingTargets` falls back to `[null]`. There is no Xooter to rank yet, so there is no
-- honest rate to record. It is stamped on acceptance instead. A default would be a fabricated
-- number that reads as agreed, which is worse than an absence that reads as pending.
--
-- ⚠️ DEPLOY ORDER IS NOT OPTIONAL. This migration must be applied BEFORE `create-booking` and
-- `respond-zooter-job` are deployed. PostgREST rejects an entire statement on the first unknown
-- column, so a function that inserts `commission_rate_bps` against a table without it does not
-- degrade — every booking insert fails, and booking creation is down. The reverse order is safe:
-- the column simply sits null until the functions ship.
--
-- ── Basis points ──────────────────────────────────────────────────────────────────────────
--
-- Integer bps, not numeric. 32.5% is 3250 exactly; 0.325 is not representable and this decides
-- what a person is paid. The check constraint spans the whole plausible ladder rather than
-- pinning today's five bands, so tuning the schedule does not require a migration — but a
-- typo of 35 or 3500000 still fails loudly.

alter table public.bookings
  add column if not exists commission_rate_bps integer;

comment on column public.bookings.commission_rate_bps is
  'Xoot commission in basis points, struck when the Xooter was assigned and never recomputed. '
  'Null means no Xooter has accepted yet. Schedule: src/lib/xooter-commission.ts.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_commission_rate_bps_range'
  ) then
    alter table public.bookings
      add constraint bookings_commission_rate_bps_range
      check (commission_rate_bps is null or commission_rate_bps between 500 and 5000);
  end if;
end
$$;

-- Existing rows keep a null rate deliberately. Backfilling them from today's ranks would invent
-- agreements that were never struck, and stamp them with scores earned after the work was done.
-- The absence is the honest record.
