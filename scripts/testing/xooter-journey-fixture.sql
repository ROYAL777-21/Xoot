-- Disposable local fixture only; identities and workflow states are synthetic.
create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
create schema auth;create schema private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz,last_sign_in_at timestamptz,raw_user_meta_data jsonb default '{}');
create table public.xooter_applications(id uuid primary key default gen_random_uuid(),user_id uuid unique not null references auth.users,status text not null default 'draft');
create table public.xooters(id uuid primary key default gen_random_uuid(),user_id uuid,active boolean default false);
create table public.user_roles(id uuid primary key default gen_random_uuid(),user_id uuid,role text);
create table public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users,kind text,title text,body text,link text,read boolean default false,created_at timestamptz default now());
create table public.integration_outbox(id uuid primary key default gen_random_uuid(),source_table text,source_id uuid,event_type text,channel text,owner text,stack_tool text,payload jsonb,status text check(status in ('queued','needs_approval','processing','completed','failed','cancelled')),approval_required boolean,created_by uuid,processed_at timestamptz,failure_mode text);
create function public.assert_journey(p_result boolean,p_label text) returns void language plpgsql as $$begin
  if p_result is distinct from true then raise exception 'JOURNEY_FAILED: %',p_label;end if;end$$;
create function public.expect_journey_error(p_sql text,p_code text) returns void language plpgsql as $$declare actual text;begin
  begin execute p_sql;exception when others then get stacked diagnostics actual=returned_sqlstate;end;
  if actual is distinct from p_code then raise exception 'JOURNEY_ERROR_FAILED: expected %, got %',p_code,coalesce(actual,'success');end if;end$$;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000001','synthetic-one@example.test',now()),
 ('00000000-0000-4000-8000-000000000002','synthetic-two@example.test',now()),
 ('00000000-0000-4000-8000-000000000003','unconfirmed@example.test',null);
