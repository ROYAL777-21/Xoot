-- Run only inside the caller's BEGIN/ROLLBACK on staging, with an authorised existing owner.
-- Synthetic provider rows exercise SQL invariants, not genuine ITN, JWT, MFA or worker acceptance.
do $$begin
  if current_setting('xoot.test_intent',true) is distinct from 'booking-cancellation-rollback' then
    raise exception 'explicit rollback test intent required';
  end if;
end$$;
create temporary table xoot_cancel_test_checks(label text not null) on commit drop;
create function pg_temp.cancel_check(p_ok boolean,p_label text) returns void language plpgsql as $$begin
  if p_ok is not true then raise exception 'cancellation test failed: %',p_label; end if;
  insert into pg_temp.xoot_cancel_test_checks values(p_label);
end$$;
create function pg_temp.cancel_fixture(p_schedule interval)
returns table(booking_id uuid,payment_id uuid,event_id uuid,reference text,transaction_id text) language plpgsql as $$
declare v_owner uuid:=nullif(current_setting('xoot.test_owner_id',true),'')::uuid;
begin
  booking_id:=gen_random_uuid(); payment_id:=gen_random_uuid(); event_id:=gen_random_uuid();
  reference:='xoot_cancel_sql_'||gen_random_uuid(); transaction_id:='synthetic_cancel_'||gen_random_uuid();
  insert into public.bookings(id,user_id,service,service_type,scheduled_at,price,status,payment_status,notes)
    values(booking_id,v_owner,'cleaning','residential',clock_timestamp()+p_schedule,125.01,'draft','pending','CODEX_CANCEL_ROLLBACK_20261028');
  insert into public.payment_records(id,user_id,booking_id,amount,currency,payment_kind,provider,provider_reference)
    values(payment_id,v_owner,booking_id,125.01,'ZAR','booking','payfast',reference);
  insert into public.provider_events(id,provider,event_id,event_type,idempotency_key,subject_table,subject_id,payload_hash)
    values(event_id,'payfast',transaction_id,'payment_confirmed',transaction_id,'payment_records',payment_id,repeat('c',64));
  return next;
end$$;
create function private.xoot_test_cancel_failure() returns trigger language plpgsql as $$begin
  if tg_table_name=current_setting('xoot.cancel_fail_table',true)
    and position(current_setting('xoot.cancel_fail_booking',true) in to_jsonb(new)::text)>0 then
    raise exception 'injected cancellation side-effect failure';
  end if;
  return new;
end$$;
create trigger xoot_test_cancel_failure before insert on public.refund_requests for each row execute function private.xoot_test_cancel_failure();
create trigger xoot_test_cancel_failure before insert on public.admin_review_queue for each row execute function private.xoot_test_cancel_failure();
create trigger xoot_test_cancel_failure before insert on public.notifications for each row execute function private.xoot_test_cancel_failure();
create trigger xoot_test_cancel_failure before insert on public.admin_audit_log for each row execute function private.xoot_test_cancel_failure();
create trigger xoot_test_cancel_failure before insert on private.booking_cancellations for each row execute function private.xoot_test_cancel_failure();

do $$declare
  v_owner uuid:=nullif(current_setting('xoot.test_owner_id',true),'')::uuid;
  f record;
  v_result jsonb;
  v_retry jsonb;
  v_caught boolean;
  v_stage text;
  v_hours integer;
  v_expected bigint;
