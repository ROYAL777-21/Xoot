-- Local correlation for in-app data calls only. Never store raw callbacks, telephone numbers,
-- message content or recordings. The five-minute call lease bounds local metadata retention;
-- pg_cron removes expired rows each minute even when no new request arrives.
do $$ begin
  if not exists (select from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron must be present before delivering in-app call correlation';
  end if;
end $$;

create table public.xoot_in_app_voice_sessions (
  call_sid text primary key check (call_sid ~ '^CA[0-9a-fA-F]{32}$'),
  account_sid text not null check (account_sid ~ '^AC[0-9a-fA-F]{32}$'),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  participant_role text not null check (participant_role in ('client','contractor')),
  conference_sid text check (conference_sid ~ '^CF[0-9a-fA-F]{32}$'),
  status text not null default 'queued' check (status in ('queued','active','completed')),
  sequence_number bigint not null default -1 check (sequence_number >= -1),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  finished_at timestamptz,
  check (expires_at > created_at and expires_at <= created_at + interval '5 minutes'),
  check (status <> 'completed' or finished_at is not null)
);
alter table public.xoot_in_app_voice_sessions enable row level security;
revoke all on public.xoot_in_app_voice_sessions from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.xoot_in_app_voice_sessions to service_role;
create index xoot_in_app_voice_expiry_idx on public.xoot_in_app_voice_sessions(expires_at);
create unique index xoot_in_app_voice_active_role_idx
  on public.xoot_in_app_voice_sessions(booking_id, participant_role)
  where status in ('queued','active');
comment on table public.xoot_in_app_voice_sessions is
  'Service-only ephemeral in-app voice correlation; no client policy or raw payload; expires within five minutes and is purged each minute. Provider-side retention is separate.';

select cron.schedule('purge-xoot-in-app-voice-sessions', '* * * * *',
  $$delete from public.xoot_in_app_voice_sessions where expires_at <= now()$$);

-- RLS does not restrict TRUNCATE. Remove inherited non-CRUD client privileges from the legacy
-- ledger as well, without touching its data, SELECT policy, or unrelated PSTN implementation.
revoke truncate, references, trigger on public.masked_call_sessions from anon, authenticated;
