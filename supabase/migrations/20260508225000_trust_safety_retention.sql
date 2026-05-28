-- Trust, safety, and retention layer for Zoot.
-- Verification remains admin-reviewed in this pass; provider columns are hooks for later MIE/ID/face/bank integrations.

alter table public.bookings
  add column if not exists service_type text default 'residential',
  add column if not exists arrived_at timestamptz,
  add column if not exists job_started_at timestamptz,
  add column if not exists job_completed_at timestamptz,
  add column if not exists completion_photo_required boolean default false;

alter table public.favorites
  add column if not exists favorite_kind text default 'favorite',
  add column if not exists repeat_bookings_count integer not null default 0,
  add column if not exists last_booked_at timestamptz,
  add column if not exists notes text;

alter table public.zooters
  add column if not exists background_checked boolean not null default false,
  add column if not exists background_check_status text not null default 'pending',
  add column if not exists airbnb_specialist boolean not null default false,
  add column if not exists premium_care_plus boolean not null default false,
  add column if not exists repeat_client_count integer not null default 0,
  add column if not exists job_completion_rate numeric not null default 100,
  add column if not exists reliability_score integer not null default 100,
  add column if not exists years_experience integer not null default 3,
  add column if not exists suburb_coverage text[] not null default '{}',
  add column if not exists transport text default 'Own transport',
  add column if not exists supplies_owned text[] not null default '{}',
  add column if not exists languages_spoken text[] not null default array['English'],
  add column if not exists pet_comfort text default 'Pet friendly',
  add column if not exists reliability_flagged boolean not null default false;

alter table public.zooter_applications
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists reference_1_name text,
  add column if not exists reference_1_phone text,
  add column if not exists reference_2_name text,
  add column if not exists reference_2_phone text,
  add column if not exists id_verification_status text not null default 'pending',
  add column if not exists selfie_verification_status text not null default 'pending',
  add column if not exists address_verification_status text not null default 'pending',
  add column if not exists banking_verification_status text not null default 'pending',
  add column if not exists reference_verification_status text not null default 'pending',
  add column if not exists verification_notes jsonb not null default '{}'::jsonb;

create table if not exists public.zooter_reliability_metrics (
  zooter_id uuid primary key references public.zooters(id) on delete cascade,
  late_arrivals integer not null default 0,
  cancellations integer not null default 0,
  quality_average numeric not null default 5,
  repeat_bookings integer not null default 0,
  complaints integer not null default 0,
  support_escalations integer not null default 0,
  score integer not null default 100,
  deprioritized boolean not null default false,
  flagged_for_review boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.trust_incidents (
  id uuid primary key default gen_random_uuid(),
  zooter_id uuid references public.zooters(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  incident_type text not null check (incident_type in ('lateness', 'disrespect', 'poor_quality', 'suspicious_behaviour', 'damages', 'complaint', 'support_escalation')),
  severity integer not null default 1 check (severity between 1 and 5),
  notes text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.booking_status_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  status text not null,
  label text not null,
  created_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create table if not exists public.post_job_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  zooter_id uuid not null references public.zooters(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  quality_rating integer check (quality_rating between 1 and 5),
  punctuality_rating integer check (punctuality_rating between 1 and 5),
  complaint boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.booking_completion_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  zooter_id uuid references public.zooters(id) on delete set null,
  photo_type text not null check (photo_type in ('before', 'after')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.household_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  address text,
  pet_notes text,
  parking_instructions text,
  gate_code text,
  cleaning_preferences text,
  fragile_areas text,
  favourite_products text,
  access_notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recurring_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  zooter_id uuid references public.zooters(id) on delete set null,
  household_profile_id uuid references public.household_profiles(id) on delete set null,
  cadence_days integer not null default 14,
  preferred_day text,
  preferred_time time,
  status text not null default 'active',
  next_suggested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trust_incidents_zooter on public.trust_incidents(zooter_id);
create index if not exists idx_booking_status_events_booking on public.booking_status_events(booking_id, created_at);
create index if not exists idx_completion_photos_booking on public.booking_completion_photos(booking_id);
create index if not exists idx_household_profiles_user on public.household_profiles(user_id);
create index if not exists idx_recurring_schedules_user on public.recurring_schedules(user_id);

insert into public.training_modules (title, category, description, duration_min, pass_score, required, badge_color, quiz_questions)
values
  ('Client etiquette', 'trust', 'Respectful greetings, privacy, communication tone, and how to close a visit professionally.', 8, 80, true, 'sage', '[{"q":"What should you do before entering a private room?","a":["Ask or confirm permission","Walk in quickly","Ignore it if cleaning"],"correct":0}]'::jsonb),
  ('Luxury-home expectations', 'premium', 'How to handle high-value homes, quiet service, surfaces, linen, and premium client standards.', 10, 80, true, 'primary', '[{"q":"What is the safest approach around premium surfaces?","a":["Use approved products only","Use any strong chemical","Skip the area"],"correct":0}]'::jsonb),
  ('Pet handling basics', 'safety', 'How to work safely around pets, gates, feeding instructions, and client boundaries.', 7, 80, true, 'sage', '[{"q":"What should you do if a pet seems distressed?","a":["Message the client and keep distance","Try to pick it up","Lock it outside"],"correct":0}]'::jsonb),
  ('Fragile item handling', 'quality', 'Safe movement, photo reporting, and no-touch rules for fragile or sentimental items.', 7, 80, true, 'primary', '[{"q":"If you notice a fragile item in a cleaning zone, what is best?","a":["Clean around it or ask first","Move it quickly","Hide it in a drawer"],"correct":0}]'::jsonb),
  ('Punctuality standards', 'reliability', 'Arrival windows, early communication, cancellations, and how reliability affects ranking.', 6, 80, true, 'sage', '[{"q":"When should you message the client if delayed?","a":["As soon as you know","After arriving","Only if asked"],"correct":0}]'::jsonb)
on conflict do nothing;

insert into storage.buckets (id, name, public)
values ('booking-completion-photos', 'booking-completion-photos', false)
on conflict (id) do nothing;
