-- A Xooter keeps 5% more of every job for 14 days, as a reward for doing well.
--
-- ── Why a time-boxed row rather than a flag ───────────────────────────────────────────────
--
-- The founder's framing is "your earnings are boosted for the next 14 days — a reward for doing
-- well", awarded to selected Xooters rather than computed for everyone. That is an *event*, not a
-- property, and it has to end by itself.
--
-- A boolean on `zooters` would not. A boost switched on and forgotten becomes a permanent rate
-- change nobody remembers making, discovered months later as an unexplained margin gap. A row with
-- `ends_at` expires whether or not anyone remembers it, which is the only version that stays true.
--
-- ── Why it does not stack below the floor ─────────────────────────────────────────────────
--
-- 20% is the confirmed floor on Xoot's take (founder, 2026-08-09), and `applyBoost` in
-- `src/lib/xooter-commission.ts` clamps there. A Platinum Xooter already at 20% therefore gains
-- nothing from a boost, and ops should reward them another way — the grant path says so rather
-- than silently issuing a boost worth zero.
--
-- ── Why the rate is still stamped on the booking ──────────────────────────────────────────
--
-- `bookings.commission_rate_bps` continues to be struck once, at assignment. A boost applies to
-- bookings struck inside its window and never retroactively, in either direction: a boost granted
-- today does not repay last week's jobs, and a boost expiring tomorrow does not claw back the rate
-- on a job already agreed. That is the same property that makes the ladder trustworthy.
--
-- ── The copy this supports, and the arithmetic behind it ──────────────────────────────────
--
-- The honest sentence is **"you keep 5% more of every job"**, not "your revenue is up 5%".
-- Going 35% -> 30% moves the Xooter's share of a R296 clean from R192.40 to R207.20: five
-- percentage points more of the job, which is a **7.7%** rise in what they earn. Saying "5% more
-- of every job" is exactly true and happens to be the better-sounding claim; saying "revenue up
-- 5%" understates what they actually get.

create table if not exists public.xooter_commission_boosts (
  id uuid primary key default gen_random_uuid(),
  zooter_id uuid not null references public.zooters(id) on delete cascade,
  -- Basis points taken off the resolved commission rate. 500 = five percentage points.
  bps integer not null default 500,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '14 days'),
  -- Why this Xooter, in words. A reward with no stated reason is indistinguishable from a
  -- mistake when someone reviews it later.
  reason text not null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint xooter_commission_boosts_bps_range check (bps between 100 and 1500),
  constraint xooter_commission_boosts_window check (ends_at > starts_at)
);

comment on table public.xooter_commission_boosts is
  'Time-boxed commission reductions awarded to individual Xooters. Read when striking '
  'bookings.commission_rate_bps; clamped so a boost can never take Xoot below the 20% floor.';

-- The only query this table serves: active boosts for a Xooter at a moment in time.
create index if not exists xooter_commission_boosts_active_idx
  on public.xooter_commission_boosts (zooter_id, starts_at, ends_at);

alter table public.xooter_commission_boosts enable row level security;

-- A Xooter may read their own boosts — they are being told about it, so hiding it would be odd —
-- and nobody may write from the client. Granting is a service-role action through `ops-workflow`
-- so that every boost carries a reason and an actor. A Xooter who could insert their own row
-- would be setting their own pay.
drop policy if exists "xooter_commission_boosts_own_read" on public.xooter_commission_boosts;
create policy "xooter_commission_boosts_own_read"
  on public.xooter_commission_boosts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.zooters z
       where z.id = xooter_commission_boosts.zooter_id
         and z.user_id = auth.uid()
    )
    or exists (
      select 1 from public.user_roles r
       where r.user_id = auth.uid() and r.role = 'admin'
    )
  );

revoke insert, update, delete on public.xooter_commission_boosts from authenticated, anon;
