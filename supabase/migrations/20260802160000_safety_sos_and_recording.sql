-- Safety: SOS alerts, and consented audio recording of a visit.
--
-- Two features with one shared property: they exist for the worst day, so every default is
-- chosen for the case where something has gone wrong and nobody is thinking clearly.
--
-- The recording design is deliberately narrow. Xoot must not end up holding a searchable
-- library of audio from inside thousands of homes — that is a worse asset to lose than the
-- gate codes, and POPIA treats it as personal information about everyone audible, not just the
-- person who pressed record. So: audio only, never video; encrypted client-side under a key
-- Xoot does not hold; and the ciphertext is useless to Xoot unless the recorder attaches it to
-- an incident report, which is the moment consent to disclose is actually given.
--
-- RICA s4 permits a party to a communication to record it, which is what makes the Xooter's or
-- the customer's own recording lawful. It does not permit recording a conversation you are not
-- part of, so the app must stop recording when the visit ends, and both parties are told at
-- booking that either may record.

begin;

-- ---------------------------------------------------------------------------
-- SOS
-- ---------------------------------------------------------------------------
create table if not exists public.safety_sos_alerts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  -- Nullable: an alert raised outside a booking is still an alert worth keeping.
  raiser_id uuid not null references auth.users(id) on delete restrict,
  raiser_role text not null check (raiser_role in ('customer', 'zooter')),

  -- `armed` is the countdown. `dispatched` is the point of no return: from here cancelling
  -- requires the PIN, because otherwise anyone who takes the phone can silence a real alert.
  state text not null default 'armed'
    check (state in ('armed', 'dispatched', 'cancelled', 'resolved', 'false_alarm')),

  -- Captured at the moment of trigger, not on arrival of the alert, so a lost connection does
  -- not lose the location.
  latitude double precision,
  longitude double precision,
  accuracy_m double precision,
  address_snapshot text,

  -- What the app did. Recorded because "I pressed SOS and nothing happened" has to be
  -- answerable after the fact.
  emergency_number_dialled text,
  silent boolean not null default true,
  triggered_at timestamptz not null default now(),
  dispatched_at timestamptz,
  cancelled_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now()
);

comment on table public.safety_sos_alerts is
  'Every SOS trigger, including cancelled ones. Cancellations are kept on purpose: a pattern of '
  'cancelled alerts at one address is a signal, and deleting them would erase it.';

create index if not exists safety_sos_alerts_open_idx
  on public.safety_sos_alerts (state, triggered_at desc)
  where state in ('armed', 'dispatched');

create index if not exists safety_sos_alerts_booking_idx
  on public.safety_sos_alerts (booking_id);

alter table public.safety_sos_alerts enable row level security;

-- A person may see the alerts they raised. Nobody else reaches this table from a client —
-- not the other party to the booking, and not an ordinary admin without the role.
create policy "sos own alerts readable"
  on public.safety_sos_alerts for select
  to authenticated
  using (raiser_id = (select auth.uid()) or private.has_role((select auth.uid()), 'admin'::app_role));

-- No client write policy at all. An alert is raised through the Edge Function, which records
-- the location and the dial outcome the client cannot be trusted to report about itself.
revoke insert, update, delete on public.safety_sos_alerts from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Visit recordings
-- ---------------------------------------------------------------------------
create table if not exists public.visit_recordings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  recorder_id uuid not null references auth.users(id) on delete restrict,
  recorder_role text not null check (recorder_role in ('customer', 'zooter')),

  -- Ciphertext location. The object is encrypted before upload; this row never holds the key.
  storage_path text not null,
  duration_seconds integer check (duration_seconds >= 0),
  started_at timestamptz not null,
  ended_at timestamptz,

  -- The disclosure gate. While null, the recording is the recorder's own and Xoot has no
  -- lawful basis and no technical means to listen to it. Setting it is the recorder handing
  -- the key over as evidence.
  attached_to_incident_id uuid references public.trust_incidents(id) on delete set null,
  attached_at timestamptz,

  -- Both parties were told. Recorded per recording rather than assumed from a settings page,
  -- because the notice is what makes RICA and POPIA work and it has to be provable per event.
  parties_notified_at timestamptz not null,

  -- Unattached recordings are deleted on this date by the retention job. Attached ones have it
  -- cleared, because evidence outlives the retention window.
  purge_after date not null default (current_date + 30),
  created_at timestamptz not null default now()
);

comment on table public.visit_recordings is
  'Audio-only, encrypted client-side. Xoot cannot decrypt a recording that is not attached to '
  'an incident. Video is deliberately not supported: inside a private home it is '
  'disproportionate under POPIA and reads as surveillance.';

create index if not exists visit_recordings_purge_idx
  on public.visit_recordings (purge_after)
  where attached_to_incident_id is null;

create index if not exists visit_recordings_booking_idx
  on public.visit_recordings (booking_id, recorder_id);

alter table public.visit_recordings enable row level security;

-- Only the recorder sees their own recordings. The other party to the booking does not, and
-- neither does an admin — an admin's route in is the incident the recording is attached to,
-- which leaves a trail. This is the ZD-023 rule again: sensitive material gets its own table
-- and its own predicate, because RLS cannot hide a column.
create policy "recordings own readable"
  on public.visit_recordings for select
  to authenticated
  using (recorder_id = (select auth.uid()));

revoke insert, update, delete on public.visit_recordings from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Retention
-- ---------------------------------------------------------------------------
-- Unattached recordings expire. Called by a scheduled job; returns what it removed so the run
-- can be logged rather than trusted.
create or replace function private.purge_expired_recordings()
returns table (purged_id uuid, storage_path text)
language sql
security definer
set search_path = ''
as $$
  delete from public.visit_recordings
  where attached_to_incident_id is null
    and purge_after <= current_date
  returning id, storage_path;
$$;

revoke all on function private.purge_expired_recordings() from public, anon, authenticated;

-- Attaching a recording to an incident clears its purge date; detaching restores one. Kept in
-- a trigger so the rule holds regardless of which code path does the attaching.
create or replace function public.sync_recording_retention()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.attached_to_incident_id is not null and old.attached_to_incident_id is null then
    new.attached_at := now();
    new.purge_after := 'infinity'::date;
  elsif new.attached_to_incident_id is null and old.attached_to_incident_id is not null then
    new.attached_at := null;
    new.purge_after := current_date + 30;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_recording_retention on public.visit_recordings;
create trigger sync_recording_retention
  before update on public.visit_recordings
  for each row execute function public.sync_recording_retention();

commit;
