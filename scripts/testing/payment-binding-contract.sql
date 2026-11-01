create function public.assert_binding(p_condition boolean,p_case text) returns void language plpgsql as $$
begin if p_condition is distinct from true then raise exception 'PAYMENT_BINDING_FAILED: %',p_case;end if;end $$;
create function public.expect_binding_error(p_sql text,p_code text,p_case text) returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when others then
    if sqlstate=p_code then return;end if;
    raise exception 'PAYMENT_BINDING_WRONG_ERROR: % expected % received %',p_case,p_code,sqlstate;
  end;
  raise exception 'PAYMENT_BINDING_NOT_REFUSED: %',p_case;
end $$;

insert into public.bookings(id,user_id) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002');
insert into public.payment_records(id,user_id,booking_id,amount,provider_reference) values
 ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',289,'synthetic-booking-a'),
 ('20000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',289,'synthetic-booking-b');
insert into public.provider_events(id,event_id,subject_id,payload_hash) values
 ('30000000-0000-4000-8000-000000000001','payfast:synthetic-transaction-a','20000000-0000-4000-8000-000000000001',repeat('a',64));

set role service_role;
select public.settle_booking_payment('20000000-0000-4000-8000-000000000001','payfast',28900,'synthetic-booking-a',
 '30000000-0000-4000-8000-000000000001',repeat('a',64),'synthetic-transaction-a',null,null,null);
reset role;
select public.assert_binding((select count(*)=1 from private.payfast_payment_bindings),'first actual booking transaction is bound');
select public.assert_binding((select status='processed' from public.provider_events where id='30000000-0000-4000-8000-000000000001'),'first event processed atomically');
select public.assert_binding((select count(*)=1 from public.notifications),'one notification');
select public.assert_binding((select count(*)=1 from public.integration_outbox),'one consequence outbox');

set role service_role;
select public.settle_booking_payment('20000000-0000-4000-8000-000000000001','payfast',28900,'synthetic-booking-a',
 '30000000-0000-4000-8000-000000000001',repeat('a',64),'synthetic-transaction-a',null,null,null);
reset role;
select public.assert_binding((select count(*)=1 from public.notifications),'exact callback retry adds no notification');
select public.assert_binding((select count(*)=1 from private.payfast_payment_bindings),'exact retry adds no provider binding');

-- Model actual event retention cleanup, then another claimed event with the old external ID.
-- The fixture keeps the real UNIQUE(provider,event_id) constraint; it never invents simultaneous
-- duplicate canonical events to manufacture a replay that the production schema already denies.
delete from public.provider_events where id='30000000-0000-4000-8000-000000000001';
select public.assert_binding((select provider_event_id is null from private.booking_payment_settlements
 where payment_record_id='20000000-0000-4000-8000-000000000001'),'event cleanup preserves the first receipt');
insert into public.provider_events(id,event_id,subject_id,payload_hash) values
 ('30000000-0000-4000-8000-000000000002','payfast:synthetic-transaction-a','20000000-0000-4000-8000-000000000002',repeat('b',64));

select public.expect_binding_error($q$select public.settle_booking_payment('20000000-0000-4000-8000-000000000002','payfast',28900,'synthetic-booking-b',
 '30000000-0000-4000-8000-000000000002',repeat('b',64),'synthetic-transaction-a',null,null,null)$q$,'23505','a second booking cannot reuse the transaction');
select public.assert_binding((select status='pending' from public.payment_records where id='20000000-0000-4000-8000-000000000002'),'replay rolls back payment');
select public.assert_binding((select status='pending_payment' and payment_status='pending' from public.bookings where id='10000000-0000-4000-8000-000000000002'),'replay rolls back booking');
select public.assert_binding((select count(*)=1 from public.notifications),'replay rolls back notification');
select public.assert_binding((select count(*)=1 from private.booking_payment_settlements),'replay rolls back receipt');
select public.assert_binding((select status='received' from public.provider_events where id='30000000-0000-4000-8000-000000000002'),'replay does not process another event');
update public.provider_events set event_id='payfast:synthetic-rejected-booking' where id='30000000-0000-4000-8000-000000000002';

-- Future membership/gift settlements must call this SAME private helper inside their transaction.
insert into public.payment_records(id,user_id,amount,provider_reference,payment_kind,status) values
 ('20000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',99,'synthetic-membership','homecare_membership','paid'),
 ('20000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000002',289,'synthetic-gift','gift_clean','paid');
insert into public.provider_events(id,event_id,subject_id,payload_hash) values
 ('30000000-0000-4000-8000-000000000003','payfast:synthetic-transaction-a','20000000-0000-4000-8000-000000000003',repeat('c',64));
select public.expect_binding_error($q$select private.bind_payfast_payment_transaction('20000000-0000-4000-8000-000000000003','homecare_membership',9900,
 'synthetic-membership','synthetic-transaction-a','30000000-0000-4000-8000-000000000003')$q$,'23505','cross-kind membership replay');
