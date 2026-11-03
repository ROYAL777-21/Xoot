-- Closed notification schema only. No send, schedule, allowlist, budget refill or worker activation.
-- Each canonical history entry records only SQL just executed in this atomic statement.
-- Original staging sources remain immutable; one production outbox assertion adaptation is explicit.
do $closed_xooter_notifications$
declare v_existing integer;v_sql text;v_history text;expected record;role_name text;table_name text;
begin
  perform set_config('lock_timeout','5s',true);
  perform pg_advisory_xact_lock(20261102,108);
  select count(*) into v_existing from supabase_migrations.schema_migrations where version in ('20261102082500','20261102082516','20261102165153');
  if v_existing not in (0,3) then raise exception 'Partial notification history requires explicit review';end if;
  if v_existing=0 and (to_regclass('private.xooter_journeys') is not null or to_regclass('private.xooter_communication_preferences') is not null
    or to_regclass('private.xooter_journey_events') is not null or to_regclass('private.xooter_email_policy') is not null
    or to_regprocedure('public.manage_xooter_communications(text,jsonb,integer)') is not null
    or to_regprocedure('public.claim_xooter_journey_email(text)') is not null) then
    raise exception 'Unrecorded notification objects must not be overwritten or stamped';
  end if;
  -- 20261102082500_xooter_notification_journey.sql; immutable source SHA256 82ea0fc77d11c67e2061b2702c0091d84e6d31fe88340a3345a4c1e5ee3419ed
  -- Actual executed SHA256 d263ff435597a5034474e5dbb82517bde328eb92f795d74b77960cd8bcf91968
  if v_existing=0 then
    v_sql := $notification_source_20261102082500$-- Authenticated, consent-aware Xooter notifications. No email sender or role activation opens.
set local lock_timeout='5s';
set local statement_timeout='60s';

create table private.xooter_journeys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default clock_timestamp(),
  approved_at timestamptz,
  status_revision integer not null default 0 check(status_revision>=0)
);
create table private.xooter_communication_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_updates boolean not null default true,
  onboarding_reminders boolean not null default true,
  tips boolean not null default false,
  promotions boolean not null default false,
  tips_consented_at timestamptz,
  promotions_consented_at timestamptz,
  consent_version text not null default 'xoot-xooter-communications-v1',
  revision integer not null default 0 check(revision>=0),
  updated_at timestamptz not null default clock_timestamp(),
  check(tips=(tips_consented_at is not null)),
  check(promotions=(promotions_consented_at is not null))
);
create table private.xooter_journey_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null check(length(event_key) between 1 and 160),
  kind text not null check(kind in ('xooter_welcome','xooter_continue_24h','xooter_continue_72h',
    'xooter_application_received','xooter_application_attention','xooter_onboarding_complete',
    'xooter_tip_profile','xooter_tip_customers','xooter_return')),
  title text not null,
  body text not null,
  route text not null,
  optional boolean not null,
  notification_id uuid references public.notifications(id) on delete set null,
  outbox_id uuid references public.integration_outbox(id) on delete set null,
  email_state text not null default 'queued' check(email_state in ('queued','claimed','accepted','uncertain','failed','suppressed')),
  created_at timestamptz not null default clock_timestamp(),
  unique(user_id,event_key)
);
create index xooter_journey_events_optional_recent on private.xooter_journey_events(user_id,created_at desc) where optional;
create index xooter_journey_events_email_queue on private.xooter_journey_events(created_at,id) where email_state='queued';
alter table private.xooter_journeys enable row level security;
alter table private.xooter_communication_preferences enable row level security;
alter table private.xooter_journey_events enable row level security;
revoke all on private.xooter_journeys,private.xooter_communication_preferences,private.xooter_journey_events
  from public,anon,authenticated,service_role;

create function private.xooter_journey_ready(p_user uuid) returns boolean
language sql stable security invoker set search_path='' as $$
  select exists(select from public.xooter_applications a where a.user_id=p_user and a.status='approved')
    and exists(select from public.xooters x where x.user_id=p_user and x.active)
    and exists(select from public.user_roles r where r.user_id=p_user and r.role::text='xooter');
