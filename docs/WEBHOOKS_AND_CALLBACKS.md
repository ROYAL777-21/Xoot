# Xoot Webhooks And Callbacks

Reviewed: 2026-06-30

This document maps every callback class needed for staging and production. Values are placeholders and route designs; no real secrets belong here.

## Rules

- A frontend success page is never proof that a payment succeeded.
- Booking, Care+, XootCred, referral, assignment, refund, and contractor-verification state changes must happen server-side.
- Every supported provider webhook must verify signatures, shared secrets, or hashes before mutating data.
- Every webhook must be idempotent by provider event ID and internal payment/reference ID.
- Webhooks must log enough metadata for reconciliation without storing full card, bank login, OTP, access-code, private phone, or private key data.

## Existing Edge Function Endpoints

| Function | Current endpoint shape | Purpose | Env required | Status |
| --- | --- | --- | --- | --- |
| `ai-match` | `https://<project-ref>.functions.supabase.co/ai-match` | Authenticated Xooter matching/ranking | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS` | Implemented |
| `create-booking-request` | `https://<project-ref>.functions.supabase.co/create-booking-request` | Backend-priced booking request creation, payment record creation, notification queue | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS` | Implemented |
| `care-plus-membership` | `https://<project-ref>.functions.supabase.co/care-plus-membership` | Care+ membership request/cancellation action layer, payment record creation, admin queue, notification queue | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS` | Implemented |
| `ops-workflow` | `https://<project-ref>.functions.supabase.co/ops-workflow` | Authenticated action layer for support routing, property account ops routing, Gift Clean payment requests, XootCred redemption, booking status changes, masked call requests, trust incidents, low-rating follow-up, Xooter application submission, Xooter job response, and typed admin queue/KYC actions | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS` | Implemented |
| `support-respond` | `https://<project-ref>.functions.supabase.co/support-respond` | Support bot response and escalation | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_SUPPORT_MODEL`, `ALLOWED_ORIGINS` | Implemented |
| `get-booking-public-keys` | `https://<project-ref>.functions.supabase.co/get-booking-public-keys` | Authenticated booking chat public-key lookup for verified booking participants only | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS` | Implemented |
| `get-sensitive-access` | `https://<project-ref>.functions.supabase.co/get-sensitive-access` | Authenticated Xooter sensitive field reveal with booking-window checks and reveal logging | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS` | Implemented |

## Supabase Auth Callbacks

| Callback | Local | Staging | Production | Notes |
| --- | --- | --- | --- | --- |
| OAuth/email callback | `http://localhost:5173/auth/callback` | `https://staging.xoot.co.za/auth/callback` | `https://xoot.co.za/auth/callback` | Must be allow-listed in Supabase Auth. |
| Password reset | `http://localhost:5173/auth/reset` | `https://staging.xoot.co.za/auth/reset` | `https://xoot.co.za/auth/reset` | Must be allow-listed in Supabase Auth. |
| Native auth callback | `zoot://auth/callback` | `zoot://auth/callback` | `zoot://auth/callback` | Only enable once native auth is wired and tested. |

Supabase Auth Site URL:

- Staging: `https://staging.xoot.co.za`
- Production: `https://xoot.co.za`

## Stitch Payments

Planned server endpoints:

| Callback | Suggested endpoint | Trust level | Required verification |
| --- | --- | --- | --- |
| Checkout/session create | `https://<project-ref>.functions.supabase.co/stitch-create-checkout` | Authenticated user request | User JWT, backend quote, internal booking/payment record. |
| Webhook | `https://<project-ref>.functions.supabase.co/stitch-webhook` | Provider request | Provider signature or webhook secret, event idempotency. |
| Callback/return | `https://xoot.co.za/payments/stitch/return` | Display only | Must fetch backend payment status after return. |
| Success URL | `https://xoot.co.za/payments/success` | Display only | Never confirms booking by itself. |
| Failure URL | `https://xoot.co.za/payments/failed` | Display only | Never cancels booking by itself. |

Reconciliation reference format:

```text
zoot-{env}-{bookingId}-{paymentRecordId}
```

Required checks before confirming payment:

- Provider reference maps to exactly one `payment_records` row.
- Amount equals backend-calculated amount.
- Currency is `ZAR`.
- Booking/user/payment IDs match the pending record.
- Duplicate events are ignored after first successful processing.
- Failed, pending, cancelled, or abandoned events do not confirm bookings.

## Ozow Payments

Planned server endpoints:

| Callback | Suggested endpoint | Trust level | Required verification |
| --- | --- | --- | --- |
| Payment request create | `https://<project-ref>.functions.supabase.co/ozow-create-payment` | Authenticated user request | User JWT, backend quote, internal booking/payment record. |
| Notification/webhook URL | `https://<project-ref>.functions.supabase.co/ozow-notify` | Provider request | Provider hash/signature validation and idempotency. |
| Success URL | `https://xoot.co.za/payments/ozow/success` | Display only | Must fetch backend status. |
| Cancel URL | `https://xoot.co.za/payments/ozow/cancel` | Display only | Must not mutate booking alone. |
| Error URL | `https://xoot.co.za/payments/ozow/error` | Display only | Must not mutate booking alone. |

Required checks before confirming payment:

- Provider notification hash/signature validates.
- Provider transaction ID maps to one internal payment record.
- Amount and currency match backend-calculated invoice.
- Booking is still in a payment-confirmable state.
- Care+ activates only after a verified successful payment event.
- XootCred is awarded only after a completed paid booking meets anti-fraud rules.

## Twilio

Implemented endpoints:

