-- Accepted workers can plan days ahead. Household access-code windows are unchanged.
-- Historical commission rosters are not current authorization after a replacement.
begin;
set local lock_timeout='5s';set local statement_timeout='60s';
do $guard$
begin
  if (select encode(pg_catalog.sha256(pg_catalog.convert_to(regexp_replace(p.prosrc,E'\r\n',E'\n','g'),'UTF8')),'hex')
    from pg_proc p where p.oid='public.get_xooter_job_cards_for_user(uuid)'::regprocedure)
    not in ('a2af0a13223b3fccc8c33c4132ce3f9ad4cbf5b2c34115a33cd50c987b6f4c03',
      '15dda51fc42e0db10abe5d1b89242960753ed4143643aaf55af9f06b8cfbaaea') then
    raise exception 'Unknown job-card source; review before replacing';
  end if;
  if not (has_schema_privilege('service_role','public','usage')
    and has_table_privilege('service_role','public.bookings','select')
    and has_table_privilege('service_role','public.xooter_jobs','select')
    and has_table_privilege('service_role','public.xooters','select')
    and has_table_privilege('service_role','public.booking_assignees','select')) then
    raise exception 'Service read authority missing';
  end if;
end $guard$;

create or replace function public.get_xooter_job_cards_for_user(p_user_id uuid)
returns table(job_id uuid, booking_id uuid, xooter_id uuid, state text,
  offered_at timestamptz, responded_at timestamptz, decline_reason text,
  service text, service_type text, scheduled_at timestamptz, price numeric,
  duration_hours numeric, status text, job_completed_at timestamptz, completed_at timestamptz,
  cancelled_at timestamptz, sensitive_data_revoked_at timestamptz,
  sensitive_access_available_notified_at timestamptz, user_id uuid, destination_address text)
language sql stable security invoker set search_path='' as $function$
  select xj.id, b.id, xj.xooter_id, xj.state, xj.offered_at, xj.responded_at, xj.decline_reason,
    b.service::text, b.service_type::text, b.scheduled_at, b.price, b.duration_hours,
    b.status::text, b.job_completed_at, b.completed_at, b.cancelled_at,
    b.sensitive_data_revoked_at, b.sensitive_access_available_notified_at, b.user_id,
    case when xj.state='accepted' and x.active
      and b.status::text in ('pending','confirmed','assigned','contractor_accepted','en_route','enroute','arrived','checked_in','in_progress')
      and b.cancelled_at is null and b.completed_at is null and b.job_completed_at is null
      and b.sensitive_data_revoked_at is null
      and (b.xooter_id=xj.xooter_id or (
        b.crew_size between 2 and 4
        and b.original_xooter_id is not null and b.xooter_id=b.original_xooter_id
        and b.was_reassigned is false and b.replacement_count=0
        and exists(select from public.booking_assignees ba where ba.booking_id=b.id and ba.xooter_id=xj.xooter_id)
        and exists(select from public.booking_assignees lead where lead.booking_id=b.id and lead.xooter_id=b.xooter_id)
        and (select count(*) from public.booking_assignees roster where roster.booking_id=b.id)=b.crew_size
      )) then nullif(btrim(b.address),'') else null end
  from public.xooter_jobs xj
  join public.xooters x on x.id=xj.xooter_id
  join public.bookings b on b.id=xj.booking_id
  where p_user_id is not null and x.user_id=p_user_id
  order by xj.offered_at desc;
$function$;
revoke all on function public.get_xooter_job_cards_for_user(uuid) from public,anon,authenticated;
grant execute on function public.get_xooter_job_cards_for_user(uuid) to service_role;
comment on function public.get_xooter_job_cards_for_user(uuid) is
  'Service-only, invoker job cards. Destination available immediately after acceptance for the current active primary or complete original never-replaced crew, with revocation/terminal checks. Historical crew access closes after replacement. No scheduled-time cutoff or household codes.';
commit;
