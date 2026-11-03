select public.assert_true((select not enabled and authorized_attempts=0 and used=0 from private.geoapify_evaluation_budget),'trial starts disabled with zero allowance');
select public.assert_true((select count(*)=0 from private.geoapify_evaluation_attempts),'no seeded attempts');
select public.assert_true((select bool_and(relrowsecurity) from pg_class where oid in
  ('private.geoapify_evaluation_budget'::regclass,'private.geoapify_evaluation_attempts'::regclass)),'both private tables have RLS');
select public.assert_true(not exists(select from pg_policies where schemaname='private' and tablename like 'geoapify_evaluation_%'),'no client RLS grants');
select public.assert_true((select bool_and(not prosecdef and proconfig @> array['search_path=""']) from pg_proc where oid in
  ('public.geoapify_evaluation_worker_authorized()'::regprocedure,'public.claim_geoapify_evaluation(text,uuid)'::regprocedure,
   'public.authorize_geoapify_evaluation(uuid,uuid)'::regprocedure,'public.finish_geoapify_evaluation(uuid,uuid,text,text,jsonb)'::regprocedure)),'all four RPCs are invoker with pinned empty search_path');
select public.assert_true(not has_column_privilege('service_role','private.geoapify_evaluation_budget','authorized_attempts','UPDATE'),'worker cannot refill allowance');
select public.assert_true(not has_column_privilege('service_role','private.geoapify_evaluation_budget','enabled','UPDATE'),'worker cannot enable trial');
select public.assert_true(not has_table_privilege('service_role','private.geoapify_evaluation_attempts','DELETE'),'worker cannot delete an ambiguous receipt');
select public.assert_throws($q$update private.geoapify_evaluation_budget set authorized_attempts=21$q$,'23514','even owner cannot exceed twenty');
select public.assert_true(not public.geoapify_evaluation_worker_authorized(),'database owner is not mistaken for a service credential');

set role anon;
select public.assert_throws($q$select * from private.geoapify_evaluation_budget$q$,'42501','anonymous budget read');
select public.assert_throws($q$select public.geoapify_evaluation_worker_authorized()$q$,'42501','anonymous worker probe');
select public.assert_throws($q$select public.claim_geoapify_evaluation('gcis_head_office','00000000-0000-4000-8000-000000000001')$q$,'42501','anonymous claim');
reset role;
set role authenticated;
select public.assert_throws($q$select * from private.geoapify_evaluation_attempts$q$,'42501','customer receipt read');
select public.assert_throws($q$select public.authorize_geoapify_evaluation('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002')$q$,'42501','customer dispatch');
select public.assert_throws($q$select public.finish_geoapify_evaluation('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','error','provider_unavailable',null)$q$,'42501','customer finish');
reset role;
set role service_role;
select public.assert_true(public.geoapify_evaluation_worker_authorized(),'actual service role passes independent probe');
select public.assert_throws($q$update private.geoapify_evaluation_budget set enabled=true$q$,'42501','service role cannot activate');
select public.assert_throws($q$update private.geoapify_evaluation_budget set authorized_attempts=20$q$,'42501','service role cannot refill');
select public.assert_throws($q$select public.claim_geoapify_evaluation('private customer address','00000000-0000-4000-8000-000000000001')$q$,'22023','arbitrary query refused');
select public.assert_true(public.claim_geoapify_evaluation('gcis_head_office','00000000-0000-4000-8000-000000000001')->>'reason'='trial_disabled','disabled trial denies');
reset role;

-- Claims bind fixture, caller nonce, budget revision and the current lease; no retry slot.
begin;
update private.geoapify_evaluation_budget set enabled=true,authorized_attempts=1;
set role service_role;
select public.assert_true(public.claim_geoapify_evaluation('gcis_head_office','00000000-0000-4000-8000-000000000001')->>'state'='claimed','first fixed fixture claims');
select public.assert_true((select used=1 from private.geoapify_evaluation_budget),'one consumed before dispatch');
select public.assert_true(public.claim_geoapify_evaluation('gcis_head_office','00000000-0000-4000-8000-000000000002')->>'reason'='prior_attempt_not_retried','same fixture cached with no new nonce lease');
select public.assert_true(public.claim_geoapify_evaluation('state_theatre','00000000-0000-4000-8000-000000000002')->>'reason'='budget_exhausted','unspent user identity cannot bypass ceiling');
select public.assert_true(not (public.authorize_geoapify_evaluation((select id from private.geoapify_evaluation_attempts),'00000000-0000-4000-8000-000000000002')->>'authorized')::boolean,'wrong nonce denied');
select public.assert_true((public.authorize_geoapify_evaluation((select id from private.geoapify_evaluation_attempts),'00000000-0000-4000-8000-000000000001')->>'authorized')::boolean,'bound dispatch admitted once');
select public.assert_true(not (public.authorize_geoapify_evaluation((select id from private.geoapify_evaluation_attempts),'00000000-0000-4000-8000-000000000001')->>'authorized')::boolean,'dispatch replay denied');
select public.assert_true(public.finish_geoapify_evaluation((select id from private.geoapify_evaluation_attempts),'00000000-0000-4000-8000-000000000002','error','provider_unavailable',null)->>'reason'='receipt_refused','wrong nonce cannot finish');
select public.assert_true(public.finish_geoapify_evaluation((select id from private.geoapify_evaluation_attempts),'00000000-0000-4000-8000-000000000001','error','provider_unavailable',null)->>'state'='error','ambiguous outcome stored');
select public.assert_true((public.finish_geoapify_evaluation((select id from private.geoapify_evaluation_attempts),'00000000-0000-4000-8000-000000000001','error','provider_unavailable',null)->>'cached')::boolean,'finish replay cached');
select public.assert_true(public.claim_geoapify_evaluation('gcis_head_office','00000000-0000-4000-8000-000000000003')->>'reason'='provider_unavailable','timeout never auto resends');
select public.assert_throws($q$update private.geoapify_evaluation_budget set used=0$q$,'23514','consumption never refunded');
reset role;
rollback;

