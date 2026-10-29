-- Contract test only: run in a caller-owned BEGIN/ROLLBACK on the named staging project.
-- Synthetic SQL provider events do not prove genuine provider verification or JWT/MFA acceptance.
-- The caller sets xoot.test_intent=payfast-settlement-rollback. No provider API or email is used.
do $$begin
  if current_setting('xoot.test_intent', true) is distinct from 'payfast-settlement-rollback' then
    raise exception 'explicit rollback test intent required';
  end if;
end$$;
create temporary table xoot_payment_test_checks(label text not null) on commit drop;
create function pg_temp.payment_check(p_ok boolean, p_label text) returns void language plpgsql as $$begin
  if p_ok is not true then raise exception 'payment test failed: %', p_label; end if;
  insert into pg_temp.xoot_payment_test_checks values(p_label);
end$$;
create function private.xoot_test_payment_outbox_failure() returns trigger language plpgsql as $$begin
  if new.source_id::text = current_setting('xoot.test_booking', true) then raise exception 'injected payment outbox failure'; end if;
  return new;
end$$;
create trigger xoot_test_payment_outbox_failure before insert on public.integration_outbox
  for each row execute function private.xoot_test_payment_outbox_failure();

do $$declare
  v_owner uuid;
  v_booking uuid := gen_random_uuid();
  v_payment uuid := gen_random_uuid();
  v_event uuid := gen_random_uuid();
  v_reference text := 'xoot_sql_contract_' || gen_random_uuid()::text;
  v_tx text := 'synthetic_' || gen_random_uuid()::text;
  v_hash text := repeat('a', 64);
  v_result jsonb;
  v_other_booking uuid := gen_random_uuid();
  v_other_payment uuid := gen_random_uuid();
  v_other_event uuid := gen_random_uuid();
  v_caught boolean;
