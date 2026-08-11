-- Splitting one booking's cost between several people.
--
-- WHAT THIS IS AND IS NOT
-- -----------------------
-- This records **who owes what**. It does not collect money, because nothing in Xoot collects
-- money yet: `create-booking` writes `provider_required: 'Ozow/Stitch credentials not connected'`
-- and every `payment_records` row moves `pending -> admin_confirmed -> paid` by hand. Each
-- accepted share gets its own `payment_records` row so it is independently collectable the moment
-- a provider is connected, and the UI says so rather than implying a payment happened.
--
-- WHY `payer_user_id` IS NULLABLE
-- -------------------------------
-- Someone is invited by email before they have an account. `payment_records.user_id` is NOT NULL,
-- so a payment row cannot exist until there is a real user to own it — which is why the payment
-- row is created **on acceptance**, not on invitation. Same shape as `gift_clean_orders`, which
-- already carries `recipient_email` with no user FK.
--
-- WHY THE CLIENT CANNOT WRITE THIS
-- --------------------------------
-- `20260802120000_client_write_surface_lockdown.sql` left `bookings` with exactly one policy —
-- `bookings_participant_read`, SELECT only. Every mutation goes through an Edge Function holding
-- the service role. This table follows that: participants may read, nobody may write.
--
-- A client-writable split table would be strictly worse than a client-writable booking. Anyone
-- could lower their own share, or raise someone else's, and the total would still look right on
-- the screen that mattered.

create table if not exists public.booking_fare_splits (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,

  -- Null until the invitee signs in and accepts. Not a placeholder user: an absent payer is a
  -- real, distinguishable state ("invited, not yet accepted") and must not be confused with one.
  payer_user_id uuid references auth.users(id) on delete set null,
  invited_email text not null,

  -- Cents, integer. Never a numeric or a float: this is money, and `29600 / 3` must be a decision
  -- the code makes explicitly rather than a rounding the database performs silently.
  amount_cents integer not null check (amount_cents >= 1000),

  status text not null default 'invited'
    check (status in ('invited', 'accepted', 'declined', 'settled')),

  -- Who organised the split. Always the booking owner; kept for the audit trail rather than
  -- re-derived, because ownership can transfer and an invitation was still sent by someone.
  invited_by uuid not null references auth.users(id) on delete cascade,

  -- Set when the share is accepted and its payment row exists.
  payment_record_id uuid references public.payment_records(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,

  -- One invitation per person per booking. Without this, re-sending an invitation creates a second
  -- obligation for the same person and the shares stop summing.
  unique (booking_id, invited_email)
);

create index if not exists booking_fare_splits_booking_idx on public.booking_fare_splits (booking_id);
create index if not exists booking_fare_splits_payer_idx on public.booking_fare_splits (payer_user_id)
  where payer_user_id is not null;

comment on table public.booking_fare_splits is
  'Who owes what on a shared booking. Records obligations; does not collect money — no payment provider is connected. Service-role writes only.';
comment on column public.booking_fare_splits.payer_user_id is
  'Null until accepted. The payment_records row is created on acceptance, when there is a real user to own it.';

-- ── The sum guard ───────────────────────────────────────────────────────────────
-- A split whose shares do not add up to the booking is a booking that silently under- or
-- over-collects. The Edge Function checks this too, and that check is where a helpful error
-- message lives — but a constraint that only exists in application code is one forgotten code path
-- away from being no constraint at all.
--
-- Written as a constraint trigger rather than a CHECK because the rule spans rows: no CHECK can
-- see the other shares. DEFERRABLE INITIALLY DEFERRED so a multi-row insert is judged once, at
-- commit, rather than rejecting the first row for not yet summing to the whole.
create or replace function public.assert_fare_split_sums()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id uuid;
  v_total_cents integer;
  v_share_cents integer;
begin
  v_booking_id := coalesce(new.booking_id, old.booking_id);

  -- Declined shares are excluded: a declined invitation is not an obligation, and the organiser
  -- has to re-split before the booking can be collected. Leaving it in the sum would make a
  -- decline impossible without also editing every other share in the same statement.
  select coalesce(sum(amount_cents), 0) into v_share_cents
  from public.booking_fare_splits
  where booking_id = v_booking_id and status <> 'declined';

  -- `price` is rands numeric on `bookings`; the split is cents. Rounded, not truncated, so a
  -- booking priced at a half-cent cannot make the sum permanently unsatisfiable.
  select round(price * 100)::integer into v_total_cents
  from public.bookings where id = v_booking_id;

  if v_total_cents is null then
    raise exception 'booking % not found for fare split', v_booking_id;
  end if;

  if v_share_cents <> v_total_cents then
    raise exception 'fare split shares (% cents) must equal the booking total (% cents)',
      v_share_cents, v_total_cents;
  end if;

  return null;
end;
$$;

drop trigger if exists booking_fare_splits_sum_guard on public.booking_fare_splits;
create constraint trigger booking_fare_splits_sum_guard
  after insert or update or delete on public.booking_fare_splits
  deferrable initially deferred
  for each row execute function public.assert_fare_split_sums();

comment on function public.assert_fare_split_sums() is
  'Shares must equal the booking total, judged at commit so a multi-row insert is not rejected mid-way. Declined shares are excluded.';

-- ── RLS ─────────────────────────────────────────────────────────────────────────
alter table public.booking_fare_splits enable row level security;

-- Read for the organiser and for each payer — their own row only.
--
-- ⚠️ THE PRIVACY RULE THIS TABLE MUST NOT BREAK. A co-payer sees the service, the date and their
-- own amount. They must NEVER see the address, the notes, the household profile or the access
-- codes. Someone paying toward a clean is not thereby entitled to know where it happens: the
-- common case is a housemate or a family member, but the case that matters is the one where it is
-- not, and a booking address is where a person lives.
--
-- This policy governs the split rows only. It grants nothing on `bookings`, whose single
-- `bookings_participant_read` policy still requires being the owner or the assigned Xooter — so a
-- co-payer joining a split does not become a booking participant. That separation is the
-- protection, and `fare-split-privacy.test.ts` asserts the Edge Function never widens it.
drop policy if exists "fare split participants read" on public.booking_fare_splits;
create policy "fare split participants read"
  on public.booking_fare_splits
  for select
  using (
    auth.uid() = invited_by
    or auth.uid() = payer_user_id
    or exists (
      select 1 from public.bookings b
      where b.id = booking_fare_splits.booking_id and b.user_id = auth.uid()
    )
  );

comment on policy "fare split participants read" on public.booking_fare_splits is
  'Organiser and payers read. Grants nothing on bookings, so a co-payer never gains the address or access codes.';

-- No client writes at all, matching the booking write-surface lockdown.
revoke insert, update, delete on public.booking_fare_splits from anon, authenticated;
grant select on public.booking_fare_splits to authenticated;
