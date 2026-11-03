-- Customer first-entry notifications only. No Auth trigger, old-account welcome backfill,
-- provider call, schedule or production email activation. Worker policy/receipts stay separate.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';

create table private.customer_email_policy (
  id boolean primary key default true check(id),
  installed_at timestamptz not null default clock_timestamp(),
  enabled boolean not null default false,
  project_ref text check(project_ref in ('fxmxyabdjqviqbcxmvlp','mvlrkelahhsyjrwgsxaf')),
  allowed_user_ids uuid[] not null default '{}' constraint customer_email_allowlist_has_no_nulls check(array_position(allowed_user_ids,null::uuid) is null),
  free_plan_reviewed_at timestamptz,
  free_plan_review_reference text,
  maximum integer not null default 20 check(maximum between 1 and 20),
  used integer not null default 0 check(used between 0 and maximum)
);
insert into private.customer_email_policy(id) values(true);
create table private.customer_journeys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  entered_at timestamptz not null default clock_timestamp(),
  last_seen_at timestamptz not null default clock_timestamp(),
  setup_started_at timestamptz,
  setup_completed_at timestamptz,
  setup_revision integer not null default 0 check(setup_revision>=0),
  check(setup_completed_at is null or setup_started_at is not null)
);
create table private.customer_communication_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_emails boolean not null default true,
  setup_reminders boolean not null default false,
  first_booking_reminders boolean not null default false,
  setup_consented_at timestamptz,
  first_booking_consented_at timestamptz,
  consent_version text not null default 'xoot-customer-communications-v1',
  revision integer not null default 0 check(revision>=0),
  updated_at timestamptz not null default clock_timestamp(),
  check(setup_reminders=(setup_consented_at is not null)),
  check(first_booking_reminders=(first_booking_consented_at is not null))
);
create table private.customer_journey_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null check(length(event_key) between 1 and 160),
  kind text not null check(kind in ('customer_welcome','customer_setup_24h','customer_setup_72h','customer_first_booking')),
  title text not null,
  body text not null,
  route text not null check(route in ('/app','/app/book','/app/profile/homes/new')),
  optional boolean not null,
  notification_id uuid references public.notifications(id) on delete set null,
  outbox_id uuid references public.integration_outbox(id) on delete set null,
  email_state text not null default 'queued' check(email_state in ('queued','claimed','accepted','uncertain','failed','suppressed')),
  email_nonce uuid,
  claimed_recipient_hash text,
  email_claimed_at timestamptz,
  email_dispatched_at timestamptz,
  email_finished_at timestamptz,
  smtp_message_id text unique,
  created_at timestamptz not null default clock_timestamp(),
  unique(user_id,event_key)
);
create index customer_journey_optional_recent on private.customer_journey_events(user_id,created_at desc) where optional;
create index customer_journey_email_queue on private.customer_journey_events(created_at,id) where email_state='queued';
alter table private.customer_email_policy enable row level security;
alter table private.customer_journeys enable row level security;
alter table private.customer_communication_preferences enable row level security;
alter table private.customer_journey_events enable row level security;
revoke all on private.customer_email_policy,private.customer_journeys,private.customer_communication_preferences,private.customer_journey_events
  from public,anon,authenticated,service_role;

create function private.customer_journey_eligible(p_user uuid) returns boolean
language sql stable security invoker set search_path='' as $$
  select exists(select from auth.users u where u.id=p_user and u.email_confirmed_at is not null
    and nullif(btrim(u.email),'') is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp()))
    and exists(select from public.user_roles r where r.user_id=p_user and r.role::text='user')
    and not exists(select from public.user_roles r where r.user_id=p_user and r.role::text in ('xooter','admin'))
    and not exists(select from public.xooter_applications a where a.user_id=p_user)
    and not exists(select from public.xooters x where x.user_id=p_user);
$$;
revoke all on function private.customer_journey_eligible(uuid) from public,anon,authenticated,service_role;

