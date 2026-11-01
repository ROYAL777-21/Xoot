-- Free-only evaluation plumbing. No raw-file read, authenticity, activation or payout gate opens.
begin;
create table private.kyc_scan_budget (
  id boolean primary key default true check(id),
  maximum integer not null default 32 check(maximum between 0 and 32),
  used integer not null default 0 check(used between 0 and maximum),
  active_attempt_id uuid, lease_expires_at timestamptz, next_request_at timestamptz,
  personal_documents_allowed boolean not null default false,
  processing_review_reference text,
  check(not personal_documents_allowed or coalesce(length(btrim(processing_review_reference)) >= 20,false))
);
insert into private.kyc_scan_budget(id) values(true);
create table private.kyc_scan_attempts (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.xooter_documents(id) on delete restrict,
  fixture text check(fixture in ('clean_pdf','eicar')),
  policy_version text not null default 'xoot-kyc-cloudmersive-v1' check(policy_version='xoot-kyc-cloudmersive-v1'),
  object_id uuid, object_updated_at timestamptz, storage_path text, sha256 text,
  content_type text, byte_length integer,
  state text not null default 'claimed' check(state in ('claimed','clean','blocked','error')),
  reason text, response_sha256 text check(response_sha256 ~ '^[0-9a-f]{64}$'),
  malware_detected boolean not null default false,
  created_at timestamptz not null default now(), finished_at timestamptz,
  unique(document_id,policy_version), unique(fixture),
  check((document_id is not null and fixture is null and object_id is not null and
    object_updated_at is not null and storage_path is not null and sha256 is not null and sha256 ~ '^[0-9a-f]{64}$'
    and content_type is not null and content_type in ('application/pdf','image/jpeg','image/png','image/webp')
    and byte_length is not null and byte_length between 1 and 3000000) or (document_id is null and fixture is not null)),
  check((state='claimed' and finished_at is null) or (state<>'claimed' and finished_at is not null))
);
alter table private.kyc_scan_budget enable row level security;
alter table private.kyc_scan_attempts enable row level security;
revoke all on private.kyc_scan_budget,private.kyc_scan_attempts from public,anon,authenticated,service_role;
grant select on private.kyc_scan_budget,private.kyc_scan_attempts to service_role;
grant update(used,active_attempt_id,lease_expires_at,next_request_at) on private.kyc_scan_budget to service_role;
grant insert on private.kyc_scan_attempts to service_role;
grant update(state,reason,response_sha256,malware_detected,finished_at) on private.kyc_scan_attempts to service_role;

