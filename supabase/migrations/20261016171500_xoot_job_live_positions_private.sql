begin;

-- Active job-scoped position only: no historical GPS trail, no public client access.
-- Coordinates are intentionally NOT published to Supabase Realtime.
-- Edge function xoot-job-location is the sole read/write boundary and rechecks job ownership.
create table if not exists public.xoot_job_live_positions (
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
