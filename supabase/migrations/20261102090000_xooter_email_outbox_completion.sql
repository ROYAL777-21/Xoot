-- Forward-only fix for the hosted outbox contract. Original staging migration stays immutable.
-- No send, retry, policy enable, data backfill or broader grant occurs here.
begin;
set local lock_timeout='5s';set local statement_timeout='60s';
do $guard$
begin
  if (select encode(pg_catalog.sha256(pg_catalog.convert_to(
    regexp_replace(p.prosrc,E'\r\n',E'\n','g'),'UTF8')),'hex')
    from pg_proc p where p.oid='public.finish_xooter_journey_email(uuid,uuid,text,text)'::regprocedure)
    is distinct from 'c8fed712522ee0a0971c71ca5af83b8c33832b15f3018f20ba2c9c84e1711bb4' then
    raise exception 'Unknown lifecycle receipt source; review before replacing';
  end if;
  if not exists(select from pg_constraint c where c.conrelid='public.integration_outbox'::regclass
    and c.conname='integration_outbox_status_check' and pg_get_constraintdef(c.oid) like '%''completed''%') then
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
commit;