begin
  perform pg_temp.cancel_check(exists(select from auth.users where id=v_owner),'authorised staging owner exists');
  perform pg_temp.cancel_check(not public.has_role(v_owner,'admin'::public.app_role),'test customer has no admin role');
  perform pg_temp.cancel_check(not has_function_privilege('anon','public.cancel_booking_atomically(uuid,uuid,text,uuid)','execute'),'anonymous RPC execute denied');
  perform pg_temp.cancel_check(not has_function_privilege('authenticated','public.cancel_booking_atomically(uuid,uuid,text,uuid)','execute'),'customer direct RPC execute denied');
  perform pg_temp.cancel_check(not has_table_privilege('authenticated','private.booking_cancellations','select'),'private receipt inaccessible to customers');
  perform pg_temp.cancel_check(not has_table_privilege('service_role','private.booking_cancellations','insert'),'service cannot bypass receipt function with a direct insert');

  foreach v_stage in array array['refund_requests','admin_review_queue','notifications','admin_audit_log','booking_cancellations'] loop
    select * into f from pg_temp.cancel_fixture(interval '24 hours');
    perform public.settle_booking_payment(f.payment_id,'payfast',12501,f.reference,f.event_id,repeat('c',64),f.transaction_id,null,null,null);
    perform set_config('xoot.cancel_fail_booking',f.booking_id::text,true);
    perform set_config('xoot.cancel_fail_table',v_stage,true);
    v_caught:=false;
    begin perform public.cancel_booking_atomically(f.booking_id,v_owner,'Customer cancellation test',null);
    exception when raise_exception then
      if sqlerrm<>'injected cancellation side-effect failure' then raise; end if;
      v_caught:=true;
    end;
    perform pg_temp.cancel_check(v_caught,'failure injected at '||v_stage);
    perform pg_temp.cancel_check((select status::text='payment_confirmed' and payment_status='paid' and cancelled_at is null and sensitive_data_revoked_at is null from public.bookings where id=f.booking_id),'failed '||v_stage||' keeps booking and access state');
    perform pg_temp.cancel_check((select status='paid' from public.payment_records where id=f.payment_id),'failed '||v_stage||' preserves paid money');
    perform pg_temp.cancel_check(not exists(select from public.refund_requests where booking_id=f.booking_id),'failed '||v_stage||' rolls back refund');
    perform pg_temp.cancel_check(not exists(select from public.admin_review_queue where booking_id=f.booking_id),'failed '||v_stage||' rolls back review');
    perform pg_temp.cancel_check(not exists(select from public.notifications where link='/app/bookings/'||f.booking_id and kind='booking_cancelled'),'failed '||v_stage||' rolls back cancellation notification');
    perform pg_temp.cancel_check(not exists(select from public.admin_audit_log where target_id=f.booking_id and action='cancel_booking'),'failed '||v_stage||' rolls back success audit');
    perform pg_temp.cancel_check(not exists(select from private.booking_cancellations where booking_id=f.booking_id),'failed '||v_stage||' leaves no cancellation receipt');
    perform pg_temp.cancel_check((select status='queued' from public.integration_outbox where source_id=f.booking_id and event_type='payment_confirmed_assignment_search'),'failed '||v_stage||' preserves assignment queue');
    perform pg_temp.cancel_check(not exists(select from public.booking_status_events where booking_id=f.booking_id and status='cancelled'),'failed '||v_stage||' rolls back status history');
    perform set_config('xoot.cancel_fail_table','',true);
  end loop;

  foreach v_hours in array array[24,6,1] loop
    v_expected:=case v_hours when 24 then 12501 when 6 then 6251 else 0 end;
    select * into f from pg_temp.cancel_fixture(make_interval(hours=>v_hours));
    perform public.settle_booking_payment(f.payment_id,'payfast',12501,f.reference,f.event_id,repeat('c',64),f.transaction_id,null,null,null);
    v_result:=public.cancel_booking_atomically(f.booking_id,v_owner,'Customer cancellation test',null);
    perform pg_temp.cancel_check((v_result->'refund'->>'amount')::numeric*100=v_expected,'exact refund cents for '||v_hours||' hours');
    perform pg_temp.cancel_check((select status='paid' from public.payment_records where id=f.payment_id),'cancellation preserves settled payment at '||v_hours||' hours');
    perform pg_temp.cancel_check((select status::text='cancelled' and payment_status='paid' and sensitive_data_revoked_at is not null from public.bookings where id=f.booking_id),'cancelled booking keeps paid accounting and revokes access');
    perform pg_temp.cancel_check((select count(*)=case when v_expected>0 then 1 else 0 end from public.refund_requests where booking_id=f.booking_id and status='pending'),'refund is pending review only');
    perform pg_temp.cancel_check((select status='cancelled' from public.integration_outbox where source_id=f.booking_id and event_type='payment_confirmed_assignment_search'),'queued assignment cancelled');
    update public.bookings set scheduled_at=clock_timestamp()-interval '1 day' where id=f.booking_id;
    v_retry:=public.cancel_booking_atomically(f.booking_id,v_owner,'Repeated cancellation test',null);
    perform pg_temp.cancel_check((v_retry->>'idempotent')::boolean and (v_retry-'idempotent')=(v_result-'idempotent'),'retry returns original receipt across refund windows');
    perform pg_temp.cancel_check((select count(*)=1 from public.notifications where link='/app/bookings/'||f.booking_id and kind='booking_cancelled'),'retry does not notify twice');
    perform pg_temp.cancel_check((select count(*)=1 from public.admin_audit_log where target_id=f.booking_id and action='cancel_booking'),'retry does not audit twice');
    v_caught:=false;
    begin perform public.cancel_booking_atomically(f.booking_id,gen_random_uuid(),'Unrelated actor cannot replay',gen_random_uuid());
    exception when insufficient_privilege then v_caught:=true; end;
    perform pg_temp.cancel_check(v_caught,'retry rechecks owner or fresh MFA admin');
  end loop;

  select * into f from pg_temp.cancel_fixture(interval '24 hours');
  v_result:=public.cancel_booking_atomically(f.booking_id,v_owner,'Pending cancellation test',null);
  perform pg_temp.cancel_check((select status='cancelled' and provider_reference=f.reference from public.payment_records where id=f.payment_id),'pending payment cancelled with provider reference retained');
  perform pg_temp.cancel_check((v_result->'refund'->>'amount')::numeric=0 and v_result->>'refund_request_id' is null,'unpaid cancellation makes no refund');
  v_caught:=false;
  begin perform public.settle_booking_payment(f.payment_id,'payfast',12501,f.reference,f.event_id,repeat('c',64),f.transaction_id,null,null,null);
  exception when invalid_parameter_value then v_caught:=true; end;
  perform pg_temp.cancel_check(v_caught,'late settlement after cancellation requires reconciliation');
  perform pg_temp.cancel_check(not exists(select from private.booking_payment_settlements where payment_record_id=f.payment_id),'late settlement does not create fulfilment receipt');

  select * into f from pg_temp.cancel_fixture(interval '24 hours');
  update public.payment_records set status='paid' where id=f.payment_id;
  update public.bookings set payment_status='paid' where id=f.booking_id;
  v_caught:=false;
  begin perform public.cancel_booking_atomically(f.booking_id,v_owner,'Legacy paid without receipt',null);
  exception when invalid_parameter_value then v_caught:=true; end;
  perform pg_temp.cancel_check(v_caught,'legacy paid flag is not a settlement receipt');

  select * into f from pg_temp.cancel_fixture(interval '24 hours');
  insert into public.payment_records(user_id,booking_id,amount,currency,payment_kind,provider)
    values(v_owner,f.booking_id,125.01,'ZAR','booking','manual_pending');
  v_caught:=false;
  begin perform public.cancel_booking_atomically(f.booking_id,v_owner,'Multiple payments need review',null);
  exception when invalid_parameter_value then v_caught:=true; end;
  perform pg_temp.cancel_check(v_caught,'multiple payment lanes rejected');

  select * into f from pg_temp.cancel_fixture(interval '24 hours');
  update public.bookings set crew_size=2 where id=f.booking_id;
  v_caught:=false;
  begin perform public.cancel_booking_atomically(f.booking_id,v_owner,'Crew cancellation needs review',null);
  exception when invalid_parameter_value then v_caught:=true; end;
  perform pg_temp.cancel_check(v_caught,'unsupported crew contract held');

  select * into f from pg_temp.cancel_fixture(interval '24 hours');
  perform public.settle_booking_payment(f.payment_id,'payfast',12501,f.reference,f.event_id,repeat('c',64),f.transaction_id,null,null,null);
  update public.bookings set status='in_progress' where id=f.booking_id;
  v_caught:=false;
  begin perform public.cancel_booking_atomically(f.booking_id,v_owner,'Post-start cancellation needs review',null);
  exception when invalid_parameter_value then v_caught:=true; end;
  perform pg_temp.cancel_check(v_caught,'post-start accounting reversal held');

  select * into f from pg_temp.cancel_fixture(interval '24 hours');
  perform public.settle_booking_payment(f.payment_id,'payfast',12501,f.reference,f.event_id,repeat('c',64),f.transaction_id,null,null,null);
  update public.integration_outbox set status='processing' where source_id=f.booking_id;
  v_caught:=false;
  begin perform public.cancel_booking_atomically(f.booking_id,v_owner,'Assignment processing needs review',null);
  exception when invalid_parameter_value then v_caught:=true; end;
  perform pg_temp.cancel_check(v_caught,'in-flight assignment is held for reconciliation');
end$$;
