-- Disposable fixture only: v1 contract has already executed, including three durable attempts.
begin;
create temp table scanner_v1_before as select * from private.kyc_scan_attempts;
select public.assert_true((select used=3 and maximum=32 from private.kyc_scan_budget),'policy migration preserves actual prior spend and cap');
set role anon;
select public.assert_throws($q$select public.claim_kyc_scan_v2(null,'eicar')$q$,'42501','anonymous v2 denied');
reset role;
set role authenticated;
select public.assert_throws($q$select public.claim_kyc_scan_v2(null,'eicar')$q$,'42501','customer v2 denied');
select public.assert_throws($q$select private.claim_kyc_scan_policy(null,'eicar','xoot-kyc-cloudmersive-v2')$q$,'42501','customer cannot pick a private policy');
reset role;
set role service_role;
select public.assert_throws($q$select private.claim_kyc_scan_policy(null,'eicar','arbitrary-policy')$q$,'22023','unknown policies are not quota bypasses');
select public.assert_true(public.claim_kyc_scan(null,'clean_pdf')->>'policyVersion'='xoot-kyc-cloudmersive-v1','frozen v1 API retains its fixed policy');
select public.assert_true(public.claim_kyc_scan(null,'clean_pdf')->>'cached'='true','v1 retry keeps prior receipt');
select public.assert_true(public.claim_kyc_scan((select document_id from private.kyc_quarantine_receipts limit 1),null)->>'policyVersion'='xoot-kyc-cloudmersive-v1',
 'v1 registered-document lookup retains its original policy');
select public.assert_true(public.claim_kyc_scan_v2((select document_id from private.kyc_quarantine_receipts limit 1),null)->>'reason'='object_changed',
 'v2 document lookup cannot substitute an older cached receipt');
select public.assert_true((select used=3 from private.kyc_scan_budget),'held revised object consumes no new attempt');
reset role;
update private.kyc_scan_budget set next_request_at=clock_timestamp()-interval '1 second';
set role service_role;
select public.assert_true(public.claim_kyc_scan_v2(null,'clean_pdf')->>'state'='claimed','new fixed policy claims separately');
select public.assert_true((select used=4 from private.kyc_scan_budget),'v2 uses the same global allowance');
select public.assert_true(public.claim_kyc_scan_v2(null,'clean_pdf')->>'cached'='true','v2 retry does not consume again');
select public.assert_true(public.claim_kyc_scan(null,'clean_pdf')->>'policyVersion'='xoot-kyc-cloudmersive-v1','v1 fixture lookup cannot return v2');
select public.assert_true(public.claim_kyc_scan_v2(null,'clean_pdf')->>'policyVersion'='xoot-kyc-cloudmersive-v2','v2 fixture lookup cannot return v1');
select public.assert_true(public.claim_kyc_scan_v2(null,'eicar')->>'reason'='scanner_busy','versions share one in-flight lease');
select public.authorize_kyc_scan_dispatch((select id from private.kyc_scan_attempts where fixture='clean_pdf' and policy_version='xoot-kyc-cloudmersive-v2'));
select public.finish_kyc_scan((select id from private.kyc_scan_attempts where fixture='clean_pdf' and policy_version='xoot-kyc-cloudmersive-v2'),
 'clean','provider_clean',repeat('d',64),null,false);
reset role;
update private.kyc_scan_budget set next_request_at=clock_timestamp()-interval '1 second';
set role service_role;
select public.assert_true(public.claim_kyc_scan_v2(null,'eicar')->>'state'='claimed','second v2 fixture claims within the same cap');
select public.authorize_kyc_scan_dispatch((select id from private.kyc_scan_attempts where fixture='eicar' and policy_version='xoot-kyc-cloudmersive-v2'));
select public.finish_kyc_scan((select id from private.kyc_scan_attempts where fixture='eicar' and policy_version='xoot-kyc-cloudmersive-v2'),
 'blocked','provider_rejected',repeat('e',64),null,true);
select public.assert_true((select used=5 and maximum=32 from private.kyc_scan_budget),'no refill across policy versions');
select public.assert_true(public.claim_kyc_scan(null,'eicar')->>'policyVersion'='xoot-kyc-cloudmersive-v1','legacy malware receipt remains independently cached');
select public.assert_throws($q$update private.kyc_scan_attempts set policy_version='xoot-kyc-cloudmersive-v1'
 where fixture='eicar' and policy_version='xoot-kyc-cloudmersive-v2'$q$,'42501','worker cannot relabel immutable evidence');
reset role;
select public.assert_true(not exists((select * from scanner_v1_before) except
 (select * from private.kyc_scan_attempts where policy_version='xoot-kyc-cloudmersive-v1')),'every original v1 field and digest remains unchanged');
select public.assert_true((select count(*)=2 from private.kyc_scan_attempts where policy_version='xoot-kyc-cloudmersive-v2'),'exactly two v2 fixture receipts');
select public.assert_throws($q$insert into private.kyc_scan_attempts(fixture,policy_version)
 values('clean_pdf','arbitrary-policy')$q$,'23514','even direct privileged insert retains policy constraint');
commit;
