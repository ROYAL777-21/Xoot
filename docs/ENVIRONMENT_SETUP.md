# Xoot Environment Setup

Reviewed: 2026-06-08

This file is the safe setup guide for local, staging, and production configuration. It intentionally contains placeholders only. Do not paste live credentials into docs, chat, commits, issues, PR descriptions, screenshots, or frontend variables.

## Current Env Usage Found In Code

Frontend/public runtime:

- `VITE_APP_ENV` - app environment guard: `development`, `preview`, `staging`, or `production`.
- `VITE_PUBLIC_SITE_URL` / `VITE_SITE_URL` - canonical frontend URL for docs, redirects, and deployment checks.
- `VITE_ENABLE_DEMO_MODE` - local/preview demo gate only. Must be false or unset in production.
- `VITE_SUPABASE_URL` - public Supabase project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY` - public Supabase anon/publishable key.
- `VITE_SUPABASE_PROJECT_ID` - deployment/admin reference.
- `VITE_SENTRY_DSN` - public Sentry browser DSN if frontend monitoring is enabled.
- `VITE_POSTHOG_PROJECT_TOKEN` - public PostHog project token for privacy-approved product analytics events.
- `VITE_POSTHOG_HOST` - PostHog ingest host, normally `https://us.i.posthog.com`.
- `VITE_MAPBOX_PUBLIC_TOKEN` - public Mapbox browser token for service-area and dispatch maps.
- `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY` - public Turnstile site key if bot checks are enabled.
- `VITE_GOOGLE_WEB_CLIENT_ID` - public Google web OAuth client ID when a direct client flow is enabled.
- `VITE_APPLE_SERVICES_ID` - public Apple Services ID reference when web Sign in with Apple is enabled.
- `import.meta.env.PROD` - service worker registration and production-mode config guard.
- `import.meta.env.DEV` - developer-only error logging.

Build/native association scripts:

- `ZOOT_APPLE_TEAM_ID`
- `ZOOT_IOS_BUNDLE_ID`
- `ZOOT_IOS_APP_ID`
- `ZOOT_ANDROID_PACKAGE_NAME`
- `ZOOT_ANDROID_SHA256_CERT_FINGERPRINTS`
- `ZOOT_APP_LINK_PATHS`

SEO CMS and publishing automation:

- `WORDPRESS_SITE_URL` - public WordPress CMS URL.
- `WORDPRESS_PUBLIC_CANONICAL_BASE` - canonical Xoot article base, normally `https://zoothome.co.za/articles`.
- `WORDPRESS_REST_API_URL` - server/CI-only REST API endpoint for approved article sync.
- `WORDPRESS_APP_USERNAME` / `WORDPRESS_APP_PASSWORD` - least-privilege WordPress application credential for server/CI sync only.
- `WORDPRESS_WEBHOOK_SECRET` / `WORDPRESS_PREVIEW_SECRET` - server/CI-only publishing and draft-preview protection.
- `WORDPRESS_SYNC_DRY_RUN` - keeps WordPress sync non-mutating until editorial approval is configured.

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
| WordPress application password/webhook secrets | CI secret store or server-side sync job | Frontend, mobile app, WordPress public pages, docs |
| Mapbox secret/download tokens | Supabase Edge Function secrets, EAS secrets, or CI secrets | `VITE_`, `EXPO_PUBLIC_`, docs, or app bundles |
| OAuth client secrets/private keys | Supabase provider dashboard or secure backend secret store | Public repo or app bundle |
| Mobile signing keys/profiles | Apple Developer, App Store Connect, Google Play Console, secure CI secrets | Repo or frontend env |
| Sentry source map auth token | CI secret only | Frontend env or static files |
| PostHog public project token | Hostinger/Vercel/GitHub/EAS public env | Private secret stores as if it were privileged |
| PostHog private API key | Server/CI secret store only if dashboards or exports are automated | `VITE_`, `EXPO_PUBLIC_`, docs, or app bundles |

## Required Environments

Xoot uses three operational environments:

| Environment | Purpose | Supabase project | Payment credentials | Demo mode |
| --- | --- | --- | --- | --- |
| Local development | Developer iteration and preview data | Local or staging-safe project | Sandbox only | Allowed when `VITE_APP_ENV=development` |
| Staging | Real end-to-end QA before launch | `Xoot Staging` (`fxmxyabdjqviqbcxmvlp`) once migrations/functions/secrets are deployed | Sandbox/test credentials | Not allowed |
| Production | Customer and Xooter traffic | `Xoot` (`mvlrkelahhsyjrwgsxaf`) | Production credentials | Not allowed |

Staging and production credentials must be separate. A staging webhook, OAuth app, payment callback, or Supabase project must never share production secrets unless a provider explicitly forces one account and the scopes are isolated.

## Frontend `.env.local` Template

Use `.env.example` as the source. Local `.env.local` can contain public values only:

