-- Run after the local fixture and exact migration. No real people or actual files involved.
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
set role authenticated;
select public.assert_true((select count(*)=0 from storage.objects where bucket_id='kyc-docs'),'owner cannot read raw files');
select public.assert_true((select count(*)=1 from storage.objects where bucket_id='public-assets'),'unrelated storage reads retained');
select public.assert_throws($q$insert into public.xooter_documents(user_id,status) values(auth.uid(),'approved')$q$,'42501','no forged document insert');
select public.assert_throws($q$update public.xooter_applications set full_name='forged' where user_id=auth.uid()$q$,'42501','individual UPDATE grant revoked');
select public.assert_throws($q$insert into public.xooter_applications(user_id,status) values(auth.uid(),'approved')$q$,'42501','no forged application insert');
select public.assert_throws($q$delete from public.xooter_applications where user_id=auth.uid()$q$,'42501','no owner application deletion');
select public.assert_throws($q$select * from private.kyc_quarantine_receipts$q$,'42501','receipt is not browser-readable');
select public.assert_throws($q$truncate public.xooter_documents$q$,'42501','no truncate bypass');
select public.assert_throws($q$select public.inspect_quarantined_kyc_object(auth.uid(),'10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001/id.pdf')$q$,'42501','metadata RPC is service only');
with changed as(update storage.objects set metadata='{}' where bucket_id='kyc-docs' returning id)
 select public.assert_true((select count(*)=0 from changed),'raw UPDATE denied despite legacy permissive ALL');
reset role;
set role service_role;
select public.assert_true(public.inspect_quarantined_kyc_object('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001/id.pdf')->>'id'='20000000-0000-4000-8000-000000000001','narrow metadata RPC works');
select public.assert_true(public.inspect_quarantined_kyc_object('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001/id.pdf') is null,'foreign owner metadata denied');
select public.assert_throws($q$select public.register_quarantined_kyc_document('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','id','00000000-0000-4000-8000-000000000001/id.pdf','20000000-0000-4000-8000-000000000001','2026-10-25T00:00:00Z',repeat('a',64),'application/pdf',12)$q$,'40001','stale object fingerprint rejected');
select public.assert_throws($q$select public.register_quarantined_kyc_document('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','id','00000000-0000-4000-8000-000000000001/id.pdf','20000000-0000-4000-8000-000000000001','2026-10-26T00:00:00Z','invalid','application/pdf',12)$q$,'23514','bad receipt rolls back document insert');
select public.assert_true((select count(*)=0 from public.xooter_documents),'failed registration left no partial document');
select public.register_quarantined_kyc_document('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','id','00000000-0000-4000-8000-000000000001/id.pdf','20000000-0000-4000-8000-000000000001','2026-10-26T00:00:00Z',repeat('a',64),'application/pdf',12);
select public.register_quarantined_kyc_document('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','selfie','00000000-0000-4000-8000-000000000001/selfie.png','20000000-0000-4000-8000-000000000002','2026-10-26T00:00:00Z',repeat('b',64),'image/png',16);
select public.assert_true((select selfie_storage_path='00000000-0000-4000-8000-000000000001/selfie.png' from public.xooter_applications),'selfie pointer committed in same transaction');
select public.assert_true((select count(*)=2 from private.kyc_quarantine_receipts),'two private fingerprints stored');
select public.assert_true((select bool_and(status='pending') from public.xooter_documents),'fingerprinting never clears a document');
select public.assert_true(public.inspect_quarantined_kyc_object('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001/id.pdf')->'document'->>'storage_path'='00000000-0000-4000-8000-000000000001/id.pdf','registered retry returns only current document receipt');
select public.assert_true((select used=1 from private.kyc_quarantine_limits where kind='inspection'),'registered retry does not consume another inspection or download');
select public.assert_throws($q$select public.register_quarantined_kyc_document('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','id','00000000-0000-4000-8000-000000000001/id.pdf','20000000-0000-4000-8000-000000000001','2026-10-26T00:00:00Z',repeat('a',64),'application/pdf',12)$q$,'23505','registered path cannot be reused');
select public.assert_throws($q$insert into public.xooters(user_id,active) values('00000000-0000-4000-8000-000000000001',true)$q$,'23514','service activation cannot bypass clearance');
select public.assert_throws($q$update public.xooter_applications set status='approved'$q$,'23514','service application approval cannot bypass clearance');
select public.assert_throws($q$insert into public.user_roles(user_id,role) values('00000000-0000-4000-8000-000000000001','xooter')$q$,'23514','service Xooter role grant cannot bypass clearance');
update public.xooters set active=true where id='30000000-0000-4000-8000-000000000001';
select public.assert_true((select count(*)=1 from public.xooters where active),'unrelated pre-existing staging worker retained');
reset role;
set role authenticated;
with gone as(delete from storage.objects where bucket_id='kyc-docs' returning id)
 select public.assert_true((select count(*)=0 from gone),'registered raw objects cannot be deleted');
-- Unregistered uploads also stay inaccessible pending privileged orphan cleanup.
insert into storage.objects(bucket_id,name) values('kyc-docs','00000000-0000-4000-8000-000000000001/unused.pdf');
with gone as(delete from storage.objects where name='00000000-0000-4000-8000-000000000001/unused.pdf' returning id)
 select public.assert_true((select count(*)=0 from gone),'unregistered upload cannot bypass raw-file containment');
reset role;
set role service_role;
update public.xooter_applications set status='submitted';
select public.assert_throws($q$update public.xooter_applications set status='draft',full_name='late draft'$q$,'23514','stale draft cannot undo submission');
select public.assert_throws($q$update public.xooter_applications set full_name='late changed identity'$q$,'23514','submitted identity cannot race the review lock');
reset role;
-- Limits are durable and non-renewing, including repeated inspection attempts.
begin;
set role authenticated;
insert into storage.objects(bucket_id,name) select 'kyc-docs','00000000-0000-4000-8000-000000000001/quota-'||n||'.pdf' from generate_series(1,7) n;
select public.assert_throws($q$insert into storage.objects(bucket_id,name) values('kyc-docs','00000000-0000-4000-8000-000000000001/quota-9.pdf')$q$,'23514','ninth owner upload denied');
reset role;
select public.assert_true((select used=8 from private.kyc_owner_quarantine_limits where user_id='00000000-0000-4000-8000-000000000001' and kind='upload'),'eight owner uploads counted once');
update private.kyc_quarantine_limits set maximum=used where kind='upload';
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
select public.assert_throws($q$insert into storage.objects(bucket_id,name) values('kyc-docs','00000000-0000-4000-8000-000000000002/global-denied.pdf')$q$,'23514','global upload ceiling denies another owner');
reset role;
rollback;
begin;
set role service_role;
-- Original unused object has no receipt. Only its first inspection may authorise a download.
select public.inspect_quarantined_kyc_object('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001/unused.pdf');
reset role;
-- Submitted applications fail before a reservation/download is issued.
select public.assert_true((select used=1 from private.kyc_quarantine_limits where kind='inspection'),'submitted app does not consume inspection budget');
rollback;
select 'KYC quarantine contract passed' as result;
