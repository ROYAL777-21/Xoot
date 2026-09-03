-- ZD-035 crew bookings, and ZD-036 referrals.
--
-- ⚠️ WRITTEN, NOT APPLIED. `db-push` cannot reach production — the stored
-- `SUPABASE_DB_PASSWORD` is staging's, and `SUPABASE_DB_PASSWORD_PRODUCTION` does not exist
-- yet. This file is the artefact that founder secret unblocks; it has not run anywhere.
--
-- ── ZD-035, and why this is a migration rather than a constant change ────────────────────
--
-- `create-booking` builds `bookingTargets = selectedXooterIds.length ? selectedXooterIds :
-- [null]` and inserts ONE `bookings` ROW PER XOOTER, each priced as a whole job with its own
-- commission rate. The data model IS the old commercial model: "two Xooters" means two jobs.
--
-- ZD-035 makes it one job a crew finishes sooner. Under the old shape, changing only the
-- multiplier would emit N rows at the coordination overhead each — 2.3× the intended price for
-- a crew of two, in the UNDER-stating direction against what the customer was shown. That is
-- the side of the CPA line this repo does not survive.
--
-- So: one `bookings` row for the job, and a `booking_assignees` row per Xooter carrying that
-- Xooter's own commission rate. Option (a) in `docs/implementation/design-port-plan.md`.
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

-- ── ZD-036 ──────────────────────────────────────────────────────────────────────────────

create table if not exists public.referrals (
  code text primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  active boolean not null default true,
  -- Set on redemption. Single-use by the referee, so the burn is what makes it single-use.
  burned_at timestamptz,
  burned_by uuid references auth.users (id),
  burned_booking_id uuid references public.bookings (id),
  created_at timestamptz not null default now(),
  -- A person gets one code, not a supply of them.
  unique (owner_id)
);

create index if not exists referrals_owner_id_idx on public.referrals (owner_id);

alter table public.referrals enable row level security;

-- A user may read their own code, and nothing else. They may not write it: issuing, burning
-- and validating are server decisions. `locked-commercial-facts.md` § Financial And Trust
-- Authority already lists "referral qualification" among the things the frontend is never
-- authoritative for, and a policy allowing update here would contradict that fact in SQL.
drop policy if exists referrals_owner_can_read on public.referrals;
create policy referrals_owner_can_read
  on public.referrals
  for select
  to authenticated
  using (owner_id = auth.uid());

revoke all on public.referrals from anon;
revoke insert, update, delete on public.referrals from authenticated;
grant select on public.referrals to authenticated;
grant select, insert, update, delete on public.referrals to service_role;

commit;