$$;
revoke all on function private.xooter_journey_ready(uuid) from public,anon,authenticated,service_role;

create function private.emit_xooter_journey(p_user uuid,p_kind text,p_key text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare copy jsonb; event_id uuid; note_id uuid; queue_id uuid; is_optional boolean;
begin
  -- All callers must already hold this account's journey row lock, including cron and triggers.
  if not exists(select from auth.users u where u.id=p_user and u.email_confirmed_at is not null
    and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp())) then return false;end if;
  is_optional:=p_kind in ('xooter_tip_profile','xooter_tip_customers','xooter_return');
  if is_optional and (not exists(select from private.xooter_communication_preferences p where p.user_id=p_user and p.tips)
    or exists(select from private.xooter_journey_events e where e.user_id=p_user and e.optional
      and e.created_at>clock_timestamp()-interval '7 days')) then return false;end if;
  copy:=case p_kind
    when 'xooter_welcome' then jsonb_build_array('Welcome to Xoot','Your Xooter journey starts here. Add your experience and complete the checks at your pace.','/xooter/apply')
    when 'xooter_continue_24h' then jsonb_build_array('Your next step is saved','Continue your Xooter application when you are ready. Your progress is waiting in Xoot.','/xooter/apply')
    when 'xooter_continue_72h' then jsonb_build_array('A little closer to your first visit','Finish your application to send it for review. Need a hand? Contact Xoot support from your account.','/xooter/apply')
    when 'xooter_application_received' then jsonb_build_array('Application received','Thank you for completing your application. Your checks are under review; this is not approval to take jobs yet.','/xooter/kyc')
    when 'xooter_application_attention' then jsonb_build_array('Your application needs a small update','Open your private application for the review notes and the next step.','/xooter/kyc')
    when 'xooter_onboarding_complete' then jsonb_build_array('Your onboarding is complete','Your Xooter account is approved. Open your dashboard to manage availability and see eligible opportunities.','/xooter')
    when 'xooter_tip_profile' then jsonb_build_array('Help customers get to know you','Keep your profile photo, experience and availability current. Accurate details help customers choose a good fit.','/xooter/profile')
    when 'xooter_tip_customers' then jsonb_build_array('Small details make a thoughtful visit','Check the visit checklist, arrive on time and keep customer messages inside Xoot. Ask for honest feedback after the visit.','/xooter/training')
    when 'xooter_return' then jsonb_build_array('Ready when you are','If you would like to take more visits, review your availability and keep your profile current.','/xooter')
    else null end;
  if copy is null then raise exception 'Unknown Xooter journey event' using errcode='22023';end if;
  insert into private.xooter_journey_events(user_id,event_key,kind,title,body,route,optional)
    values(p_user,p_key,p_kind,copy->>0,copy->>1,copy->>2,is_optional)
    on conflict(user_id,event_key) do nothing returning id into event_id;
  if event_id is null then return false;end if;
  insert into public.notifications(user_id,kind,title,body,link)
    values(p_user,p_kind,copy->>0,copy->>1,copy->>2) returning id into note_id;
  -- Only this private event identity may drive the new sender. No application email/notes are copied.
  insert into public.integration_outbox(source_table,source_id,event_type,channel,owner,stack_tool,payload,status,approval_required,created_by)
    values('xooter_journey_events',event_id,p_kind,'brevo_email','Contractor Success','Xoot lifecycle email',
      jsonb_build_object('journey_event_id',event_id),'queued',false,p_user) returning id into queue_id;
  update private.xooter_journey_events set notification_id=note_id,outbox_id=queue_id where id=event_id;
  return true;
end $$;
revoke all on function private.emit_xooter_journey(uuid,text,text) from public,anon,authenticated,service_role;

