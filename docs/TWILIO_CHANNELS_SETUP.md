# Twilio Channels Setup

Reviewed: 2026-06-30

This runbook covers Xoot's planned Twilio channels: SMS, WhatsApp, phone/voice, masked calling, Verify OTP, and optional Twilio SendGrid email. It contains placeholders only. Do not paste Twilio credentials into docs, GitHub, frontend env, Expo public env, screenshots, or chat.

If real Twilio credentials were pasted into chat or issue text during setup, rotate them in Twilio before production. Treat the current values as compromised until rotation is complete.

## Deployment Status

Completed on 2026-06-24:

- `20260621001000_twilio_webhook_events.sql` is applied to staging and production.
- SMS, WhatsApp, voice, status, and Verify webhook functions are deployed to staging and production.
- Required webhook authentication and URL secrets are present in both Supabase projects.
- Unsigned webhook requests are rejected with `403`.
- Signed staging smoke tests returned valid TwiML or `204`, as appropriate.
- Audit verification confirmed that raw phone numbers and message bodies are not stored.

Completed locally on 2026-06-30:

- `20260630102715_phase9_twilio_verify_masked_voice.sql` adds disabled Phase 9 controls for `twilio.verify_otp`, `twilio.masked_voice`, and `twilio.whatsapp_urgent`.
- `public.twilio_verify_attempts` stores redacted Verify attempt metadata only: hashed destination, optional last four, status, and provider reference. It never stores OTP values or raw destinations.
- `private.can_create_masked_call()` centralizes masked-call eligibility: booking participant only, accepted/active booking only, no terminal booking states, and the approved booking contact window.
- `masked_call_sessions` direct browser/mobile writes are revoked. Clients can read their own session status; creation and updates stay behind Edge Functions.
- Xoot masked voice is explicitly no-recording and no-transcription for launch.

Still required in the Twilio Console:

- Rotate all credentials that were pasted into chat.
- Upgrade the trial account before production traffic.
- Purchase or port an approved South African production phone number.
- Replace the existing marketing-classified Messaging Service with a transactional/notifications service for booking and account messages. Do not route operational traffic through the marketing service.
- Create and approve the WhatsApp sender through Twilio/Meta; no sender is currently attached.
- Point each sender, TwiML App, Verify service, and status callback to the production endpoints.
- Complete South African sender, traffic, consent, and WhatsApp template approvals.
- Decide whether Brevo remains the sole email provider or Twilio SendGrid is enabled.

Current provider-account finding on 2026-06-24:

- Account status: Trial.
- Incoming phone numbers: none.
- WhatsApp senders: none.
- Existing Messaging Service classification: marketing, which is not acceptable for Xoot booking, OTP, safety, or service-status traffic.
- The repository and Edge Functions are ready for signed webhooks, but production delivery cannot be enabled until the sender and regulatory items above are complete.

## Security Rules

- Use Twilio API Key SID and API Key Secret for outbound API calls.
- Keep Twilio Auth Token server-side only for request signature validation and emergency account operations.
- Validate `X-Twilio-Signature` on every Twilio webhook before updating bookings, notifications, outbox rows, support tickets, or audit logs.
- Webhooks must be HTTPS.
- Never expose user or Xooter phone numbers in browser/mobile code.
- Never store OTP codes, raw phone numbers, raw email addresses, or message bodies in `twilio_verify_attempts`, webhook logs, outbox payloads, or analytics events.
- Do not call live Twilio Verify, Proxy, Voice, SMS, or WhatsApp APIs unless the relevant `twilio.*` operational control is enabled for the environment.
- Masked calls must be booking-scoped. They may not dial arbitrary numbers supplied by a client request.
- Masked voice must not record or transcribe calls.
- Never trust a Twilio status callback without matching it to an existing `integration_outbox` or booking workflow row.
- Separate staging and production Twilio projects/subaccounts where possible.
- Rotate any Twilio credentials that were pasted into chat before production launch.

## Required Secrets

