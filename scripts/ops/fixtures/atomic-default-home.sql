create schema auth;
create schema private;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function private.has_role(uuid,text) returns boolean language sql stable as $$select current_setting('test.admin',true)='true'$$;
grant usage on schema public,auth,private to anon,authenticated,service_role;
grant execute on function auth.uid(),private.has_role(uuid,text) to authenticated,service_role;
create table public.household_profiles (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 label text not null default 'Home',address text,pet_notes text,parking_instructions text,gate_code text,alarm_code text,
 access_instructions text,cleaning_preferences text,fragile_areas text,favourite_products text,access_notes text,
 is_default boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.saved_addresses (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 label text not null,address text not null,city text,postal_code text,is_default boolean not null default false,created_at timestamptz not null default now());
create table public.bookings(id uuid primary key default gen_random_uuid(),household_profile_id uuid references public.household_profiles(id) on delete set null);
alter table public.household_profiles enable row level security;
alter table public.saved_addresses enable row level security;
-- Deliberately retain the broader live production policy. Revoked DML grants and RPC
-- auth checks must still protect owners even when a client has an admin RLS branch.
create policy "own household profiles" on public.household_profiles for all using(user_id=auth.uid() or private.has_role(auth.uid(),'admin')) with check(user_id=auth.uid() or private.has_role(auth.uid(),'admin'));
create policy "own addresses" on public.saved_addresses for all using(user_id=auth.uid()) with check(user_id=auth.uid());
grant all on public.household_profiles,public.saved_addresses to authenticated,service_role;
grant select on public.household_profiles,public.saved_addresses to anon;
-- Historical column grants must also be removed by the migration.
grant update(is_default,user_id),insert(is_default,user_id) on public.household_profiles to authenticated;