update public.provider_events set event_id='payfast:synthetic-pending-membership' where id='30000000-0000-4000-8000-000000000003';
insert into public.provider_events(id,event_id,subject_id,payload_hash) values
 ('30000000-0000-4000-8000-000000000004','payfast:synthetic-transaction-a','20000000-0000-4000-8000-000000000004',repeat('d',64));
select public.expect_binding_error($q$select private.bind_payfast_payment_transaction('20000000-0000-4000-8000-000000000004','gift_clean',28900,
 'synthetic-gift','synthetic-transaction-a','30000000-0000-4000-8000-000000000004')$q$,'23505','cross-kind gift replay');
select public.assert_binding((select count(*)=1 from private.payfast_payment_bindings),'cross-kind refusal leaves one binding');

-- A paid flag alone, wrong event subject/ID, amount, provider or reference proves nothing.
select public.expect_binding_error($q$select private.bind_payfast_payment_transaction('20000000-0000-4000-8000-000000000003','homecare_membership',9900,
 'synthetic-membership','synthetic-unbound','30000000-0000-4000-8000-000000000003')$q$,'22023','event ID must bind the exact transaction');
select public.expect_binding_error($q$select private.bind_payfast_payment_transaction('20000000-0000-4000-8000-000000000003','homecare_membership',9900,
 'synthetic-membership','synthetic-transaction-a','30000000-0000-4000-8000-000000000001')$q$,'22023','event subject must bind the exact payment');
select public.expect_binding_error($q$select private.bind_payfast_payment_transaction('20000000-0000-4000-8000-000000000003','homecare_membership',1,
 'synthetic-membership','synthetic-transaction-a','30000000-0000-4000-8000-000000000003')$q$,'22023','exact cents');
select public.expect_binding_error($q$select private.bind_payfast_payment_transaction('20000000-0000-4000-8000-000000000003','booking',9900,
 'synthetic-membership','synthetic-transaction-a','30000000-0000-4000-8000-000000000003')$q$,'22023','exact kind');
select public.expect_binding_error($q$select private.bind_payfast_payment_transaction('20000000-0000-4000-8000-000000000003','homecare_membership',9900,
 'caller-reference','synthetic-transaction-a','30000000-0000-4000-8000-000000000003')$q$,'22023','exact reference');
select public.expect_binding_error($q$select private.bind_payfast_payment_transaction('20000000-0000-4000-8000-000000000003','homecare_membership',9900,
 'synthetic-membership',E'unsafe\ntransaction','30000000-0000-4000-8000-000000000003')$q$,'22023','control characters refused');
select public.expect_binding_error($q$select private.bind_payfast_payment_transaction('20000000-0000-4000-8000-000000000003','homecare_membership',9900,
 'synthetic-membership','synthetic-transaction-a',null)$q$,'22023','no event is not evidence');

update public.provider_events set event_id='payfast:synthetic-membership-tx' where id='30000000-0000-4000-8000-000000000003';
select private.bind_payfast_payment_transaction('20000000-0000-4000-8000-000000000003','homecare_membership',9900,
 'synthetic-membership','synthetic-membership-tx','30000000-0000-4000-8000-000000000003');
update public.provider_events set event_id='payfast:synthetic-second-charge' where id='30000000-0000-4000-8000-000000000003';
select public.expect_binding_error($q$select private.bind_payfast_payment_transaction('20000000-0000-4000-8000-000000000003','homecare_membership',9900,
 'synthetic-membership','synthetic-second-charge','30000000-0000-4000-8000-000000000003')$q$,'23505','second charge for same payment is held');
select public.assert_binding((select count(*)=2 from private.payfast_payment_bindings),'distinct valid payments bind independently');

select public.expect_binding_error($q$update private.booking_payment_settlements set amount_cents=1 where payment_record_id='20000000-0000-4000-8000-000000000001'$q$,
 '22023','receipt amount immutable');
select public.expect_binding_error($q$update private.booking_payment_settlements set provider_transaction_id=null where payment_record_id='20000000-0000-4000-8000-000000000001'$q$,
 '22023','receipt binding cannot be removed');
select public.assert_binding((select count(*)=2 from private.payfast_payment_bindings),'receipt edit refusal leaves bindings intact');

-- Admin-first, then a genuine late ITN: corroborate once without another fulfilment or regression.
insert into public.bookings(id,user_id) values('10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001');
insert into public.payment_records(id,user_id,booking_id,amount,provider_reference) values
 ('20000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003',289,'synthetic-admin-first');
insert into public.user_roles values('00000000-0000-4000-8000-000000000002','admin');
insert into auth.sessions values('40000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','aal2',clock_timestamp()+interval '1 hour');
set role service_role;
select public.settle_booking_payment('20000000-0000-4000-8000-000000000005','admin',28900,'synthetic-admin-first',null,null,null,
 '00000000-0000-4000-8000-000000000002','Synthetic review of the provider receipt','40000000-0000-4000-8000-000000000001');
