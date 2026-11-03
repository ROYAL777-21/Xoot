-- Isolated PostgreSQL fixture, synthetic identities only. Existing Auth welcome mirrors actual
-- production handle_new_user without replacing or changing that hosted function.
create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
create schema auth;create schema private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated,service_role;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz,
  banned_until timestamptz,created_at timestamptz not null default clock_timestamp(),raw_user_meta_data jsonb default '{}');
create table public.user_roles(user_id uuid not null references auth.users,role text not null,unique(user_id,role));
create table public.xooter_applications(user_id uuid primary key references auth.users,status text default 'draft');
create table public.xooters(user_id uuid primary key references auth.users,active boolean default false);
create table public.household_profiles(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users,address text);
create table public.bookings(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users,status text default 'pending');
create table public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users,
  kind text,title text,body text,link text,read boolean default false,created_at timestamptz default clock_timestamp());
alter table public.notifications enable row level security;
grant select on public.notifications to authenticated;grant update(read) on public.notifications to authenticated;
create policy own_notifications on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy read_own_notifications on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create table public.integration_outbox(id uuid primary key default gen_random_uuid(),source_table text,source_id uuid,event_type text,
  channel text,owner text,stack_tool text,payload jsonb,status text not null check(status in ('queued','needs_approval','processing','completed','failed','cancelled')),
  approval_required boolean,created_by uuid,processed_at timestamptz,failure_mode text);
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$begin
  insert into public.user_roles(user_id,role) values(new.id,'user');
  insert into public.notifications(user_id,kind,title,body,link) values(new.id,'welcome','Welcome to Xoot',
    'Your home, sorted. Book your first visit and earn XootCred.','/app');return new;end$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
revoke all on function public.handle_new_user() from public,anon,authenticated,service_role;
-- An old confirmed account must never receive a new welcome/email backfill.
insert into auth.users(id,email,email_confirmed_at,created_at) values
  ('00000000-0000-4000-8000-000000000001','old-customer@example.test',clock_timestamp(),clock_timestamp()-interval '2 days');
create table private.xooter_email_policy(id boolean primary key,enabled boolean,used integer,maximum integer);
insert into private.xooter_email_policy values(true,false,1,20);
create function public.assert_customer(p_result boolean,p_label text) returns void language plpgsql as $$begin
  if p_result is distinct from true then raise exception 'CUSTOMER_FAILED: %',p_label;end if;end$$;
create function public.expect_customer_error(p_sql text,p_code text) returns void language plpgsql as $$declare actual text;begin
  begin execute p_sql;exception when others then get stacked diagnostics actual=returned_sqlstate;end;
  if actual is distinct from p_code then raise exception 'CUSTOMER_ERROR_FAILED: expected %, got %',p_code,coalesce(actual,'success');end if;end$$;
