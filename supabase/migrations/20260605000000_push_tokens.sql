-- Phase 10: store one native push token per authenticated user and mobile platform.
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now(),
  unique (user_id, platform)
);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_own" on public.push_tokens;
create policy "push_tokens_own"
  on public.push_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.push_tokens is
  'Stores native push notification tokens per user/platform for Capacitor iOS and Android apps.';
comment on policy "push_tokens_own" on public.push_tokens is
  'Users may only create, view, update, or delete their own device push token.';

grant select, insert, update, delete on public.push_tokens to authenticated;