reset role;
select public.assert_binding((select count(*)=2 from private.payfast_payment_bindings),'admin receipt alone claims no provider transaction');
update public.bookings set status='completed' where id='10000000-0000-4000-8000-000000000003';
insert into public.provider_events(id,event_id,subject_id,payload_hash) values
 ('30000000-0000-4000-8000-000000000005','payfast:synthetic-late-itn','20000000-0000-4000-8000-000000000005',repeat('e',64));
set role service_role;
select public.settle_booking_payment('20000000-0000-4000-8000-000000000005','payfast',28900,'synthetic-admin-first',
 '30000000-0000-4000-8000-000000000005',repeat('e',64),'synthetic-late-itn',null,null,null);
reset role;
select public.assert_binding((select count(*)=3 from private.payfast_payment_bindings),'late genuine ITN creates one durable binding');
select public.assert_binding((select status='completed' from public.bookings where id='10000000-0000-4000-8000-000000000003'),'late ITN preserves completed booking');
select public.assert_binding((select count(*)=2 from public.notifications),'late ITN does not repeat fulfilment');
select public.assert_binding((select source='admin' and provider_transaction_id='synthetic-late-itn'
 from private.booking_payment_settlements where payment_record_id='20000000-0000-4000-8000-000000000005'),'admin receipt remains the original source');

update public.payment_records set status='refunded' where id='20000000-0000-4000-8000-000000000005';
set role service_role;
select public.settle_booking_payment('20000000-0000-4000-8000-000000000005','payfast',28900,'synthetic-admin-first',
 '30000000-0000-4000-8000-000000000005',repeat('e',64),'synthetic-late-itn',null,null,null);
reset role;
select public.assert_binding((select status='refunded' from public.payment_records where id='20000000-0000-4000-8000-000000000005'),
 'genuine retry preserves later refund');
update public.payment_records set status='cancelled' where id='20000000-0000-4000-8000-000000000005';
set role service_role;
select public.settle_booking_payment('20000000-0000-4000-8000-000000000005','payfast',28900,'synthetic-admin-first',
 '30000000-0000-4000-8000-000000000005',repeat('e',64),'synthetic-late-itn',null,null,null);
reset role;
select public.assert_binding((select status='cancelled' from public.payment_records where id='20000000-0000-4000-8000-000000000005'),
 'genuine retry preserves later cancellation');
select public.assert_binding((select count(*)=2 from public.notifications),'refunded/cancelled retries add no fulfilment');

delete from public.provider_events where id='30000000-0000-4000-8000-000000000005';
select public.assert_binding((select provider_event_id is null from private.booking_payment_settlements
 where payment_record_id='20000000-0000-4000-8000-000000000005'),'existing event FK cleanup remains possible');
select public.assert_binding(exists(select from private.payfast_payment_bindings where provider_transaction_id='synthetic-late-itn'),
 'event cleanup retains external transaction tombstone');

-- A later deletion cannot release a provider transaction for another payment/kind.
delete from private.booking_payment_settlements where payment_record_id='20000000-0000-4000-8000-000000000001';
select public.assert_binding(exists(select from private.payfast_payment_bindings where provider_transaction_id='synthetic-transaction-a'),
 'provider binding survives source receipt deletion');
update public.provider_events set event_id='payfast:synthetic-transaction-a' where id='30000000-0000-4000-8000-000000000004';
select public.expect_binding_error($q$select private.bind_payfast_payment_transaction('20000000-0000-4000-8000-000000000004','gift_clean',28900,
 'synthetic-gift','synthetic-transaction-a','30000000-0000-4000-8000-000000000004')$q$,'23505','deleted receipt cannot reopen cross-kind replay');

-- Actual role execution, including service role: only the vetted settlement's definer can bind.
set role anon;
select public.expect_binding_error($q$select * from private.payfast_payment_bindings$q$,'42501','anonymous private read denied');
select public.expect_binding_error($q$select private.bind_payfast_payment_transaction(null,null,null,null,null,null)$q$,'42501','anonymous bind denied');
reset role;
set role authenticated;
select public.expect_binding_error($q$select * from private.payfast_payment_bindings$q$,'42501','customer private read denied');
select public.expect_binding_error($q$select private.bind_payfast_payment_transaction(null,null,null,null,null,null)$q$,'42501','customer bind denied');
reset role;
set role service_role;
select public.expect_binding_error($q$select private.bind_payfast_payment_transaction(null,null,null,null,null,null)$q$,'42501','service cannot call financial binder directly');
select public.expect_binding_error($q$delete from private.payfast_payment_bindings$q$,'42501','service cannot erase transaction history');
reset role;
select public.assert_binding((select relrowsecurity from pg_class where oid='private.payfast_payment_bindings'::regclass),'registry RLS retained');
select public.assert_binding((select not prosecdef and proconfig @> array['search_path=""'] from pg_proc
 where oid='private.bind_payfast_payment_transaction(uuid,text,bigint,text,text,uuid)'::regprocedure),'binder is invoker with empty search path');
