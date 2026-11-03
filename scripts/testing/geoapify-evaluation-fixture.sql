-- Isolated PostgreSQL-compatible test database only. Never run against a hosted project.
create schema private;
create role anon;
create role authenticated;
create role service_role bypassrls;
grant usage on schema public,private to anon,authenticated,service_role;
-- Exercise revokes against the broad defaults found in existing Supabase projects.
alter default privileges in schema private grant all on tables to anon,authenticated,service_role;
create function public.assert_true(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Assertion failed: %',label;end if;end $$;
create function public.assert_throws(statement text,code text,label text) returns void language plpgsql as $$
begin
  begin execute statement;exception when others then
    if sqlstate=code then return;end if;raise exception 'Unexpected SQLSTATE for %: %',label,sqlstate;
  end;
  raise exception 'Expected refusal: %',label;
end $$;
create table public.xoot_mapbox_geocoding_budget(budget_key text primary key,authorized_queries integer,consumed_queries integer);
insert into public.xoot_mapbox_geocoding_budget values('paused_sentinel',3,3);
