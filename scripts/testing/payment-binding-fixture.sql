-- Disposable PostgreSQL fixture. No actual account, merchant, payment or money is used.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create schema private;
grant usage on schema public,private,auth to anon,authenticated,service_role;
create type public.app_role as enum('user','admin','xooter');
create table auth.users(id uuid primary key);
create table auth.sessions(id uuid primary key,user_id uuid,aal text,not_after timestamptz);
create table public.user_roles(user_id uuid,role public.app_role);
create function public.has_role(p_user_id uuid,p_role public.app_role) returns boolean language sql as $$
  select exists(select from public.user_roles where user_id=p_user_id and role=p_role)
$$;
create table public.payment_records(id uuid primary key default gen_random_uuid(),user_id uuid not null,
  booking_id uuid,amount numeric not null,currency text not null default 'ZAR',payment_kind text not null default 'booking',
  provider text not null default 'payfast',provider_reference text,status text not null default 'pending',
  meta jsonb not null default '{}',created_at timestamptz default now(),updated_at timestamptz default now(),paid_at timestamptz);
create table public.provider_events(id uuid primary key default gen_random_uuid(),provider text not null default 'payfast',
  event_id text not null,event_type text not null default 'payment_confirmed',subject_table text default 'payment_records',
  subject_id uuid,payload_hash text not null,status text not null default 'received',processed_at timestamptz,error_message text,
  unique(provider,event_id));
create table public.bookings(id uuid primary key,user_id uuid not null,xooter_id uuid,status text not null default 'pending_payment',
  payment_status text not null default 'pending',crew_size integer not null default 1,payment_confirmed_at timestamptz,updated_at timestamptz);
create table public.booking_status_events(id uuid default gen_random_uuid(),booking_id uuid,actor_id uuid,status text,label text,meta jsonb);
create table public.xooters(id uuid primary key,active boolean,background_check_status text,reliability_flagged boolean);
create table public.xooter_jobs(id uuid default gen_random_uuid(),booking_id uuid,xooter_id uuid,state text);
create table public.notifications(id uuid default gen_random_uuid(),user_id uuid,kind text,title text,body text,link text);
create table public.integration_outbox(id uuid default gen_random_uuid(),source_table text,source_id uuid,event_type text,channel text,
  owner text,stack_tool text,payload jsonb,status text,approval_required boolean,created_by uuid);
create table public.admin_audit_log(id uuid default gen_random_uuid(),admin_id uuid,action text,target_table text,target_id uuid,changes jsonb,reason text);
create table public.xootcred_ledger(id uuid primary key default gen_random_uuid(),user_id uuid,amount numeric,direction text,status text,expires_at timestamptz);
create table public.user_subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid);
create table public.referrals(id uuid primary key default gen_random_uuid(),user_id uuid);
create table public.referral_redemptions(id uuid primary key default gen_random_uuid(),referrer_user_id uuid,referred_user_id uuid);
create function public.check_xootcred_balance() returns trigger language plpgsql as $$begin return new;end $$;
create trigger zootcred_balance_check before insert on public.xootcred_ledger for each row execute function public.check_xootcred_balance();

-- The original settlement runs under a restricted definer, just as on the hosted project.
-- Browser roles receive no write permission in this disposable fixture.
grant select on public.payment_records to anon,authenticated;
insert into auth.users values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