create function private.start_xooter_journey(p_user uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
  insert into private.xooter_journeys(user_id) values(p_user) on conflict do nothing;
  perform 1 from private.xooter_journeys where user_id=p_user for update;
  insert into private.xooter_communication_preferences(user_id) values(p_user) on conflict do nothing;
  perform private.emit_xooter_journey(p_user,'xooter_welcome','welcome');
end $$;
revoke all on function private.start_xooter_journey(uuid) from public,anon,authenticated,service_role;

create function public.manage_xooter_communications(p_action text,p_preferences jsonb default null,p_revision integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); pref private.xooter_communication_preferences%rowtype; key text;
begin
  if actor is null or not exists(select from auth.users u where u.id=actor and u.email_confirmed_at is not null
    and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp())) then
    raise exception 'Confirmed account required' using errcode='42501';end if;
  if p_action is null or p_action not in ('start','get','save') then raise exception 'Invalid preferences action' using errcode='22023';end if;
  if p_action='start' then perform private.start_xooter_journey(actor);
  elsif not exists(select from private.xooter_journeys where user_id=actor) then
    raise exception 'Start your Xooter journey first' using errcode='22023';end if;
  perform 1 from private.xooter_journeys where user_id=actor for update;
  select * into pref from private.xooter_communication_preferences where user_id=actor for update;
  if p_action='save' then
    if p_preferences is null or jsonb_typeof(p_preferences)<>'object' or
      (select count(*) from jsonb_object_keys(p_preferences))<>4 then raise exception 'Complete preferences required' using errcode='22023';end if;
    foreach key in array array['email_updates','onboarding_reminders','tips','promotions'] loop
      if jsonb_typeof(p_preferences->key) is distinct from 'boolean' then raise exception 'Boolean preferences required' using errcode='22023';end if;
    end loop;
    if p_revision is distinct from pref.revision then raise exception 'Preferences changed; reload before saving' using errcode='40001';end if;
    update private.xooter_communication_preferences set email_updates=(p_preferences->>'email_updates')::boolean,
      onboarding_reminders=(p_preferences->>'onboarding_reminders')::boolean,tips=(p_preferences->>'tips')::boolean,
      promotions=(p_preferences->>'promotions')::boolean,
      tips_consented_at=case when (p_preferences->>'tips')::boolean then coalesce(tips_consented_at,clock_timestamp()) else null end,
      promotions_consented_at=case when (p_preferences->>'promotions')::boolean then coalesce(promotions_consented_at,clock_timestamp()) else null end,
      revision=revision+1,updated_at=clock_timestamp() where user_id=actor returning * into pref;
  end if;
  return jsonb_build_object('email_updates',pref.email_updates,'onboarding_reminders',pref.onboarding_reminders,
    'tips',pref.tips,'promotions',pref.promotions,'revision',pref.revision);
end $$;
revoke all on function public.manage_xooter_communications(text,jsonb,integer) from public,anon,service_role;
grant execute on function public.manage_xooter_communications(text,jsonb,integer) to authenticated;

create function private.xooter_application_journey() returns trigger
language plpgsql security definer set search_path='' as $$
declare revision integer;
begin
  if tg_table_schema<>'public' or tg_table_name<>'xooter_applications' or tg_when<>'AFTER' or tg_level<>'ROW' then
    raise exception 'Invalid application journey context' using errcode='42501';end if;
  if tg_op='UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'Application owner is immutable' using errcode='22023';end if;
  perform private.start_xooter_journey(new.user_id);
  if tg_op='INSERT' or new.status is distinct from old.status then
    update private.xooter_journeys set status_revision=status_revision+1 where user_id=new.user_id returning status_revision into revision;
    if new.status='submitted' then
      perform private.emit_xooter_journey(new.user_id,'xooter_application_received','status:'||revision::text);
    elsif new.status='rejected' then
      perform private.emit_xooter_journey(new.user_id,'xooter_application_attention','status:'||revision::text);
    end if;
  end if;
  return new;
end $$;
revoke all on function private.xooter_application_journey() from public,anon,authenticated,service_role;
create trigger xooter_application_journey after insert or update on public.xooter_applications
  for each row execute function private.xooter_application_journey();

