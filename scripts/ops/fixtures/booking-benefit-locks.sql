-- Synthetic, bounded PG integration fixture. It models the columns, constraints,
-- grants and RLS touched by the guard migration; it is not the full app schema.
create schema private;
create schema auth;
grant usage on schema public, private, auth to anon, authenticated, service_role;
-- Deliberately broad defaults reproduce Supabase's historical defaults and prove
-- the migration's explicit function/table revocations, not just fresh PG defaults.
alter default privileges grant all on tables to anon, authenticated, service_role;
alter default privileges grant execute on functions to anon, authenticated, service_role;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create type public.subscription_status as enum ('active', 'cancelled', 'paused', 'pending_payment');
create table public.bookings (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  completed_at timestamptz, customer_note text, status text default 'pending'
);
create table public.xootcred_ledger (
  id uuid primary key default gen_random_uuid(), user_id uuid not null,
  amount numeric(10,2) not null, direction text,
  status text not null default 'available', expires_at timestamptz,
  reason text not null default 'synthetic_test', meta jsonb default '{}',
  booking_id uuid references public.bookings on delete set null,
  check(direction is null or direction in ('credit','debit')),
  check(direction is null or amount >= 0),
  check(status in ('pending','available','redeemed','expired','cancelled'))
);
create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  status public.subscription_status not null default 'active',
  next_billing_at timestamptz not null default now() + interval '30 days'
);
create table public.referrals (
  user_id uuid primary key, code text not null unique,
  total_invited integer not null default 0, total_rewarded integer not null default 0
);
create table public.referral_redemptions (
  id uuid primary key default gen_random_uuid(), referrer_user_id uuid not null,
  referred_user_id uuid not null unique, rewarded boolean not null default false,
  rewarded_at timestamptz, booking_id uuid references public.bookings on delete set null,
  credit_cents integer check(credit_cents is null or credit_cents >= 0)
);
alter table public.bookings enable row level security;
alter table public.xootcred_ledger enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_redemptions enable row level security;
create policy bookings_read on public.bookings for select to authenticated using(user_id=auth.uid());
create policy bookings_update on public.bookings for update to authenticated
  using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke insert,update,delete on public.bookings from anon,authenticated;
grant update(customer_note) on public.bookings to authenticated;
revoke insert,update,delete on public.xootcred_ledger,public.user_subscriptions from anon,authenticated;
create policy ledger_read on public.xootcred_ledger for select to authenticated using(user_id=auth.uid());
create policy subscriptions_read on public.user_subscriptions for select to authenticated using(user_id=auth.uid());
create policy referrals_read on public.referrals for select to authenticated using(user_id=auth.uid());
create policy redemptions_read on public.referral_redemptions for select to authenticated
  using(referrer_user_id=auth.uid() or referred_user_id=auth.uid());
-- Service policy also exercises non-BYPASSRLS service roles on portable servers.
create policy service on public.bookings for all to service_role using(true) with check(true);
create policy service on public.xootcred_ledger for all to service_role using(true) with check(true);
create policy service on public.user_subscriptions for all to service_role using(true) with check(true);
create policy service on public.referrals for all to service_role using(true) with check(true);
create policy service on public.referral_redemptions for all to service_role using(true) with check(true);
create function public.synthetic_signup_referral() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.referrals(user_id,code) values(new.id,new.id::text);
  return new;
end;
$$;
create trigger synthetic_signup after insert on auth.users for each row
  execute function public.synthetic_signup_referral();
revoke all on function public.synthetic_signup_referral() from public,anon,authenticated,service_role;