create function private.customer_journey_current(p_user uuid,p_kind text,p_now timestamptz) returns boolean
language sql stable security invoker set search_path='' as $$
  select p_now is not null and private.customer_journey_eligible(p_user)
    and exists(select from private.customer_journeys j join private.customer_communication_preferences p using(user_id)
      where j.user_id=p_user and case p_kind
        when 'customer_welcome' then exists(select from auth.users u cross join private.customer_email_policy policy
          where u.id=p_user and policy.id and u.created_at>=policy.installed_at)
        when 'customer_setup_24h' then p.setup_reminders and j.setup_started_at is not null
          and j.setup_completed_at is null and j.setup_started_at+interval '24 hours'<=p_now
          and p_now<j.setup_started_at+interval '72 hours'
          and not exists(select from public.household_profiles h where h.user_id=p_user and nullif(btrim(h.address),'') is not null)
          and not exists(select from public.bookings b where b.user_id=p_user)
        when 'customer_setup_72h' then p.setup_reminders and j.setup_started_at is not null
          and j.setup_completed_at is null and j.setup_started_at+interval '72 hours'<=p_now
          and p_now<j.setup_started_at+interval '7 days'
          and not exists(select from public.household_profiles h where h.user_id=p_user and nullif(btrim(h.address),'') is not null)
          and not exists(select from public.bookings b where b.user_id=p_user)
        when 'customer_first_booking' then p.first_booking_reminders and j.entered_at+interval '7 days'<=p_now
          and not exists(select from public.bookings b where b.user_id=p_user)
        else false end
      and (p_kind='customer_welcome' or (j.last_seen_at<=p_now-interval '1 hour'
        and extract(hour from p_now at time zone 'Africa/Johannesburg') between 7 and 20)));
$$;
revoke all on function private.customer_journey_current(uuid,text,timestamptz) from public,anon,authenticated,service_role;

create function private.emit_customer_journey(p_user uuid,p_kind text,p_key text,p_now timestamptz) returns boolean
language plpgsql security invoker set search_path='' as $$
declare copy jsonb; event_id uuid; note_id uuid; queue_id uuid; optional_event boolean; legacy_count integer;
begin
  -- Caller holds this customer's journey lock. Auth/signup itself is never dependent on this writer.
  if not private.customer_journey_current(p_user,p_kind,p_now) then return false;end if;
  optional_event:=p_kind<>'customer_welcome';
  if optional_event and (exists(select from private.customer_journey_events e where e.user_id=p_user and e.optional and e.created_at>p_now-interval '7 days')
    or (select count(*) from private.customer_journey_events e where e.user_id=p_user and e.optional and e.created_at>p_now-interval '30 days')>=2) then return false;end if;
  copy:=case p_kind
    when 'customer_welcome' then jsonb_build_array('Welcome to Xoot','Your account is ready. Explore at your own pace, save a place when you like, and plan your first visit.','/app')
    when 'customer_setup_24h' then jsonb_build_array('Your place, at your pace','You started adding a place. Pick up where you left off when it suits you, or keep exploring Xoot.','/app/profile/homes/new')
    when 'customer_setup_72h' then jsonb_build_array('A little help getting settled','Your place setup is waiting. Add the details you choose to save, or contact Xoot support for a hand.','/app/profile/homes/new')
    when 'customer_first_booking' then jsonb_build_array('Ready to plan your first visit?','Explore the services in Xoot and choose the visit that suits your place. You can review the details before deciding.','/app/book')
    else null end;
  if copy is null then raise exception 'Unknown customer event' using errcode='22023';end if;
  if exists(select from private.customer_journey_events where user_id=p_user and event_key=p_key) then return false;end if;
  -- The existing Auth trigger already creates one generic welcome. Adopt only a unique exact
  -- legacy row, never an arbitrary historical item; this is not proof of an email delivery.
  if p_kind='customer_welcome' then
    select count(*) into legacy_count from public.notifications where user_id=p_user and kind='welcome';
    if legacy_count>1 then return false;end if;
    if legacy_count=1 then
      select id into note_id from public.notifications where user_id=p_user and kind='welcome'
        and title='Welcome to Xoot' and body='Your home, sorted. Book your first visit and earn XootCred.' and link='/app' for update;
      if note_id is null then return false;end if;
    end if;
  end if;
  insert into private.customer_journey_events(user_id,event_key,kind,title,body,route,optional,created_at)
    values(p_user,p_key,p_kind,copy->>0,copy->>1,copy->>2,optional_event,p_now)
    on conflict(user_id,event_key) do nothing returning id into event_id;
  if event_id is null then return false;end if;
  if note_id is null then
    insert into public.notifications(user_id,kind,title,body,link)
      values(p_user,p_kind,copy->>0,copy->>1,copy->>2) returning id into note_id;
  else
    update public.notifications set kind=p_kind,title=copy->>0,body=copy->>1,link=copy->>2 where id=note_id and user_id=p_user;
  end if;
  insert into public.integration_outbox(source_table,source_id,event_type,channel,owner,stack_tool,payload,status,approval_required,created_by)
    values('customer_journey_events',event_id,p_kind,'brevo_email','Customer Care','Xoot customer lifecycle email',
      jsonb_build_object('journey_event_id',event_id),'queued',false,p_user) returning id into queue_id;
  update private.customer_journey_events set notification_id=note_id,outbox_id=queue_id where id=event_id;
  return true;