-- An expired/replaced lease or owner policy change cannot authorize/finish an old claim.
begin;
update private.geoapify_evaluation_budget set enabled=true,authorized_attempts=2;
set role service_role;
select public.claim_geoapify_evaluation('gcis_head_office','00000000-0000-4000-8000-000000000001');
reset role;
update private.geoapify_evaluation_budget set lease_expires_at=clock_timestamp()-interval '1 second';
set role service_role;
select public.assert_true(not (public.authorize_geoapify_evaluation((select id from private.geoapify_evaluation_attempts where fixture_id='gcis_head_office'),'00000000-0000-4000-8000-000000000001')->>'authorized')::boolean,'expired lease denied');
select public.assert_true(public.claim_geoapify_evaluation('state_theatre','00000000-0000-4000-8000-000000000002')->>'state'='claimed','different fixture gets fresh lease');
select public.assert_true(public.finish_geoapify_evaluation((select id from private.geoapify_evaluation_attempts where fixture_id='gcis_head_office'),'00000000-0000-4000-8000-000000000001','error','provider_unavailable',null)->>'reason'='receipt_not_current','old finish cannot clear current active lease');
reset role;
update private.geoapify_evaluation_budget set enabled=false;
set role service_role;
select public.assert_true(not (public.authorize_geoapify_evaluation((select id from private.geoapify_evaluation_attempts where fixture_id='state_theatre'),'00000000-0000-4000-8000-000000000002')->>'authorized')::boolean,'owner disabling revokes pending dispatch');
reset role;
update private.geoapify_evaluation_budget set enabled=true;
set role service_role;
select public.assert_true(not (public.authorize_geoapify_evaluation((select id from private.geoapify_evaluation_attempts where fixture_id='state_theatre'),'00000000-0000-4000-8000-000000000002')->>'authorized')::boolean,'reenabling does not resurrect old budget revision');
reset role;
rollback;

-- A successful no-result receipt carries only constrained normalized evidence.
begin;
update private.geoapify_evaluation_budget set enabled=true,authorized_attempts=2;
set role service_role;
select public.claim_geoapify_evaluation('gcis_head_office','00000000-0000-4000-8000-000000000001');
select public.authorize_geoapify_evaluation((select id from private.geoapify_evaluation_attempts),'00000000-0000-4000-8000-000000000001');
select public.assert_throws($q$update private.geoapify_evaluation_attempts set report='{"apiKey":"synthetic-forbidden-field"}'$q$,'23514','unknown receipt fields refused');
select public.assert_true(public.finish_geoapify_evaluation((select id from private.geoapify_evaluation_attempts),'00000000-0000-4000-8000-000000000001','complete','provider_response',
  '{"outcome":"no_results","candidateCount":0,"countryCode":null,"houseNumber":"missing","streetMatches":false,"localityMatches":false,"provinceMatches":false,"resultType":"unknown","matchType":"unknown","confidence":{"overall":null,"city":null,"street":null,"building":null},"location":{"latitude":null,"longitude":null},"source":"unreviewed"}'::jsonb)->>'state'='complete','bounded report accepted');
select public.assert_true(public.claim_geoapify_evaluation('state_theatre','00000000-0000-4000-8000-000000000002')->>'reason'='worker_busy','immediate next fixture respects dispatch spacing');
reset role;
rollback;

select public.assert_true((select authorized_queries=3 and consumed_queries=3 from public.xoot_mapbox_geocoding_budget where budget_key='paused_sentinel'),'Mapbox allowance stays paused and unchanged');
select 'Geoapify private evaluation SQL contract passed' result;
