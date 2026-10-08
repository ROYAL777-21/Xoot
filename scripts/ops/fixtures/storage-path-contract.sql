-- Disposable in-memory SQL fixture. Minimal relation scaffold, synthetic identities only.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create schema storage;
create type public.app_role as enum ('admin', 'customer');
create type public.booking_status as enum ('pending', 'completed');
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function public.has_role(actor uuid, role_name public.app_role) returns boolean
language sql stable as
$$ select role_name = 'admin' and actor = 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid $$;

-- Supabase's helper bodies: migrations/tenant/0002-storage-schema.sql.
-- https://github.com/supabase/storage/blob/master/migrations/tenant/0002-storage-schema.sql
create function storage.foldername(name text) returns text[] language plpgsql as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts,1)-1];
end $$;
create function storage.extension(name text) returns text language plpgsql as $$
declare _parts text[]; _filename text;
begin
  select string_to_array(name, '/') into _parts;
  select _parts[array_length(_parts,1)] into _filename;
  return reverse(split_part(reverse(_filename), '.', 1));
end $$;

create table storage.buckets (
  id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text not null, metadata jsonb, unique(bucket_id, name)
);
alter table storage.objects enable row level security;
create table public.zooters (id uuid primary key, user_id uuid not null);
create table public.bookings (
  id uuid primary key, user_id uuid not null, zooter_id uuid references public.zooters(id),
  status public.booking_status not null default 'pending'
);
create table public.admin_review_queue (id uuid primary key, user_id uuid);
create table public.booking_tips (id uuid primary key, user_id uuid, booking_id uuid, settled_at timestamptz);
create table public.automation_skills (id uuid);
create table public.booking_chat_typing_indicators (id uuid);
create table public.contractor_screening_questions (id uuid);
create table public.notification_templates (id uuid);
create table public.profiles (id uuid);
create table public.subscription_plans (id uuid);
create table public.training_modules (id uuid);
create table public.xooter_earnings (id uuid);
create table public.xooter_training_progress (id uuid);
grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;
grant select on public.bookings, public.zooters to authenticated, service_role;
grant all on public.admin_review_queue, public.booking_tips to authenticated, service_role;

-- RLS matches the customer/assigned-worker visibility needed by the object policies.
alter table public.zooters enable row level security;
create policy worker_self on public.zooters for select to authenticated using (user_id = auth.uid());
alter table public.bookings enable row level security;
create policy participant_read on public.bookings for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.zooters x where x.id = zooter_id and x.user_id = auth.uid())
);

insert into public.zooters values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
insert into public.bookings(id, user_id, zooter_id) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', null);