create function private.collect_xooter_journeys(p_now timestamptz default clock_timestamp()) returns integer
language plpgsql security definer set search_path='' as $$
declare actor_row record; candidate record; emitted integer:=0; ready boolean;
begin
  -- In-app reminders are also deferred during Johannesburg quiet hours; no browser clock is trusted.
  if p_now is null or extract(hour from p_now at time zone 'Africa/Johannesburg') not between 7 and 20 then return 0;end if;
  for actor_row in select j.user_id from private.xooter_journeys j join auth.users u on u.id=j.user_id
    join private.xooter_communication_preferences p on p.user_id=j.user_id
    where u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp())
      and (
        (private.xooter_journey_ready(j.user_id) and not exists(select from private.xooter_journey_events e where e.user_id=j.user_id and e.event_key='complete'))
        or (p.onboarding_reminders and not exists(select from public.xooter_applications a where a.user_id=j.user_id and a.status<>'draft')
          and ((j.started_at+interval '24 hours'<=p_now and not exists(select from private.xooter_journey_events e where e.user_id=j.user_id and e.event_key='continue:24h'))
            or (j.started_at+interval '72 hours'<=p_now and not exists(select from private.xooter_journey_events e where e.user_id=j.user_id and e.event_key='continue:72h'))))
        or (p.tips and private.xooter_journey_ready(j.user_id)
          and not exists(select from private.xooter_journey_events e where e.user_id=j.user_id and e.optional and e.created_at>p_now-interval '7 days')
          and ((j.approved_at+interval '3 days'<=p_now and not exists(select from private.xooter_journey_events e where e.user_id=j.user_id and e.event_key='tip:profile'))
            or (j.approved_at+interval '7 days'<=p_now and not exists(select from private.xooter_journey_events e where e.user_id=j.user_id and e.event_key='tip:customers'))
            or (coalesce(u.last_sign_in_at,j.started_at)+interval '14 days'<=p_now and not exists(select from private.xooter_journey_events e where e.user_id=j.user_id and e.event_key='return:'||coalesce(u.last_sign_in_at,j.started_at)::text))))
      )
    order by j.started_at,j.user_id limit 200 loop
    perform 1 from private.xooter_journeys where user_id=actor_row.user_id for update;
    ready:=private.xooter_journey_ready(actor_row.user_id);
    if ready then
      update private.xooter_journeys set approved_at=coalesce(approved_at,p_now) where user_id=actor_row.user_id;
      if private.emit_xooter_journey(actor_row.user_id,'xooter_onboarding_complete','complete') then emitted:=emitted+1;end if;
    end if;
    for candidate in select j.user_id,v.kind,v.event_key from private.xooter_journeys j
      join private.xooter_communication_preferences p on p.user_id=j.user_id
      join auth.users u on u.id=j.user_id
      cross join lateral (values
        ('xooter_continue_24h','continue:24h',j.started_at+interval '24 hours',p.onboarding_reminders and not exists(select from public.xooter_applications a where a.user_id=j.user_id and a.status<>'draft')),
        ('xooter_continue_72h','continue:72h',j.started_at+interval '72 hours',p.onboarding_reminders and not exists(select from public.xooter_applications a where a.user_id=j.user_id and a.status<>'draft')),
        ('xooter_tip_profile','tip:profile',j.approved_at+interval '3 days',p.tips and ready),
        ('xooter_tip_customers','tip:customers',j.approved_at+interval '7 days',p.tips and ready),
        ('xooter_return','return:'||coalesce(u.last_sign_in_at,j.started_at)::text,coalesce(u.last_sign_in_at,j.started_at)+interval '14 days',p.tips and ready)
      ) v(kind,event_key,due,eligible)
      where j.user_id=actor_row.user_id and v.eligible and v.due<=p_now
        and not exists(select from private.xooter_journey_events e where e.user_id=j.user_id and e.event_key=v.event_key)
      order by v.due,v.event_key loop
      if private.emit_xooter_journey(candidate.user_id,candidate.kind,candidate.event_key) then emitted:=emitted+1;end if;
    end loop;
  end loop;
  return emitted;
