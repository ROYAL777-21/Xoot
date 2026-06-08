# Zoot Environment Setup

Reviewed: 2026-06-08

This file is the safe setup guide for local, staging, and production configuration. It intentionally contains placeholders only. Do not paste live credentials into docs, chat, commits, issues, PR descriptions, screenshots, or frontend variables.

## Current Env Usage Found In Code

Frontend/public runtime:

- `VITE_APP_ENV` - app environment guard: `development`, `preview`, `staging`, or `production`.
- `VITE_PUBLIC_SITE_URL` - canonical frontend URL for docs, redirects, and deployment checks.
- `VITE_ENABLE_DEMO_MODE` - local/preview demo gate only. Must be false or unset in production.
- `VITE_SUPABASE_URL` - public Supabase project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY` - public Supabase anon/publishable key.
- `VITE_SUPABASE_PROJECT_ID` - deployment/admin reference.
- `VITE_SENTRY_DSN` - public Sentry browser DSN if frontend monitoring is enabled.
- `import.meta.env.PROD` - service worker registration and production-mode config guard.
- `import.meta.env.DEV` - developer-only error logging.

Build/native association scripts:

- `ZOOT_APPLE_TEAM_ID`
- `ZOOT_IOS_BUNDLE_ID`
- `ZOOT_IOS_APP_ID`
- `ZOOT_ANDROID_PACKAGE_NAME`
- `ZOOT_ANDROID_SHA256_CERT_FINGERPRINTS`
- `ZOOT_APP_LINK_PATHS`

Supabase Edge Functions:

- `ALLOWED_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_SUPPORT_MODEL`

## Storage Locations

| Value type | Store in | Never store in |
| --- | --- | --- |
| Public frontend config | Hostinger/Vercel/GitHub Actions env, local `.env.local` | Chat with live values |
| Supabase anon/publishable key | Frontend env and Supabase client settings | Server-only secret stores as if it were privileged |
| Supabase service-role key | Supabase Edge Function secrets only | Any `VITE_` variable or browser/mobile app bundle |
| Payment provider secrets | Supabase Edge Function secrets or backend secret manager | Frontend, docs, local committed files |
| Twilio/Brevo/KIE/OpenAI secrets | Supabase Edge Function secrets | Frontend, screenshots, support tickets |
| OAuth client secrets/private keys | Supabase provider dashboard or secure backend secret store | Public repo or app bundle |
| Mobile signing keys/profiles | Apple Developer, App Store Connect, Google Play Console, secure CI secrets | Repo or frontend env |
| Sentry source map auth token | CI secret only | Frontend env or static files |

## Required Environments

Zoot uses three operational environments:

| Environment | Purpose | Supabase project | Payment credentials | Demo mode |
| --- | --- | --- | --- | --- |
| Local development | Developer iteration and preview data | Local or staging-safe project | Sandbox only | Allowed when `VITE_APP_ENV=development` |
| Staging | Real end-to-end QA before launch | Separate staging project | Sandbox/test credentials | Not allowed |
| Production | Customer and Zooter traffic | Separate production project | Production credentials | Not allowed |

Staging and production credentials must be separate. A staging webhook, OAuth app, payment callback, or Supabase project must never share production secrets unless a provider explicitly forces one account and the scopes are isolated.

## Frontend `.env.local` Template

Use `.env.example` as the source. Local `.env.local` can contain public values only:

```env
VITE_APP_ENV=development
VITE_PUBLIC_SITE_URL=http://localhost:5173
VITE_ENABLE_DEMO_MODE=false
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SENTRY_DSN=
```

Rules:

- `VITE_` means public. Treat it as visible to every browser user.
- Do not put service-role, payment, Twilio, Brevo, KIE, OpenAI, OAuth client secrets, webhook secrets, private keys, or signing secrets in `VITE_` variables.
- `VITE_ENABLE_DEMO_MODE=true` is only for local or preview builds.
- `VITE_APP_ENV=production` must use real `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Supabase Edge Function Secrets

Set these in the Supabase dashboard or via Supabase CLI secrets for each project:

```env
ALLOWED_ORIGINS=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_SUPPORT_MODEL=
STITCH_CLIENT_ID=
STITCH_CLIENT_SECRET=
STITCH_WEBHOOK_SECRET=
OZOW_SITE_CODE=
OZOW_PRIVATE_KEY=
OZOW_API_KEY=
OZOW_WEBHOOK_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_API_KEY_SID=
TWILIO_API_KEY_SECRET=
TWILIO_VERIFY_SERVICE_SID=
TWILIO_TWIML_APP_SID=
BREVO_API_KEY=
KIE_API_KEY=
SENTRY_DSN=
```

Only Edge Functions and other trusted server-side code may read these values.

## Production No-Mock Guard

The app now has two config checks:

- `src/lib/env.ts` runs at frontend startup and throws if production/staging would use preview Supabase, demo mode, missing environment names, or secret-like `VITE_` names.
- `scripts/config/validate-public-env.mjs` runs before `npm run build` and in GitHub Actions through `npm run config:check`.

Preview/demo mode remains available for CI and local work only when explicitly configured as `VITE_APP_ENV=preview` or `development`.

## Supabase Setup

Required dashboard items for both staging and production:

- Project URL.
- Publishable/anon key.
- Service-role key stored only as an Edge Function secret.
- Auth Site URL.
- Auth Redirect URLs.
- Storage buckets for user documents, support attachments, completion photos, KIE prompt/output files, and public marketing assets.
- Deployed Edge Function secrets.
- Webhook URLs for payments, Twilio, Brevo, and support workflows as they are implemented.

## CORS And Redirect Origins

Baseline allowed origins:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `https://staging.zoothome.co.za`
- `https://zoothome.co.za`
- `https://www.zoothome.co.za`

Supabase Auth Redirect URLs should include:

- `http://localhost:5173/auth/callback`
- `http://localhost:5173/auth/reset`
- `https://staging.zoothome.co.za/auth/callback`
- `https://staging.zoothome.co.za/auth/reset`
- `https://zoothome.co.za/auth/callback`
- `https://zoothome.co.za/auth/reset`
- `zoot://auth/callback` if native deep-link auth is enabled.

## Manual Dashboard Setup Needed

- Create and name separate Supabase staging and production projects.
- Configure Supabase Auth providers, Site URL, Redirect URLs, email OTP settings, and leaked-password protection.
- Create storage buckets and RLS policies before enabling uploads.
- Set Edge Function secrets per environment.
- Configure Hostinger environment variables or CI build variables for production.
- Configure Stitch/Ozow sandbox and production callback URLs.
- Configure Twilio webhooks and request signature validation.
- Configure Brevo sender domain, transactional templates, and webhook validation.
- Configure Sentry frontend DSN and CI source map upload auth token if source maps are uploaded.
- Configure Apple/Google OAuth apps and native mobile IDs before store release.

## Run And Deploy Checks

Local/CI commands:

```bash
npm run config:check
npm run lint
npm run test
npm run build
npm run security:scan
```

Mobile release commands after native projects exist:

```bash
npm run mobile:sync
iOS archive in Xcode
Android release bundle in Android Studio or Gradle
```

Do not deploy production if any check fails, if provider dashboard callbacks are not aligned, or if any production provider still uses sandbox credentials.
