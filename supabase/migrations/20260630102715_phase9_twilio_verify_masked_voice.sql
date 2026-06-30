-- Phase 9 Twilio Verify and masked voice foundation.
-- Additive and disabled by default. This records non-secret readiness state,
-- OTP attempt metadata, and masked-call eligibility without activating live
-- Twilio traffic, recording, transcription, or arbitrary dialing.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to service_role;

insert into public.operational_controls (
  control_key,
  control_type,
  environment,
  enabled,
  description,
  owner,
  metadata
)
values
  (
    'twilio.verify_otp',
    'provider_gate',
    'all',
    false,
    'Allows Twilio Verify OTP sends only after account upgrade, Verify Service configuration, Fraud Guard, geo-permissions, rate limits and signed smoke tests are approved.',
    'operations-security',
    '{"launch_phase":"phase_9","provider":"twilio","requires":["verify_service","fraud_guard","geo_permissions","rate_limits","signed_staging_smoke_tests"]}'::jsonb
  ),
  (
    'twilio.masked_voice',
    'provider_gate',
    'all',
    false,
    'Allows Twilio masked voice sessions only for booking participants inside the approved booking contact window after Twilio number, Proxy/TwiML, callbacks and signed smoke tests are approved.',
    'operations-security',
    '{"launch_phase":"phase_9","provider":"twilio","requires":["approved_phone_number","proxy_or_twiml_app","status_callbacks","signed_staging_smoke_tests"],"recording":false,"transcription":false}'::jsonb
  ),
  (
    'twilio.whatsapp_urgent',
    'provider_gate',
    'all',
    false,
    'Allows urgent WhatsApp operational templates only after approved sender, approved templates, opt-in proof and signed webhook tests are complete.',
    'operations-security',
    '{"launch_phase":"phase_9","provider":"twilio","use_cases":["contractor_on_the_way","urgent_booking_update","safety_escalation"],"marketing":false}'::jsonb
  )
on conflict (control_key, environment)
do update set
  control_type = excluded.control_type,
  description = excluded.description,
  owner = excluded.owner,
  metadata = excluded.metadata,
  updated_at = now();

create table if not exists public.twilio_verify_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  purpose text not null
    check (purpose in ('signup', 'login', 'mfa', 'phone_verification', 'support_step_up', 'payout_step_up')),
  channel text not null
    check (channel in ('sms', 'voice', 'whatsapp', 'email')),
  to_hash text not null,
  to_last4 text,
  actor_hash text,
  twilio_verification_sid text,
  status text not null default 'requested'
    check (status in ('requested', 'sent', 'approved', 'failed', 'rate_limited', 'blocked')),
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint twilio_verify_attempts_to_hash_length
    check (char_length(trim(to_hash)) between 16 and 200),
  constraint twilio_verify_attempts_to_last4_safe
    check (to_last4 is null or to_last4 ~ '^[0-9]{2,4}$')
);

comment on table public.twilio_verify_attempts
  is 'Redacted audit log for Twilio Verify OTP attempts. Raw phone numbers and OTP codes must never be stored.';
comment on column public.twilio_verify_attempts.to_hash
  is 'Salted server-side hash of the destination. Do not store raw phone numbers or email addresses.';
comment on column public.twilio_verify_attempts.twilio_verification_sid
  is 'Provider verification reference only. The OTP code is never returned or stored.';

create index if not exists twilio_verify_attempts_user_idx
  on public.twilio_verify_attempts(user_id, created_at desc)
  where user_id is not null;
create index if not exists twilio_verify_attempts_status_idx
  on public.twilio_verify_attempts(status, created_at desc);
create index if not exists twilio_verify_attempts_actor_idx
  on public.twilio_verify_attempts(actor_hash, created_at desc)
  where actor_hash is not null;

drop trigger if exists twilio_verify_attempts_touch
  on public.twilio_verify_attempts;
create trigger twilio_verify_attempts_touch
  before update on public.twilio_verify_attempts
  for each row execute function private.touch_governance_updated_at();

alter table public.twilio_verify_attempts enable row level security;
revoke all on public.twilio_verify_attempts from anon, authenticated;
grant select on public.twilio_verify_attempts to authenticated;
grant all on public.twilio_verify_attempts to service_role;

drop policy if exists "twilio_verify_attempts_admin_read"
  on public.twilio_verify_attempts;
create policy "twilio_verify_attempts_admin_read"
  on public.twilio_verify_attempts for select
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "twilio_verify_attempts_admin_read" on public.twilio_verify_attempts
  is 'Admins can inspect redacted Verify attempt outcomes; OTP sends/checks are service-role only.';

alter table public.masked_call_sessions
  add column if not exists eligibility_checked_at timestamptz,
  add column if not exists eligible_until timestamptz,
  add column if not exists provider_session_reference text,
  add column if not exists provider_status jsonb not null default '{}'::jsonb;

comment on table public.masked_call_sessions
  is 'Booking-scoped masked voice session ledger. Clients can read their own sessions but all writes go through audited Edge Functions.';