begin
  v_owner := nullif(current_setting('xoot.test_owner_id', true),'')::uuid;
  if not exists(select from auth.users where id=v_owner) then v_owner:=null; end if;
  perform pg_temp.payment_check(v_owner is not null, 'authorised staging signup owner exists');
  perform pg_temp.payment_check(not public.has_role(v_owner, 'admin'::public.app_role), 'ordinary customer is not an admin');
  perform pg_temp.payment_check(not has_function_privilege('anon', 'public.settle_booking_payment(uuid,text,bigint,text,uuid,text,text,uuid,text,uuid)', 'execute'), 'anonymous RPC execute denied');
  perform pg_temp.payment_check(not has_function_privilege('authenticated', 'public.settle_booking_payment(uuid,text,bigint,text,uuid,text,text,uuid,text,uuid)', 'execute'), 'customer RPC execute denied');
  perform pg_temp.payment_check(not has_table_privilege('authenticated', 'private.booking_payment_settlements', 'select'), 'private receipts have no customer table grant');
  perform pg_temp.payment_check(public.booking_payment_settlement_ready() = 1, 'transaction readiness reports version1');

  insert into public.bookings(id,user_id,service,service_type,scheduled_at,price,status,payment_status,notes)
    values(v_booking,v_owner,'cleaning','residential',now()+interval '2 days',125.01,'draft','pending','CODEX_PAYFAST_ATOMIC_ROLLBACK_20261027');
  insert into public.payment_records(id,user_id,booking_id,amount,currency,payment_kind,provider,provider_reference)
    values(v_payment,v_owner,v_booking,125.01,'ZAR','booking','payfast',v_reference);
  insert into public.provider_events(id,provider,event_id,event_type,idempotency_key,subject_table,subject_id,payload_hash)
    values(v_event,'payfast',v_tx,'payment_confirmed',v_tx,'payment_records',v_payment,v_hash);
  perform set_config('xoot.test_booking',v_booking::text,true);
  v_caught := false;
  begin
    perform public.settle_booking_payment(v_payment,'payfast',12501,v_reference,v_event,v_hash,v_tx,null,null,null);
  exception when raise_exception then
    if sqlerrm <> 'injected payment outbox failure' then raise; end if;
    v_caught := true;
  end;
  perform pg_temp.payment_check(v_caught, 'injected late side-effect failure reached');
  perform pg_temp.payment_check((select status='pending' from public.payment_records where id=v_payment), 'failed transaction leaves payment pending');
  perform pg_temp.payment_check((select status::text='draft' and payment_status='pending' from public.bookings where id=v_booking), 'failed transaction leaves booking unchanged');
  perform pg_temp.payment_check(not exists(select from public.booking_status_events where booking_id=v_booking), 'failed transaction rolls back history');
  perform pg_temp.payment_check(not exists(select from public.notifications where link='/app/bookings/'||v_booking), 'failed transaction rolls back customer notification');
  perform pg_temp.payment_check(not exists(select from public.integration_outbox where source_id=v_booking), 'failed transaction leaves no assignment outbox');
  perform pg_temp.payment_check(not exists(select from public.admin_audit_log where target_id=v_payment), 'failed transaction leaves no success audit');
  perform pg_temp.payment_check(not exists(select from private.booking_payment_settlements where payment_record_id=v_payment), 'failed transaction leaves no receipt');
  perform pg_temp.payment_check((select status='received' from public.provider_events where id=v_event), 'failed transaction leaves provider event retryable');

  -- Remove only this transaction's injected failure. Nothing is committed to staging.
  execute 'drop trigger xoot_test_payment_outbox_failure on public.integration_outbox';
  v_result := public.settle_booking_payment(v_payment,'payfast',12501,v_reference,v_event,v_hash,v_tx,null,null,null);
  perform pg_temp.payment_check((v_result->>'idempotent')::boolean=false, 'retry after rollback completes once');
  perform pg_temp.payment_check((select status='paid' and paid_at is not null from public.payment_records where id=v_payment), 'receipt commits paid money and timestamp');
  perform pg_temp.payment_check((select status::text='payment_confirmed' and payment_status='paid' from public.bookings where id=v_booking), 'receipt commits booking confirmation');
  perform pg_temp.payment_check((select count(*)=1 from public.booking_status_events where booking_id=v_booking), 'one booking history row');
  perform pg_temp.payment_check((select count(*)=1 from public.notifications where link='/app/bookings/'||v_booking), 'one owner notification');
  perform pg_temp.payment_check((select count(*)=1 from public.integration_outbox where source_id=v_booking), 'one assignment outbox row');
  perform pg_temp.payment_check((select count(*)=1 from public.admin_audit_log where target_id=v_payment), 'one financial audit');
  perform pg_temp.payment_check((select count(*)=1 from private.booking_payment_settlements where payment_record_id=v_payment), 'one settlement receipt');
  perform pg_temp.payment_check((select status='processed' from public.provider_events where id=v_event), 'provider event processed in transaction');

  update public.bookings set status='en_route' where id=v_booking;
  v_result := public.settle_booking_payment(v_payment,'payfast',12501,v_reference,v_event,v_hash,v_tx,null,null,null);
  perform pg_temp.payment_check((v_result->>'idempotent')::boolean, 'duplicate callback recognises committed receipt');
  perform pg_temp.payment_check((select status::text='en_route' from public.bookings where id=v_booking), 'duplicate does not regress a later booking');
  perform pg_temp.payment_check((select count(*)=1 from public.notifications where link='/app/bookings/'||v_booking), 'duplicate does not notify twice');
  perform pg_temp.payment_check((select count(*)=1 from public.integration_outbox where source_id=v_booking), 'duplicate does not queue twice');

  v_caught := false;
  begin perform public.settle_booking_payment(v_payment,'payfast',12500,v_reference,v_event,v_hash,v_tx,null,null,null);
  exception when invalid_parameter_value then v_caught:=true; end;
  perform pg_temp.payment_check(v_caught, 'one-cent mismatch rejected even on a replay');
  v_caught := false;
  begin perform public.settle_booking_payment(v_payment,'payfast',12501,v_reference,v_event,repeat('b',64),v_tx,null,null,null);
  exception when invalid_parameter_value then v_caught:=true; end;
  perform pg_temp.payment_check(v_caught, 'event payload mismatch rejected');
  v_caught := false;
  begin perform public.settle_booking_payment(v_payment,'payfast',12501,v_reference,v_event,v_hash,'different_transaction',null,null,null);
  exception when invalid_parameter_value then v_caught:=true; end;
  perform pg_temp.payment_check(v_caught, 'different provider transaction requires reconciliation');
  v_caught := false;
  begin perform public.settle_booking_payment(v_payment,'admin',12501,v_reference,null,null,null,v_owner,'Synthetic unprivileged attempt',null);
  exception when insufficient_privilege then v_caught:=true; end;
  perform pg_temp.payment_check(v_caught, 'customer cannot substitute for an admin');

  insert into public.bookings(id,user_id,service,scheduled_at,price,status,payment_status,notes)
    values(v_other_booking,v_owner,'cleaning',now()+interval '2 days',125.01,'draft','pending','CODEX_PAYFAST_ATOMIC_ROLLBACK_20261027');
  insert into public.payment_records(id,user_id,booking_id,amount,currency,payment_kind,provider,provider_reference,status)
    values(v_other_payment,v_owner,v_other_booking,125.01,'ZAR','booking','payfast',v_reference||'_legacy','paid');
  insert into public.provider_events(id,provider,event_id,event_type,idempotency_key,subject_table,subject_id,payload_hash)
    values(v_other_event,'payfast',v_tx||'_legacy','payment_confirmed',v_tx||'_legacy','payment_records',v_other_payment,v_hash);
  v_caught := false;
  begin perform public.settle_booking_payment(v_other_payment,'payfast',12501,v_reference||'_legacy',v_other_event,v_hash,v_tx||'_legacy',null,null,null);
  exception when invalid_parameter_value then v_caught:=true; end;
  perform pg_temp.payment_check(v_caught, 'legacy paid flag without a receipt is not a success acknowledgement');
  perform pg_temp.payment_check((select status::text='draft' from public.bookings where id=v_other_booking), 'unreconciled legacy booking not mutated');

  -- A synthetic pre-existing admin receipt models late-callback history; no admin role or MFA is fabricated.
  insert into private.booking_payment_settlements(payment_record_id,booking_id,user_id,amount_cents,source,settled_status,provider_reference)
    values(v_other_payment,v_other_booking,v_owner,12501,'admin','admin_confirmed',v_reference||'_legacy');
  update public.payment_records set status='admin_confirmed' where id=v_other_payment;
  update public.bookings set status='en_route',payment_status='paid' where id=v_other_booking;
  v_result := public.settle_booking_payment(v_other_payment,'payfast',12501,v_reference||'_legacy',v_other_event,v_hash,v_tx||'_legacy',null,null,null);
  perform pg_temp.payment_check((v_result->>'idempotent')::boolean, 'first late ITN corroborates an admin receipt');
  perform pg_temp.payment_check((select provider_transaction_id=v_tx||'_legacy' and source='admin' from private.booking_payment_settlements where payment_record_id=v_other_payment), 'late transaction bound while preserving original admin source');
  perform pg_temp.payment_check((select count(*)=1 from public.admin_audit_log where target_id=v_other_payment and action='payfast_admin_settlement_reconciled'), 'late corroboration audit written once');
  v_result := public.settle_booking_payment(v_other_payment,'payfast',12501,v_reference||'_legacy',v_other_event,v_hash,v_tx||'_legacy',null,null,null);
  perform pg_temp.payment_check((select count(*)=1 from public.admin_audit_log where target_id=v_other_payment and action='payfast_admin_settlement_reconciled'), 'late replay does not duplicate its audit');
  v_event := gen_random_uuid();
  insert into public.provider_events(id,provider,event_id,event_type,idempotency_key,subject_table,subject_id,payload_hash)
    values(v_event,'payfast',v_tx||'_second','payment_confirmed',v_tx||'_second','payment_records',v_other_payment,repeat('b',64));
  v_caught := false;
  begin perform public.settle_booking_payment(v_other_payment,'payfast',12501,v_reference||'_legacy',v_event,repeat('b',64),v_tx||'_second',null,null,null);
  exception when invalid_parameter_value then v_caught:=true; end;
  perform pg_temp.payment_check(v_caught, 'second transaction after an admin receipt needs reconciliation');
  perform pg_temp.payment_check((select status='received' from public.provider_events where id=v_event), 'second transaction is not falsely acknowledged');
  perform pg_temp.payment_check((select status::text='en_route' from public.bookings where id=v_other_booking), 'late ITNs do not regress booking progress');
  v_other_booking:=gen_random_uuid(); v_other_payment:=gen_random_uuid();
  insert into public.bookings(id,user_id,service,scheduled_at,price,status,payment_status,notes)
    values(v_other_booking,v_owner,'cleaning',now()+interval '2 days',125.01,'draft','pending','CODEX_PAYFAST_ATOMIC_ROLLBACK_20261027');
  insert into public.payment_records(id,user_id,booking_id,amount,currency,payment_kind,provider)
    values(v_other_payment,v_owner,v_other_booking,125.01,'ZAR','booking','manual_pending');
  v_caught:=false;
  begin perform public.settle_booking_payment(v_other_payment,'admin',12501,'manual_eft:'||v_other_payment,null,null,null,v_owner,'Synthetic ordinary customer',null);
  exception when insufficient_privilege then v_caught:=true; end;
  perform pg_temp.payment_check(v_caught, 'manual no-reference payment reaches the admin guard without a reference mismatch');
end$$;
select count(*) as passed_contract_checks from pg_temp.xoot_payment_test_checks;
