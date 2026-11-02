-- Authenticated, consent-aware Xooter notifications. No email sender or role activation opens.
begin;
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
-- Scheduling and external delivery follow actual staging acceptance, not migration alone.
commit;
