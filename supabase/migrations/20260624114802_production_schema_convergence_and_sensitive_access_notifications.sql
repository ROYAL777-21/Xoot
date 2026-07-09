-- Phase 1 production/staging convergence.
-- This migration is intentionally additive. PostgreSQL enum values added here
-- are consumed by the following migration after this transaction commits.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

do $$
begin
  alter type public.booking_status add value if not exists 'draft';
  alter type public.booking_status add value if not exists 'pending_payment';
  alter type public.booking_status add value if not exists 'payment_confirmed';
  alter type public.booking_status add value if not exists 'awaiting_assignment';
  alter type public.booking_status add value if not exists 'assigned';
  alter type public.booking_status add value if not exists 'contractor_accepted';
  alter type public.booking_status add value if not exists 'en_route';
  alter type public.booking_status add value if not exists 'rated';
  alter type public.booking_status add value if not exists 'replacement_required';
  alter type public.booking_status add value if not exists 'replacement_offered';
exception
  when duplicate_object then null;
end
$$;

alter table public.bookings
  add column if not exists sensitive_data_revoked_at timestamptz,
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists assigned_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists replacement_count integer not null default 0,
  add column if not exists household_profile_id uuid
    references public.household_profiles(id) on delete set null,
  add column if not exists sensitive_access_available_notified_at timestamptz;

alter table public.payment_records
  add column if not exists paid_at timestamptz;

alter table public.household_profiles
  add column if not exists label text not null default 'Home',
  add column if not exists alarm_code text,
  add column if not exists access_instructions text;

update public.household_profiles
set access_instructions = access_notes
where access_instructions is null
  and access_notes is not null;

create index if not exists idx_bookings_household_profile
  on public.bookings(household_profile_id);

create index if not exists idx_bookings_sensitive_access_notification_due
  on public.bookings(scheduled_at, sensitive_access_available_notified_at)
  where zooter_id is not null
    and sensitive_access_available_notified_at is null
    and sensitive_data_revoked_at is null;

create table if not exists public.native_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  platform text not null default 'unknown'
    check (platform in ('ios', 'android', 'web', 'unknown')),
  push_token text,
  token_type text not null default 'expo_push'
    check (token_type in ('capacitor', 'expo_push', 'web_push', 'unknown')),
  permission_status text not null default 'prompt'
    check (permission_status in ('prompt', 'prompt-with-rationale', 'granted', 'denied', 'unknown')),
  app_version text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint native_push_device_id_length
    check (char_length(trim(device_id)) between 8 and 160),
  constraint native_push_token_required_when_granted
    check (
      permission_status <> 'granted'
      or char_length(trim(coalesce(push_token, ''))) > 8
    ),
  unique (user_id, device_id)
);

alter table public.native_push_subscriptions
  drop constraint if exists native_push_subscriptions_token_type_check;

alter table public.native_push_subscriptions
  add constraint native_push_subscriptions_token_type_check
  check (token_type in ('capacitor', 'expo_push', 'web_push', 'unknown'));

alter table public.native_push_subscriptions
  alter column token_type set default 'expo_push';

create index if not exists native_push_subscriptions_active_user_idx
  on public.native_push_subscriptions(user_id, last_seen_at desc)
  where revoked_at is null;

alter table public.native_push_subscriptions enable row level security;

drop policy if exists "users view own native push subscriptions"
  on public.native_push_subscriptions;
create policy "users view own native push subscriptions"
  on public.native_push_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);
comment on policy "users view own native push subscriptions"
  on public.native_push_subscriptions
  is 'Users can inspect only push registrations attached to their own account.';

drop policy if exists "users create own native push subscriptions"
  on public.native_push_subscriptions;
create policy "users create own native push subscriptions"
  on public.native_push_subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id);
comment on policy "users create own native push subscriptions"
  on public.native_push_subscriptions
  is 'Users can register only their own device for Zoot notifications.';

drop policy if exists "users update own native push subscriptions"
  on public.native_push_subscriptions;
create policy "users update own native push subscriptions"
  on public.native_push_subscriptions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
comment on policy "users update own native push subscriptions"
  on public.native_push_subscriptions
  is 'Users can refresh or revoke only their own device registration.';

