-- Extends the existing benefit-guard fixture with the actual touched payment
-- columns/checks. Deliberately broad inherited grants test explicit revocations.
alter table public.bookings add column payment_status text not null default 'pending',
  add column crew_size smallint not null default 1,
  add column cancelled_at timestamptz;
create table public.payment_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  booking_id uuid references public.bookings(id) on delete set null,
  amount numeric(10,2) not null check(amount >= 0),
  currency text not null default 'ZAR',
  payment_kind text not null check(payment_kind in ('booking','homecare_membership','gift_clean','b2b_invoice','booking_cover','placement_admin_fee')),
  provider text not null default 'manual_pending'
    check(provider in ('manual_pending','manual_eft','payfast')),
  provider_reference text,
  status text not null default 'pending'
    check(status in ('pending','admin_confirmed','paid','failed','cancelled','refunded')),
  meta jsonb not null default '{}', paid_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.payment_records enable row level security;
create policy service on public.payment_records for all to service_role using(true) with check(true);
revoke insert, update, delete on public.payment_records from anon, authenticated;
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(), admin_id uuid not null references auth.users(id),
  action text not null, target_table text not null, target_id uuid, changes jsonb,
  reason text, ip_address text, created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
create table private.booking_payment_settlements (payment_record_id uuid primary key);
create table private.booking_cancellations (booking_id uuid primary key);
revoke all on private.booking_payment_settlements, private.booking_cancellations
  from public, anon, authenticated, service_role;
