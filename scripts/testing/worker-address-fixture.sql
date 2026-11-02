-- Disposable identities/addresses only. Old body matches the inspected production source.
create role anon;create role authenticated;create role service_role bypassrls;
create table public.xooters(id uuid primary key,user_id uuid,active boolean not null default true);
create table public.bookings(id uuid primary key,xooter_id uuid,crew_size integer default 1,user_id uuid,
 service text,service_type text,scheduled_at timestamptz,price numeric,duration_hours numeric,status text,
 job_completed_at timestamptz,completed_at timestamptz,cancelled_at timestamptz,
 sensitive_data_revoked_at timestamptz,sensitive_access_available_notified_at timestamptz,address text);
create table public.xooter_jobs(id uuid primary key,booking_id uuid,xooter_id uuid,state text,offered_at timestamptz,responded_at timestamptz,decline_reason text);
create table public.booking_assignees(booking_id uuid,xooter_id uuid,unique(booking_id,xooter_id));
grant usage on schema public to service_role;
grant select on all tables in schema public to service_role;
create function public.get_xooter_job_cards_for_user(p_user_id uuid)
returns table(job_id uuid,booking_id uuid,xooter_id uuid,state text,offered_at timestamptz,responded_at timestamptz,decline_reason text,
service text,service_type text,scheduled_at timestamptz,price numeric,duration_hours numeric,status text,job_completed_at timestamptz,
completed_at timestamptz,cancelled_at timestamptz,sensitive_data_revoked_at timestamptz,sensitive_access_available_notified_at timestamptz,user_id uuid,destination_address text)
language sql stable security definer set search_path='public','pg_temp' as $function$
  select xj.id, b.id, xj.xooter_id, xj.state, xj.offered_at, xj.responded_at, xj.decline_reason,
         b.service::text, b.service_type::text, b.scheduled_at, b.price, b.duration_hours,
         b.status::text, b.job_completed_at, b.completed_at, b.cancelled_at,
         b.sensitive_data_revoked_at, b.sensitive_access_available_notified_at, b.user_id,
         case when xj.state = 'accepted'
              and coalesce(b.status::text, '') not in ('cancelled', 'completed', 'rated')
              and b.cancelled_at is null
           then nullif(btrim(b.address), '') else null end
  from public.xooter_jobs xj
  join public.xooters x on x.id = xj.xooter_id
  join public.bookings b on b.id = xj.booking_id
  where p_user_id is not null and x.user_id = p_user_id
  order by xj.offered_at desc;
$function$;
revoke all on function public.get_xooter_job_cards_for_user(uuid) from public,anon,authenticated;
grant execute on function public.get_xooter_job_cards_for_user(uuid) to service_role;