drop policy if exists "users delete own native push subscriptions"
  on public.native_push_subscriptions;
create policy "users delete own native push subscriptions"
  on public.native_push_subscriptions for delete
  to authenticated
  using (auth.uid() = user_id);
comment on policy "users delete own native push subscriptions"
  on public.native_push_subscriptions
  is 'Users can remove only their own device registration.';

grant select, insert, update, delete
  on public.native_push_subscriptions to authenticated;

create or replace function public.touch_native_push_subscriptions_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_native_push_subscriptions_updated_at
  on public.native_push_subscriptions;
create trigger touch_native_push_subscriptions_updated_at
  before update on public.native_push_subscriptions
  for each row execute function public.touch_native_push_subscriptions_updated_at();

create table if not exists public.sensitive_data_access_log (
  id uuid primary key default gen_random_uuid(),
  zooter_id uuid not null,
  booking_id uuid not null,
  field_accessed text not null,
  accessed_at timestamptz not null default now(),
  device_info text,
  was_within_window boolean not null
);

alter table public.sensitive_data_access_log enable row level security;
revoke all on public.sensitive_data_access_log from anon, authenticated;
grant select on public.sensitive_data_access_log to authenticated;

drop policy if exists "sensitive_data_access_log_admin_read"
  on public.sensitive_data_access_log;
create policy "sensitive_data_access_log_admin_read"
  on public.sensitive_data_access_log for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
comment on policy "sensitive_data_access_log_admin_read"
  on public.sensitive_data_access_log
  is 'Only admins can inspect the service-written sensitive data reveal audit trail.';

create index if not exists idx_sensitive_data_access_log_booking
  on public.sensitive_data_access_log(booking_id, accessed_at desc);
create index if not exists idx_sensitive_data_access_log_zooter
  on public.sensitive_data_access_log(zooter_id, accessed_at desc);

create table if not exists public.user_encryption_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  public_jwk jsonb not null,
  key_version integer not null default 1 check (key_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, device_id),
  constraint user_encryption_keys_public_jwk_object
    check (jsonb_typeof(public_jwk) = 'object'),
  constraint user_encryption_keys_device_id_not_blank
    check (length(trim(device_id)) > 0)
);

create index if not exists idx_user_encryption_keys_active_user
  on public.user_encryption_keys(user_id, revoked_at)
  where revoked_at is null;

alter table public.user_encryption_keys enable row level security;
revoke all on public.user_encryption_keys from anon, authenticated;
grant select, insert, update on public.user_encryption_keys to authenticated;

drop policy if exists "users manage own encryption keys"
  on public.user_encryption_keys;
create policy "users manage own encryption keys"
  on public.user_encryption_keys for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
comment on policy "users manage own encryption keys"
  on public.user_encryption_keys
  is 'Users manage only their own device public keys; counterpart lookup remains an authenticated Edge Function action.';

drop policy if exists "authenticated users read active public encryption keys"
  on public.user_encryption_keys;

create or replace function public.touch_user_encryption_keys_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_encryption_keys_touch
  on public.user_encryption_keys;
create trigger user_encryption_keys_touch
  before update on public.user_encryption_keys
  for each row execute function public.touch_user_encryption_keys_updated_at();

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payment_record_id uuid references public.payment_records(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'ZAR',
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'processed', 'cancelled')),
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.refund_requests enable row level security;
revoke all on public.refund_requests from anon, authenticated;
grant select on public.refund_requests to authenticated;

drop policy if exists "refund_requests_own_read" on public.refund_requests;
create policy "refund_requests_own_read"
  on public.refund_requests for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.has_role(auth.uid(), 'admin'::public.app_role)
  );
comment on policy "refund_requests_own_read" on public.refund_requests
  is 'Clients can read their own refund requests and admins can audit all requests; writes are service-role only.';

create index if not exists idx_refund_requests_booking
  on public.refund_requests(booking_id, created_at desc);
create index if not exists idx_refund_requests_status
  on public.refund_requests(status, created_at desc);

comment on column public.bookings.sensitive_access_available_notified_at
  is 'Set once when Zoot notifies the assigned Zooter that the 45-minute sensitive-access window has opened.';
