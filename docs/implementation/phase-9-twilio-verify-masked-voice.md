# Phase 9 - Twilio Verify And Masked Voice

Reviewed: 2026-06-30

## Status

Implemented locally as an inactive foundation.

This phase does not enable live SMS, WhatsApp, Verify OTP, outbound voice, masked calls, recording, transcription, or any provider send. Activation remains blocked until the Twilio account is upgraded, the sender resources are approved, callbacks are assigned, rotated secrets are stored in Supabase Edge Function secrets, and signed staging smoke tests pass.

## What Was Added

- `supabase/migrations/20260630102715_phase9_twilio_verify_masked_voice.sql`
  - `public.twilio_verify_attempts`
  - `private.can_create_masked_call(booking_id, actor_id)`
  - masked-call no-recording constraint
  - masked-call read-only participant/admin RLS
  - disabled controls for `twilio.verify_otp`, `twilio.masked_voice`, and `twilio.whatsapp_urgent`
- `supabase/functions/create-masked-call/index.ts`
  - booking participant check
  - rate limit
  - private masked-call eligibility helper
  - `twilio.operational_messages` and `twilio.masked_voice` provider gates
  - no recording/transcription provider metadata
- `supabase/functions/ops-workflow/index.ts`
  - legacy masked-call request branch now uses the same eligibility helper and provider-gate metadata
- `src/lib/twilio-phase9-readiness.test.ts`
  - static regression tests for the migration, Edge Function gates, no-recording rule, and JWT config

## Controls

The migration seeds these controls without activating providers:

- `twilio.verify_otp` - disabled
- `twilio.masked_voice` - disabled
- `twilio.whatsapp_urgent` - disabled

The existing global `twilio.operational_messages` control remains disabled until the account, sender classification, regulatory setup, webhook assignments, and staging tests are complete.

## Security Rules

- Verify OTP attempts must be stored as redacted metadata only. OTP codes, raw phone numbers, raw emails, and message bodies are not stored.
- Verify OTP sends must use Twilio Verify after Fraud Guard, geo-permissions, rate limits, and service configuration are reviewed.
- Masked calls are booking-scoped. The caller must be the booking client or assigned Zooter account.
- Masked calls require an accepted or active booking state.
- Masked calls are allowed only from 45 minutes before the scheduled start through 30 minutes after the calculated booking end while the booking is not terminal.
- Browser/mobile clients cannot insert or update `masked_call_sessions` directly.
- Provider calls require both the global Twilio operational gate and the masked voice gate.
- Zoot masked voice does not record or transcribe calls.
- No endpoint may dial arbitrary numbers supplied by a client request.
- Twilio Auth Token is server-only and used for webhook signature validation; API keys are preferred for outbound provider calls.

## Activation Checklist

Before enabling this phase in staging:

1. Rotate any Twilio values that appeared in chat, issues, screenshots, or logs.
2. Upgrade the Twilio account or use an approved staging subaccount.
3. Create an operational or transactional Messaging Service. Do not use a marketing-classified service for booking, OTP, safety, or status traffic.
4. Add or port a South African phone number and complete required regulatory approvals.
5. Create and verify a Twilio Verify Service with Fraud Guard, geo-permissions, and rate-limit rules.
6. Approve WhatsApp sender and urgent operational templates only.
7. Configure sender, Verify, voice, TwiML/Proxy, and status callbacks to staging Supabase Edge Function URLs.
8. Store rotated Twilio secrets in Supabase Edge Function secrets.
9. Run signed staging smoke tests for SMS, WhatsApp, Verify, voice, status callbacks, blocked unsigned callbacks, masked-call denial outside the window, and masked-call queue creation inside the window.
10. Enable only staging `twilio.*` controls after tests and approval.

Before enabling this phase in production:

1. Repeat staging tests against production callbacks and production Twilio resources.
2. Confirm consent, opt-out, WhatsApp template, voice support, privacy, and POPIA wording.
3. Confirm support operations owners and incident runbook.
4. Confirm no raw phone numbers appear in frontend/mobile responses or public logs.
5. Enable production controls only after founder, operations, legal, and security approval.

## Rollback

- Disable `twilio.operational_messages`, `twilio.verify_otp`, `twilio.masked_voice`, and `twilio.whatsapp_urgent`.
- Remove or disable Twilio dashboard callback assignments if they are causing provider retries.
- Keep `twilio_webhook_events`, `twilio_verify_attempts`, `provider_events`, `integration_outbox`, and `masked_call_sessions` audit rows intact.
- Revert the relevant Edge Function to the previous deployed version if a function deployment caused the issue.
- Use in-app chat and support escalation as the fallback while Twilio is disabled.