create function public.claim_kyc_scan(p_document_id uuid default null,p_fixture text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare budget private.kyc_scan_budget%rowtype; attempt private.kyc_scan_attempts%rowtype;
  receipt private.kyc_quarantine_receipts%rowtype; object storage.objects%rowtype;
begin
  if (p_document_id is null)=(p_fixture is null) or (p_fixture is not null and p_fixture not in ('clean_pdf','eicar')) then
    raise exception 'Choose one registered document or fixed synthetic fixture' using errcode='22023';
  end if;
  select * into budget from private.kyc_scan_budget where id for update;
  if not found then return jsonb_build_object('state','held','reason','scan_budget_unavailable');end if;
  select * into attempt from private.kyc_scan_attempts where
    (p_document_id is not null and document_id=p_document_id and policy_version='xoot-kyc-cloudmersive-v1')
    or (p_fixture is not null and fixture=p_fixture);
  if found then return jsonb_build_object('state',attempt.state,'reason',attempt.reason,'attemptId',attempt.id,
    'cached',true,'malwareDetected',attempt.malware_detected);end if;
  if p_document_id is not null then
    if not budget.personal_documents_allowed then return jsonb_build_object('state','held','reason','processing_review_pending');end if;
    select r.* into receipt from private.kyc_quarantine_receipts r join public.xooter_documents d on d.id=r.document_id
      and d.user_id=r.user_id and d.application_id=r.application_id and d.storage_path=r.storage_path
      join public.xooter_applications a on a.id=r.application_id and a.user_id=r.user_id
      where r.document_id=p_document_id and d.status='pending' and a.status in ('draft','rejected','submitted','under_review');
    if not found then return jsonb_build_object('state','held','reason','quarantine_receipt_unavailable');end if;
    if receipt.byte_length>3000000 then return jsonb_build_object('state','held','reason','scan_size_limit');end if;
    select * into object from storage.objects where bucket_id='kyc-docs' and name=receipt.storage_path;
    if not found or object.id is distinct from receipt.object_id or object.updated_at is distinct from receipt.object_updated_at
      or (object.metadata->>'size')::bigint is distinct from receipt.byte_length
      or object.metadata->>'mimetype' is distinct from receipt.content_type then
      return jsonb_build_object('state','held','reason','object_changed');
    end if;
  end if;
  if budget.used>=budget.maximum then return jsonb_build_object('state','held','reason','scan_budget_exhausted');end if;
  if budget.lease_expires_at>clock_timestamp() or budget.next_request_at>clock_timestamp() then
    return jsonb_build_object('state','held','reason','scanner_busy');
  end if;
  insert into private.kyc_scan_attempts(document_id,fixture,object_id,object_updated_at,storage_path,sha256,content_type,byte_length)
    values(p_document_id,p_fixture,receipt.object_id,receipt.object_updated_at,receipt.storage_path,receipt.sha256,receipt.content_type,receipt.byte_length)
    returning * into attempt;
  update private.kyc_scan_budget set used=used+1,active_attempt_id=attempt.id,
    lease_expires_at=clock_timestamp()+interval '60 seconds',next_request_at=clock_timestamp()+interval '1 second' where id;
  return jsonb_build_object('state','claimed','cached',false,'attemptId',attempt.id,'fixture',attempt.fixture,
    'storagePath',attempt.storage_path,'sha256',attempt.sha256,'contentType',attempt.content_type,'byteLength',attempt.byte_length);
end $$;

create function public.finish_kyc_scan(p_attempt_id uuid,p_verdict text,p_reason text,p_response_sha256 text,
  p_observed_sha256 text,p_malware_detected boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare budget private.kyc_scan_budget%rowtype; attempt private.kyc_scan_attempts%rowtype;
  final_verdict text:=p_verdict; final_reason text:=p_reason; current_object boolean;
begin
  if p_verdict is null or p_verdict not in ('clean','blocked','error') or p_reason is null
    or p_reason !~ '^[a-z_]{1,60}$' or (p_response_sha256 is not null and p_response_sha256 !~ '^[a-f0-9]{64}$')
    or (p_verdict in ('clean','blocked') and p_response_sha256 is null) then
    raise exception 'Invalid scanner receipt' using errcode='22023';
  end if;
  select * into budget from private.kyc_scan_budget where id for update;
  select * into attempt from private.kyc_scan_attempts where id=p_attempt_id for update;
  if not found then raise exception 'Scan attempt unavailable' using errcode='22023';end if;
  if attempt.state<>'claimed' then return jsonb_build_object('state',attempt.state,'reason',attempt.reason,
    'attemptId',attempt.id,'cached',true,'malwareDetected',attempt.malware_detected);end if;
  if budget.active_attempt_id is distinct from attempt.id or budget.lease_expires_at<clock_timestamp() then
    final_verdict:='error';final_reason:='scan_lease_expired';
  elsif attempt.document_id is not null then
    select exists(select 1 from private.kyc_quarantine_receipts r
      join public.xooter_documents d on d.id=r.document_id and d.user_id=r.user_id and d.application_id=r.application_id
        and d.storage_path=r.storage_path and d.status='pending'
      join storage.objects o on o.bucket_id='kyc-docs' and o.name=r.storage_path
      where r.document_id=attempt.document_id and r.object_id=attempt.object_id
        and r.object_updated_at=attempt.object_updated_at and r.sha256=attempt.sha256
        and p_observed_sha256=attempt.sha256 and o.id=r.object_id and o.updated_at=r.object_updated_at
        and (o.metadata->>'size')::bigint=r.byte_length and o.metadata->>'mimetype'=r.content_type)
      into current_object;
    if not current_object then final_verdict:='error';final_reason:='object_changed';end if;
  end if;
  update private.kyc_scan_attempts set state=final_verdict,reason=final_reason,response_sha256=p_response_sha256,
    malware_detected=coalesce(p_malware_detected,false),finished_at=clock_timestamp() where id=attempt.id;
  update private.kyc_scan_budget set active_attempt_id=null,lease_expires_at=null
    where id and active_attempt_id=attempt.id;
  return jsonb_build_object('state',final_verdict,'reason',final_reason,'attemptId',attempt.id,'cached',false,
    'malwareDetected',coalesce(p_malware_detected,false));
end $$;
revoke all on function public.claim_kyc_scan(uuid,text) from public,anon,authenticated;
revoke all on function public.finish_kyc_scan(uuid,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.claim_kyc_scan(uuid,text) to service_role;
grant execute on function public.finish_kyc_scan(uuid,text,text,text,text,boolean) to service_role;
comment on table private.kyc_scan_attempts is
  'Private immutable-input malware receipts. A clean verdict is never identity, background, bank, training or availability clearance.';
commit;
