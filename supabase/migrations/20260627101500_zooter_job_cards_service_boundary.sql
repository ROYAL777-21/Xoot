-- Move privileged Zooter job-card reads behind an Edge Function boundary.
-- The public SECURITY DEFINER RPCs are service-role only so browser/mobile
-- clients cannot call privileged database functions directly.

create or replace function public.get_accepted_zooter_job_destinations_for_user(
  p_user_id uuid,
  p_job_ids uuid[]
) returns table (
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
  where p_user_id is not null
    and zj.id = any(coalesce(p_job_ids, array[]::uuid[]))
    and z.user_id = p_user_id
    and zj.state = 'accepted'
    and coalesce(b.status::text, '') not in ('cancelled', 'completed', 'rated')
    and b.cancelled_at is null
    and nullif(btrim(b.address), '') is not null;
$$;

comment on function public.get_accepted_zooter_job_destinations_for_user(uuid, uuid[])
  is 'Service-role RPC for Edge Functions. Returns accepted job destinations for the supplied authenticated Zooter user id only.';

revoke all on function public.get_accepted_zooter_job_destinations_for_user(uuid, uuid[]) from public;
revoke all on function public.get_accepted_zooter_job_destinations_for_user(uuid, uuid[]) from anon;
revoke all on function public.get_accepted_zooter_job_destinations_for_user(uuid, uuid[]) from authenticated;
grant execute on function public.get_accepted_zooter_job_destinations_for_user(uuid, uuid[]) to service_role;

create or replace function public.get_zooter_job_cards_for_user(
  p_user_id uuid
) returns table (
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
  where p_user_id is not null
    and z.user_id = p_user_id
  order by zj.offered_at desc;
$$;

comment on function public.get_zooter_job_cards_for_user(uuid)
  is 'Service-role RPC for Edge Functions. Returns safe Zooter job-card fields for the supplied authenticated user id; destination_address is populated only after acceptance.';

revoke all on function public.get_zooter_job_cards_for_user(uuid) from public;
revoke all on function public.get_zooter_job_cards_for_user(uuid) from anon;
revoke all on function public.get_zooter_job_cards_for_user(uuid) from authenticated;
grant execute on function public.get_zooter_job_cards_for_user(uuid) to service_role;

revoke all on function public.get_accepted_zooter_job_destinations(uuid[]) from public;
revoke all on function public.get_accepted_zooter_job_destinations(uuid[]) from anon;
revoke all on function public.get_accepted_zooter_job_destinations(uuid[]) from authenticated;
grant execute on function public.get_accepted_zooter_job_destinations(uuid[]) to service_role;

revoke all on function public.get_zooter_job_cards() from public;
revoke all on function public.get_zooter_job_cards() from anon;
revoke all on function public.get_zooter_job_cards() from authenticated;
grant execute on function public.get_zooter_job_cards() to service_role;

comment on function public.get_accepted_zooter_job_destinations(uuid[])
  is 'Deprecated service-role-only compatibility RPC. Browser and mobile clients must call get-zooter-job-cards Edge Function instead.';

comment on function public.get_zooter_job_cards()
  is 'Deprecated service-role-only compatibility RPC. Browser and mobile clients must call get-zooter-job-cards Edge Function instead.';