Store these in Supabase Edge Function secrets or the Twilio dashboard only:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_API_KEY_SID=
TWILIO_API_KEY_SECRET=
TWILIO_VERIFY_SERVICE_SID=
TWILIO_TWIML_APP_SID=
TWILIO_ORGANIZATION_SID=
TWILIO_MESSAGING_SERVICE_SID=
TWILIO_PROXY_SERVICE_SID=
TWILIO_CALLER_ID=
TWILIO_SMS_SENDER=
TWILIO_WHATSAPP_SENDER=
TWILIO_VOICE_WEBHOOK_URL=
TWILIO_STATUS_CALLBACK_URL=
TWILIO_MESSAGE_WEBHOOK_URL=
TWILIO_WHATSAPP_WEBHOOK_URL=
TWILIO_VERIFY_WEBHOOK_URL=
TWILIO_WEBHOOK_BASE_URL=
TWILIO_WEBHOOK_HASH_SALT=
TWILIO_MASKED_CALL_QUEUE=
TWILIO_SENDGRID_API_KEY=
TWILIO_SENDGRID_SENDER_EMAIL=
```

## Setting Secrets Safely

Do not write live Twilio values into `.env.example`, `mobile/.env.example`, `supabase/functions/.env.example`, source code, docs, GitHub variables, or Expo public env.

Use a local file outside the repository, then push it into Supabase Edge Function secrets:

```powershell
# Example path only. Keep the real file outside the repo and do not paste values into chat.
notepad C:\secure\zoot-staging-edge.env
npm run ops:supabase:secrets:staging -- -EnvFile C:\secure\zoot-staging-edge.env
```

The local file should contain the Twilio keys listed above plus the shared Supabase/OpenAI/Brevo/payment secrets needed by the deployed Edge Functions. Delete or vault the local file after setting the secrets.

## Channel Intent

| Channel | Xoot use | Production rule |
| --- | --- | --- |
| SMS | OTP, urgent booking updates, fallback notices | Use Verify for OTP; operational SMS must be opt-out compliant. |
| WhatsApp | Urgent operational updates only | Do not replace in-app client-contractor chat; use approved templates where required. |
| Voice/phone | Active booking support and masked calls | Use TwiML App and server-generated masked call flows. |
| Status callbacks | Delivery, call status, failure handling | Verify signature and reconcile against `integration_outbox`. |
| Email via SendGrid | Optional if Brevo is not used for a template | Prefer one transactional email system unless there is a clear reason to split. |

## Webhook Endpoints To Configure

Use Supabase Edge Functions or a trusted backend route:

```text
https://<project-ref>.functions.supabase.co/twilio-message-webhook
https://<project-ref>.functions.supabase.co/twilio-whatsapp-webhook
https://<project-ref>.functions.supabase.co/twilio-voice-webhook
https://<project-ref>.functions.supabase.co/twilio-status-callback
https://<project-ref>.functions.supabase.co/twilio-verify-webhook
```

These functions should:

- Validate the Twilio signature with the Auth Token.
- Normalize the event payload.
- Match it to an existing booking, support case, notification, or outbox row.
- Write redacted webhook metadata to `public.twilio_webhook_events` and create an admin review queue item when human follow-up is needed.
- Return a minimal response and never leak internal IDs unless already known to Twilio.
- Never store raw phone numbers; store only salted hashes and last-four references for reconciliation.

## Phase 9 Operational Gates

Leave all Twilio provider controls disabled until staging proves the exact channel:

| Control | Default | Enables |
| --- | --- | --- |
| `twilio.operational_messages` | Off | Global Twilio transactional readiness after account upgrade, sender classification, callbacks and signed smoke tests. |
| `twilio.verify_otp` | Off | Verify OTP sends/checks after Fraud Guard, geo-permissions, rate limits and Verify Service setup. |
| `twilio.masked_voice` | Off | Live masked voice provider calls for eligible active bookings only. |
| `twilio.whatsapp_urgent` | Off | Approved urgent WhatsApp templates only. |

Turning on a secret alone must not activate a provider. The Edge Functions also check the controls above.

## Launch Checklist

- Twilio account/subaccount created for staging and production.
- API key pair created; Auth Token kept only for signature validation.
- SMS sender or Messaging Service configured.
- WhatsApp sender approved and templates reviewed.
- Voice number and TwiML App configured.
- Verify Service configured with Fraud Guard, geo-permissions and approved countries only.
- Webhook URLs set to Supabase Edge Function endpoints.
- `20260621001000_twilio_webhook_events.sql` deployed before webhooks are enabled.
- `20260630102715_phase9_twilio_verify_masked_voice.sql` deployed before Verify or masked voice is enabled.
- All webhook functions deployed and signature validation tested.
- Masked-call staging tests cover: outside-window denial, non-participant denial, terminal-booking denial, no-recording metadata, and provider-gated queue creation.
- Verify staging tests cover: rate limits, Fraud Guard/geo rules, redacted attempt logging, wrong-code handling, and approved-code handling.
- `TWILIO_WEBHOOK_BASE_URL` and `TWILIO_WEBHOOK_HASH_SALT` set per environment.
- `TWILIO_API_KEY_SID` and `TWILIO_API_KEY_SECRET` used for outbound API calls; `TWILIO_AUTH_TOKEN` used only for webhook signature validation and emergency account operations.
- Opt-in/opt-out wording reviewed.
- Brevo vs Twilio SendGrid ownership decision documented.
- No Twilio credentials exist in git history after rotation.