end $$;
revoke all on function private.emit_customer_journey(uuid,text,text,timestamptz) from public,anon,authenticated,service_role;

create function public.manage_customer_communications(p_action text,p_preferences jsonb default null,p_revision integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); pref private.customer_communication_preferences%rowtype; journey private.customer_journeys%rowtype; key text;
begin
  if actor is null or not exists(select from auth.users u where u.id=actor and u.email_confirmed_at is not null
    and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp())) then
    raise exception 'Confirmed account required' using errcode='42501';end if;
  if p_action is null or p_action not in ('enter','get','save','setup_started','setup_complete') then
    raise exception 'Invalid customer action' using errcode='22023';end if;
  if not private.customer_journey_eligible(actor) then return jsonb_build_object('eligible',false);end if;
  insert into private.customer_journeys(user_id) values(actor) on conflict do nothing;
  select * into journey from private.customer_journeys where user_id=actor for update;
  insert into private.customer_communication_preferences(user_id) values(actor) on conflict do nothing;
  select * into pref from private.customer_communication_preferences where user_id=actor for update;
  if p_action='enter' then
    update private.customer_journeys set last_seen_at=clock_timestamp() where user_id=actor;
    perform private.emit_customer_journey(actor,'customer_welcome','entry:welcome',clock_timestamp());
  elsif p_action='save' then
    if p_preferences is null or jsonb_typeof(p_preferences)<>'object'
      or (select count(*) from jsonb_object_keys(p_preferences))<>3 then raise exception 'Complete preferences required' using errcode='22023';end if;
    foreach key in array array['account_emails','setup_reminders','first_booking_reminders'] loop
      if jsonb_typeof(p_preferences->key) is distinct from 'boolean' then raise exception 'Boolean preferences required' using errcode='22023';end if;
    end loop;
    if p_revision is distinct from pref.revision then raise exception 'Preferences changed; reload before saving' using errcode='40001';end if;
    update private.customer_communication_preferences set account_emails=(p_preferences->>'account_emails')::boolean,
      setup_reminders=(p_preferences->>'setup_reminders')::boolean,first_booking_reminders=(p_preferences->>'first_booking_reminders')::boolean,
      setup_consented_at=case when (p_preferences->>'setup_reminders')::boolean then coalesce(setup_consented_at,clock_timestamp()) else null end,
      first_booking_consented_at=case when (p_preferences->>'first_booking_reminders')::boolean then coalesce(first_booking_consented_at,clock_timestamp()) else null end,
      revision=revision+1,updated_at=clock_timestamp() where user_id=actor returning * into pref;
  elsif p_action='setup_started' then
    update private.customer_journeys set setup_started_at=coalesce(setup_started_at,clock_timestamp()),last_seen_at=clock_timestamp() where user_id=actor;
  elsif p_action='setup_complete' then
    if not exists(select from public.household_profiles where user_id=actor and nullif(btrim(address),'') is not null) then
      raise exception 'Save your place first' using errcode='22023';end if;
    update private.customer_journeys set setup_started_at=coalesce(setup_started_at,clock_timestamp()),
      setup_completed_at=coalesce(setup_completed_at,clock_timestamp()),last_seen_at=clock_timestamp() where user_id=actor;
  end if;
  select * into journey from private.customer_journeys where user_id=actor;
  return jsonb_build_object('eligible',true,'account_emails',pref.account_emails,'setup_reminders',pref.setup_reminders,
    'first_booking_reminders',pref.first_booking_reminders,'revision',pref.revision,'setup_started',journey.setup_started_at is not null,
    'setup_complete',journey.setup_completed_at is not null,'optional_email_available',false,'scheduling_enabled',false);