| Callback | Suggested endpoint | Purpose | Required verification |
| --- | --- | --- | --- |
| SMS message webhook | `https://<project-ref>.functions.supabase.co/twilio-message-webhook` | Inbound operational SMS and support handoff | Twilio request signature. |
| WhatsApp webhook | `https://<project-ref>.functions.supabase.co/twilio-whatsapp-webhook` | Inbound WhatsApp operational support handoff | Twilio request signature. |
| Voice webhook | `https://<project-ref>.functions.supabase.co/twilio-voice-webhook` | Masked call setup/TwiML | Twilio request signature. |
| Status callback | `https://<project-ref>.functions.supabase.co/twilio-status-callback` | SMS, WhatsApp, and call lifecycle/failure logging | Twilio request signature. |
| Verify callback/logging | `https://<project-ref>.functions.supabase.co/twilio-verify-webhook` | OTP delivery/verification operations | Twilio request signature; do not log OTP values. |

Masked calling notes:

- Frontend may request a masked-call session, but backend must create/approve it through `create-masked-call` or the legacy `ops-workflow` branch.
- Backend must call `private.can_create_masked_call()` before creating a masked-call row.
- Masked-call provider traffic requires both `twilio.operational_messages` and `twilio.masked_voice` controls.
- Masked-call sessions are allowed only for booking participants in accepted/active booking states and within the approved booking contact window.
- Browser/mobile clients cannot insert or update `public.masked_call_sessions` directly.
- Browser/mobile payloads must never contain user or Xooter phone numbers.
- Xoot masked voice must not record or transcribe calls.
- Use Twilio API keys for production outbound calls when possible.
- Keep Auth Token available only where signature validation requires it.
- Deploy `supabase/migrations/20260621001000_twilio_webhook_events.sql` before enabling callbacks.
- Deploy `supabase/migrations/20260630102715_phase9_twilio_verify_masked_voice.sql` before enabling Verify or masked voice.
- Twilio webhook functions log redacted metadata to `public.twilio_webhook_events`; raw phone numbers are not stored.
- Verify OTP attempts log only redacted metadata to `public.twilio_verify_attempts`; OTP values are never stored.
- Set `TWILIO_WEBHOOK_BASE_URL` to the exact public Supabase Functions origin used in the Twilio Console, and set a per-environment `TWILIO_WEBHOOK_HASH_SALT`.
- Rotate any Twilio credentials that were pasted into chat, issues, PRs, screenshots, or logs before production launch.

## Brevo

Planned endpoints:

| Callback | Suggested endpoint | Purpose | Required verification |
| --- | --- | --- | --- |
| Transactional event webhook | `https://<project-ref>.functions.supabase.co/brevo-events` | Delivery, bounce, complaint, click/open if enabled | Webhook key/header validation. |
| Marketing subscription webhook | `https://<project-ref>.functions.supabase.co/brevo-marketing-events` | List opt-in/out synchronization | Webhook key/header validation. |

Rules:

- Use verified sender domain before production.
- Do not send access codes, OTPs, gate codes, lockbox codes, or private support content in marketing email.
- Transactional templates need staging test sends before production.

## KIE

Planned callback/storage flow:

| Flow | Suggested location | Purpose | Required review |
| --- | --- | --- | --- |
| Prompt storage | Supabase private bucket path from `KIE_PROMPT_STORAGE_PATH` | Audit generated campaign inputs | Human review. |
| Output storage | Supabase private bucket path from `KIE_OUTPUT_STORAGE_PATH` | Store generated image/content outputs | Human approval before publishing. |
| Moderation event | Internal review queue | Mark approved/rejected assets | No auto-publish to production. |

## OpenAI Support Bot

Existing function: `support-respond`.

Rules already represented in code:

- Redacts email/phone/access-code-like content before model input.
- Escalates risky requests such as refunds, payments, damage, unsafe, cancellation, replacement, access codes, and bugs.
- Uses deterministic support-rule fallback if OpenAI is unavailable.
- Does not approve refunds, payments, replacements, contractor status, admin changes, or deployment actions.

Needed before scale:

- Per-user and per-ticket rate limits.
- Abuse detection for repeated support prompts.
- Support transcript retention policy.
- Sentry/structured logging with request IDs.

## Native Deep Links And App Links

Generated by `scripts/build/write-native-association-files.mjs`:

| File | URL | Purpose |
| --- | --- | --- |
| Apple AASA | `https://xoot.co.za/.well-known/apple-app-site-association` | Universal Links for iOS. |
| Android assetlinks | `https://xoot.co.za/.well-known/assetlinks.json` | Android App Links. |

Required app link paths:

- `/app/*`
- `/auth/callback*`
- `/auth/reset*`
- `/care-plus/*`
- `/install`
- `/trust-centre`
- `/zooter/*`

## CORS Allow List

Edge Functions currently use `ALLOWED_ORIGINS` plus safe defaults. Production must set:

```text
https://xoot.co.za,https://www.xoot.co.za,https://staging.xoot.co.za,http://localhost:5173,http://127.0.0.1:5173
```

Do not use `*` for authenticated or payment-related functions.

## Webhook Implementation Checklist

- Verify provider signature/secret/hash.
- Require `POST` except `OPTIONS` preflight.
- Parse and sanitize body with size limits.
- Use idempotency keys/provider event IDs.
- Fetch internal payment/booking/user rows server-side.
- Validate amount, currency, provider reference, environment, and status transition.
- Insert audit event before or with mutation.
- Return a generic success/failure response without leaking internal details.
- Add replay protection where the provider supports timestamps.
- Add provider-specific dashboard test events before production traffic.
