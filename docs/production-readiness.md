# Zoot Production Readiness Guide

This guide separates code readiness from operational credentials and dashboard settings. It is intentionally conservative: Zoot should measure readiness before claiming high-scale capacity.

## Required Environment Variables

Client-safe variables only:

```bash
VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
VITE_MAPBOX_PUBLIC_TOKEN=
VITE_SENTRY_DSN=
VITE_CLOUDFLARE_TURNSTILE_SITE_KEY=
```

Do not expose service-role keys, webhook secrets, Stitch/Ozow secrets, Twilio auth tokens, Brevo API keys, Apple private keys, AI provider keys, signing certificates, or release fingerprints through `VITE_` variables.

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
TWILIO_VERIFY_SERVICE_SID=
TWILIO_MESSAGING_SERVICE_SID=
TWILIO_SMS_SENDER=
TWILIO_WHATSAPP_SENDER=
TWILIO_TWIML_APP_SID=
BREVO_API_KEY=
WEBHOOK_SIGNING_SECRET=
SENTRY_DSN=
MAPBOX_SECRET_TOKEN=
```

Native release build variables belong in CI or the release shell only:

```bash
ZOOT_APPLE_TEAM_ID=
ZOOT_IOS_BUNDLE_ID=za.co.zoothome.app
ZOOT_IOS_APP_ID=
ZOOT_ANDROID_PACKAGE_NAME=za.co.zoothome.app
ZOOT_ANDROID_SHA256_CERT_FINGERPRINTS=
ZOOT_APP_LINK_PATHS=/app/*,/auth/callback*,/auth/reset*,/care-plus/*,/install,/trust-centre,/zooter/*
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
npm ci
npm run verify
```

Upload the `dist/` contents to Hostinger public web root. The branch includes `public/.htaccess`, which Vite copies into `dist/`, to provide:

- SPA fallback to `/index.html`.
- CSP, HSTS, frame denial, referrer, permissions, COOP, and CORP headers.
- Noindex response headers for protected app, admin, auth, and contractor account routes.
- Long cache windows for built JS/CSS assets.
- Short-cache JSON responses for `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` when native association files are generated.
- No-cache handling for `sw.js`.

Confirm Hostinger allows `.htaccess` override directives for `mod_rewrite`, `mod_headers`, and `mod_expires`.

## Native Universal Links and App Links

The build runs `scripts/build/write-native-association-files.mjs` before and after Vite. It generates:

- `/.well-known/apple-app-site-association` when `ZOOT_APPLE_TEAM_ID` or `ZOOT_IOS_APP_ID` is set.
- `/.well-known/assetlinks.json` when `ZOOT_ANDROID_SHA256_CERT_FINGERPRINTS` is set.

Release checks:

1. Use the final Apple Team ID and bundle ID before TestFlight submission.
2. Use the Android release signing certificate SHA-256 fingerprint, not a debug fingerprint, before Play submission.
3. Deploy the generated `.well-known` files at the production domain over HTTPS with `application/json` content type.
4. Confirm universal links route into `/app`, booking links, auth callback/reset, Care+, install, trust centre, and Zooter routes through `resolveNativeRoute`.
5. Keep the `zoot://` custom scheme as a fallback, but do not rely on it as the only production linking path.

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
- Twilio webhooks follow `docs/TWILIO_CHANNELS_SETUP.md` and validate `X-Twilio-Signature` before mutating any row.
- Mapbox public tokens are URL/app restricted; native Mapbox downloads token is stored only as an EAS/CI secret.

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

## Public Scraping And Bot Controls

Public SEO pages cannot be made impossible to scrape without also blocking legitimate search crawlers. The production posture is:

- Public marketing and article pages remain crawlable.
- Protected app, admin, auth, and contractor account routes send `X-Robots-Tag: noindex, noarchive, nosnippet`.
- Browser CSP allows Supabase and Mapbox only; Twilio, Brevo, payments, OpenAI, KIE, Airtable, Hostinger, and Cloudflare provider APIs must be called only from server-side Edge Functions or CI/provider dashboards.
- Private account, booking, payment, household, Zooter, and support data must be protected by Supabase Auth, RLS, Edge Function authorization, and rate limits.
- Cloudflare should enforce bot/rate-limit rules on `/app/*`, `/auth/*`, `/admin/*`, Supabase-facing functions, and high-risk form submissions before public launch.

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
- Apple Team ID, final bundle ID, and Android release certificate fingerprint for native association files.
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
