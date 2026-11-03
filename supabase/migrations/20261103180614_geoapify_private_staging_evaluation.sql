-- Separate fixed-public-fixture Geoapify evaluation. This never changes Mapbox allowances,
-- coverage, saved places, worker availability, GPS, Directions, payments or notifications.
-- Disabled/zero by default. Only the database owner can grant up to 20 lifetime attempts.
create schema if not exists private;
create table private.geoapify_evaluation_budget (
  id boolean primary key default true check(id),
  project_ref text not null default 'fxmxyabdjqviqbcxmvlp' check(project_ref='fxmxyabdjqviqbcxmvlp'),
  policy_version text not null default 'xoot-geoapify-public-fixtures-v1' check(policy_version='xoot-geoapify-public-fixtures-v1'),
  enabled boolean not null default false,
  authorized_attempts integer not null default 0 check(authorized_attempts between 0 and 20),
  used integer not null default 0 check(used between 0 and authorized_attempts),
  revision bigint not null default 1 check(revision>0),
  active_attempt_id uuid, lease_expires_at timestamptz, next_request_at timestamptz,
  check((active_attempt_id is null)=(lease_expires_at is null))
);
insert into private.geoapify_evaluation_budget(id) values(true);

create table private.geoapify_evaluation_attempts (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null unique check(fixture_id in ('gcis_head_office','state_theatre','union_buildings')),
  nonce uuid not null unique,
  budget_revision bigint not null check(budget_revision>0),
  policy_version text not null default 'xoot-geoapify-public-fixtures-v1' check(policy_version='xoot-geoapify-public-fixtures-v1'),
  state text not null default 'claimed' check(state in ('claimed','dispatched','complete','error')),
  reason text check(reason in ('provider_response','dispatch_denied','dispatch_window_elapsed','provider_unavailable','provider_http_error','provider_invalid_response')),
  report jsonb,
  created_at timestamptz not null default clock_timestamp(), dispatched_at timestamptz, finished_at timestamptz,
  check((state='claimed' and dispatched_at is null and finished_at is null and reason is null and report is null)
    or (state='dispatched' and dispatched_at is not null and finished_at is null and reason is null and report is null)
    or (state='complete' and dispatched_at is not null and finished_at is not null and reason='provider_response' and report is not null)
    or (state='error' and finished_at is not null and reason is not null and reason<>'provider_response' and report is null)),
  -- Only bounded enums, booleans and numeric quality evidence may be stored. No raw address,
  -- upstream URL/body, provider key, display text or arbitrary JSON field reaches the receipt.
  check(report is null or coalesce(length(report::text)<=2048 and jsonb_typeof(report)='object'
    and report ?& array['outcome','candidateCount','countryCode','houseNumber','streetMatches','localityMatches','provinceMatches','resultType','matchType','confidence','location','source']
    and report-array['outcome','candidateCount','countryCode','houseNumber','streetMatches','localityMatches','provinceMatches','resultType','matchType','confidence','location','source']='{}'::jsonb
    and report->>'outcome' in ('address_candidate','place_candidate','needs_review','no_results')
    and jsonb_typeof(report->'candidateCount')='number' and (report->>'candidateCount')::integer between 0 and 3
    and (report->>'candidateCount')::numeric=(report->>'candidateCount')::integer
    and (report->'countryCode'='null'::jsonb or report->>'countryCode' ~ '^[a-z]{2}$')
    and report->>'houseNumber' in ('match','missing','mismatch','not_requested')
    and jsonb_typeof(report->'streetMatches')='boolean' and jsonb_typeof(report->'localityMatches')='boolean' and jsonb_typeof(report->'provinceMatches')='boolean'
    and report->>'resultType' in ('unknown','amenity','building','street','suburb','district','postcode','city','county','state','country')
    and report->>'matchType' in ('unknown','full_match','inner_part','match_by_building','match_by_street','match_by_postcode','match_by_city_or_disrict','match_by_city_or_district','match_by_country_or_state')
    and report->>'source' in ('openstreetmap','unreviewed')
    and jsonb_typeof(report->'confidence')='object'
    and (report->'confidence') ?& array['overall','city','street','building']
    and (report->'confidence')-array['overall','city','street','building']='{}'::jsonb
    and ((report#>'{confidence,overall}')='null'::jsonb or (jsonb_typeof(report#>'{confidence,overall}')='number' and (report#>>'{confidence,overall}')::numeric between 0 and 1))
    and ((report#>'{confidence,city}')='null'::jsonb or (jsonb_typeof(report#>'{confidence,city}')='number' and (report#>>'{confidence,city}')::numeric between 0 and 1))
    and ((report#>'{confidence,street}')='null'::jsonb or (jsonb_typeof(report#>'{confidence,street}')='number' and (report#>>'{confidence,street}')::numeric between 0 and 1))
    and ((report#>'{confidence,building}')='null'::jsonb or (jsonb_typeof(report#>'{confidence,building}')='number' and (report#>>'{confidence,building}')::numeric between 0 and 1))
    and jsonb_typeof(report->'location')='object' and (report->'location') ?& array['latitude','longitude']
    and (report->'location')-array['latitude','longitude']='{}'::jsonb
    and ((report#>'{location,latitude}')='null'::jsonb or (jsonb_typeof(report#>'{location,latitude}')='number' and (report#>>'{location,latitude}')::numeric between -90 and 90))
    and ((report#>'{location,longitude}')='null'::jsonb or (jsonb_typeof(report#>'{location,longitude}')='number' and (report#>>'{location,longitude}')::numeric between -180 and 180))
    and ((report->>'outcome'='no_results' and (report->>'candidateCount')::integer=0)
      or (report->>'outcome'<>'no_results' and (report->>'candidateCount')::integer>0))
    and (report->>'outcome' not in ('address_candidate','place_candidate') or (
      report->>'countryCode'='za' and report->'streetMatches'='true'::jsonb and report->'localityMatches'='true'::jsonb
      and report->'provinceMatches'='true'::jsonb and report->>'source'='openstreetmap' and report->>'matchType'='full_match'
      and report->>'resultType' in ('building','amenity') and (report#>>'{confidence,overall}')::numeric>=0.95
      and (report#>>'{confidence,city}')::numeric>=0.95 and (report#>>'{confidence,street}')::numeric>=0.95
      and (report#>>'{confidence,building}')::numeric>=0.9 and (report#>'{location,latitude}')<>'null'::jsonb
      and (report#>'{location,longitude}')<>'null'::jsonb and
      ((report->>'outcome'='address_candidate' and report->>'houseNumber'='match' and fixture_id<>'union_buildings') or
       (report->>'outcome'='place_candidate' and report->>'houseNumber'='not_requested' and fixture_id='union_buildings')))),false))
);
alter table private.geoapify_evaluation_budget enable row level security;
alter table private.geoapify_evaluation_attempts enable row level security;
revoke all on private.geoapify_evaluation_budget,private.geoapify_evaluation_attempts from public,anon,authenticated,service_role;
grant usage on schema private to service_role;
grant select on private.geoapify_evaluation_budget,private.geoapify_evaluation_attempts to service_role;
grant update(used,active_attempt_id,lease_expires_at,next_request_at) on private.geoapify_evaluation_budget to service_role;
grant insert(fixture_id,nonce,budget_revision) on private.geoapify_evaluation_attempts to service_role;
grant update(state,reason,report,dispatched_at,finished_at) on private.geoapify_evaluation_attempts to service_role;

-- Internal trigger, not a Data API RPC. A used attempt is never refunded, even on timeout.
-- Owner policy changes invalidate outstanding leases; service_role cannot alter policy/allowance.
create function private.preserve_geoapify_evaluation_budget()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.used<old.used or new.used>old.used+1 then
    raise exception 'Evaluation consumption is monotonic and advances one attempt' using errcode='23514';
  end if;
  new.revision:=old.revision+case when new.enabled is distinct from old.enabled or
    new.authorized_attempts is distinct from old.authorized_attempts then 1 else 0 end;
  return new;
end $$;
revoke all on function private.preserve_geoapify_evaluation_budget() from public,anon,authenticated,service_role;
create trigger preserve_geoapify_evaluation_budget before update on private.geoapify_evaluation_budget
for each row execute function private.preserve_geoapify_evaluation_budget();

create function public.geoapify_evaluation_worker_authorized()
returns boolean language sql stable security invoker set search_path='' as $$ select current_user='service_role'; $$;

create function public.claim_geoapify_evaluation(p_fixture_id text,p_nonce uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare budget private.geoapify_evaluation_budget%rowtype; attempt private.geoapify_evaluation_attempts%rowtype;
begin
  if current_user<>'service_role' or p_nonce is null or p_fixture_id is null or
    p_fixture_id not in ('gcis_head_office','state_theatre','union_buildings') then
    raise exception 'Fixed public fixture and worker nonce required' using errcode='22023';
  end if;
  select * into budget from private.geoapify_evaluation_budget where id for update;
  if not found then return jsonb_build_object('policyVersion','xoot-geoapify-public-fixtures-v1','state','held','reason','budget_unavailable');end if;
  select * into attempt from private.geoapify_evaluation_attempts where fixture_id=p_fixture_id;
  if found then
    return jsonb_build_object('policyVersion',attempt.policy_version,'state',case when attempt.state in ('claimed','dispatched') then 'held' else attempt.state end,
      'reason',case when attempt.state in ('claimed','dispatched') then 'prior_attempt_not_retried' else attempt.reason end,
      'attemptId',attempt.id,'cached',true,'report',attempt.report);
  end if;
  if not budget.enabled or budget.authorized_attempts=0 then
    return jsonb_build_object('policyVersion',budget.policy_version,'state','held','reason','trial_disabled');end if;
  if budget.used>=budget.authorized_attempts then
    return jsonb_build_object('policyVersion',budget.policy_version,'state','held','reason','budget_exhausted');end if;
  if budget.lease_expires_at>clock_timestamp() or budget.next_request_at>clock_timestamp() then
    return jsonb_build_object('policyVersion',budget.policy_version,'state','held','reason','worker_busy');end if;
  insert into private.geoapify_evaluation_attempts(fixture_id,nonce,budget_revision)
    values(p_fixture_id,p_nonce,budget.revision) returning * into attempt;
  update private.geoapify_evaluation_budget set used=used+1,active_attempt_id=attempt.id,
    lease_expires_at=clock_timestamp()+interval '30 seconds' where id;
  return jsonb_build_object('policyVersion',budget.policy_version,'state','claimed','cached',false,'attemptId',attempt.id,'fixtureId',attempt.fixture_id);
end $$;

create function public.authorize_geoapify_evaluation(p_attempt_id uuid,p_nonce uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare budget private.geoapify_evaluation_budget%rowtype; attempt private.geoapify_evaluation_attempts%rowtype;
begin
  select * into budget from private.geoapify_evaluation_budget where id for update;
  select * into attempt from private.geoapify_evaluation_attempts where id=p_attempt_id for update;
  if current_user<>'service_role' or not found or p_nonce is null or attempt.nonce<>p_nonce or attempt.state<>'claimed'
    or not budget.enabled or budget.used>budget.authorized_attempts or attempt.budget_revision<>budget.revision
    or budget.active_attempt_id is distinct from p_attempt_id or budget.lease_expires_at is null or budget.lease_expires_at<=clock_timestamp()
    or budget.next_request_at>clock_timestamp() then return jsonb_build_object('authorized',false);end if;
  update private.geoapify_evaluation_attempts set state='dispatched',dispatched_at=clock_timestamp() where id=p_attempt_id;
  -- Handler permits dispatch for at most 2s after this RPC starts; 3.5s spacing is safely <5rps.
  update private.geoapify_evaluation_budget set lease_expires_at=clock_timestamp()+interval '30 seconds',
    next_request_at=clock_timestamp()+interval '3500 milliseconds' where id;
  return jsonb_build_object('authorized',true,'attemptId',attempt.id,'nonce',attempt.nonce,'fixtureId',attempt.fixture_id,'policyVersion',attempt.policy_version);
end $$;

create function public.finish_geoapify_evaluation(p_attempt_id uuid,p_nonce uuid,p_state text,p_reason text,p_report jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare budget private.geoapify_evaluation_budget%rowtype; attempt private.geoapify_evaluation_attempts%rowtype;
begin
  select * into budget from private.geoapify_evaluation_budget where id for update;
  select * into attempt from private.geoapify_evaluation_attempts where id=p_attempt_id for update;
  if current_user<>'service_role' or not found or p_nonce is null or attempt.nonce<>p_nonce then
    return jsonb_build_object('policyVersion','xoot-geoapify-public-fixtures-v1','state','held','reason','receipt_refused');end if;
  if attempt.state in ('complete','error') then return jsonb_build_object('policyVersion',attempt.policy_version,'state',attempt.state,
    'reason',attempt.reason,'attemptId',attempt.id,'cached',true,'report',attempt.report);end if;
  if not budget.enabled or attempt.budget_revision<>budget.revision or budget.active_attempt_id is distinct from p_attempt_id
    or budget.lease_expires_at is null or budget.lease_expires_at<=clock_timestamp() then
    return jsonb_build_object('policyVersion',attempt.policy_version,'state','held','reason','receipt_not_current');end if;
  if p_state not in ('complete','error') or p_state is null or
    (p_state='complete' and (attempt.state<>'dispatched' or p_reason is distinct from 'provider_response' or p_report is null)) or
    (p_state='error' and (p_report is not null or p_reason is null or p_reason not in
      ('dispatch_denied','dispatch_window_elapsed','provider_unavailable','provider_http_error','provider_invalid_response'))) then
    raise exception 'Invalid evaluation receipt' using errcode='22023';end if;
  update private.geoapify_evaluation_attempts set state=p_state,reason=p_reason,report=p_report,finished_at=clock_timestamp()
    where id=p_attempt_id returning * into attempt;
  update private.geoapify_evaluation_budget set active_attempt_id=null,lease_expires_at=null where id;
  return jsonb_build_object('policyVersion',attempt.policy_version,'state',attempt.state,'reason',attempt.reason,'attemptId',attempt.id,'cached',false,'report',attempt.report);
end $$;

revoke all on function public.geoapify_evaluation_worker_authorized() from public,anon,authenticated;
revoke all on function public.claim_geoapify_evaluation(text,uuid) from public,anon,authenticated;
revoke all on function public.authorize_geoapify_evaluation(uuid,uuid) from public,anon,authenticated;
revoke all on function public.finish_geoapify_evaluation(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.geoapify_evaluation_worker_authorized() to service_role;
grant execute on function public.claim_geoapify_evaluation(text,uuid) to service_role;
grant execute on function public.authorize_geoapify_evaluation(uuid,uuid) to service_role;
grant execute on function public.finish_geoapify_evaluation(uuid,uuid,text,text,jsonb) to service_role;
comment on table private.geoapify_evaluation_budget is 'Owner-disabled fixed-public-fixture evaluation only; max20 lifetime, no renewal/refund/fallback or Mapbox coupling.';
comment on table private.geoapify_evaluation_attempts is 'Once-only public civic fixture evidence. Confidence is not verified address, geography coverage or verified Xooter availability.';
