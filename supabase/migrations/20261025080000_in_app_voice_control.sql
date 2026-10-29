-- A WebRTC access token was previously unaffected by the PSTN-specific switches.
-- Keep in-app voice disabled independently until real signed/device acceptance and cost approval.
-- This adds configuration only; it does not grant client writes or enable any existing control.
insert into public.operational_controls (
  control_key, control_type, environment, enabled, description, owner, metadata
) values (
  'twilio.in_app_voice', 'provider_gate', 'all', false,
  'Allows booking-bound in-app voice only after signed webhook, two-party device, privacy and cost acceptance. No phone-number rental is needed; provider usage is billable.',
  'operations-security',
  '{"provider":"twilio","recording":false,"transcription":false,"max_call_seconds":300,"requires":["signed_webhook_acceptance","authorised_customer_and_xooter","native_signed_builds","status_correlation_and_retention","cost_approval"]}'::jsonb
) on conflict (control_key, environment) do nothing;
