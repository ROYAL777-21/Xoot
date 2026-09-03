-- ZD-035 crew bookings, and ZD-036's missing referral columns.
--
-- ── ⚠️ THIS FILE'S FIRST DRAFT WAS WRONG, AND STAGING IS WHAT CAUGHT IT ─────────────────
--
-- The first version created `public.referrals` from scratch with an `owner_id`. Applying it to
-- staging failed at statement 11:
--
--     ERROR: column "owner_id" does not exist (SQLSTATE 42703)
--     create index if not exists referrals_owner_id_idx on public.referrals (owner_id)
--
-- `create table if not exists` had silently done nothing, because **`public.referrals` has
-- existed since 2026-04-23** with `user_id` as its primary key, a unique `code`, and a signup
-- trigger that already issues every user a code. `referral_redemptions` exists beside it, and
-- its `referred_user_id UNIQUE` **is** the single-use burn ZD-036 asked for.
--
-- So ZD-036 needs no new tables. It needed two columns. Had the index name not collided, this
-- migration would have bolted new RLS policies and grants onto a live table with a different
-- shape and real rows in it — which is a considerably worse outcome than a failed apply.
--
-- ⚠️ **`if not exists` is why the collision was silent.** It is the right default for a table
-- this migration owns and the wrong one for a table it does not, because it converts "this
-- already exists and is not what you think" into "fine, carry on".
--
-- ── ZD-035, and why this half is a migration rather than a constant change ───────────────
--
-- `create-booking` builds `bookingTargets = selectedXooterIds.length ? selectedXooterIds :
-- [null]` and inserts ONE `bookings` ROW PER XOOTER, each priced as a whole job with its own
-- commission rate. The data model IS the old commercial model: "two Xooters" means two jobs.
--
-- ZD-035 makes it one job a crew finishes sooner. Under the old shape, changing only the
-- multiplier would emit N rows at the coordination overhead each — 2.3× the intended price for
-- a crew of two, in the UNDER-stating direction against what the customer was shown.
--
-- ⚠️ NOTHING IS BACKFILLED AND NOTHING IS DROPPED. Existing multi-Xooter bookings keep their
-- row-per-Xooter shape and their prices. Rewriting historical money to a model that did not
-- exist when it was charged would make every past invoice disagree with what was taken.
-- `bookings.crew_size` defaults to 1, so every existing row reads as the solo booking it was.

begin;

-- ── ZD-035 ──────────────────────────────────────────────────────────────────────────────

alter table public.bookings
  add column if not exists crew_size smallint not null default 1,
  -- Elapsed hours differ from booked labour once a crew is involved, and the customer is told
  -- the elapsed figure. Stored rather than derived so an invoice re-read years later does not
  -- depend on today's overhead curve.
  add column if not exists crew_elapsed_hours numeric(4, 1);

-- ZD-035 caps at 4. The check is here as well as in the resolver because a hand-built request
-- that reaches the table directly must not be able to record a crew nobody priced.
alter table public.bookings
  drop constraint if exists bookings_crew_size_range;
alter table public.bookings
  add constraint bookings_crew_size_range check (crew_size between 1 and 4);

create table if not exists public.booking_assignees (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  xooter_id uuid not null references public.xooters (id),
  -- Each Xooter is ranked separately, so each carries their own rate on the job they worked.
  -- Copied at assignment, never joined at read time: a Xooter whose band moves next month must
  -- not retroactively change what they were paid for this booking.
  commission_rate_bps integer not null,
  assigned_at timestamptz not null default now(),
  -- One row per Xooter per booking. Without this a retry double-assigns and the payout splits
  -- into more shares than there are people.
  unique (booking_id, xooter_id)
);

create index if not exists booking_assignees_booking_id_idx
  on public.booking_assignees (booking_id);
create index if not exists booking_assignees_xooter_id_idx
  on public.booking_assignees (xooter_id);

alter table public.booking_assignees enable row level security;

-- No anon or authenticated policy is created, deliberately. Assignment is decided by the
-- server; a customer reads their crew through the booking they already own, and a Xooter reads
-- their jobs through the existing card RPCs. Granting a direct select here would widen the
-- surface for no gain.
revoke all on public.booking_assignees from anon, authenticated;
grant select, insert, update, delete on public.booking_assignees to service_role;

-- ── ZD-036 — two columns on the redemption ledger that already exists ────────────────────
--
-- `public.referrals` and `public.referral_redemptions` are left exactly as they are. Their
-- RLS was already tightened by `20260627113000_performance_advisor_cleanup`, and the signup
-- trigger that issues codes already works. Adding to them, not replacing them.

alter table public.referral_redemptions
  -- Which booking burned the code. Without it a redemption cannot be reconciled against the
  -- money it discounted, and "was this credit actually applied?" has no answer.
  add column if not exists booking_id uuid references public.bookings (id) on delete set null,
  -- What was actually taken off, in cents. Stored rather than assumed from today's constant:
  -- ZD-036 records R100 as provisional, and a redemption from before a change must still
  -- report the number that was really applied.
  add column if not exists credit_cents integer;

-- Never negative, and never invented. A null means the redemption predates this column.
alter table public.referral_redemptions
  drop constraint if exists referral_redemptions_credit_cents_non_negative;
alter table public.referral_redemptions
  add constraint referral_redemptions_credit_cents_non_negative
  check (credit_cents is null or credit_cents >= 0);

create index if not exists referral_redemptions_booking_id_idx
  on public.referral_redemptions (booking_id);

commit;
