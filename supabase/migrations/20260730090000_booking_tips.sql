-- Tipping a Xooter after a service.
--
-- NOT APPLIED. Written under ZD-003 (no production mutation during Phase 0) and gated
-- on ZD-005 (schema source of truth unresolved). Review both before running this
-- anywhere.
--
-- Two halves: where the amount is recorded, and who is allowed to record it.

alter table public.bookings
  add column if not exists tip_cents integer not null default 0
    check (tip_cents >= 0 and tip_cents <= 100000);

comment on column public.bookings.tip_cents is
  'Optional tip in integer CENTS. Note bookings.price is numeric RANDS — do not add the two without converting. Capped to match MAX_TIP_CENTS in src/lib/tipping.ts; a mis-keyed rand amount is the failure that guards against, not generosity.';

-- Settlement path. `payment_kind` had no value for a tip, so a recorded tip had nowhere
-- to become money. Adding the value does not wire the payout; that is the payments
-- phase. It exists so the tip can be settled without a second migration under time
-- pressure later.
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

-- ---------------------------------------------------------------------------
-- Only the customer may set their own tip
-- ---------------------------------------------------------------------------
--
-- A column-level rule rather than a table policy, because customers already hold update
-- rights on their own bookings for other reasons. Without this, anything that can update
-- a booking can also write a tip onto it — including a Xooter tipping themselves, which
-- is the case worth being explicit about.
--
-- The trigger reverts rather than raises: a legitimate update that happens not to touch
-- the tip should not fail because it carried the old value along.

create or replace function public.enforce_booking_tip_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tip_cents is distinct from old.tip_cents then
    -- Only the booking's own customer, and only once the work is done. A tip offered
    -- before service is a different product with different consumer-law consequences.
    if auth.uid() is null or auth.uid() <> old.user_id then
      new.tip_cents := old.tip_cents;
    elsif old.status <> 'completed'::public.booking_status then
      new.tip_cents := old.tip_cents;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists booking_tip_author_guard on public.bookings;

create trigger booking_tip_author_guard
  before update on public.bookings
  for each row
  execute function public.enforce_booking_tip_author();
