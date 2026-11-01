-- Local disposable PostgreSQL contract fixture. Never run against Supabase.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth; create schema private; create schema storage;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create table auth.users(id uuid primary key);
create table public.xooter_applications(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users,
  status text not null default 'draft',selfie_storage_path text,full_name text);
create table public.xooter_documents(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users,
  application_id uuid references public.xooter_applications,doc_type text,storage_path text,status text default 'pending');
create table public.xooters(id uuid primary key default gen_random_uuid(),user_id uuid,active boolean not null default false);
create table public.user_roles(id uuid primary key default gen_random_uuid(),user_id uuid,role text);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,
  updated_at timestamptz not null default now(),metadata jsonb,unique(bucket_id,name));
alter table public.xooter_applications enable row level security;
alter table public.xooter_documents enable row level security;
alter table storage.objects enable row level security;
create policy legacy_app_owner_all on public.xooter_applications for all to authenticated
 using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy legacy_doc_owner_all on public.xooter_documents for all to authenticated
 using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy legacy_storage_all on storage.objects for all to authenticated
 using(bucket_id='public-assets' or split_part(name,'/',1)=auth.uid()::text)
 with check(bucket_id='public-assets' or split_part(name,'/',1)=auth.uid()::text);
grant usage on schema public,auth,private,storage to anon,authenticated,service_role;
grant all on all tables in schema public,storage to authenticated,service_role;
-- Reproduce the earlier individual-column grants, which must also disappear.
grant update(storage_path,doc_type) on public.xooter_documents to authenticated;
grant update(full_name) on public.xooter_applications to authenticated;
insert into auth.users values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into public.xooter_applications(id,user_id) values('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001');
insert into storage.objects(id,bucket_id,name,updated_at,metadata) values
 ('20000000-0000-4000-8000-000000000001','kyc-docs','00000000-0000-4000-8000-000000000001/id.pdf','2026-10-26T00:00:00Z','{"size":12,"mimetype":"application/pdf"}'),
 ('20000000-0000-4000-8000-000000000002','kyc-docs','00000000-0000-4000-8000-000000000001/selfie.png','2026-10-26T00:00:00Z','{"size":16,"mimetype":"image/png"}'),
 ('20000000-0000-4000-8000-000000000003','public-assets','public.png',now(),'{"size":8}');
-- An existing active staging record is left operational by the containment migration.
insert into public.xooters(id,user_id,active) values('30000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',true);
create function public.assert_true(p_value boolean,p_label text) returns void language plpgsql as $$
begin if p_value is distinct from true then raise exception 'ASSERTION FAILED: %',p_label;end if;end $$;
create function public.assert_throws(p_sql text,p_state text,p_label text) returns void language plpgsql as $$
declare actual text; begin
  begin execute p_sql; exception when others then get stacked diagnostics actual=returned_sqlstate; end;
  if actual is distinct from p_state then raise exception 'ASSERTION FAILED: %, expected %, got %',p_label,p_state,coalesce(actual,'success');end if;
end $$;
