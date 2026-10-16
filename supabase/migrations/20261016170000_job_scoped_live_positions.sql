-- Protected, short-lived job location. Source-only until staging migration history is
-- reconciled and worker/customer two-account negative checks pass.
-- NEVER add this table to a public directory or unrestricted Realtime publication.
create table if not exists public.job_live_positions (
  job_id uuid primary key references public.xooter_jobs(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  xooter_id uuid not null references public.xooters(id) on delete cascade,
  latitude double precision not null check (latitude between -35.0 and -22.0),
  longitude double precision not null check (longitude between 16.0 and 33.5),
  accuracy_m double precision not null check (accuracy_m between 1 and 200),
  consented_at timestamptz not null,
  received_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.job_live_positions enable row level security;
-- Exposed 'public' schema is used only because service-role REST needs the table.
-- There are NO anon/authenticated RLS policies, including for SELECT.
revoke all on public.job_live_positions from public, anon, authenticated;
grant select, insert, update, delete on public.job_live_positions to service_role;
create index if not exists job_live_positions_expiry_idx
  on public.job_live_positions (expires_at);
create index if not exists job_live_positions_booking_idx
  on public.job_live_positions (booking_id);

-- Database-level backstop protects even a misconfigured service-role Edge Function
-- against published positions for cancelled, reassigned, completed, or unapproved jobs.
create or replace function public.validate_live_job_position()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
declare
  v_valid boolean;
begin
  if new.expires_at <= now() or new.expires_at > now() + interval '2 minutes'
    or new.received_at > now() + interval '5 seconds'
    or new.received_at < now() - interval '30 seconds'
    or new.consented_at > now() + interval '5 seconds'
    or new.consented_at < now() - interval '15 minutes' then
    raise exception 'location time window invalid' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    if new.job_id is distinct from old.job_id
      or new.booking_id is distinct from old.booking_id
      or new.xooter_id is distinct from old.xooter_id then
      raise exception 'location job identity immutable' using errcode = '23514';
    end if;
    if now() < old.received_at + interval '10 seconds' then
      raise exception 'location rate too high' using errcode = '23514';
    end if;
  end if;

  -- Row locks serialize publication with job reassignment and booking cancellation.
  select true into v_valid
  from public.xooter_jobs j
  join public.bookings b on b.id = j.booking_id
  join public.xooters x on x.id = j.xooter_id
  where j.id = new.job_id
    and j.booking_id = new.booking_id
    and j.xooter_id = new.xooter_id
    and j.state = 'accepted'
    and b.xooter_id = new.xooter_id
    and b.status::text in ('en_route', 'enroute')
    and b.cancelled_at is null
    and b.sensitive_data_revoked_at is null
    and x.active is true
    and x.background_check_status = 'approved'
  for update of j, b;
  if not coalesce(v_valid, false) then
    raise exception 'location job no longer eligible' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_live_job_position() from public, anon, authenticated;
drop trigger if exists job_live_positions_check_insert_update on public.job_live_positions;
create trigger job_live_positions_check_insert_update
before insert or update on public.job_live_positions
for each row execute function public.validate_live_job_position();

-- Delete the coordinate immediately as a booking exits the on-the-way state or
-- changes worker. A background TTL sweep still handles crashes/abandoned updates.
create or replace function public.purge_live_job_position_on_booking_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status::text not in ('en_route', 'enroute')
    or new.cancelled_at is not null
    or new.sensitive_data_revoked_at is not null
    or new.xooter_id is distinct from old.xooter_id then
    delete from public.job_live_positions where booking_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.purge_live_job_position_on_booking_change()
  from public, anon, authenticated;
drop trigger if exists purge_live_job_position_on_booking_change on public.bookings;
create trigger purge_live_job_position_on_booking_change
after update of status, cancelled_at, sensitive_data_revoked_at, xooter_id on public.bookings
for each row execute function public.purge_live_job_position_on_booking_change();

create or replace function public.purge_live_job_position_on_job_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.state <> 'accepted' or new.xooter_id is distinct from old.xooter_id then
    delete from public.job_live_positions where job_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.purge_live_job_position_on_job_change()
  from public, anon, authenticated;
drop trigger if exists purge_live_job_position_on_job_change on public.xooter_jobs;
create trigger purge_live_job_position_on_job_change
after update of state, xooter_id on public.xooter_jobs
for each row execute function public.purge_live_job_position_on_job_change();

comment on table public.job_live_positions is
  'Service-role-only, job-scoped, expiring, consented foreground worker GPS. No client grants or direct Realtime. Poll via authenticated edge access gate only.';
