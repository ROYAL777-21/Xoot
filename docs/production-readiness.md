# Zoot Production Readiness Guide

This guide separates code readiness from operational credentials and dashboard settings. It is intentionally conservative: Zoot should measure readiness before claiming high-scale capacity.

## Required Environment Variables

Client-safe variables only:

```bash
VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
```

Do not expose service-role keys, webhook secrets, Stitch/Ozow secrets, Twilio auth tokens, Brevo API keys, Apple private keys, or AI provider keys through `VITE_` variables.

Server/edge-only secrets belong in Supabase Edge Function secrets or the relevant provider dashboard:

```bash
ALLOWED_ORIGINS=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_SUPPORT_MODEL=gpt-4.1-mini
STITCH_CLIENT_ID=
STITCH_CLIENT_SECRET=
OZOW_SITE_CODE=
OZOW_PRIVATE_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_API_KEY_SID=
TWILIO_API_KEY_SECRET=
BREVO_API_KEY=
WEBHOOK_SIGNING_SECRET=
SENTRY_DSN=
```

`ALLOWED_ORIGINS` should be a comma-separated allowlist such as:

```bash
ALLOWED_ORIGINS=https://zoothome.co.za,https://www.zoothome.co.za,https://staging.zoothome.co.za
```

## Supabase Auth Setup

1. Enable email/password auth.
2. Enable leaked-password protection in Auth settings.
3. Configure password reset redirect URLs:
   - `https://<staging-domain>/auth/reset`
   - `https://<production-domain>/auth/reset`
   - Local preview URLs only while developing.
4. Configure OAuth redirect URLs:
   - `https://<staging-domain>/auth/callback`
   - `https://<production-domain>/auth/callback`
5. Add Google provider credentials in Supabase Auth.
6. Add Apple provider credentials in Supabase Auth: Services ID, Team ID, Key ID, and private key.
7. Keep PKCE enabled for browser auth.
8. Require MFA for admin/internal roles before production launch.

## Hostinger Static Deployment

Build command:

```bash
npm install
npm run verify
```

Upload the `dist/` contents to Hostinger public web root. The branch includes `public/.htaccess`, which Vite copies into `dist/`, to provide:

- SPA fallback to `/index.html`.
- CSP, HSTS, frame denial, referrer, permissions, COOP, and CORP headers.
- Long cache windows for built JS/CSS assets.
- No-cache handling for `sw.js`.

Confirm Hostinger allows `.htaccess` override directives for `mod_rewrite`, `mod_headers`, and `mod_expires`.

## iPhone PWA Verification

1. Open the production or LAN preview URL in Safari on iPhone.
2. Confirm `/auth`, `/care-plus`, `/app`, `/install`, `/trust-centre`, and `/auth/reset` render without horizontal overflow.
3. Use Share -> Add to Home Screen.
4. Launch from the home screen and confirm standalone display.
5. Start a password reset request and confirm the link returns to `/auth/reset`.
6. Start Google/Apple OAuth only after provider credentials and redirect allow-list are configured.
7. Confirm offline fallback shows a useful page rather than a blank screen.

## Security Verification Before Merge

Run locally or in CI:

```bash
npm run lint
npm run test
npm run build
npm run security:scan
```

Supabase checks:

- Security advisor.
- Performance advisor.
- RLS enabled on all public tables.
- Policy smoke tests for client, contractor, support, finance, and admin roles.
- Edge function smoke tests for `create-booking-request`, `ai-match`, `support-respond`, and sensitive access read/save.
- Webhook signature validation for payment and communications endpoints before live traffic.

Browser checks:

- `/`
- `/auth`
- `/auth/reset`
- `/auth/callback?next=/app`
- `/care-plus`
- `/trust-centre`
- `/app`
- `/app/properties/airbnb`
- `/app/properties/office`

## ChatGPT Support Assistant

`support-respond` is the only support path that may call the OpenAI API. The browser creates an authenticated support ticket, invokes the Supabase Edge Function with the `ticket_id`, and the Edge Function persists the returned assistant text using the server-only service-role key after verifying the ticket belongs to the caller.

Production requirements:

- Set `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and `OPENAI_SUPPORT_MODEL` as Supabase Edge Function secrets only.
- Keep the deterministic Zoot support-rule fallback enabled for API outages or missing credentials.
- Do not send refund, payment, trust, safety, cancellation, access-code, lockbox, or bug escalations to the model; those must route to human review.
- Review OpenAI request IDs from Edge Function logs when debugging provider failures.

## 10,000-Request Readiness

The repository includes a k6 script at `scripts/load/zoot-smoke.js`.

Run a smoke check:

```bash
BASE_URL=https://<staging-domain> k6 run scripts/load/zoot-smoke.js
```

Run a larger public-route check by overriding options in k6 or splitting route groups. Do not claim Zoot supports 10,000 concurrent users until:

- Static frontend responses meet target latency under CDN/Hostinger conditions.
- Supabase database-facing reads have measured latency and no failing RLS/policy paths.
- `create-booking-request` is deployed and live frontend booking calls are verified against it; remaining payment, refund, ZootCred redemption, subscription cancellation, and support mutations should move behind Edge Functions before real value is issued.
- Provider webhooks are idempotent and rate-limited.
- Error budgets, Sentry alerts, and rollback procedures are active.

## Credential-Blocked Items

These are intentionally not hardcoded into the repo:

- Google OAuth client ID/secret.
- Apple OAuth Services ID, Team ID, Key ID, and private key.
- Production/staging domains.
- Hostinger deployment credentials.
- Supabase service-role key and edge function secrets.
- OpenAI API key for ChatGPT support responses.
- Stitch/Ozow payment credentials and webhook secrets.
- Twilio voice credentials and phone numbers.
- Brevo API key and sender domain verification.
- Apple Developer account and final native bundle IDs.

## Production Guardrails

- Real booking prices, cover, ZootCred, refunds, and Care+ membership state must be calculated server-side.
- Browser clients must not be the authority for contractor assignment, payment confirmation, ZootCred balance changes, subscription state, cancellation penalties, refunds, or sensitive access decisions.
- Gate codes and sensitive access notes must be encrypted and fetched only inside the allowed booking window.
- Notifications must follow the app-first hierarchy: in-app first, email for records, WhatsApp only for urgent operational events, Twilio voice only during active bookings.
- Avoid unsupported guarantees in public copy unless backed by policy, insurance, and operational capacity.
