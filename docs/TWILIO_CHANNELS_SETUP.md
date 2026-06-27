# Twilio Channels Setup

Reviewed: 2026-06-24

This runbook covers Zoot's planned Twilio channels: SMS, WhatsApp, phone/voice, masked calling, Verify OTP, and optional Twilio SendGrid email. It contains placeholders only. Do not paste Twilio credentials into docs, GitHub, frontend env, Expo public env, screenshots, or chat.

If real Twilio credentials were pasted into chat or issue text during setup, rotate them in Twilio before production. Treat the current values as compromised until rotation is complete.

## Deployment Status

Completed on 2026-06-24:

- `20260621001000_twilio_webhook_events.sql` is applied to staging and production.
- SMS, WhatsApp, voice, status, and Verify webhook functions are deployed to staging and production.
- Required webhook authentication and URL secrets are present in both Supabase projects.
- Unsigned webhook requests are rejected with `403`.
- Signed staging smoke tests returned valid TwiML or `204`, as appropriate.
- Audit verification confirmed that raw phone numbers and message bodies are not stored.

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
- Existing Messaging Service classification: marketing, which is not acceptable for Zoot booking, OTP, safety, or service-status traffic.
- The repository and Edge Functions are ready for signed webhooks, but production delivery cannot be enabled until the sender and regulatory items above are complete.

## Security Rules

- Use Twilio API Key SID and API Key Secret for outbound API calls.
- Keep Twilio Auth Token server-side only for request signature validation and emergency account operations.
- Validate `X-Twilio-Signature` on every Twilio webhook before updating bookings, notifications, outbox rows, support tickets, or audit logs.
- Webhooks must be HTTPS.
- Never expose user or Zooter phone numbers in browser/mobile code.
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
powershell -ExecutionPolicy Bypass -File scripts/ops/set-supabase-edge-secrets.ps1 -EnvFile C:\secure\zoot-staging-edge.env
```

The local file should contain the Twilio keys listed above plus the shared Supabase/OpenAI/Brevo/payment secrets needed by the deployed Edge Functions. Delete or vault the local file after setting the secrets.

## Channel Intent

| Channel | Zoot use | Production rule |
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

## Launch Checklist

- Twilio account/subaccount created for staging and production.
- API key pair created; Auth Token kept only for signature validation.
- SMS sender or Messaging Service configured.
- WhatsApp sender approved and templates reviewed.
- Voice number and TwiML App configured.
- Webhook URLs set to Supabase Edge Function endpoints.
- `20260621001000_twilio_webhook_events.sql` deployed before webhooks are enabled.
- All webhook functions deployed and signature validation tested.
- `TWILIO_WEBHOOK_BASE_URL` and `TWILIO_WEBHOOK_HASH_SALT` set per environment.
- `TWILIO_API_KEY_SID` and `TWILIO_API_KEY_SECRET` used for outbound API calls; `TWILIO_AUTH_TOKEN` used only for webhook signature validation and emergency account operations.
- Opt-in/opt-out wording reviewed.
- Brevo vs Twilio SendGrid ownership decision documented.
- No Twilio credentials exist in git history after rotation.
