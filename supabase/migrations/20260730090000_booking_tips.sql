-- Tipping a Xooter after a service.
--
-- NOT APPLIED. Written under ZD-003 (no production mutation during Phase 0) and gated
-- on ZD-005 (schema source of truth unresolved). Review both before running this.
--
-- ---------------------------------------------------------------------------
-- Why a table rather than a bookings column
-- ---------------------------------------------------------------------------
--
-- The founder's decision (2026-07-30) is that a Xooter must not see the tip before the
-- customer relationship is closed out, because it biases how the job and the customer
-- are treated.
--
-- A `bookings.tip_cents` column — which is what app-iteration has, and what the first
-- draft of this migration did — cannot enforce that. RLS in Postgres is row-level: the
-- existing "zooters view assigned bookings" policy returns the whole row, so the moment
-- a tip column exists on `bookings` every assigned Xooter can read it. Column-level
-- GRANTs are the usual escape hatch and do not help here either, because customers and
-- Xooters share the single `authenticated` role, so there is no grant that separates
-- them.
--
-- So the tip lives in its own table with its own policies, which is the only place the
-- visibility rule can actually be enforced.

create table if not exists public.booking_tips (
  -- One tip per booking. A composite or serial key would allow two, and then "the tip"
  -- becomes a sum that different screens can disagree about.
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  zooter_id uuid references public.zooters(id) on delete set null,
  -- Integer cents. Note bookings.price is numeric RANDS — do not add the two without
  -- converting. Capped to match MAX_TIP_CENTS in src/lib/tipping.ts; that guards a
  -- mis-keyed rand amount, not generosity.
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 100000),
  -- Null until the tip has actually been paid out. This column is the visibility gate
  -- below, not just a record of state.
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_tips_zooter_settled_idx
  on public.booking_tips (zooter_id, settled_at);

alter table public.booking_tips enable row level security;

grant select, insert, update on table public.booking_tips to authenticated;

-- ---------------------------------------------------------------------------
-- The customer owns their tip, and only after the work is done
-- ---------------------------------------------------------------------------

drop policy if exists "customers view own tips" on public.booking_tips;
create policy "customers view own tips"
  on public.booking_tips for select
  using (user_id = auth.uid());

drop policy if exists "customers add tip to own completed booking" on public.booking_tips;
create policy "customers add tip to own completed booking"
  on public.booking_tips for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_tips.booking_id
        and b.user_id = auth.uid()
        -- A tip offered before the service is a different product with different
        -- consumer-law consequences. This is the only moment it may be added.
        and b.status = 'completed'::public.booking_status
    )
  );

drop policy if exists "customers change own unsettled tip" on public.booking_tips;
create policy "customers change own unsettled tip"
  on public.booking_tips for update
  using (user_id = auth.uid() and settled_at is null)
  with check (user_id = auth.uid() and settled_at is null);

-- ---------------------------------------------------------------------------
-- The Xooter sees it only once it is settled
-- ---------------------------------------------------------------------------
--
-- Deliberately NOT "once the job is complete". The point of the rule is that knowing
-- about a tip must not colour the job or the rating, and settlement is the first moment
-- where that is behind them.
--
-- When a Xooter-rates-customer flow exists, tighten this further: the gate becomes
-- settled AND the Xooter has already submitted their rating. Today there is no such
-- flow — `post_job_reviews` runs customer→Xooter only — so settlement is the honest
-- line to draw, and it errs on the side of not showing.

drop policy if exists "zooters view settled tips only" on public.booking_tips;
create policy "zooters view settled tips only"
  on public.booking_tips for select
  using (
    settled_at is not null
    and exists (
      select 1 from public.zooters z
      where z.id = booking_tips.zooter_id and z.user_id = auth.uid()
    )
  );

drop policy if exists "admins manage tips" on public.booking_tips;
create policy "admins manage tips"
  on public.booking_tips for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Settlement is a server-side act. Nobody holding a customer or Xooter session may set
-- it — a customer could otherwise reveal their own tip early, and a Xooter could reveal
-- everyone's.
create or replace function public.enforce_tip_settlement_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.settled_at is distinct from old.settled_at
     and auth.uid() is not null
     and not public.has_role(auth.uid(), 'admin') then
    new.settled_at := old.settled_at;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists booking_tip_settlement_guard on public.booking_tips;

create trigger booking_tip_settlement_guard
  before update on public.booking_tips
  for each row
  execute function public.enforce_tip_settlement_author();

-- ---------------------------------------------------------------------------
-- Settlement path
-- ---------------------------------------------------------------------------
--
-- `payment_kind` had no value for a tip, so a recorded tip had nowhere to become money.
-- Adding the value does not wire the payout; that is the payments phase. It is here so
-- that work does not need a second migration under time pressure.

alter table public.payment_records
  drop constraint if exists payment_records_payment_kind_check;

alter table public.payment_records
  add constraint payment_records_payment_kind_check
  check (payment_kind in (
    'booking',
    'homecare_membership',
    'gift_clean',
    'b2b_invoice',
    'booking_cover',
    'placement_admin_fee',
    'tip'
  ));
