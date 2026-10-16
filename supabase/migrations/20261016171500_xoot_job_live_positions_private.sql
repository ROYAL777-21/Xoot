begin;

-- Active job-scoped position only: no historical GPS trail, no public client access.
-- Coordinates are intentionally NOT published to Supabase Realtime.
-- Edge function xoot-job-location is the sole read/write boundary and rechecks job ownership.
create table public.xoot_job_live_positions (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  xooter_id uuid not null references public.xooters(id) on delete cascade,
  latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180),
  accuracy_m numeric(6,1) not null check (accuracy_m > 0 and accuracy_m <= 200),
  recorded_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint xoot_job_live_positions_finite_lifetime
    check (expires_at > recorded_at and expires_at <= recorded_at + interval '90 seconds')
);

create index if not exists xoot_job_live_positions_expiry
  on public.xoot_job_live_positions (expires_at);

alter table public.xoot_job_live_positions enable row level security;

-- RLS intentionally has NO policies for anon/authenticated. Only the Edge service
-- key may access the row, after verifying Supabase JWT, worker ownership, accepted
-- job, matching booking assignment, active en-route status and explicit consent.
revoke all on table public.xoot_job_live_positions from public, anon, authenticated;
grant select, insert, update, delete on table public.xoot_job_live_positions to service_role;

comment on table public.xoot_job_live_positions is
  'Live active-job Xooter GPS only. Service-only, no direct client/RLS policies. '
  'Expiry <=90 seconds, never in Realtime publication. Clear upon stop/cancel/reassignment; '
  'authorised reads additionally reject stale/cancelled jobs. Retention cleared every minute.';

-- Cancelled, reassigned and completed bookings must clear positions immediately, not
-- rely only on the TTL. This trigger runs with DB privileges after the protected
-- booking status change, never with arbitrary client-supplied actor IDs.
create or replace function private.xoot_clear_live_location_on_booking_update()
returns trigger language plpgsql security definer set search_path = '' as $
begin
  if new.status::text not in ('en_route','enroute')
    or new.xooter_id is distinct from old.xooter_id
    or new.cancelled_at is not null
    or new.completed_at is not null
    or new.sensitive_data_revoked_at is not null
  then
    delete from public.xoot_job_live_positions where booking_id = new.id;
  end if;
  return new;
end;
$;
revoke all on function private.xoot_clear_live_location_on_booking_update() from public, anon, authenticated;
create trigger xoot_remove_location_on_booking_change
after update of status,xooter_id,cancelled_at,completed_at,sensitive_data_revoked_at
on public.bookings for each row
execute function private.xoot_clear_live_location_on_booking_update();

-- A worker unassignment may be represented in xooter_jobs before bookings is
-- updated. Remove the old job's position at that point as well.
create or replace function private.xoot_clear_live_location_on_job_change()
returns trigger language plpgsql security definer set search_path = '' as $
begin
  if tg_op = 'DELETE' then
    if old.state = 'accepted' then
      delete from public.xoot_job_live_positions
        where booking_id = old.booking_id and xooter_id = old.xooter_id;
    end if;
    return old;
  end if;
  if old.state = 'accepted' and (
    new.state is distinct from old.state
    or new.xooter_id is distinct from old.xooter_id
    or new.booking_id is distinct from old.booking_id
  ) then
    delete from public.xoot_job_live_positions
      where booking_id = old.booking_id and xooter_id = old.xooter_id;
  end if;
  return new;
end;
$;
revoke all on function private.xoot_clear_live_location_on_job_change() from public, anon, authenticated;
create trigger xoot_remove_location_on_job_change
after update or delete on public.xooter_jobs for each row
execute function private.xoot_clear_live_location_on_job_change();

-- Physical deletion, not merely filtering stale rows at read time. Both existing Xoot
-- projects have pg_cron installed. Abort the migration on a fresh project without it.
do $xoot_cleanup$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron must be installed for short-lived GPS retention';
  end if;
  if not exists (select 1 from cron.job where jobname = 'xoot-live-location-expiry') then
    perform cron.schedule(
      'xoot-live-location-expiry',
      '* * * * *',
      $job$delete from public.xoot_job_live_positions where expires_at <= now()$job$
    );
  end if;
end;
$xoot_cleanup$;

commit;
