-- Public device keys for end-to-end encrypted booking chat.
-- Only public JWKs are stored here. Private keys remain on the user's device.

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
  constraint user_encryption_keys_public_jwk_object check (jsonb_typeof(public_jwk) = 'object'),
  constraint user_encryption_keys_device_id_not_blank check (length(trim(device_id)) > 0)
);

create index if not exists idx_user_encryption_keys_active_user
  on public.user_encryption_keys(user_id, revoked_at)
  where revoked_at is null;

alter table public.user_encryption_keys enable row level security;

grant select, insert, update on table public.user_encryption_keys to authenticated;

drop trigger if exists user_encryption_keys_touch on public.user_encryption_keys;
create trigger user_encryption_keys_touch
  before update on public.user_encryption_keys
  for each row execute function public.touch_updated_at();

drop policy if exists "users manage own encryption keys" on public.user_encryption_keys;
create policy "users manage own encryption keys"
  on public.user_encryption_keys for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "authenticated users read active public encryption keys" on public.user_encryption_keys;
create policy "authenticated users read active public encryption keys"
  on public.user_encryption_keys for select
  using (auth.role() = 'authenticated' and revoked_at is null);