comment on column public.masked_call_sessions.recording_consent
  is 'Locked false for launch. Zoot masked voice must not record or transcribe participant calls.';
comment on column public.masked_call_sessions.provider_session_reference
  is 'Provider session identifier only. Do not store raw participant phone numbers or access codes here.';

update public.masked_call_sessions
set recording_consent = false
where recording_consent is distinct from false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'masked_call_sessions_no_recording'
      and conrelid = 'public.masked_call_sessions'::regclass
  ) then
    alter table public.masked_call_sessions
      add constraint masked_call_sessions_no_recording
      check (recording_consent = false);
  end if;
end $$;

create index if not exists masked_call_sessions_status_idx
  on public.masked_call_sessions(status, created_at desc);
create index if not exists masked_call_sessions_provider_reference_idx
  on public.masked_call_sessions(provider_session_reference)
  where provider_session_reference is not null;

revoke insert, update, delete on table public.masked_call_sessions from authenticated;
grant select on table public.masked_call_sessions to authenticated;
grant all on table public.masked_call_sessions to service_role;

drop policy if exists "booking participants manage masked calls"
  on public.masked_call_sessions;
drop policy if exists "masked_call_sessions_participant_read"
  on public.masked_call_sessions;
create policy "masked_call_sessions_participant_read"
  on public.masked_call_sessions for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      left join public.zooters z
        on z.id = b.zooter_id
      where b.id = masked_call_sessions.booking_id
        and (
          b.user_id = (select auth.uid())
          or z.user_id = (select auth.uid())
          or public.has_role((select auth.uid()), 'admin'::public.app_role)
        )
    )
  );
comment on policy "masked_call_sessions_participant_read" on public.masked_call_sessions
  is 'Booking clients, assigned Zooters and admins can read masked-call status. Session creation/update is service-role only.';

create or replace function private.can_create_masked_call(
  p_booking_id uuid,
  p_actor_id uuid
) returns table(
  allowed boolean,
  reason text,
  participant_role text,
  eligible_until timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_booking record;
  v_actor_role text := 'none';
  v_window_start timestamptz;
  v_window_end timestamptz;
begin
  if p_booking_id is null or p_actor_id is null then
    return query select false, 'booking_and_actor_required', 'none', null::timestamptz;
    return;
  end if;

  select
    b.id,
    b.user_id,
    b.zooter_id,
    b.status::text as status,
    b.scheduled_at,
    b.duration_hours,
    b.cancelled_at,
    b.completed_at,
    b.job_completed_at,
    z.user_id as zooter_user_id
  into v_booking
  from public.bookings b
  left join public.zooters z
    on z.id = b.zooter_id
  where b.id = p_booking_id;

  if not found then
    return query select false, 'booking_not_found', 'none', null::timestamptz;
    return;
  end if;

  if v_booking.user_id = p_actor_id then
    v_actor_role := 'client';
  elsif v_booking.zooter_user_id = p_actor_id then
    v_actor_role := 'contractor';
  else
    return query select false, 'not_booking_participant', 'none', null::timestamptz;
    return;
  end if;

  if v_booking.zooter_id is null or v_booking.zooter_user_id is null then
    return query select false, 'booking_has_no_assigned_zooter', v_actor_role, null::timestamptz;
    return;
  end if;

  if v_booking.scheduled_at is null then
    return query select false, 'booking_has_no_schedule', v_actor_role, null::timestamptz;
    return;
  end if;

  v_window_start := v_booking.scheduled_at - interval '45 minutes';
  v_window_end := coalesce(
    v_booking.completed_at,
    v_booking.job_completed_at,
    v_booking.scheduled_at + (coalesce(v_booking.duration_hours, 0) * interval '1 hour')
  ) + interval '30 minutes';

  if v_booking.cancelled_at is not null
    or v_booking.status in ('cancelled', 'completed', 'rated')
  then
    return query select false, 'terminal_booking_state', v_actor_role, v_window_end;
    return;
  end if;

  if v_booking.status not in ('contractor_accepted', 'en_route', 'enroute', 'in_progress') then
    return query select false, 'masked_voice_requires_accepted_active_booking', v_actor_role, v_window_end;
    return;
  end if;

  if now() < v_window_start then
    return query select false, 'masked_voice_window_not_open', v_actor_role, v_window_end;
    return;
  end if;

  if now() > v_window_end then
    return query select false, 'masked_voice_window_closed', v_actor_role, v_window_end;
    return;
  end if;

  return query select true, 'eligible', v_actor_role, v_window_end;
end;
$$;

comment on function private.can_create_masked_call(uuid, uuid)
  is 'Service-role masked voice eligibility check. It allows only booking participants, accepted/active bookings, and the booking contact window.';

revoke all on function private.can_create_masked_call(uuid, uuid) from public;
revoke all on function private.can_create_masked_call(uuid, uuid) from anon;
revoke all on function private.can_create_masked_call(uuid, uuid) from authenticated;
grant execute on function private.can_create_masked_call(uuid, uuid) to service_role;