end $$;
revoke all on function private.collect_xooter_journeys(timestamptz) from public,anon,authenticated,service_role;
-- Preserve one notification owner during migration→Edge rollout and a rollback to old handlers.
-- Existing historical rows stay untouched; only a redundant new legacy insert is omitted.
create function private.ignore_legacy_xooter_journey_duplicate() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor uuid; canonical_kind text;
begin
  if tg_table_schema<>'public' or tg_level<>'ROW' or tg_when<>'BEFORE' or tg_op<>'INSERT' then
    raise exception 'Invalid lifecycle bridge context' using errcode='42501';end if;
  if tg_table_name='notifications' then
    canonical_kind:=case new.kind when 'xooter_application_submitted' then 'xooter_application_received'
      when 'xooter_application_rejected' then 'xooter_application_attention' else null end;
    actor:=new.user_id;
  elsif tg_table_name='integration_outbox' then
    if new.source_table is distinct from 'xooter_applications' or new.channel is distinct from 'brevo_email' then return new;end if;
    canonical_kind:=case new.event_type when 'trust_verification_update' then 'xooter_application_received'
      when 'xooter_application_rejected' then 'xooter_application_attention' else null end;
    select user_id into actor from public.xooter_applications where id=new.source_id;
  else raise exception 'Invalid lifecycle bridge table' using errcode='42501';end if;
  if canonical_kind is not null and exists(select from private.xooter_journey_events e
    where e.user_id=actor and e.kind=canonical_kind and e.notification_id is not null) then return null;end if;
  return new;
end $$;
revoke all on function private.ignore_legacy_xooter_journey_duplicate() from public,anon,authenticated,service_role;
create trigger xooter_legacy_notification_bridge before insert on public.notifications
  for each row execute function private.ignore_legacy_xooter_journey_duplicate();
create trigger xooter_legacy_email_bridge before insert on public.integration_outbox
  for each row execute function private.ignore_legacy_xooter_journey_duplicate();
-- Scheduling and external delivery follow actual staging acceptance, not migration alone.
$notification_source_20261102082500$;
    execute v_sql;
    insert into supabase_migrations.schema_migrations(version,name,statements) values('20261102082500','xooter_notification_journey',array[v_sql]);
  else
    select encode(sha256(convert_to(replace(array_to_string(statements,E'\n'),E'\r\n',E'\n'),'UTF8')),'hex') into v_history
      from supabase_migrations.schema_migrations where version='20261102082500' and name='xooter_notification_journey' and cardinality(statements)=1;
    if v_history is null or v_history not in ('82ea0fc77d11c67e2061b2702c0091d84e6d31fe88340a3345a4c1e5ee3419ed','d263ff435597a5034474e5dbb82517bde328eb92f795d74b77960cd8bcf91968') then raise exception 'Unknown notification source history';end if;
  end if;
  -- 20261102082516_xooter_email_delivery_receipts.sql; immutable source SHA256 9592ccc511eff6c40195440de6829e46e9f4999464a53362de90ff409ed0c1da
  -- Actual executed SHA256 7e33ebb27e6a621cbacd1df5c5e4c05104314460d5c3dffe778b3014641cbb52
  if v_existing=0 then
    v_sql := $notification_source_20261102082516$-- Closed, one-time lifecycle-email evaluation. No provider call, schedule or budget renewal.
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
    -- Returning to a prior status must not revive mail from a different review transition.
    and (e.kind not in ('xooter_application_received','xooter_application_attention')
      or e.event_key=(select 'status:'||j.status_revision::text from private.xooter_journeys j where j.user_id=e.user_id))
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
$notification_source_20261102082516$;
    execute v_sql;
    insert into supabase_migrations.schema_migrations(version,name,statements) values('20261102082516','xooter_email_delivery_receipts',array[v_sql]);
  else
    select encode(sha256(convert_to(replace(array_to_string(statements,E'\n'),E'\r\n',E'\n'),'UTF8')),'hex') into v_history
      from supabase_migrations.schema_migrations where version='20261102082516' and name='xooter_email_delivery_receipts' and cardinality(statements)=1;
    if v_history is null or v_history not in ('9592ccc511eff6c40195440de6829e46e9f4999464a53362de90ff409ed0c1da','7e33ebb27e6a621cbacd1df5c5e4c05104314460d5c3dffe778b3014641cbb52') then raise exception 'Unknown notification source history';end if;
  end if;
  -- 20261102165153_xooter_email_outbox_completion.sql; immutable source SHA256 e6ad261323fc7d1d65efc34e8436c6818031e3c4a138438b6ede01ee0730574a
  -- Actual executed SHA256 09ab57c1ec6a4a7e8102077fd35e5858f74075a76286558e565c15f84abcf647 (explicit production compatibility assertion)
  if v_existing=0 then
    v_sql := $notification_source_20261102165153$-- Forward-only fix for the hosted outbox contract. Original staging migration stays immutable.
