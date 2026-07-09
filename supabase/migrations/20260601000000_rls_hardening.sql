-- Phase 2 RLS hardening for high-risk customer, contractor, payment, trust,
-- notification, and marketplace data.
--
-- Browser/mobile clients may read only data scoped to the signed-in user or to
-- public-safe views. System writes should flow through Edge Functions using the
-- service-role key, which bypasses RLS server-side and must never be exposed to
-- browser/mobile clients.

-- ---------------------------------------------------------------------------
-- Notifications: users can read and mark their own notifications as read.
-- Inserts are service-role only; no client insert policy is created.
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "notifications_insert_any" on public.notifications;
drop policy if exists "system inserts notifications" on public.notifications;
drop policy if exists "user creates own notifications" on public.notifications;
drop policy if exists "view own notifications" on public.notifications;
drop policy if exists "update own notifications" on public.notifications;
drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;

revoke insert on table public.notifications from anon, authenticated;
revoke update on table public.notifications from authenticated;
grant select on table public.notifications to authenticated;
grant update (read) on table public.notifications to authenticated;

create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);
comment on policy "notifications_select_own" on public.notifications
  is 'Users can read only their own in-app notification rows.';

create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
comment on policy "notifications_update_own" on public.notifications
  is 'Users can update only their own notification row, with grants limiting client updates to the read flag.';

-- ---------------------------------------------------------------------------
-- Training progress: legacy zooter progress is contractor-owned, not public.
-- The current app also uses zooter_training_completions, whose policies remain
-- user-scoped in earlier migrations.
-- ---------------------------------------------------------------------------
alter table public.zooter_training_progress enable row level security;

drop policy if exists "training_progress_public" on public.zooter_training_progress;
drop policy if exists "anyone views progress" on public.zooter_training_progress;
drop policy if exists "training_progress_own" on public.zooter_training_progress;
drop policy if exists "training_progress_insert_own" on public.zooter_training_progress;
drop policy if exists "training_progress_update_own" on public.zooter_training_progress;

grant select, insert, update on table public.zooter_training_progress to authenticated;

create policy "training_progress_own"
  on public.zooter_training_progress for select
  using (
    exists (
      select 1
      from public.zooters z
      where z.id = zooter_training_progress.zooter_id
        and z.user_id = auth.uid()
    )
    or public.has_role(auth.uid(), 'admin')
  );
comment on policy "training_progress_own" on public.zooter_training_progress
  is 'Contractors can read only their own module progress; admins can review all contractor progress.';

create policy "training_progress_insert_own"
  on public.zooter_training_progress for insert
  with check (
    exists (
      select 1
      from public.zooters z
      where z.id = zooter_training_progress.zooter_id
        and z.user_id = auth.uid()
    )
  );
comment on policy "training_progress_insert_own" on public.zooter_training_progress
  is 'Contractors can create progress rows only for their own activated Zooter profile.';

create policy "training_progress_update_own"
  on public.zooter_training_progress for update
  using (
    exists (
      select 1
      from public.zooters z
      where z.id = zooter_training_progress.zooter_id
        and z.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.zooters z
      where z.id = zooter_training_progress.zooter_id
        and z.user_id = auth.uid()
    )
  );
comment on policy "training_progress_update_own" on public.zooter_training_progress
  is 'Contractors can update only their own module progress rows.';

-- ---------------------------------------------------------------------------
-- Referrals: owners/admins can read full referral records. Public code lookup
-- returns only the matching code through a narrow security-definer function.
-- ---------------------------------------------------------------------------
alter table public.referrals enable row level security;

drop policy if exists "referral_codes_public" on public.referrals;
drop policy if exists "referrals_public" on public.referrals;
drop policy if exists "view by code" on public.referrals;
drop policy if exists "view own referral" on public.referrals;
drop policy if exists "users view own referral codes" on public.referrals;
drop policy if exists "referral_codes_own" on public.referrals;

grant select on table public.referrals to authenticated;

create policy "referral_codes_own"
  on public.referrals for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
comment on policy "referral_codes_own" on public.referrals
  is 'Users can read their own referral record; admins can review referral records for abuse handling.';

create or replace function public.lookup_referral_code(p_code text)
returns table(code text)
language sql
stable
security definer
set search_path = public
as $$
  select r.code
  from public.referrals r
  where r.code = upper(trim(p_code))
  limit 1
$$;
comment on function public.lookup_referral_code(text)
  is 'Public-safe referral lookup that returns only a matching referral code and never exposes owner or reward counters.';
