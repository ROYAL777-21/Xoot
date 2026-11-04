create function public.assert_atomic(p_ok boolean,p_message text) returns void
language plpgsql as $$ begin if p_ok is distinct from true then raise exception 'ATOMIC_FAILED: %',p_message; end if; end $$;
create function public.expect_atomic_error(p_sql text,p_code text) returns void
language plpgsql as $$ begin
  begin execute p_sql; exception when others then
    if sqlstate=p_code then return; end if; raise;
  end; raise exception 'ATOMIC_FAILED: expected SQLSTATE %',p_code;
end $$;

insert into auth.users(id) values
('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002');
insert into public.bookings(id,user_id,status) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','draft'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','pending_payment');
insert into public.payment_records(id,user_id,booking_id,amount,payment_kind,provider_reference) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',200,'booking','synthetic_one'),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002',200,'booking','synthetic_two');
insert into public.xootcred_ledger(user_id,amount,direction,status,reason) values
('10000000-0000-4000-8000-000000000001',100,'credit','available','synthetic'),
('10000000-0000-4000-8000-000000000002',100,'credit','available','synthetic');
-- Stable explicit request identity: exact owner, payment, accepted due and credit cents.
create function public.synthetic_redeem(p_actor uuid default '10000000-0000-4000-8000-000000000001',
 p_booking uuid default '20000000-0000-4000-8000-000000000001',
 p_payment uuid default '30000000-0000-4000-8000-000000000001',
 p_key uuid default '40000000-0000-4000-8000-000000000001',
 p_due bigint default 20000,p_credit bigint default 7000) returns jsonb
language sql security invoker as $$ select public.redeem_booking_xootcred(p_actor,p_booking,p_payment,p_key,p_due,p_credit) $$;
revoke all on function public.synthetic_redeem(uuid,uuid,uuid,uuid,bigint,bigint) from public;
grant execute on function public.synthetic_redeem(uuid,uuid,uuid,uuid,bigint,bigint) to service_role;
select public.assert_atomic(not has_function_privilege('anon','public.redeem_booking_xootcred(uuid,uuid,uuid,uuid,bigint,bigint)','EXECUTE'),'anon RPC denied');
select public.assert_atomic(not has_function_privilege('authenticated','public.redeem_booking_xootcred(uuid,uuid,uuid,uuid,bigint,bigint)','EXECUTE'),'user RPC denied');
select public.assert_atomic(has_function_privilege('service_role','public.redeem_booking_xootcred(uuid,uuid,uuid,uuid,bigint,bigint)','EXECUTE'),'service RPC permitted');
select public.assert_atomic(not has_table_privilege('service_role','private.booking_credit_redemptions','INSERT'),'service cannot forge receipts');
select public.assert_atomic((select relrowsecurity from pg_class where oid='private.booking_credit_redemptions'::regclass),'receipt RLS enabled');
select public.assert_atomic(not has_function_privilege('authenticated','private.redeem_booking_xootcred(uuid,uuid,uuid,uuid,bigint,bigint)','EXECUTE'),'private definer denied to customer');
select public.assert_atomic(not has_table_privilege('service_role','private.booking_credit_redemptions','UPDATE'),'service cannot rewrite original receipt');
set role authenticated;
select public.expect_atomic_error('select public.synthetic_redeem()','42501');
reset role;
set role service_role;
select public.expect_atomic_error($q$select public.synthetic_redeem(p_actor=>'10000000-0000-4000-8000-000000000002')$q$,'42501');
select public.expect_atomic_error($q$select public.synthetic_redeem(p_payment=>'30000000-0000-4000-8000-000000000002')$q$,'22023');
select public.expect_atomic_error('select public.synthetic_redeem(p_due=>19999)','22023');
select public.expect_atomic_error('select public.synthetic_redeem(p_credit=>10001)','23514');
select public.expect_atomic_error('select public.synthetic_redeem(p_credit=>15001)','22023');
select public.expect_atomic_error('select public.synthetic_redeem(p_credit=>0)','22023');
reset role;
select public.assert_atomic((select amount=200 from public.payment_records where id='30000000-0000-4000-8000-000000000001'),'invalid identity/amount/balance leave payment unchanged');
select public.assert_atomic((select count(*)=0 from public.xootcred_ledger where direction='debit'),'invalid attempts debit nothing');

