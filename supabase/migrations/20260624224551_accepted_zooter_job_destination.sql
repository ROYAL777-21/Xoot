-- Returns booking destinations only after the authenticated Zooter accepts the job.
-- The offer list intentionally omits addresses so a browser cannot receive them before acceptance.
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
