-- Atomic delivery of the already rehearsed staging source. No history repair or ledger deletion.
-- Record the canonical version ONLY after its exact DDL executes in this same statement.
-- The hosting runner records this wrapper's own actual version separately.
do $worker_destination_delivery$
declare v_sql text;v_history_hash text;
begin
  perform pg_advisory_xact_lock(20261102,110);
  perform set_config('lock_timeout','5s',true);
  if exists(select from supabase_migrations.schema_migrations where version='20261102191938') then
    select encode(sha256(convert_to(replace(array_to_string(statements,E'\n'),E'\r\n',E'\n'),'UTF8')),'hex') into v_history_hash
      from supabase_migrations.schema_migrations where version='20261102191938' and name='current_accepted_worker_destinations' and cardinality(statements)=1;
    if v_history_hash is null or v_history_hash not in ('e1bc246a545ee7868aa89431a85313277c2db2a5012c85335498014e1b51a58d','070c7d8767364b65a45c8e285741efc2ee40b097625018337f8aaffcf309d8ee') then
      raise exception 'Unknown existing destination source history; explicit review required';
    end if;
  else
    v_sql := $worker_destination_source$-- Accepted workers can plan days ahead. Household access-code windows are unchanged.
-- Historical commission rosters are not current authorization after a replacement.
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
$worker_destination_source$;
    execute v_sql;
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261102191938','current_accepted_worker_destinations',array[v_sql]);
  end if;
  if not exists(select from pg_proc p where p.oid='public.get_xooter_job_cards_for_user(uuid)'::regprocedure
    and encode(sha256(convert_to(replace(p.prosrc,E'\r\n',E'\n'),'UTF8')),'hex')='c58fdc2c7d5a7235c23bdeb41110fcf3032d14764a370f40dce723472fe918c0'
    and p.prosecdef=false and p.proconfig=array['search_path=""']::text[]
    and not has_function_privilege('anon',p.oid,'execute')
    and not has_function_privilege('authenticated',p.oid,'execute')
    and has_function_privilege('service_role',p.oid,'execute')) then
    raise exception 'Destination source or service-only invoker privileges changed';
  end if;
end $worker_destination_delivery$;
