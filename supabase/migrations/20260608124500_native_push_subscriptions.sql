create table if not exists public.native_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  platform text not null default 'unknown' check (platform in ('ios', 'android', 'web', 'unknown')),
  push_token text,
  token_type text not null default 'capacitor' check (token_type in ('capacitor', 'web_push', 'unknown')),
  permission_status text not null default 'prompt' check (permission_status in ('prompt', 'prompt-with-rationale', 'granted', 'denied', 'unknown')),
  app_version text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint native_push_device_id_length check (char_length(trim(device_id)) between 8 and 160),
  constraint native_push_token_required_when_granted check (permission_status <> 'granted' or char_length(trim(coalesce(push_token, ''))) > 8)
);

create unique index if not exists native_push_subscriptions_user_device_idx
  on public.native_push_subscriptions (user_id, device_id);

create index if not exists native_push_subscriptions_active_user_idx
  on public.native_push_subscriptions (user_id, last_seen_at desc)
  where revoked_at is null;

alter table public.native_push_subscriptions enable row level security;

drop policy if exists "users view own native push subscriptions" on public.native_push_subscriptions;
create policy "users view own native push subscriptions"
  on public.native_push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "users create own native push subscriptions" on public.native_push_subscriptions;
create policy "users create own native push subscriptions"
  on public.native_push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update own native push subscriptions" on public.native_push_subscriptions;
create policy "users update own native push subscriptions"
  on public.native_push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users delete own native push subscriptions" on public.native_push_subscriptions;
create policy "users delete own native push subscriptions"
  on public.native_push_subscriptions for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.native_push_subscriptions to authenticated;

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

drop trigger if exists touch_native_push_subscriptions_updated_at on public.native_push_subscriptions;
create trigger touch_native_push_subscriptions_updated_at
  before update on public.native_push_subscriptions
  for each row execute function public.touch_native_push_subscriptions_updated_at();
