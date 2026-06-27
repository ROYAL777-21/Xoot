-- Returns booking destinations only after the authenticated Zooter accepts the job.
-- The offer list intentionally omits addresses so a browser cannot receive them before acceptance.
alter table public.zooter_jobs
  add column if not exists offered_at timestamptz not null default now(),
  add column if not exists responded_at timestamptz,
  add column if not exists decline_reason text;

create or replace function public.get_accepted_zooter_job_destinations(p_job_ids uuid[])
returns table (
  job_id uuid,
  booking_id uuid,
  address text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    zj.id as job_id,
    b.id as booking_id,
    nullif(btrim(b.address), '') as address
  from public.zooter_jobs zj
  join public.zooters z on z.id = zj.zooter_id
  join public.bookings b on b.id = zj.booking_id
  where zj.id = any(coalesce(p_job_ids, array[]::uuid[]))
    and z.user_id = auth.uid()
    and zj.state = 'accepted'
    and coalesce(b.status::text, '') not in ('cancelled', 'completed', 'rated')
    and b.cancelled_at is null
    and nullif(btrim(b.address), '') is not null;
$$;

revoke all on function public.get_accepted_zooter_job_destinations(uuid[]) from public;
revoke all on function public.get_accepted_zooter_job_destinations(uuid[]) from anon;
grant execute on function public.get_accepted_zooter_job_destinations(uuid[]) to authenticated;

comment on function public.get_accepted_zooter_job_destinations(uuid[])
  is 'Returns a booking destination only to the authenticated Zooter after their zooter_jobs row is accepted; offer cards and completed/cancelled jobs do not expose the address.';

-- Safe card feed for the Zooter Jobs page. This avoids browser-side joins against public.bookings.
create or replace function public.get_zooter_job_cards()
returns table (
  job_id uuid,
  booking_id uuid,
  zooter_id uuid,
  state text,
  offered_at timestamptz,
  responded_at timestamptz,
  decline_reason text,
  service text,
  service_type text,
  scheduled_at timestamptz,
  price numeric,
  duration_hours numeric,
  status text,
  job_completed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  sensitive_data_revoked_at timestamptz,
  sensitive_access_available_notified_at timestamptz,
  user_id uuid,
  destination_address text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    zj.id as job_id,
    b.id as booking_id,
    zj.zooter_id,
    zj.state,
    zj.offered_at,
    zj.responded_at,
    zj.decline_reason,
    b.service::text,
    b.service_type::text,
    b.scheduled_at,
    b.price,
    b.duration_hours,
    b.status::text,
    b.job_completed_at,
    b.completed_at,
    b.cancelled_at,
    b.sensitive_data_revoked_at,
    b.sensitive_access_available_notified_at,
    b.user_id,
    case
      when zj.state = 'accepted'
        and coalesce(b.status::text, '') not in ('cancelled', 'completed', 'rated')
        and b.cancelled_at is null
      then nullif(btrim(b.address), '')
      else null
    end as destination_address
  from public.zooter_jobs zj
  join public.zooters z on z.id = zj.zooter_id
  join public.bookings b on b.id = zj.booking_id
  where z.user_id = auth.uid()
  order by zj.offered_at desc;
$$;

revoke all on function public.get_zooter_job_cards() from public;
revoke all on function public.get_zooter_job_cards() from anon;
grant execute on function public.get_zooter_job_cards() to authenticated;

comment on function public.get_zooter_job_cards()
  is 'Returns safe Zooter job-card fields for the authenticated Zooter; destination_address is populated only after acceptance and never for completed or cancelled bookings.';

drop policy if exists "bookings_participant_read" on public.bookings;
create policy "bookings_participant_read"
  on public.bookings for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.has_role((select auth.uid()), 'admin'::app_role)
    or exists (
      select 1
      from public.zooter_jobs zj
      join public.zooters z on z.id = zj.zooter_id
      where zj.booking_id = bookings.id
        and z.user_id = (select auth.uid())
        and zj.state = 'accepted'
    )
  );

comment on policy "bookings_participant_read" on public.bookings
  is 'Clients read their own bookings, admins read all bookings, and Zooters can directly read booking rows only after accepting the assigned job; offer cards use get_zooter_job_cards instead.';
