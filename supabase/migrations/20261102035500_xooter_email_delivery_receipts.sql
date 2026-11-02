-- Closed, one-time lifecycle-email evaluation. No provider call, schedule or budget renewal.
begin;
set local lock_timeout='5s';set local statement_timeout='60s';
alter table private.xooter_journey_events
  add column email_nonce uuid,
  add column email_claimed_at timestamptz,
  add column email_dispatched_at timestamptz,
  add column email_finished_at timestamptz,
  add column smtp_message_id text unique;
create table private.xooter_email_policy (
  id boolean primary key default true check(id),
  enabled boolean not null default false,
  project_ref text check(project_ref in ('fxmxyabdjqviqbcxmvlp','mvlrkelahhsyjrwgsxaf')),
  allowed_user_ids uuid[] not null default '{}',
  free_plan_reviewed_at timestamptz,
  free_plan_review_reference text,
  maximum integer not null default 20 check(maximum between 1 and 20),
  used integer not null default 0 check(used between 0 and maximum)
);
insert into private.xooter_email_policy(id) values(true);
alter table private.xooter_email_policy enable row level security;
revoke all on private.xooter_email_policy from public,anon,authenticated,service_role;

create function private.xooter_journey_email_eligible(e private.xooter_journey_events) returns boolean
language sql stable security invoker set search_path='' as $$
  select exists(select from auth.users u where u.id=e.user_id and u.email_confirmed_at is not null and u.email is not null
    and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp()))
    and exists(select from private.xooter_communication_preferences p where p.user_id=e.user_id and p.email_updates
      and (e.kind not in ('xooter_continue_24h','xooter_continue_72h') or (p.onboarding_reminders and p.revision>0)))
    -- Optional retention/promotional email remains closed until a reviewed unsubscribe/campaign path.
    and not e.optional
    and case e.kind
      when 'xooter_welcome' then true
      when 'xooter_application_received' then exists(select from public.xooter_applications a where a.user_id=e.user_id and a.status='submitted')
      when 'xooter_application_attention' then exists(select from public.xooter_applications a where a.user_id=e.user_id and a.status='rejected')
      when 'xooter_onboarding_complete' then private.xooter_journey_ready(e.user_id)
      when 'xooter_continue_24h' then not exists(select from public.xooter_applications a where a.user_id=e.user_id and a.status<>'draft')
      when 'xooter_continue_72h' then not exists(select from public.xooter_applications a where a.user_id=e.user_id and a.status<>'draft')
      else false end;
$$;
revoke all on function private.xooter_journey_email_eligible(private.xooter_journey_events) from public,anon,authenticated,service_role;

create function public.xooter_email_worker_authorized() returns boolean
language sql stable security invoker set search_path='' as $$select current_user='service_role'$$;
revoke all on function public.xooter_email_worker_authorized() from public,anon,authenticated;
grant execute on function public.xooter_email_worker_authorized() to service_role;

create function public.claim_xooter_journey_email(p_project_ref text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare policy private.xooter_email_policy%rowtype; candidate record; event private.xooter_journey_events%rowtype;
begin
  select * into policy from private.xooter_email_policy where id for update;
  if not policy.enabled or p_project_ref is distinct from policy.project_ref or policy.used>=policy.maximum
    or policy.free_plan_reviewed_at is null or policy.free_plan_reviewed_at>clock_timestamp()
    or policy.free_plan_reviewed_at<clock_timestamp()-interval '7 days' or nullif(btrim(policy.free_plan_review_reference),'') is null
    or exists(select from private.xooter_journey_events where email_state='claimed') then return null;end if;
  for candidate in select id,user_id from private.xooter_journey_events
    where email_state='queued' and user_id=any(policy.allowed_user_ids) order by created_at,id limit 100 loop
    -- Same order as enrolment/preferences/trigger: journey before an existing event row.
    perform 1 from private.xooter_journeys where user_id=candidate.user_id for update;
    select * into event from private.xooter_journey_events where id=candidate.id for update;
    if event.email_state<>'queued' then continue;end if;
    if not private.xooter_journey_email_eligible(event) or event.created_at<clock_timestamp()-interval '7 days' then
      update private.xooter_journey_events set email_state='suppressed',email_finished_at=clock_timestamp() where id=event.id;
      continue;
    end if;
    if event.kind like 'xooter_continue_%' and extract(hour from clock_timestamp() at time zone 'Africa/Johannesburg') not between 7 and 20 then continue;end if;
    update private.xooter_journey_events set email_state='claimed',email_nonce=gen_random_uuid(),email_claimed_at=clock_timestamp()
      where id=event.id returning * into event;
    update private.xooter_email_policy set used=used+1 where id;
    return jsonb_build_object('id',event.id,'nonce',event.email_nonce);
  end loop;
  return null;
end $$;
revoke all on function public.claim_xooter_journey_email(text) from public,anon,authenticated;
grant execute on function public.claim_xooter_journey_email(text) to service_role;

create function public.authorize_xooter_journey_email(p_id uuid,p_nonce uuid,p_project_ref text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare policy private.xooter_email_policy%rowtype; event private.xooter_journey_events%rowtype; actor uuid; recipient record;
begin
  select * into policy from private.xooter_email_policy where id for update;
  select user_id into actor from private.xooter_journey_events where id=p_id;
  perform 1 from private.xooter_journeys where user_id=actor for update;
  select * into event from private.xooter_journey_events where id=p_id for update;
  if not found or event.email_state<>'claimed' or event.email_nonce is distinct from p_nonce
    or event.email_dispatched_at is not null then return null;end if;
  if not policy.enabled or p_project_ref is distinct from policy.project_ref or not(event.user_id=any(policy.allowed_user_ids))
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
revoke all on function public.authorize_xooter_journey_email(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.authorize_xooter_journey_email(uuid,uuid,text) to service_role;

create function public.finish_xooter_journey_email(p_id uuid,p_nonce uuid,p_state text,p_message_id text default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare event private.xooter_journey_events%rowtype; actor uuid;
begin
  if p_state is null or p_state not in ('accepted','uncertain','failed') or
    (p_state='accepted' and (p_message_id is null or length(p_message_id) not between 1 and 200 or p_message_id~'[[:cntrl:]]'))
    or (p_state<>'accepted' and p_message_id is not null) then raise exception 'Invalid email result' using errcode='22023';end if;
  perform 1 from private.xooter_email_policy where id for update;
  select user_id into actor from private.xooter_journey_events where id=p_id;
  perform 1 from private.xooter_journeys where user_id=actor for update;
  select * into event from private.xooter_journey_events where id=p_id for update;
  if not found or event.email_state<>'claimed' or event.email_nonce is distinct from p_nonce then return false;end if;
  if p_state='accepted' and event.email_dispatched_at is null then raise exception 'No email dispatch authorized' using errcode='22023';end if;
  update private.xooter_journey_events set email_state=p_state,smtp_message_id=p_message_id,email_finished_at=clock_timestamp() where id=p_id;
  update public.integration_outbox set status=case when p_state='accepted' then 'processed' else 'failed' end,
    processed_at=case when p_state='accepted' then clock_timestamp() else null end,
    failure_mode=case when p_state='accepted' then null else 'Lifecycle email needs manual reconciliation; never automatically resend.' end
    where id=event.outbox_id and source_table='xooter_journey_events' and source_id=event.id;
  return true;
end $$;
revoke all on function public.finish_xooter_journey_email(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.finish_xooter_journey_email(uuid,uuid,text,text) to service_role;
commit;
