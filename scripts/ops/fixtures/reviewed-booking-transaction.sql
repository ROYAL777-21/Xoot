-- Extension of booking-benefit-locks.sql. Synthetic column/constraint fixture,
-- not a full hosted schema or actor/lifecycle proof. The REAL reviewed migrations
-- are subsequently applied by the harness (no copied writer/calculator/guards).
create table public.xooters(id uuid primary key default gen_random_uuid(),active boolean not null default true);
create table public.xooter_jobs(id uuid primary key default gen_random_uuid(),booking_id uuid references public.bookings(id),xooter_id uuid references public.xooters(id),state text);
create table public.household_profiles(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id));
create table public.property_accounts(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),status text not null default 'active');
alter table public.bookings
  add column xooter_id uuid references public.xooters(id),
  add column original_xooter_id uuid references public.xooters(id),
  add column service text not null default 'cleaning',
  add column service_type text,
  add column scheduled_at timestamptz not null default now()+interval '1 day',
  add column duration_hours numeric(3,1) not null default 2,
  add column address text,
  add column price numeric(10,2) not null default 100,
  add column notes text,
  add column payment_status text not null default 'pending',
  add column frequency text not null default 'one_time',
  add column household_profile_id uuid references public.household_profiles(id),
  add column property_account_id uuid references public.property_accounts(id),
  add column launch_region text,
  add column completion_photo_required boolean not null default false,
  add column service_fee numeric not null default 0,
  add column booking_cover_amount numeric not null default 0,
  add column high_demand_premium numeric not null default 0;
create table public.payment_records(
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
  booking_id uuid references public.bookings(id) on delete set null,
  amount numeric(10,2) not null check(amount>=0),currency text not null default 'ZAR',
  payment_kind text not null check(payment_kind in ('booking','homecare_membership','gift_clean','b2b_invoice','booking_cover','placement_admin_fee')),
  provider text not null default 'manual_pending',provider_reference text,
  status text not null default 'pending' check(status in ('pending','admin_confirmed','paid','failed','cancelled','refunded')),
  meta jsonb not null default '{}'
);
create table public.booking_status_events(id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),actor_id uuid references auth.users(id),status text not null,label text,meta jsonb);
create table public.recurring_schedules(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
  xooter_id uuid references public.xooters(id),household_profile_id uuid references public.household_profiles(id),
  cadence_days integer not null default 14,preferred_day text,preferred_time time,status text not null default 'active',next_suggested_at timestamptz);
create table public.admin_review_queue(id uuid primary key default gen_random_uuid(),queue_type text not null,
  subject_table text not null,subject_id uuid,user_id uuid references auth.users(id),booking_id uuid references public.bookings(id),priority text,summary text not null);
create table public.integration_outbox(id uuid primary key default gen_random_uuid(),source_table text,source_id uuid,
  event_type text not null,channel text not null,owner text not null,stack_tool text not null,payload jsonb not null,
  status text not null,failure_mode text,approval_required boolean not null default false,created_by uuid references auth.users(id));
create table public.admin_audit_log(id uuid primary key default gen_random_uuid(),admin_id uuid not null references auth.users(id),
  action text not null,target_table text not null,target_id uuid,changes jsonb,reason text);
do $$ declare t text; begin
  foreach t in array array['xooters','household_profiles','property_accounts','payment_records','booking_status_events',
    'recurring_schedules','admin_review_queue','integration_outbox','admin_audit_log'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy service on public.%I for all to service_role using(true) with check(true)',t);
  end loop;
end $$;
