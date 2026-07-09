-- Twilio webhook audit trail.
-- Stores operational webhook metadata without exposing raw phone numbers to clients.

create table if not exists public.twilio_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  channel text not null default 'unknown' check (channel in ('sms', 'whatsapp', 'voice', 'verify', 'status', 'unknown')),
  twilio_sid text,
  from_hash text,
  to_hash text,
  from_last4 text,
  to_last4 text,
  status text,
  payload jsonb not null default '{}'::jsonb,
  signature_valid boolean not null default false,
  received_at timestamptz not null default now()
);

alter table public.twilio_webhook_events enable row level security;

revoke all on table public.twilio_webhook_events from public;
revoke all on table public.twilio_webhook_events from anon;
revoke all on table public.twilio_webhook_events from authenticated;

grant select on table public.twilio_webhook_events to authenticated;

drop policy if exists "twilio_events_admin_read" on public.twilio_webhook_events;
create policy "twilio_events_admin_read"
  on public.twilio_webhook_events
  for select
  to authenticated
  using (private.has_role(auth.uid(), 'admin'));

comment on table public.twilio_webhook_events
  is 'Admin-only operational log for Twilio SMS, WhatsApp, voice, status, and Verify webhooks. Raw phone numbers are not stored.';

comment on policy "twilio_events_admin_read" on public.twilio_webhook_events
  is 'Only admins can inspect redacted Twilio webhook event metadata for delivery, abuse, and support triage.';