grant execute on function public.lookup_referral_code(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Zooters: remove public base-table reads. Marketplace/customer views use
-- zooters_public; booking participants use booking_zooter_profiles.
-- ---------------------------------------------------------------------------
alter table public.zooters enable row level security;

drop policy if exists "anyone views zooters" on public.zooters;
drop policy if exists "zooters_self_select" on public.zooters;
drop policy if exists "zooters_self_update" on public.zooters;
drop policy if exists "zooters_admin_select" on public.zooters;
drop policy if exists "admins manage zooters" on public.zooters;

revoke select on table public.zooters from anon;
revoke update on table public.zooters from authenticated;
grant select on table public.zooters to authenticated;
grant update (
  name,
  bio,
  hourly_rate,
  photo_url,
  tags,
  years_experience,
  suburb_coverage,
  transport,
  supplies_owned,
  languages_spoken,
  pet_comfort,
  airbnb_specialist
) on table public.zooters to authenticated;

create policy "zooters_self_select"
  on public.zooters for select
  using (user_id = auth.uid());
comment on policy "zooters_self_select" on public.zooters
  is 'Activated contractors can read their own full Zooter row for profile and portal workflows.';

create policy "zooters_self_update"
  on public.zooters for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
comment on policy "zooters_self_update" on public.zooters
  is 'Contractors can update only their own Zooter profile row, with grants limiting editable columns to public profile fields.';

create policy "admins manage zooters"
  on public.zooters for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
comment on policy "admins manage zooters" on public.zooters
  is 'Admins can review and manage full Zooter rows, including operational and verification fields.';

create or replace view public.zooters_public
with (security_barrier = true)
as
select
  id,
  name,
  role,
  bio,
  rating,
  jobs_completed,
  hourly_rate,
  photo_url,
  tags,
  distance_mi,
  is_zotm,
  active,
  verified,
  background_checked,
  background_check_status,
  airbnb_specialist,
  premium_care_plus,
  repeat_client_count,
  job_completion_rate,
  reliability_score,
  years_experience,
  suburb_coverage,
  transport,
  supplies_owned,
  languages_spoken,
  pet_comfort
from public.zooters
where active = true
  and reliability_flagged = false;
comment on view public.zooters_public
  is 'Public-safe marketplace Zooter profile view; excludes auth user IDs, commission data, internal notes, verification notes, application documents, and other sensitive contractor data.';
grant select on public.zooters_public to anon, authenticated;

create or replace view public.booking_zooter_profiles
with (security_barrier = true)
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
    b.user_id = auth.uid()
    or z.user_id = auth.uid()
    or public.has_role(auth.uid(), 'admin')
  );
comment on view public.booking_zooter_profiles
  is 'Booking-scoped Zooter profile view for clients, assigned contractors, and admins; includes Zooter auth UUID only for secure booking chat participant resolution.';
grant select on public.booking_zooter_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Bookings: read is relationship-scoped; privileged writes stay behind admin
-- or service-role workflows.
-- ---------------------------------------------------------------------------
alter table public.bookings enable row level security;

drop policy if exists "bookings_select_any" on public.bookings;
drop policy if exists "view own bookings" on public.bookings;
drop policy if exists "zooters view assigned bookings" on public.bookings;
drop policy if exists "bookings_client_own" on public.bookings;
drop policy if exists "bookings_zooter_assigned" on public.bookings;
drop policy if exists "bookings_admin" on public.bookings;
drop policy if exists "create own bookings" on public.bookings;

revoke insert, update, delete on table public.bookings from authenticated;
grant select on table public.bookings to authenticated;

create policy "bookings_client_own"
  on public.bookings for select
  using (auth.uid() = user_id);
comment on policy "bookings_client_own" on public.bookings
  is 'Clients can read only bookings they own.';

create policy "bookings_zooter_assigned"
  on public.bookings for select
  using (
    exists (
      select 1
      from public.zooters z
      where z.id = bookings.zooter_id
        and z.user_id = auth.uid()
    )
  );
comment on policy "bookings_zooter_assigned" on public.bookings
  is 'Assigned contractors can read bookings assigned to their activated Zooter profile.';

create policy "bookings_admin"
  on public.bookings for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
comment on policy "bookings_admin" on public.bookings
  is 'Admins can manage bookings for support, dispatch, and trust operations.';

-- ---------------------------------------------------------------------------
-- Payment records: clients read their own records; admins manage; payment
-- creation/confirmation is service-role/provider webhook work.
-- ---------------------------------------------------------------------------
alter table public.payment_records enable row level security;

drop policy if exists "payment_records_any" on public.payment_records;
drop policy if exists "users view own payment records" on public.payment_records;
drop policy if exists "users create own pending payment records" on public.payment_records;
drop policy if exists "admins update payment records" on public.payment_records;
drop policy if exists "payment_records_own" on public.payment_records;
drop policy if exists "payment_records_admin" on public.payment_records;

revoke insert, update, delete on table public.payment_records from authenticated;
grant select on table public.payment_records to authenticated;

create policy "payment_records_own"
  on public.payment_records for select
  using (auth.uid() = user_id);
comment on policy "payment_records_own" on public.payment_records
  is 'Clients can read only their own payment records.';

create policy "payment_records_admin"
  on public.payment_records for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
