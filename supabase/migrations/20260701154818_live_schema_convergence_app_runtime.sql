-- Runtime schema convergence for staging/production drift.
--
-- This migration is intentionally additive and idempotent. It fixes objects
-- already used by the live app and Edge Functions without attempting to
-- rewrite historical migration chains or copy prototype-only tables.

-- ---------------------------------------------------------------------------
-- Zooter marketplace/profile compatibility.
-- Production and staging evolved with a few different public column names.
-- Add compatibility columns so app-facing views can be stable without exposing
-- sensitive contractor fields.
-- ---------------------------------------------------------------------------
alter table public.zooters
  add column if not exists background_checked boolean not null default false,
  add column if not exists airbnb_specialist boolean not null default false,
  add column if not exists premium_care_plus boolean not null default false,
  add column if not exists languages_spoken text[] not null default '{}'::text[],
  add column if not exists reliability_flagged boolean not null default false;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'zooters'
      and column_name = 'airbnb_capable'
  ) then
    update public.zooters
    set airbnb_specialist = airbnb_capable
    where airbnb_specialist = false
      and airbnb_capable = true;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'zooters'
      and column_name = 'premium_care_awarded'
  ) then
    update public.zooters
    set premium_care_plus = premium_care_awarded
    where premium_care_plus = false
      and premium_care_awarded = true;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'zooters'
      and column_name = 'languages'
  ) then
    update public.zooters
    set languages_spoken = languages
    where languages_spoken = '{}'::text[]
      and coalesce(cardinality(languages), 0) > 0;
  end if;
end $$;

comment on column public.zooters.background_checked
  is 'Public-safe compatibility flag used by app-facing Zooter profile views.';
comment on column public.zooters.airbnb_specialist
  is 'Public-safe compatibility flag used by app-facing Zooter profile views.';
comment on column public.zooters.premium_care_plus
  is 'Public-safe compatibility flag used by app-facing Zooter profile views.';
comment on column public.zooters.languages_spoken
  is 'Public-safe compatibility list used by app-facing Zooter profile views.';
comment on column public.zooters.reliability_flagged
  is 'Internal safety flag; public Zooter views exclude flagged profiles.';

create or replace view public.booking_zooter_profiles
with (security_invoker = true, security_barrier = true)
as
select
  b.id as booking_id,
  z.id,
  z.user_id,
  z.name,
  z.role,
  z.bio,
  z.rating,
  z.jobs_completed,
  z.hourly_rate,
  z.photo_url,
  z.tags,
  z.distance_mi,
  z.is_zotm,
  z.active,
  z.verified,
  z.background_checked,
  z.background_check_status,
  z.airbnb_specialist,
  z.premium_care_plus,
  z.repeat_client_count,
  z.job_completion_rate,
  z.reliability_score,
  z.years_experience,
  z.suburb_coverage,
  z.transport,
  z.supplies_owned,
  z.languages_spoken,
  z.pet_comfort
from public.bookings b
join public.zooters z on z.id = b.zooter_id
where b.zooter_id is not null
  and (
    b.user_id = (select auth.uid())
    or z.user_id = (select auth.uid())
    or public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

comment on view public.booking_zooter_profiles
  is 'Booking-scoped Zooter profile view for clients, assigned contractors, and admins; exposes only fields needed for booked work and secure chat participant resolution.';
revoke all on table public.booking_zooter_profiles from public;
revoke all on table public.booking_zooter_profiles from anon;
grant select on table public.booking_zooter_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Saved addresses: current web app stores city and postal code separately.
-- ---------------------------------------------------------------------------
alter table public.saved_addresses
  add column if not exists city text,
  add column if not exists postal_code text;

comment on column public.saved_addresses.city
  is 'Optional city captured by the saved-address picker.';
comment on column public.saved_addresses.postal_code
  is 'Optional postal code captured by the saved-address picker.';

-- ---------------------------------------------------------------------------
-- Booking status events: current booking functions can attach structured meta.
-- ---------------------------------------------------------------------------
alter table public.booking_status_events
  add column if not exists meta jsonb not null default '{}'::jsonb;

comment on column public.booking_status_events.meta
  is 'Structured, non-sensitive event metadata for booking state timeline entries.';

-- ---------------------------------------------------------------------------
-- Care+ applications: current activate-care-plus Edge Function writes the
-- richer placement application shape.
-- ---------------------------------------------------------------------------
alter table public.care_plus_applications
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists preferred_start_date date,
  add column if not exists daily_start_time time,
  add column if not exists daily_end_time time,
  add column if not exists days_of_week text[] default '{}'::text[],
  add column if not exists daily_pay_rate numeric,
  add column if not exists overtime text,
  add column if not exists job_description text,
  add column if not exists preferred_language text,
  add column if not exists ideal_personality text,
  add column if not exists required_skills text[] default '{}'::text[],
  add column if not exists pets text[] default '{}'::text[],
  add column if not exists other_qualities text,
  add column if not exists admin_fee_paid boolean not null default false,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewer_notes text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if to_regprocedure('public.touch_updated_at()') is not null then
    drop trigger if exists trg_care_plus_apps_updated on public.care_plus_applications;
    create trigger trg_care_plus_apps_updated
      before update on public.care_plus_applications
      for each row execute function public.touch_updated_at();
  end if;
end $$;

comment on table public.care_plus_applications
  is 'Care+ placement applications submitted through the Edge Function workflow.';

-- ---------------------------------------------------------------------------
-- Zooter applications: current onboarding function upserts by user_id and
-- writes both KYC fields and trust-screening fields.
-- ---------------------------------------------------------------------------
alter table public.zooter_applications
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists date_of_birth date,
  add column if not exists id_number text,
  add column if not exists address text,
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists service_category text,
  add column if not exists bio text,
  add column if not exists bank_name text,
  add column if not exists bank_account_number text,
  add column if not exists bank_branch_code text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists reference_1_name text,
  add column if not exists reference_1_phone text,
  add column if not exists reference_2_name text,
  add column if not exists reference_2_phone text,
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists verification_notes jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'zooter_applications'
      and column_name = 'name'
  ) then
    execute $sql$
      update public.zooter_applications
      set full_name = coalesce(full_name, name)
      where full_name is null
    $sql$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'zooter_applications'
      and c.conname = 'zooter_applications_user_id_key'
  ) then
    alter table public.zooter_applications
      add constraint zooter_applications_user_id_key unique (user_id);
  end if;
end $$;

comment on table public.zooter_applications
  is 'Zooter onboarding, KYC, and review workflow records; writes are mediated by authenticated users and admin Edge Functions.';
comment on column public.zooter_applications.full_name
  is 'Compatibility field used by current Zooter onboarding and admin review surfaces.';
comment on column public.zooter_applications.service_category
  is 'Compatibility field used by current Zooter onboarding and admin review surfaces.';
