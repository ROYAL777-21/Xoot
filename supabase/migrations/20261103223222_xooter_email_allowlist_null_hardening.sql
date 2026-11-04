-- Forward-only worker allowlist repair. No policy enablement, resend, refill or receipt rewrite.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
-- Dispatcher operations take policy before journey/event locks. Take the policy's final DDL
-- lock up front, avoiding a lock upgrade after holding the event table.
lock table private.xooter_email_policy in access exclusive mode;
lock table private.xooter_journey_events in exclusive mode;
do $guard$
begin
  if (select count(*) from private.xooter_email_policy where id and not enabled)<>1 then
    raise exception 'Pause the worker email policy before allowlist delivery' using errcode='55000';
  end if;
  if exists(select from private.xooter_journey_events where email_state='claimed'
    or (email_dispatched_at is not null and email_finished_at is null)) then
    raise exception 'Reconcile active worker email before allowlist delivery' using errcode='55000';
  end if;
  if not exists(select from pg_proc p join pg_language l on l.oid=p.prolang
    where p.oid=to_regprocedure('public.authorize_xooter_journey_email(uuid,uuid,text)')
      and l.lanname='plpgsql' and p.prosecdef and p.proconfig=array['search_path=""']
      and p.proowner=(select oid from pg_roles where rolname='postgres')
      and not has_function_privilege('anon',p.oid,'execute')
      and not has_function_privilege('authenticated',p.oid,'execute')
      and has_function_privilege('service_role',p.oid,'execute')
      and encode(sha256(convert_to(replace(p.prosrc,E'\r\n',E'\n'),'UTF8')),'hex')
        ='4a94e45ce0dd6ff3892b6788356e0dc0bd48124133af86872b28d425ec55b9e3') then
    raise exception 'Unknown worker authorization source or authority; review before replacing' using errcode='55000';
  end if;
end $guard$;
alter table private.xooter_email_policy add constraint xooter_email_policy_allowlist_no_nulls
  check(array_position(allowed_user_ids,null::uuid) is null) not valid;
alter table private.xooter_email_policy validate constraint xooter_email_policy_allowlist_no_nulls;

-- CREATE OR REPLACE retains the existing function OID, owner, ABI and exact ACL.
create or replace function public.authorize_xooter_journey_email(p_id uuid,p_nonce uuid,p_project_ref text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare policy private.xooter_email_policy%rowtype; event private.xooter_journey_events%rowtype; actor uuid; recipient record;
begin
  select * into policy from private.xooter_email_policy where id for update;
  select user_id into actor from private.xooter_journey_events where id=p_id;
  perform 1 from private.xooter_journeys where user_id=actor for update;
  select * into event from private.xooter_journey_events where id=p_id for update;
  if not found or event.email_state<>'claimed' or event.email_nonce is distinct from p_nonce
    or event.email_dispatched_at is not null then return null;end if;
  if not policy.enabled or p_project_ref is distinct from policy.project_ref or (event.user_id=any(policy.allowed_user_ids)) is not true
    or policy.free_plan_reviewed_at is null or policy.free_plan_reviewed_at>clock_timestamp()
    or policy.free_plan_reviewed_at<clock_timestamp()-interval '7 days' or nullif(btrim(policy.free_plan_review_reference),'') is null
    or event.email_claimed_at<clock_timestamp()-interval '20 seconds' or not private.xooter_journey_email_eligible(event) then
    update private.xooter_journey_events set email_state='suppressed',email_finished_at=clock_timestamp() where id=p_id;
    return null;
  end if;
  select u.email,regexp_replace(split_part(coalesce(u.raw_user_meta_data->>'full_name',''),' ',1),'[^[:alpha:]''-]','','g') as first_name
    into recipient from auth.users u where u.id=event.user_id;
  update private.xooter_journey_events set email_dispatched_at=clock_timestamp() where id=p_id;
  return jsonb_build_object('id',event.id,'email',recipient.email,'first_name',left(recipient.first_name,40),
    'kind',event.kind,'title',event.title,'body',event.body,'route',event.route);
end $$;
commit;