-- No send, retry, policy enable, data backfill or broader grant occurs here.
set local lock_timeout='5s';set local statement_timeout='60s';
do $guard$
begin
  if (select encode(pg_catalog.sha256(pg_catalog.convert_to(
    regexp_replace(p.prosrc,E'\r\n',E'\n','g'),'UTF8')),'hex')
    from pg_proc p where p.oid='public.finish_xooter_journey_email(uuid,uuid,text,text)'::regprocedure)
    is distinct from 'c8fed712522ee0a0971c71ca5af83b8c33832b15f3018f20ba2c9c84e1711bb4' then
    raise exception 'Unknown lifecycle receipt source; review before replacing';
  end if;
  -- Actual production status is unconstrained text; staging has the exact six-state CHECK.
  -- Validate either reviewed shape without adding/removing a global outbox constraint.
  if not exists(select from pg_attribute a where a.attrelid='public.integration_outbox'::regclass
      and a.attname='status' and not a.attisdropped and a.atttypid='pg_catalog.text'::regtype and a.attgenerated='')
    or exists(select from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attname='status'
      where c.conrelid='public.integration_outbox'::regclass and c.contype='c' and a.attnum=any(c.conkey)
      and (c.conname<>'integration_outbox_status_check' or pg_get_constraintdef(c.oid)<>'CHECK ((status = ANY (ARRAY[''queued''::text, ''needs_approval''::text, ''processing''::text, ''completed''::text, ''failed''::text, ''cancelled''::text])))')) then
    raise exception 'Unknown outbox status contract';
  end if;
end $guard$;
create or replace function public.finish_xooter_journey_email(p_id uuid,p_nonce uuid,p_state text,p_message_id text default null) returns boolean
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
  update public.integration_outbox set status=case when p_state='accepted' then 'completed' else 'failed' end,
    processed_at=case when p_state='accepted' then clock_timestamp() else null end,
    failure_mode=case when p_state='accepted' then null else 'Lifecycle email needs manual reconciliation; never automatically resend.' end
    where id=event.outbox_id and source_table='xooter_journey_events' and source_id=event.id;
  return true;
