-- Synthetic-only PostgreSQL 17 fixture. Never run on a hosted Supabase database.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create type public.app_role as enum ('admin', 'xooter', 'customer');
create schema auth;
create schema private;
grant usage on schema auth, private to authenticated;
grant usage on schema auth to anon;

create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create function private.has_role(p_user uuid, p_role public.app_role)
  returns boolean language sql stable security definer
  set search_path = ''
  as $$ select p_user = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
                  and p_role = 'admin'::public.app_role; $$;

create table public.xooters (
  id uuid primary key,
  user_id uuid not null
);
create table public.xooter_training_progress (
  xooter_id uuid not null references public.xooters(id),
  module_id uuid not null,
  completed boolean not null,
  completed_at timestamptz,
  primary key (xooter_id, module_id)
);
alter table public.xooters enable row level security;
alter table public.xooter_training_progress enable row level security;
create policy "zooters_select_self_or_admin" on public.xooters
  for select to authenticated
  using (user_id = (select auth.uid())
    or private.has_role((select auth.uid()), 'admin'::public.app_role));
-- The leaked original policy under test (must fail before migration).
create policy "training progress visible" on public.xooter_training_progress
  for select to public using (true);
grant select on public.xooters to authenticated;
grant select, truncate, trigger, references
  on public.xooter_training_progress to anon, authenticated;
grant select on public.xooter_training_progress to service_role;

insert into public.xooters (id,user_id) values
  ('11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('22222222-2222-4222-8222-222222222222','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
insert into public.xooter_training_progress(xooter_id,module_id,completed,completed_at) values
  ('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333',true,now()),
  ('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333',false,null);