comment on policy "payment_records_admin" on public.payment_records
  is 'Admins can manage payment records for reconciliation after provider or service-role validation.';

-- ---------------------------------------------------------------------------
-- ZootCred ledger: users read own ledger; all value-changing writes are
-- service-role/admin-controlled.
-- ---------------------------------------------------------------------------
alter table public.zootcred_ledger enable row level security;

drop policy if exists "zootcred_public" on public.zootcred_ledger;
drop policy if exists "view own ledger" on public.zootcred_ledger;
drop policy if exists "users view own zootcred" on public.zootcred_ledger;
drop policy if exists "users create own zootcred ledger rows" on public.zootcred_ledger;
drop policy if exists "zootcred_own" on public.zootcred_ledger;
drop policy if exists "zootcred_admin" on public.zootcred_ledger;

revoke insert, update, delete on table public.zootcred_ledger from authenticated;
grant select on table public.zootcred_ledger to authenticated;

create policy "zootcred_own"
  on public.zootcred_ledger for select
  using (auth.uid() = user_id);
comment on policy "zootcred_own" on public.zootcred_ledger
  is 'Users can read only their own ZootCred ledger entries.';

create policy "zootcred_admin"
  on public.zootcred_ledger for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
comment on policy "zootcred_admin" on public.zootcred_ledger
  is 'Admins can manage ZootCred entries only for audited support and reconciliation workflows.';

-- ---------------------------------------------------------------------------
-- Sensitive access logs: append-only by service role; admins read.
-- ---------------------------------------------------------------------------
alter table public.sensitive_access_logs enable row level security;

drop policy if exists "participants view sensitive access logs" on public.sensitive_access_logs;
drop policy if exists "authenticated create sensitive access logs" on public.sensitive_access_logs;
drop policy if exists "sensitive_log_admin" on public.sensitive_access_logs;

revoke insert, update, delete on table public.sensitive_access_logs from authenticated;
grant select on table public.sensitive_access_logs to authenticated;

create policy "sensitive_log_admin"
  on public.sensitive_access_logs for select
  using (public.has_role(auth.uid(), 'admin'));
comment on policy "sensitive_log_admin" on public.sensitive_access_logs
  is 'Only admins can read sensitive access logs; writes are service-role append-only.';

-- ---------------------------------------------------------------------------
-- Trust incidents: client submissions go through ops-workflow; admin users can
-- review and manage the resulting records.
-- ---------------------------------------------------------------------------
alter table public.trust_incidents enable row level security;

drop policy if exists "admins view trust incidents" on public.trust_incidents;
drop policy if exists "users create trust incidents for own bookings" on public.trust_incidents;
drop policy if exists "admins manage trust incidents" on public.trust_incidents;
drop policy if exists "trust_incidents_admin" on public.trust_incidents;

grant select, insert, update, delete on table public.trust_incidents to authenticated;

create policy "trust_incidents_admin"
  on public.trust_incidents for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
comment on policy "trust_incidents_admin" on public.trust_incidents
  is 'Only admins can read or manage trust incident records; client submissions are routed through service-role Edge Functions.';

-- ---------------------------------------------------------------------------
-- Household profiles: owner-only Home Memory access.
-- ---------------------------------------------------------------------------
alter table public.household_profiles enable row level security;

drop policy if exists "household_profiles_any" on public.household_profiles;
drop policy if exists "users manage own household profiles" on public.household_profiles;
drop policy if exists "household_profiles_own" on public.household_profiles;

grant select, insert, update, delete on table public.household_profiles to authenticated;

create policy "household_profiles_own"
  on public.household_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
comment on policy "household_profiles_own" on public.household_profiles
  is 'Users can read and manage only their own household memory and sensitive access-note profile.';

-- ---------------------------------------------------------------------------
-- Support tickets: clients can create/read their own tickets; admins manage.
-- ---------------------------------------------------------------------------
alter table public.support_tickets enable row level security;

drop policy if exists "view own tickets" on public.support_tickets;
drop policy if exists "create own tickets" on public.support_tickets;
drop policy if exists "support_tickets_own" on public.support_tickets;
drop policy if exists "support_tickets_insert_own" on public.support_tickets;
drop policy if exists "support_tickets_admin" on public.support_tickets;

grant select, insert, update on table public.support_tickets to authenticated;

create policy "support_tickets_own"
  on public.support_tickets for select
  using (auth.uid() = user_id);
comment on policy "support_tickets_own" on public.support_tickets
  is 'Clients can read only their own support tickets.';

create policy "support_tickets_insert_own"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);
comment on policy "support_tickets_insert_own" on public.support_tickets
  is 'Clients can create support tickets only for their own user ID.';

create policy "support_tickets_admin"
  on public.support_tickets for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
comment on policy "support_tickets_admin" on public.support_tickets
  is 'Admins can manage support tickets for triage, escalation, and resolution.';