```env
VITE_APP_ENV=development
VITE_PUBLIC_SITE_URL=http://localhost:5173
VITE_SITE_URL=http://localhost:5173
VITE_ENABLE_DEMO_MODE=false
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SENTRY_DSN=
VITE_POSTHOG_PROJECT_TOKEN=
VITE_POSTHOG_HOST=https://us.i.posthog.com
VITE_MAPBOX_PUBLIC_TOKEN=
VITE_CLOUDFLARE_TURNSTILE_SITE_KEY=
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
ZOOT_REQUIRE_CONCIERGE_TURNSTILE=false
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
TWILIO_ORGANIZATION_SID=
TWILIO_MESSAGING_SERVICE_SID=
TWILIO_SMS_SENDER=
TWILIO_WHATSAPP_SENDER=
TWILIO_VOICE_WEBHOOK_URL=
TWILIO_STATUS_CALLBACK_URL=
TWILIO_MESSAGE_WEBHOOK_URL=
TWILIO_WHATSAPP_WEBHOOK_URL=
TWILIO_VERIFY_WEBHOOK_URL=
TWILIO_PROXY_SERVICE_SID=
TWILIO_WEBHOOK_BASE_URL=
TWILIO_WEBHOOK_HASH_SALT=
TWILIO_SENDGRID_API_KEY=
TWILIO_SENDGRID_SENDER_EMAIL=
BREVO_API_KEY=
BREVO_TRANSACTIONAL_TEMPLATE_INVOICE_ID=
BREVO_TRANSACTIONAL_TEMPLATE_INVOICE_RESEND_ID=
ZOOT_INVOICE_LEGAL_ENTITY=
ZOOT_INVOICE_LEGAL_ENTITY_REGISTRATION=
ZOOT_INVOICE_VAT_RATE=0
ZOOT_INVOICE_VAT_NUMBER=
KIE_API_KEY=
SENTRY_DSN=
POSTHOG_API_KEY=
POSTHOG_PROJECT_ID=
POSTHOG_HOST=
MAPBOX_SECRET_TOKEN=
AIRTABLE_API_TOKEN=
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_ZONE_ID=
CLOUDFLARE_TURNSTILE_SECRET_KEY=
CLOUDFLARE_R2_ENDPOINT=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_ACCESS_CLIENT_ID=
CLOUDFLARE_ACCESS_CLIENT_SECRET=
HOSTINGER_API_TOKEN=
WORDPRESS_REST_API_URL=
WORDPRESS_APP_USERNAME=
WORDPRESS_APP_PASSWORD=
WORDPRESS_WEBHOOK_SECRET=
WORDPRESS_PREVIEW_SECRET=
```

Only Edge Functions and other trusted server-side code may read these values.

For staging, copy `supabase/functions/.env.staging.example` outside the repository, fill real values locally, then run:

```powershell
npm run ops:supabase:secrets:staging -- -EnvFile C:\secure\zoot-staging-edge.env
```

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
- Storage buckets for user documents, support attachments, completion photos, KIE prompt/output files, public Xooter avatars, and public marketing assets.
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

- Deploy the repo schema, RLS, storage policies, Edge Functions, and staging secrets to the `Xoot Staging` Supabase project. Use `docs/STAGING_BACKEND_DEPLOYMENT.md` as the runbook.
- Configure Supabase Auth providers, Site URL, Redirect URLs, email OTP settings, and leaked-password protection.
- Create storage buckets and RLS policies before enabling uploads. Current bucket migration: `supabase/migrations/20260620000000_storage_buckets_and_policies.sql`.
- Set Edge Function secrets per environment.
- Configure Hostinger environment variables or CI build variables for production.
- Configure Stitch/Ozow sandbox and production callback URLs.
- Configure Twilio webhooks and request signature validation.
- Configure Mapbox public tokens for browser/Expo clients and private native downloads tokens only in EAS or CI secrets.
- Configure PostHog public project tokens for web and Expo only after the privacy-approved event contract is accepted. Keep `phx_` API keys server-side only.
- Configure Cloudflare bot/rate-limit rules for protected app routes and API endpoints; public SEO pages remain crawlable.
- Configure WordPress as the headless/editorial SEO CMS for approved article drafts, with app-password credentials stored only in CI/server secret storage.
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

Expo mobile release commands:

```bash
npm run mobile:config:check
npm run mobile:typecheck
npm run mobile:build:preview:ios
npm run mobile:build:preview:android
npm run mobile:build:production
```

Do not deploy production if any check fails, if provider dashboard callbacks are not aligned, or if any production provider still uses sandbox credentials.

Ops helper commands:

```bash
npm run ops:github-vars
npm run ops:provider-auth:check
npm run ops:readiness
npm run ops:supabase:deploy:staging
npm run ops:supabase:deploy:production
npm run ops:supabase:secrets:staging
npm run ops:supabase:secrets:production
npm run ops:supabase:verify:live
```
