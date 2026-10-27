-- Disposable local PostgreSQL only, never a Supabase project.
do $$begin create role anon nologin;exception when duplicate_object then null;end $$;
do $$begin create role authenticated nologin;exception when duplicate_object then null;end $$;
do $$begin create role service_role nologin bypassrls;exception when duplicate_object then null;end $$;
create schema auth; create schema private; create table auth.users(id uuid primary key);
create table public.bookings(id uuid primary key,user_id uuid references auth.users,service text,scheduled_at timestamptz,duration_hours numeric,status text,updated_at timestamptz,
  address text,notes text);
grant usage on schema public,auth to anon,authenticated,service_role;
grant select,insert,update on public.bookings to service_role;
insert into auth.users values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into public.bookings values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','regular',now()+interval '1 day',4,'contractor_accepted',now(),'Private address','Private access code'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','regular',now()+interval '1 day',4,'contractor_accepted',now(),'Other address','Other access code');
create function public.assert_true(value boolean,label text) returns void language plpgsql as $$begin if value is distinct from true then raise exception 'ASSERTION FAILED: %',label;end if;end $$;
create function public.assert_throws(p_sql text,p_state text,p_label text) returns void language plpgsql as $$
declare actual text; begin begin execute p_sql; exception when others then get stacked diagnostics actual=returned_sqlstate;end;
if actual is distinct from p_state then raise exception 'ASSERTION FAILED: %, expected %, got %',p_label,p_state,coalesce(actual,'success');end if;end $$;