end $$;
revoke all on function public.manage_customer_communications(text,jsonb,integer) from public,anon,service_role;
grant execute on function public.manage_customer_communications(text,jsonb,integer) to authenticated;

create function private.collect_customer_journeys(p_now timestamptz default clock_timestamp()) returns integer
language plpgsql security definer set search_path='' as $$
declare candidate record; reminder record; emitted integer:=0;
begin
  if p_now is null or extract(hour from p_now at time zone 'Africa/Johannesburg') not between 7 and 20 then return 0;end if;
  -- Private owner-only collector; no browser clock, public dispatch, cron or historical enrolment.
  for candidate in select j.user_id from private.customer_journeys j
    where j.last_seen_at<=p_now-interval '1 hour' and private.customer_journey_eligible(j.user_id)
      and not exists(select from private.customer_journey_events e where e.user_id=j.user_id and e.optional and e.created_at>p_now-interval '7 days')
      and (select count(*) from private.customer_journey_events e where e.user_id=j.user_id and e.optional and e.created_at>p_now-interval '30 days')<2
      and ((private.customer_journey_current(j.user_id,'customer_setup_24h',p_now)
          and not exists(select from private.customer_journey_events e where e.user_id=j.user_id and e.event_key='setup:'||j.setup_revision||':24h'))
        or (private.customer_journey_current(j.user_id,'customer_setup_72h',p_now)
          and not exists(select from private.customer_journey_events e where e.user_id=j.user_id and e.event_key='setup:'||j.setup_revision||':72h'))
        or (private.customer_journey_current(j.user_id,'customer_first_booking',p_now)
          and not exists(select from private.customer_journey_events e where e.user_id=j.user_id and e.event_key='first-booking:1')))
    order by j.entered_at,j.user_id limit 200 for update skip locked loop
    -- Latest due reminder wins. At most1optional/7days and2/30days;24h/72h are not guarantees.
    for reminder in select v.kind,v.event_key,v.due from private.customer_journeys j
      cross join lateral(values
        ('customer_setup_24h','setup:'||j.setup_revision||':24h',j.setup_started_at+interval '24 hours'),
        ('customer_setup_72h','setup:'||j.setup_revision||':72h',j.setup_started_at+interval '72 hours'),
        ('customer_first_booking','first-booking:1',j.entered_at+interval '7 days')
      ) v(kind,event_key,due)
      where j.user_id=candidate.user_id and v.due<=p_now
        and private.customer_journey_current(j.user_id,v.kind,p_now)
        and not exists(select from private.customer_journey_events e where e.user_id=j.user_id and e.event_key=v.event_key)
      order by v.due desc,v.event_key desc loop
      if private.emit_customer_journey(candidate.user_id,reminder.kind,reminder.event_key,p_now) then emitted:=emitted+1;exit;end if;
    end loop;
  end loop;
  return emitted;
end $$;
revoke all on function private.collect_customer_journeys(timestamptz) from public,anon,authenticated,service_role;

