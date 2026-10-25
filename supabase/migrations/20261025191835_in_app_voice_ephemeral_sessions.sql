-- Short-lived in-app call correlation only. No raw callbacks, telephone numbers,
-- message content or recordings. All participants share one immutable room expiry.
do $$ begin
  if not exists (select from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron must be present before delivering in-app call correlation';
  end if;
end $$;

create table public.xoot_in_app_voice_rooms (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  account_sid text not null check (account_sid ~ '^AC[0-9a-fA-F]{32}$'),
  conference_sid text check (conference_sid ~ '^CF[0-9a-fA-F]{32}$'),
  status text not null default 'open' check (status in ('open','completed')),
  sequence_number bigint not null default -1 check (sequence_number >= -1),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  finished_at timestamptz,
  unique(id, expires_at),
  check (expires_at > created_at and expires_at <= created_at + interval '5 minutes'),
  check (status <> 'completed' or finished_at is not null)
);
create unique index xoot_in_app_voice_open_booking_idx
  on public.xoot_in_app_voice_rooms(booking_id) where status = 'open';
create index xoot_in_app_voice_expiry_idx on public.xoot_in_app_voice_rooms(expires_at);
create table public.xoot_in_app_voice_sessions (
  call_sid text primary key check (call_sid ~ '^CA[0-9a-fA-F]{32}$'),
  room_id uuid not null,
  actor_id uuid not null references auth.users(id) on delete cascade,
  voice_role text not null check (voice_role in ('client','contractor')),
  status text not null default 'queued' check (status in ('queued','active','completed')),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  finished_at timestamptz,
  foreign key (room_id, expires_at) references public.xoot_in_app_voice_rooms(id, expires_at) on delete cascade,
  unique (room_id, voice_role),
  check (expires_at > created_at and expires_at <= created_at + interval '5 minutes'),
  check (status <> 'completed' or finished_at is not null)
);
alter table public.xoot_in_app_voice_rooms enable row level security;
alter table public.xoot_in_app_voice_sessions enable row level security;
revoke all on public.xoot_in_app_voice_rooms from public, anon, authenticated, service_role;
revoke all on public.xoot_in_app_voice_sessions from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.xoot_in_app_voice_rooms to service_role;
grant select, insert, update, delete on public.xoot_in_app_voice_sessions to service_role;

-- Registration and callbacks lock the same room. The booking lock serialises room creation.
-- Replays cannot renew a live lease. These RPCs are invokers, callable only by service_role.
create function public.xoot_register_in_app_voice_join(
  p_booking_id uuid, p_actor_id uuid, p_account_sid text, p_call_sid text,
  p_voice_role text, p_lease_seconds integer
) returns table(room_id uuid, seconds integer)
language plpgsql security invoker set search_path = '' as $$
declare
  v_room public.xoot_in_app_voice_rooms%rowtype;
  v_call public.xoot_in_app_voice_sessions%rowtype;
  v_now timestamptz;
  v_seconds integer;
begin
  if p_booking_id is null or p_actor_id is null or p_account_sid is null or p_call_sid is null
    or p_account_sid !~ '^AC[0-9a-fA-F]{32}$' or p_call_sid !~ '^CA[0-9a-fA-F]{32}$'
    or p_voice_role is null or p_voice_role not in ('client','contractor')
    or p_lease_seconds is null or p_lease_seconds not between 1 and 300 then return; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('xoot-inapp:' || p_booking_id::text, 0));
  delete from public.xoot_in_app_voice_rooms r where r.booking_id = p_booking_id and r.expires_at <= clock_timestamp();
  select * into v_call from public.xoot_in_app_voice_sessions s where s.call_sid = p_call_sid;
  if found then
    select * into v_room from public.xoot_in_app_voice_rooms r where r.id = v_call.room_id for update;
    v_now := clock_timestamp();
    if v_room.id is null or v_room.booking_id <> p_booking_id or v_room.account_sid <> p_account_sid
      or v_call.actor_id <> p_actor_id or v_call.voice_role <> p_voice_role
      or v_room.status <> 'open' or v_call.status = 'completed' or v_room.expires_at <= v_now then return; end if;
  else
    select * into v_room from public.xoot_in_app_voice_rooms r
      where r.booking_id = p_booking_id and r.status = 'open' for update;
    v_now := clock_timestamp();
    if v_room.id is not null and v_room.expires_at <= v_now then
      delete from public.xoot_in_app_voice_rooms r where r.id = v_room.id;
      v_room.id := null;
    end if;
    if v_room.id is null then
      insert into public.xoot_in_app_voice_rooms(booking_id,account_sid,created_at,expires_at)
        values (p_booking_id,p_account_sid,v_now,v_now + pg_catalog.make_interval(secs => p_lease_seconds)) returning * into v_room;
    end if;
    if v_room.status <> 'open' or v_room.account_sid <> p_account_sid then return; end if;
    if exists(select from public.xoot_in_app_voice_sessions s where s.room_id = v_room.id and s.voice_role = p_voice_role) then return; end if;
    insert into public.xoot_in_app_voice_sessions(call_sid,room_id,actor_id,voice_role,created_at,expires_at)
      values(p_call_sid,v_room.id,p_actor_id,p_voice_role,v_now,v_room.expires_at);
  end if;
  v_seconds := least(p_lease_seconds, floor(extract(epoch from (v_room.expires_at - clock_timestamp())))::integer);
  if v_seconds > 0 then return query select v_room.id,v_seconds; end if;
