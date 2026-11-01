-- Preserve terminal v1 evidence; a corrected parser gets its own fixed policy, not a receipt reset.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
-- Existing claim/dispatch/finish transactions lock the budget before the attempt table.
lock table private.kyc_scan_budget in exclusive mode;
do $$ begin
  if exists(select from private.kyc_scan_budget where active_attempt_id is not null or lease_expires_at>clock_timestamp()) then
    raise exception 'Finish the active scanner attempt before policy delivery' using errcode='55000';
  end if;
end $$;
alter table private.kyc_scan_attempts drop constraint kyc_scan_attempts_policy_version_check;
alter table private.kyc_scan_attempts add constraint kyc_scan_attempts_policy_version_check
  check(policy_version in ('xoot-kyc-cloudmersive-v1','xoot-kyc-cloudmersive-v2'));
alter table private.kyc_scan_attempts drop constraint kyc_scan_attempts_fixture_key;
alter table private.kyc_scan_attempts add constraint kyc_scan_attempts_fixture_policy_key unique(fixture,policy_version);

create function private.claim_kyc_scan_policy(p_document_id uuid,p_fixture text,p_policy_version text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare budget private.kyc_scan_budget%rowtype; attempt private.kyc_scan_attempts%rowtype;
  receipt private.kyc_quarantine_receipts%rowtype; object storage.objects%rowtype;
begin
  if p_policy_version is null or p_policy_version not in ('xoot-kyc-cloudmersive-v1','xoot-kyc-cloudmersive-v2')
    or (p_document_id is null)=(p_fixture is null) or (p_fixture is not null and p_fixture not in ('clean_pdf','eicar')) then
    raise exception 'Choose one registered input and a fixed scanner policy' using errcode='22023';
  end if;
  select * into budget from private.kyc_scan_budget where id for update;
  if not found then return jsonb_build_object('state','held','reason','scan_budget_unavailable');end if;
  select * into attempt from private.kyc_scan_attempts where policy_version=p_policy_version and
    ((p_document_id is not null and document_id=p_document_id) or (p_fixture is not null and fixture=p_fixture));
  if found then return jsonb_build_object('state',attempt.state,'reason',attempt.reason,'attemptId',attempt.id,
    'cached',true,'malwareDetected',attempt.malware_detected,'policyVersion',attempt.policy_version);end if;
  if p_document_id is not null then
    if not budget.personal_documents_allowed then return jsonb_build_object('state','held','reason','processing_review_pending','policyVersion',p_policy_version);end if;
    select r.* into receipt from private.kyc_quarantine_receipts r join public.xooter_documents d on d.id=r.document_id
      and d.user_id=r.user_id and d.application_id=r.application_id and d.storage_path=r.storage_path
      join public.xooter_applications a on a.id=r.application_id and a.user_id=r.user_id
      where r.document_id=p_document_id and d.status='pending' and a.status in ('draft','rejected','submitted','under_review');
    if not found then return jsonb_build_object('state','held','reason','quarantine_receipt_unavailable','policyVersion',p_policy_version);end if;
    if receipt.byte_length>3000000 then return jsonb_build_object('state','held','reason','scan_size_limit','policyVersion',p_policy_version);end if;
    select * into object from storage.objects where bucket_id='kyc-docs' and name=receipt.storage_path;
    if not found or object.id is distinct from receipt.object_id or object.updated_at is distinct from receipt.object_updated_at
      or (object.metadata->>'size')::bigint is distinct from receipt.byte_length
      or object.metadata->>'mimetype' is distinct from receipt.content_type then
      return jsonb_build_object('state','held','reason','object_changed','policyVersion',p_policy_version);
    end if;
  end if;
  if budget.used>=budget.maximum then return jsonb_build_object('state','held','reason','scan_budget_exhausted','policyVersion',p_policy_version);end if;
  if budget.lease_expires_at>clock_timestamp() or budget.next_request_at>clock_timestamp() then
    return jsonb_build_object('state','held','reason','scanner_busy','policyVersion',p_policy_version);
  end if;
  insert into private.kyc_scan_attempts(document_id,fixture,policy_version,object_id,object_updated_at,storage_path,sha256,content_type,byte_length)
    values(p_document_id,p_fixture,p_policy_version,receipt.object_id,receipt.object_updated_at,receipt.storage_path,receipt.sha256,receipt.content_type,receipt.byte_length)
    returning * into attempt;
  update private.kyc_scan_budget set used=used+1,active_attempt_id=attempt.id,lease_expires_at=clock_timestamp()+interval '60 seconds' where id;
  return jsonb_build_object('state','claimed','cached',false,'attemptId',attempt.id,'fixture',attempt.fixture,
    'storagePath',attempt.storage_path,'sha256',attempt.sha256,'contentType',attempt.content_type,'byteLength',attempt.byte_length,
    'policyVersion',attempt.policy_version);
end $$;
revoke all on function private.claim_kyc_scan_policy(uuid,text,text) from public,anon,authenticated;
grant execute on function private.claim_kyc_scan_policy(uuid,text,text) to service_role;

-- Existing frozen v1 workers keep their exact policy, including BOTH fixture/document cache paths.
create or replace function public.claim_kyc_scan(p_document_id uuid default null,p_fixture text default null)
returns jsonb language sql security invoker set search_path='' as $$
  select private.claim_kyc_scan_policy(p_document_id,p_fixture,'xoot-kyc-cloudmersive-v1');
$$;
create function public.claim_kyc_scan_v2(p_document_id uuid default null,p_fixture text default null)
returns jsonb language sql security invoker set search_path='' as $$
  select private.claim_kyc_scan_policy(p_document_id,p_fixture,'xoot-kyc-cloudmersive-v2');
$$;
revoke all on function public.claim_kyc_scan(uuid,text) from public,anon,authenticated;
revoke all on function public.claim_kyc_scan_v2(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_kyc_scan(uuid,text),public.claim_kyc_scan_v2(uuid,text) to service_role;
notify pgrst,'reload schema';
commit;