end $$;
revoke all on function public.finish_xooter_journey_email(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.finish_xooter_journey_email(uuid,uuid,text,text) to service_role;
$notification_source_20261102165153$;
    execute v_sql;
    insert into supabase_migrations.schema_migrations(version,name,statements) values('20261102165153','xooter_email_outbox_completion',array[v_sql]);
  else
    select encode(sha256(convert_to(replace(array_to_string(statements,E'\n'),E'\r\n',E'\n'),'UTF8')),'hex') into v_history
      from supabase_migrations.schema_migrations where version='20261102165153' and name='xooter_email_outbox_completion' and cardinality(statements)=1;
    if v_history is null or v_history not in ('e6ad261323fc7d1d65efc34e8436c6818031e3c4a138438b6ede01ee0730574a','09ab57c1ec6a4a7e8102077fd35e5858f74075a76286558e565c15f84abcf647') then raise exception 'Unknown notification source history';end if;
  end if;
  for expected in select * from (values
    ('private.collect_xooter_journeys(timestamp with time zone)','837aab3dbf9e6b03fb89398e355c26da8fd22527c919835874d994edb349f2e1',true,'integer',false,false,false),
    ('private.emit_xooter_journey(uuid, text, text)','d0967443717b4d7acf1e421a8bd69b6702a701a425d6775f22ba3bce6b5c5f3c',false,'boolean',false,false,false),
    ('private.ignore_legacy_xooter_journey_duplicate()','bb9623c2566ef02dec266535ae0c1c9d50154f59342e136605163af6750e5ea3',true,'trigger',false,false,false),
    ('private.start_xooter_journey(uuid)','2bf9c262c85c48536d13975ae1f0bc69e734928f11a5577b49fe55910d790bcd',false,'void',false,false,false),
    ('private.xooter_application_journey()','8c1c7e40a80bd6de8f4aab59f3636a3d20ddd2367c4bb05a146ae9bebd882b7c',true,'trigger',false,false,false),
    ('private.xooter_journey_email_eligible(private.xooter_journey_events)','9fddd35484b5d6779ba78c6314284bea1e941f01bd1a9c4906f90f2f74e71a5a',false,'boolean',false,false,false),
    ('private.xooter_journey_ready(uuid)','e7a1bf107266bb6560f7f8a60f774f0ee65fa5ad5388d05ae659034ce2730220',false,'boolean',false,false,false),
    ('public.authorize_xooter_journey_email(uuid, uuid, text)','4a94e45ce0dd6ff3892b6788356e0dc0bd48124133af86872b28d425ec55b9e3',true,'jsonb',false,false,true),
    ('public.claim_xooter_journey_email(text)','1df0f2c0b93ed790a479fe9214845ca2c5e3985664f69c1b1e4520aa70ad60c3',true,'jsonb',false,false,true),
    ('public.finish_xooter_journey_email(uuid, uuid, text, text)','cd76b9a166b7934bb0be4455e371bc0a0634d1d34721ecd94f1f1e676f2d3a14',true,'boolean',false,false,true),
    ('public.manage_xooter_communications(text, jsonb, integer)','2da38b3b542d1a27d4c5e61d2e1aa94a5d326a0bd3636a31706d6793c50de1ff',true,'jsonb',false,true,false),
    ('public.xooter_email_worker_authorized()','795564c930ddc386c4388c8c87e1d4781907160c0c9e6ab997a80f96ce72f167',false,'boolean',false,false,true)
  ) as reviewed(signature,sha,definer,result,anon_exec,auth_exec,service_exec) loop
    if not exists(select from pg_proc p where p.oid=to_regprocedure(expected.signature)
      and encode(sha256(convert_to(replace(p.prosrc,E'\r\n',E'\n'),'UTF8')),'hex')=expected.sha
      and p.prosecdef=expected.definer and p.proconfig=array['search_path=""']::text[]
      and pg_get_function_result(p.oid)=expected.result
      and has_function_privilege('anon',p.oid,'execute')=expected.anon_exec
      and has_function_privilege('authenticated',p.oid,'execute')=expected.auth_exec
      and has_function_privilege('service_role',p.oid,'execute')=expected.service_exec) then
      raise exception 'Notification body or authority drift: %',expected.signature;
    end if;
  end loop;
  foreach table_name in array array['xooter_journeys','xooter_communication_preferences','xooter_journey_events','xooter_email_policy'] loop
    if not exists(select from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname=table_name and c.relrowsecurity) then raise exception 'Private notification RLS required';end if;
    foreach role_name in array array['anon','authenticated','service_role'] loop
      if has_table_privilege(role_name,'private.'||table_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then raise exception 'Private notification table grants must remain closed';end if;
    end loop;
  end loop;
  if (select count(*) from pg_trigger t where not t.tgisinternal and t.tgenabled='O' and t.tgqual is null and t.tgnargs=0 and t.tgattr::text='' and
    ((t.tgname='xooter_application_journey' and t.tgrelid='public.xooter_applications'::regclass and t.tgtype=21 and t.tgfoid='private.xooter_application_journey()'::regprocedure)
    or(t.tgname='xooter_legacy_notification_bridge' and t.tgrelid='public.notifications'::regclass and t.tgtype=7 and t.tgfoid='private.ignore_legacy_xooter_journey_duplicate()'::regprocedure)
    or(t.tgname='xooter_legacy_email_bridge' and t.tgrelid='public.integration_outbox'::regclass and t.tgtype=7 and t.tgfoid='private.ignore_legacy_xooter_journey_duplicate()'::regprocedure)))<>3 then raise exception 'Notification trigger bindings changed';end if;
  if not exists(select from private.xooter_email_policy where id and not enabled and maximum=20 and used between 0 and maximum)
    or(v_existing=0 and exists(select from private.xooter_email_policy where used<>0 or cardinality(allowed_user_ids)<>0 or project_ref is not null or free_plan_reviewed_at is not null)) then
    raise exception 'Notification sending must remain closed without allowance renewal';
  end if;
end $closed_xooter_notifications$;