end;
$$;

-- One transaction orders the room and every participant. Terminal callbacks win even when
-- delivered after a newer non-terminal event. A queued/unbound second leg is completed too.
create function public.xoot_apply_in_app_voice_event(
  p_room_id uuid, p_account_sid text, p_conference_sid text, p_sequence bigint,
  p_event text, p_call_sid text default null
) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare v_room public.xoot_in_app_voice_rooms%rowtype; v_now timestamptz;
begin
  if p_room_id is null or p_account_sid is null or p_conference_sid is null
    or p_account_sid !~ '^AC[0-9a-fA-F]{32}$' or p_conference_sid !~ '^CF[0-9a-fA-F]{32}$'
    or p_sequence is null or p_sequence not between 0 and 2147483647
    or p_event is null or p_event not in ('conference-start','conference-end','participant-join','participant-leave') then return false; end if;
  select * into v_room from public.xoot_in_app_voice_rooms r where r.id = p_room_id for update;
  v_now := clock_timestamp();
  if v_room.id is null or v_room.account_sid <> p_account_sid or v_room.expires_at <= v_now
    or v_room.status = 'completed' or (v_room.conference_sid is not null and v_room.conference_sid <> p_conference_sid) then return false; end if;
  if p_event in ('participant-join','participant-leave') and (p_call_sid is null
    or not exists(select from public.xoot_in_app_voice_sessions s where s.call_sid = p_call_sid and s.room_id = p_room_id)) then return false; end if;
  if p_event in ('conference-end','participant-leave') then
    -- endConferenceOnExit=true means a registered participant's leave ends this room.
    update public.xoot_in_app_voice_rooms set status='completed', finished_at=v_now,
      conference_sid=p_conference_sid, sequence_number=greatest(sequence_number,p_sequence) where id=p_room_id;
    update public.xoot_in_app_voice_sessions set status='completed',finished_at=coalesce(finished_at,v_now) where room_id=p_room_id;
  else
    if p_sequence <= v_room.sequence_number then return false; end if;
    update public.xoot_in_app_voice_rooms set conference_sid=p_conference_sid,sequence_number=p_sequence where id=p_room_id;
    if p_event = 'participant-join' then
      update public.xoot_in_app_voice_sessions set status='active' where room_id=p_room_id and call_sid=p_call_sid and status <> 'completed';
    end if;
  end if;
  return true;
end;
$$;
revoke all on function public.xoot_register_in_app_voice_join(uuid,uuid,text,text,text,integer) from public, anon, authenticated;
revoke all on function public.xoot_apply_in_app_voice_event(uuid,text,text,bigint,text,text) from public, anon, authenticated;
grant execute on function public.xoot_register_in_app_voice_join(uuid,uuid,text,text,text,integer) to service_role;
grant execute on function public.xoot_apply_in_app_voice_event(uuid,text,text,bigint,text,text) to service_role;
comment on table public.xoot_in_app_voice_rooms is
  'Service-only ephemeral in-app room; all legs share its at-most-five-minute expiry. Provider retention is separate.';
comment on table public.xoot_in_app_voice_sessions is
  'Service-only ephemeral call correlation, deleted with the room; no client policy, raw payload or recordings.';
select cron.schedule('purge-xoot-in-app-voice-sessions', '* * * * *',
  $$delete from public.xoot_in_app_voice_rooms where expires_at <= clock_timestamp()$$);

-- RLS does not restrict TRUNCATE. Preserve legacy data/SELECT policy and the PSTN implementation.
revoke truncate, references, trigger on public.masked_call_sessions from anon, authenticated;
