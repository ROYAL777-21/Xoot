-- Containment only. No antivirus or identity-authenticity verdict is manufactured here.
-- Unblocking requires a reviewed immutable scan/read path and atomic approval migration.
begin;

create table private.kyc_quarantine_receipts (
  document_id uuid primary key references public.xooter_documents(id) on delete restrict,
  application_id uuid not null references public.xooter_applications(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique,
  object_id uuid not null,
  object_updated_at timestamptz not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  content_type text not null check (content_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  byte_length integer not null check (byte_length between 1 and 8388608),
  registered_at timestamptz not null default now()
);
alter table private.kyc_quarantine_receipts enable row level security;
revoke all on private.kyc_quarantine_receipts from public, anon, authenticated;
grant select, insert on private.kyc_quarantine_receipts to service_role;
grant usage on schema private to service_role;

-- Small, non-renewing containment limits. Raising them needs a reviewed migration.
create table private.kyc_quarantine_limits (
  kind text primary key check(kind in ('upload','inspection')),
  maximum integer not null default 32 check(maximum between 0 and 32),
  used integer not null default 0 check(used between 0 and maximum)
);
create table private.kyc_owner_quarantine_limits (
  user_id uuid not null references auth.users(id), kind text not null,
  used integer not null check(used between 1 and 8),primary key(user_id,kind)
);
create table private.kyc_inspection_attempts (
  storage_path text primary key,user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table private.kyc_quarantine_limits enable row level security;
alter table private.kyc_owner_quarantine_limits enable row level security;
alter table private.kyc_inspection_attempts enable row level security;
revoke all on private.kyc_quarantine_limits,private.kyc_owner_quarantine_limits,private.kyc_inspection_attempts
  from public,anon,authenticated;
grant select,insert,update on private.kyc_quarantine_limits,private.kyc_owner_quarantine_limits,private.kyc_inspection_attempts to service_role;
insert into private.kyc_quarantine_limits(kind) values('upload'),('inspection');

create function private.consume_kyc_quarantine_limit(p_user_id uuid,p_kind text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare cap integer; spent integer; affected integer;
begin
  if p_user_id is null or p_kind not in ('upload','inspection') then return false;end if;
  select maximum,used into cap,spent from private.kyc_quarantine_limits where kind=p_kind for update;
  if not found or spent>=cap then return false;end if;
  insert into private.kyc_owner_quarantine_limits(user_id,kind,used) values(p_user_id,p_kind,1)
    on conflict(user_id,kind) do update set used=private.kyc_owner_quarantine_limits.used+1
    where private.kyc_owner_quarantine_limits.used<8;
  get diagnostics affected=row_count;
  if affected<>1 then return false;end if;
  update private.kyc_quarantine_limits set used=used+1 where kind=p_kind;
  return true;
end $$;
revoke all on function private.consume_kyc_quarantine_limit(uuid,text) from public,anon,authenticated;
grant execute on function private.consume_kyc_quarantine_limit(uuid,text) to service_role;

create function private.enforce_kyc_upload_quarantine_limit() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.bucket_id='kyc-docs' and not private.consume_kyc_quarantine_limit(split_part(new.name,'/',1)::uuid,'upload') then
    raise exception 'Document upload limit reached; contact Xoot support' using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function private.enforce_kyc_upload_quarantine_limit() from public,anon,authenticated;
create trigger kyc_quarantine_upload_limit before insert on storage.objects
  for each row execute function private.enforce_kyc_upload_quarantine_limit();

-- The earlier lockdown granted individual columns. Revoking the table alone is insufficient.
do $$ declare t text; cols text; begin
  foreach t in array array['xooter_documents','xooter_applications'] loop
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    select string_agg(quote_ident(column_name), ',') into cols
      from information_schema.columns where table_schema='public' and table_name=t;
    execute format('revoke all (%s) on public.%I from public, anon, authenticated', cols,t);
    execute format('grant select on public.%I to authenticated',t);
  end loop;
end $$;

-- All legacy permissive KYC policies remain fenced by these restrictive policies.
create policy kyc_raw_reads_closed on storage.objects as restrictive for select
  to anon, authenticated using (bucket_id <> 'kyc-docs');
create policy kyc_raw_updates_closed on storage.objects as restrictive for update
  to anon, authenticated using (bucket_id <> 'kyc-docs') with check (bucket_id <> 'kyc-docs');

create function private.kyc_unregistered_owner_path(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null
    and split_part(p_path,'/',1)=auth.uid()::text
    and not exists(select 1 from public.xooter_documents d where d.storage_path=p_path)
    and not exists(select 1 from private.kyc_quarantine_receipts r where r.storage_path=p_path)
$$;
revoke all on function private.kyc_unregistered_owner_path(text) from public, anon;
grant execute on function private.kyc_unregistered_owner_path(text) to authenticated;
create policy kyc_registered_paths_no_reuse on storage.objects as restrictive for insert
  to anon, authenticated with check (bucket_id <> 'kyc-docs' or private.kyc_unregistered_owner_path(name));
-- Raw SELECT is closed, so browser deletion cannot reliably clean up a failed upload.
-- Retention/orphan cleanup must use a reviewed privileged worker, not a client exception.
create policy kyc_raw_deletes_closed on storage.objects as restrictive for delete
  to anon, authenticated using (bucket_id <> 'kyc-docs');

-- Storage stays outside the exposed API schemas. This narrow service-only RPC reads metadata.
create function public.inspect_quarantined_kyc_object(p_user_id uuid, p_application_id uuid, p_storage_path text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; existing jsonb; affected integer;
begin
  -- Idempotent retry: acknowledge the exact still-current quarantined receipt without a download.
  select jsonb_build_object('document',jsonb_build_object('id',d.id,'user_id',d.user_id,
    'application_id',d.application_id,'doc_type',d.doc_type,'storage_path',d.storage_path,
    'status',d.status,'safety_status','quarantined')) into existing
  from public.xooter_documents d join private.kyc_quarantine_receipts r on r.document_id=d.id
    join storage.objects o on o.bucket_id='kyc-docs' and o.name=r.storage_path
  where d.user_id=p_user_id and d.application_id=p_application_id and d.storage_path=p_storage_path
    and r.user_id=d.user_id and r.application_id=d.application_id
    and o.id=r.object_id and o.updated_at=r.object_updated_at;
  if existing is not null then return existing;end if;
  -- Any other registered/foreign/legacy path is rejected cheaply, never re-downloaded.
  if exists(select 1 from public.xooter_documents where storage_path=p_storage_path)
    or exists(select 1 from private.kyc_quarantine_receipts where storage_path=p_storage_path) then return null;end if;
  select jsonb_build_object('id',o.id,'updated_at',o.updated_at,'metadata',
    jsonb_build_object('size',o.metadata->'size','mimetype',o.metadata->'mimetype'))
  into result from storage.objects o
  where o.bucket_id='kyc-docs' and o.name=p_storage_path
    and p_storage_path ~ ('^'||p_user_id::text||'/[A-Za-z0-9][A-Za-z0-9._-]*$')
    and exists(select 1 from public.xooter_applications a where a.id=p_application_id
      and a.user_id=p_user_id and a.status in ('draft','rejected'));
  if result is null then return null;end if;
  insert into private.kyc_inspection_attempts(storage_path,user_id) values(p_storage_path,p_user_id)
    on conflict(storage_path) do nothing;
  get diagnostics affected=row_count;
  if affected<>1 or not private.consume_kyc_quarantine_limit(p_user_id,'inspection') then return null;end if;
  return result;
end
$$;
revoke all on function public.inspect_quarantined_kyc_object(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.inspect_quarantined_kyc_object(uuid,uuid,text) to service_role;

create function public.register_quarantined_kyc_document(
  p_user_id uuid, p_application_id uuid, p_doc_type text, p_storage_path text,
  p_object_id uuid, p_object_updated_at timestamptz, p_sha256 text,
  p_content_type text, p_byte_length integer
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.xooter_applications%rowtype; o storage.objects%rowtype;
  d public.xooter_documents%rowtype;
begin
  if p_doc_type not in ('id','proof_of_residence','bank_statement','selfie')
     or p_storage_path !~ ('^'||p_user_id::text||'/[A-Za-z0-9][A-Za-z0-9._-]*$') then
    raise exception 'invalid document registration' using errcode='22023';
  end if;
  select * into a from public.xooter_applications
    where id=p_application_id and user_id=p_user_id for update;
  if not found or a.status not in ('draft','rejected') then
    raise exception 'editable applicant application required' using errcode='42501';
  end if;
  select * into o from storage.objects where bucket_id='kyc-docs' and name=p_storage_path for share;
  if not found or o.id is distinct from p_object_id or o.updated_at is distinct from p_object_updated_at
    or (o.metadata->>'size')::bigint is distinct from p_byte_length::bigint
    or o.metadata->>'mimetype' is distinct from p_content_type then
    raise exception 'uploaded object changed or missing' using errcode='40001';
  end if;
  if exists(select 1 from public.xooter_documents where storage_path=p_storage_path) then
    raise exception 'registered document paths cannot be reused' using errcode='23505';
  end if;
  insert into public.xooter_documents(user_id,application_id,doc_type,storage_path,status)
    values(p_user_id,p_application_id,p_doc_type,p_storage_path,'pending') returning * into d;
  insert into private.kyc_quarantine_receipts(document_id,application_id,user_id,storage_path,
    object_id,object_updated_at,sha256,content_type,byte_length)
    values(d.id,a.id,p_user_id,p_storage_path,o.id,o.updated_at,p_sha256,p_content_type,p_byte_length);
  if p_doc_type='selfie' then
    update public.xooter_applications set selfie_storage_path=p_storage_path where id=a.id;
  end if;
  return jsonb_build_object('id',d.id,'user_id',d.user_id,'application_id',d.application_id,
    'doc_type',d.doc_type,'storage_path',d.storage_path,'status',d.status,'safety_status','quarantined');
end $$;
revoke all on function public.register_quarantined_kyc_document(uuid,uuid,text,text,uuid,timestamptz,text,text,integer)
  from public, anon, authenticated;
grant execute on function public.register_quarantined_kyc_document(uuid,uuid,text,text,uuid,timestamptz,text,text,integer)
  to service_role;

-- A draft request that started before submission cannot undo the review lock afterwards.
create function private.kyc_application_edit_lock() returns trigger
language plpgsql security invoker set search_path='' as $$
declare review_fields text[] := array['status','updated_at','reviewer_notes','reviewed_at','reviewed_by',
  'activation_locked_reason','verification_notes','id_verification_status','selfie_verification_status',
  'address_verification_status','banking_verification_status','reference_verification_status',
  'background_check_status','third_party_verification_status'];
begin
  if old.status not in ('draft','rejected') and
    (new.status='draft' or (to_jsonb(new)-review_fields) is distinct from (to_jsonb(old)-review_fields)) then
    raise exception 'Application is locked for review' using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function private.kyc_application_edit_lock() from public,anon,authenticated;
create trigger kyc_application_edit_locked before update on public.xooter_applications
  for each row execute function private.kyc_application_edit_lock();

-- This is deliberately not a configurable boolean. No unscanned file can be approved.
create function private.kyc_quarantine_activation_interlock() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_table_name='xooter_applications' then
    if new.status='approved' and (tg_op='INSERT' or old.status is distinct from 'approved') then
      raise exception 'KYC activation unavailable: private malware scan and authenticity clearance are pending' using errcode='23514';
    end if;
  elsif tg_table_name='xooters' then
    if new.active and (tg_op='INSERT' or not old.active or old.user_id is distinct from new.user_id) then
      raise exception 'KYC activation unavailable: private malware scan and authenticity clearance are pending' using errcode='23514';
    end if;
  elsif tg_table_name='user_roles' then
    if new.role::text='xooter' and (tg_op='INSERT' or old.role::text is distinct from 'xooter' or old.user_id is distinct from new.user_id) then
      raise exception 'KYC role grant unavailable: private malware scan and authenticity clearance are pending' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.kyc_quarantine_activation_interlock() from public, anon, authenticated;
create trigger kyc_application_clearance_required before insert or update on public.xooter_applications
  for each row execute function private.kyc_quarantine_activation_interlock();
create trigger kyc_contractor_clearance_required before insert or update on public.xooters
  for each row execute function private.kyc_quarantine_activation_interlock();
create trigger kyc_role_clearance_required before insert or update on public.user_roles
  for each row execute function private.kyc_quarantine_activation_interlock();

comment on table private.kyc_quarantine_receipts is
  'Server-inspected upload fingerprints only. Not malware-free, genuine identity, consent or eligibility proof.';
commit;