update public.bookings set status=null where id='20000000-0000-4000-8000-000000000001';
set role service_role;
select public.expect_atomic_error('select public.synthetic_redeem()','22023');
reset role;
update public.bookings set status='draft',crew_size=2 where id='20000000-0000-4000-8000-000000000001';
set role service_role;
select public.expect_atomic_error('select public.synthetic_redeem()','22023');
reset role;
update public.bookings set crew_size=1 where id='20000000-0000-4000-8000-000000000001';
update public.payment_records set currency='USD' where id='30000000-0000-4000-8000-000000000001';
set role service_role;
select public.expect_atomic_error('select public.synthetic_redeem()','22023');
reset role;
update public.payment_records set currency='ZAR',meta='[]' where id='30000000-0000-4000-8000-000000000001';
set role service_role;
select public.expect_atomic_error('select public.synthetic_redeem()','22023');
reset role;
update public.payment_records set meta='{}' where id='30000000-0000-4000-8000-000000000001';
insert into private.booking_payment_settlements values('30000000-0000-4000-8000-000000000001');
set role service_role;
select public.expect_atomic_error('select public.synthetic_redeem()','22023');
reset role;
delete from private.booking_payment_settlements;
insert into private.booking_cancellations values('20000000-0000-4000-8000-000000000001');
set role service_role;
select public.expect_atomic_error('select public.synthetic_redeem()','22023');
reset role;
delete from private.booking_cancellations;
insert into public.payment_records(id,user_id,booking_id,amount,payment_kind)
  values('30000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',200,'booking');
set role service_role;
select public.expect_atomic_error('select public.synthetic_redeem()','22023');
reset role;
delete from public.payment_records where id='30000000-0000-4000-8000-000000000009';

-- An audit or receipt failure rolls back the preceding debit AND payment update.
alter table public.admin_audit_log add constraint synthetic_audit_refusal check(false);
set role service_role;
select public.expect_atomic_error('select public.synthetic_redeem()','23514');
reset role;
select public.assert_atomic((select amount=200 from public.payment_records where id='30000000-0000-4000-8000-000000000001'),'audit rejection rolls back price');
select public.assert_atomic((select count(*)=0 from public.xootcred_ledger where direction='debit'),'audit rejection rolls back debit');
select public.assert_atomic((select count(*)=0 from private.booking_credit_redemptions),'audit rejection leaves no receipt');
alter table public.admin_audit_log drop constraint synthetic_audit_refusal;
alter table private.booking_credit_redemptions add constraint synthetic_receipt_refusal check(false);
set role service_role;
select public.expect_atomic_error('select public.synthetic_redeem()','23514');
reset role;
select public.assert_atomic((select count(*)=0 from public.admin_audit_log),'receipt rejection rolls back audit');
select public.assert_atomic((select amount=200 from public.payment_records where id='30000000-0000-4000-8000-000000000001'),'receipt rejection rolls back price');
alter table private.booking_credit_redemptions drop constraint synthetic_receipt_refusal;
set role service_role;
select public.assert_atomic((public.synthetic_redeem()->>'amount_due')::numeric=130,'exact committed amount');
select public.assert_atomic((public.synthetic_redeem()->>'idempotent')::boolean,'exact retry returns receipt');
select public.expect_atomic_error('select public.synthetic_redeem(p_credit=>6000)','22023');
select public.expect_atomic_error($q$select public.synthetic_redeem(p_booking=>'20000000-0000-4000-8000-000000000002',p_payment=>'30000000-0000-4000-8000-000000000002',p_actor=>'10000000-0000-4000-8000-000000000002')$q$,'42501');
reset role;
select public.assert_atomic((select count(*)=1 from private.booking_credit_redemptions),'one immutable receipt');
select public.assert_atomic((select count(*)=1 from public.xootcred_ledger where direction='debit'),'retry never double debits');
select public.assert_atomic((select count(*)=1 from public.admin_audit_log),'retry never duplicates audit');
select public.assert_atomic((select provider_reference='synthetic_one' and provider='manual_pending' from public.payment_records where id='30000000-0000-4000-8000-000000000001'),'payment route and reference unchanged');
-- New exact request is legitimate, but stale due and overdraw cannot pass.
set role service_role;
select public.expect_atomic_error($q$select public.synthetic_redeem(p_key=>'40000000-0000-4000-8000-000000000002')$q$,'22023');
select public.assert_atomic((public.synthetic_redeem(p_key=>'40000000-0000-4000-8000-000000000002',p_due=>13000,p_credit=>3000)->>'amount_due')::numeric=100,'second distinct accepted redemption is preserved');
reset role;

update public.payment_records set provider='payfast' where id='30000000-0000-4000-8000-000000000002';
set role service_role;
select public.expect_atomic_error($q$select public.synthetic_redeem('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000003')$q$,'22023');
reset role;
update public.payment_records set provider='manual_pending',status='paid',paid_at=now() where id='30000000-0000-4000-8000-000000000002';
set role service_role;
select public.expect_atomic_error($q$select public.synthetic_redeem('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000003')$q$,'22023');
reset role;
select public.assert_atomic((select amount=200 and status='paid' from public.payment_records where id='30000000-0000-4000-8000-000000000002'),'paid history remains untouched');
update public.payment_records set provider='payfast',status='paid',paid_at=now() where id='30000000-0000-4000-8000-000000000001';
update public.bookings set status='payment_confirmed',payment_status='paid' where id='20000000-0000-4000-8000-000000000001';
set role service_role;
select public.assert_atomic((public.synthetic_redeem()->>'idempotent')::boolean,'committed original receipt still replays after settlement');
reset role;
