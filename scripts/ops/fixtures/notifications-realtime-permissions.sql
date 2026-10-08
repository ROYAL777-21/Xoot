-- Disposable scaffold only. The test loads notification definitions/grants and
-- final owner policies from the actual source migrations, not copied RLS rules.
create schema auth;
grant usage on schema public, auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
-- Reproduce historical client table defaults, including TRUNCATE and TRIGGER.
alter default privileges grant all on tables to anon, authenticated, service_role;
create table public.synthetic_published (id uuid primary key, visible boolean not null);
-- Non-default options and an existing row filter must survive the additive change.
create publication supabase_realtime for table public.synthetic_published where (visible)
  with (publish = 'insert, update', publish_via_partition_root = true);
create function public.synthetic_notification_trigger() returns trigger
  language plpgsql as $$ begin return new; end; $$;