create function private.customer_journey_email_eligible(e private.customer_journey_events) returns boolean
language sql stable security invoker set search_path='' as $$
  select private.customer_journey_current(e.user_id,e.kind,clock_timestamp())
    and exists(select from private.customer_communication_preferences p where p.user_id=e.user_id and p.account_emails)
    -- Optional email never opens from a preference or SMTP key. Unsubscribe/campaign review is separate.
    and not e.optional and e.kind='customer_welcome'
    and exists(select from public.notifications n where n.id=e.notification_id and n.user_id=e.user_id and n.kind=e.kind)
    and exists(select from public.integration_outbox o where o.id=e.outbox_id and o.source_table='customer_journey_events'
      and o.source_id=e.id and o.channel='brevo_email' and o.status='queued');
$$;
revoke all on function private.customer_journey_email_eligible(private.customer_journey_events) from public,anon,authenticated,service_role;

create function public.customer_email_worker_authorized() returns boolean
language sql stable security invoker set search_path='' as $$select current_user='service_role'$$;
revoke all on function public.customer_email_worker_authorized() from public,anon,authenticated;
grant execute on function public.customer_email_worker_authorized() to service_role;

create function public.claim_customer_journey_email(p_project_ref text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare policy private.customer_email_policy%rowtype; candidate record; event private.customer_journey_events%rowtype;
begin
  select * into policy from private.customer_email_policy where id for update;
  if not policy.enabled or p_project_ref is distinct from policy.project_ref or policy.used>=policy.maximum
    or policy.free_plan_reviewed_at is null or policy.free_plan_reviewed_at>clock_timestamp()
    or policy.free_plan_reviewed_at<clock_timestamp()-interval '7 days'
    or nullif(btrim(policy.free_plan_review_reference),'') is null then return null;end if;
  -- An expired lease has an unknown outcome, not permission to send it again.
  for candidate in select id,user_id from private.customer_journey_events where email_state='claimed' order by created_at,id loop
    perform 1 from private.customer_journeys where user_id=candidate.user_id for update;
    select * into event from private.customer_journey_events where id=candidate.id for update;
    if event.email_state='claimed' and event.email_claimed_at<clock_timestamp()-interval '20 seconds' then
      update private.customer_journey_events set email_state='uncertain',email_finished_at=clock_timestamp() where id=event.id;
      update public.integration_outbox set status='failed',failure_mode='Customer email outcome needs manual reconciliation; never automatically resend.'
        where id=event.outbox_id and source_table='customer_journey_events' and source_id=event.id and channel='brevo_email' and status='queued';
    elsif event.email_state='claimed' then return null;end if;
  end loop;
  for candidate in select id,user_id from private.customer_journey_events where email_state='queued'
    and (user_id=any(policy.allowed_user_ids)) is true order by created_at,id limit 100 loop
    perform 1 from private.customer_journeys where user_id=candidate.user_id for update;
    select * into event from private.customer_journey_events where id=candidate.id for update;
    if event.email_state<>'queued' then continue;end if;
    if not private.customer_journey_email_eligible(event) or event.created_at<clock_timestamp()-interval '7 days' then
      update private.customer_journey_events set email_state='suppressed',email_finished_at=clock_timestamp() where id=event.id;
      continue;
    end if;
    update private.customer_journey_events set email_state='claimed',email_nonce=gen_random_uuid(),email_claimed_at=clock_timestamp(),
      claimed_recipient_hash=(select encode(sha256(convert_to(lower(btrim(u.email)),'UTF8')),'hex') from auth.users u where u.id=event.user_id)
      where id=event.id returning * into event;
    update private.customer_email_policy set used=used+1 where id;
    return jsonb_build_object('id',event.id,'nonce',event.email_nonce);
  end loop;
  return null;
end $$;
revoke all on function public.claim_customer_journey_email(text) from public,anon,authenticated;
grant execute on function public.claim_customer_journey_email(text) to service_role;

create function public.authorize_customer_journey_email(p_id uuid,p_nonce uuid,p_project_ref text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare policy private.customer_email_policy%rowtype; event private.customer_journey_events%rowtype; actor uuid; recipient record;
begin
  select * into policy from private.customer_email_policy where id for update;
  select user_id into actor from private.customer_journey_events where id=p_id;
  perform 1 from private.customer_journeys where user_id=actor for update;
  select * into event from private.customer_journey_events where id=p_id for update;
  if not found or event.email_state<>'claimed' or event.email_nonce is distinct from p_nonce or event.email_dispatched_at is not null then return null;end if;
  if not policy.enabled or p_project_ref is distinct from policy.project_ref or (event.user_id=any(policy.allowed_user_ids)) is not true
    or policy.free_plan_reviewed_at is null or policy.free_plan_reviewed_at>clock_timestamp()
    or policy.free_plan_reviewed_at<clock_timestamp()-interval '7 days' or nullif(btrim(policy.free_plan_review_reference),'') is null
    or event.email_claimed_at<clock_timestamp()-interval '20 seconds' or not private.customer_journey_email_eligible(event)
    or event.claimed_recipient_hash is distinct from (select encode(sha256(convert_to(lower(btrim(u.email)),'UTF8')),'hex') from auth.users u where u.id=event.user_id) then
    update private.customer_journey_events set email_state='suppressed',email_finished_at=clock_timestamp() where id=p_id;
    return null;
  end if;
  select u.email,regexp_replace(split_part(coalesce(u.raw_user_meta_data->>'full_name',''),' ',1),'[^[:alpha:]''-]','','g') as first_name into recipient from auth.users u where u.id=event.user_id;
  update private.customer_journey_events set email_dispatched_at=clock_timestamp() where id=p_id;
  return jsonb_build_object('id',event.id,'email',recipient.email,'first_name',left(recipient.first_name,40),
    'kind',event.kind,'title',event.title,'body',event.body,'route',event.route);
end $$;
revoke all on function public.authorize_customer_journey_email(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.authorize_customer_journey_email(uuid,uuid,text) to service_role;

create function public.finish_customer_journey_email(p_id uuid,p_nonce uuid,p_state text,p_message_id text default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare event private.customer_journey_events%rowtype; actor uuid; result_state text:=p_state;
begin
  if p_state is null or p_state not in ('accepted','uncertain','failed')
    or (p_state='accepted' and p_message_id is distinct from '<xoot-customer-'||p_id::text||'@xoot.co.za>')
    or (p_state<>'accepted' and p_message_id is not null) then raise exception 'Invalid customer email result' using errcode='22023';end if;
  perform 1 from private.customer_email_policy where id for update;
  select user_id into actor from private.customer_journey_events where id=p_id;
  perform 1 from private.customer_journeys where user_id=actor for update;
  select * into event from private.customer_journey_events where id=p_id for update;
  if not found or event.email_state<>'claimed' or event.email_nonce is distinct from p_nonce then return false;end if;
  if p_state='accepted' and event.email_dispatched_at is null then raise exception 'No customer dispatch authorized' using errcode='22023';end if;
  if (p_state='failed' and event.email_dispatched_at is not null)
    or (p_state='accepted' and event.email_claimed_at<clock_timestamp()-interval '20 seconds')
    or (p_state='accepted' and (not private.customer_journey_eligible(event.user_id)
      or event.claimed_recipient_hash is distinct from (select encode(sha256(convert_to(lower(btrim(u.email)),'UTF8')),'hex') from auth.users u where u.id=event.user_id))) then result_state:='uncertain';end if;
  update private.customer_journey_events set email_state=result_state,
    smtp_message_id=case when result_state='accepted' then p_message_id else null end,email_finished_at=clock_timestamp() where id=p_id;
  update public.integration_outbox set status=case when result_state='accepted' then 'completed' else 'failed' end,
    processed_at=case when result_state='accepted' then clock_timestamp() else null end,
    failure_mode=case when result_state='accepted' then null else 'Customer email outcome needs manual reconciliation; never automatically resend.' end
    where id=event.outbox_id and source_table='customer_journey_events' and source_id=event.id and channel='brevo_email' and status='queued';
  if not found then raise exception 'Customer outbox receipt binding failed' using errcode='22023';end if;
  return result_state=p_state;
end $$;
revoke all on function public.finish_customer_journey_email(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.finish_customer_journey_email(uuid,uuid,text,text) to service_role;
commit;
