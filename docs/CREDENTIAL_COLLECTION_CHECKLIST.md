# Zoot Credential Collection Checklist

Reviewed: 2026-06-19

Do not paste secret values into chat. Do not commit real secrets. Do not create a committed `.env` with live values. This checklist records what must be collected, where to get it, and where to store it.

## Collection Rules

- Public mobile values may use `EXPO_PUBLIC_` only when they are safe to ship inside the app.
- Public web values may use `VITE_` only when they are safe to ship inside the browser.
- Provider secrets belong in Supabase Edge Function secrets, EAS secrets, CI variables, or provider dashboards.
- Store signing files, App Store Connect `.p8` keys, Google Play JSON, keystores, and private keys outside the repo or as EAS file secrets.
- Keep staging/preview credentials separate from production.
- Rotate credentials before production if they were ever pasted into tools, screenshots, notes, or local files.
- Rotate Twilio credentials before production if they were pasted into chat. Set the rotated values only in Twilio, Supabase Edge Function secrets, and any approved vault; never in committed files.

## Current Collected Public Metadata

| Item | Status |
| --- | --- |
| Supabase project ref | Present in `supabase/config.toml`: `mvlrkelahhsyjrwgsxaf` |
| Supabase API URL | Confirmed by connector: `https://mvlrkelahhsyjrwgsxaf.supabase.co` |
| Supabase publishable key | Confirmed by connector; value intentionally not written to repo/docs/chat |
| Separate Supabase staging project | Created: `Zoot Staging`, project ref `fxmxyabdjqviqbcxmvlp`, URL `https://fxmxyabdjqviqbcxmvlp.supabase.co`; schema/functions/secrets still pending |
| Expo EAS project ID | Created: `@don-pacho777/zoot`, project ID `b4c6e0b8-e2e7-40c5-b259-3b34c79be30b` |
| EAS public env | Production points to production Supabase; preview/development point to staging Supabase |
| Supabase Auth advisor | Leaked password protection is still disabled; official docs list this as Pro plan and above |
| Staging backend deployment runbook | Added in `docs/STAGING_BACKEND_DEPLOYMENT.md`; scripts live in `scripts/ops/` |

The Supabase URL is public project metadata. Publishable keys are public-safe but should still be stored through EAS/GitHub/hosting environment management rather than hardcoded.

## Public App Config

| Credential/config | Get from | Store in | Variable |
| --- | --- | --- | --- |
| Mobile app environment | release decision | EAS env | `EXPO_PUBLIC_APP_ENV` |
| Production site URL | Cloudflare/Hostinger/domain | EAS env, web host env | `EXPO_PUBLIC_SITE_URL`, `VITE_PUBLIC_SITE_URL`, `VITE_SITE_URL` |
| Supabase project ref | Supabase dashboard | EAS env, GitHub vars | `EXPO_PUBLIC_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PROJECT_ID` |
| Supabase project URL | Supabase dashboard | EAS env, GitHub vars | `EXPO_PUBLIC_SUPABASE_URL`, `VITE_SUPABASE_URL` |
| Supabase publishable key | Supabase API settings | EAS env, GitHub vars | `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| EAS project ID | `eas init` / Expo dashboard | EAS env | `EXPO_PUBLIC_EAS_PROJECT_ID` |
| Sentry DSN | Sentry project settings | EAS env, web host env | `EXPO_PUBLIC_SENTRY_DSN`, `VITE_SENTRY_DSN` |
| Mapbox public token | Mapbox dashboard | EAS env | `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN` |
| Turnstile site key | Cloudflare Turnstile dashboard | EAS env, web host env | `EXPO_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY`, `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY` |

## Supabase Secrets

Set these with Supabase dashboard or CLI secrets for each environment.

| Secret | Get from | Store in |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase dashboard | Supabase Edge Function secrets |
| `SUPABASE_ANON_KEY` or publishable key | Supabase API settings | Supabase Edge Function secrets |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase API settings | Supabase Edge Function secrets only |
| `ALLOWED_ORIGINS` | deployment domains | Supabase Edge Function secrets |
| `OPENAI_API_KEY` | OpenAI Platform | Supabase Edge Function secrets |
| `OPENAI_SUPPORT_MODEL` | product decision | Supabase Edge Function secrets |
| `SENTRY_DSN` | Sentry backend/mobile project | Supabase Edge Function secrets if Edge reporting is added |

## Payments

### Stitch

| Secret/config | Get from | Store in |
| --- | --- | --- |
| Sandbox client ID | Stitch merchant dashboard | Supabase Edge secrets |
| Sandbox client secret/API key | Stitch merchant dashboard | Supabase Edge secrets |
| Production client ID | Stitch merchant dashboard | Supabase Edge secrets |
| Production client secret/API key | Stitch merchant dashboard | Supabase Edge secrets |
| Webhook/signing secret | Stitch dashboard | Supabase Edge secrets |
| Payment callback URL | Zoot Edge Function URL | Stitch dashboard |
| Success/failure return URLs | Zoot app/web display routes | Stitch dashboard |

Required backend before production:

- `stitch-create-checkout`
- `stitch-webhook`
- signature verification
- idempotency by provider event and internal payment record
- no frontend-confirmed payment success

### Ozow

| Secret/config | Get from | Store in |
| --- | --- | --- |
| Sandbox site code/merchant ID | Ozow merchant dashboard | Supabase Edge secrets |
| Sandbox private key/API key | Ozow dashboard | Supabase Edge secrets |
| Production site code/merchant ID | Ozow merchant dashboard | Supabase Edge secrets |
| Production private key/API key | Ozow dashboard | Supabase Edge secrets |
| Webhook/notification secret/hash config | Ozow dashboard | Supabase Edge secrets |
| Notify/success/cancel/error URLs | Zoot Edge/web routes | Ozow dashboard |

Required backend before production:

- `ozow-create-payment`
- `ozow-notify`
- hash/signature verification
- idempotency
- booking/Care+ activation only after verified provider event

## Communications

| Secret/config | Get from | Store in |
| --- | --- | --- |
| Twilio Account SID | Twilio Console | Supabase Edge secrets |
| Twilio Auth Token | Twilio Console | Supabase Edge secrets |
| Twilio API Key SID/Secret | Twilio Console | Supabase Edge secrets |
| Twilio Verify Service SID | Twilio Verify | Supabase Edge secrets |
| TwiML App SID | Twilio Voice | Supabase Edge secrets |
| Twilio caller ID/numbers | Twilio Console | Supabase Edge secrets/provider dashboard |
| Twilio webhook base URL/hash salt | Zoot deployment domains + generated salt | Supabase Edge secrets |
| Brevo API key | Brevo dashboard | Supabase Edge secrets |
| Brevo sender email/domain | Brevo dashboard + DNS | Supabase Edge secrets/provider dashboard |
| Brevo template/list IDs | Brevo dashboard | Supabase Edge secrets |

Rules:

- Keep client-contractor chat inside Zoot.
- Do not use WhatsApp for routine communication.
- SMS/voice are for OTP, masked calls, and critical operational flows only.
- Emails must not contain OTPs, access codes, gate codes, alarm codes, lockbox codes, private phone numbers, or full sensitive household data.

## AI, Content, And Operations

| Secret/config | Get from | Store in |
| --- | --- | --- |
| OpenAI API key | OpenAI Platform | Supabase Edge secrets |
| KIE API key/model | KIE dashboard | Supabase Edge secrets |
| Airtable token | Airtable developer hub | backend/ops secret store only |
| WordPress site/API URL | WordPress/Hostinger dashboard | CI/server config |
| WordPress app username/password | WordPress user profile | CI/server secret store only |
| WordPress webhook/preview secrets | Generated by ops | CI/server secret store and WordPress webhook config |
| Hostinger token | Hostinger dashboard | CI/deployment secret store only |
| Cloudflare API token | Cloudflare dashboard | CI/deployment secret store only |
| Cloudflare Turnstile secret | Cloudflare Turnstile dashboard | Supabase Edge Function secrets |
| Cloudflare R2 endpoint | Cloudflare R2 dashboard | CI/server config |
| Cloudflare R2 access key ID/secret | Cloudflare R2 dashboard | CI/server secret store only |
| Cloudflare Access service token | Cloudflare Zero Trust dashboard | CI/server secret store only |

Rules:

- The support bot must not perform refunds, payment changes, admin decisions, or direct account changes.
- Generated content and images need human approval before publishing.
- Provider tokens must not be embedded in Expo or Vite bundles.

## App Store And Play Store

| Credential/config | Get from | Store in |
| --- | --- | --- |
| Apple Developer Team ID | Apple Developer | EAS credentials/env |
| Apple bundle ID | Apple Developer | `mobile/app.config.ts`, Apple dashboard |
| App Store Connect app ID | App Store Connect | EAS submit config/env |
| App Store Connect API key `.p8` | App Store Connect | EAS file secret or local secure path outside repo |
| Apple Key ID / Issuer ID | App Store Connect | EAS secret/env |
| APNs key | Apple Developer | EAS credentials |
| Google Play app record | Play Console | dashboard |
| Google Play service account JSON | Google Cloud + Play Console | EAS file secret |
| Android upload key | EAS or Play Console | EAS credentials |
| Firebase/FCM project | Firebase Console | EAS credentials/backend secret store |

## OAuth

| Provider | Required setup |
| --- | --- |
| Google | Web OAuth client for Supabase Auth, iOS client ID, Android client ID, authorized origins, Supabase callback URL |
| Apple | Apple Team ID, bundle ID, Services ID for web sign-in, Key ID, private key, return URL, Sign in with Apple capability |
| Supabase | `zoot://auth/callback`, `zoot://auth/reset`, `zoot://**`, website callbacks, preview callbacks |

## Dashboard Tasks

- Store the confirmed Supabase publishable key in GitHub repo variables and Hostinger/Vercel env without committing it. EAS project env is already set. Use `npm run ops:github-vars` after installing/authenticating GitHub CLI.
- Decide whether to upgrade Supabase to Pro for leaked password protection now, or use strong password rules plus OTP/OAuth until launch risk justifies the upgrade.
- Apply the repo schema/migrations to the `Zoot Staging` Supabase project after migration history is reconciled. Use `npm run ops:supabase:deploy:staging` once local Supabase auth/DB credentials are available.
- Set Supabase Edge Function secrets for production and staging. Use `npm run ops:supabase:secrets:staging -- -EnvFile <outside-repo-file>` for staging.
- Deploy all Edge Functions after schema and secrets are set. Use `powershell -ExecutionPolicy Bypass -File scripts/ops/deploy-staging-backend.ps1 -DeployFunctions`.
- Expo login and EAS project initialization are complete for `@don-pacho777/zoot`.
- EAS environments and public variables are configured for development, preview, and production.
- Configure EAS iOS and Android credentials.
- Create App Store Connect and Play Console app records.
- Create Sentry mobile project and source-map upload token.
- Configure Cloudflare DNS, app links, AASA, assetlinks, and production SSL.
- Create the `zoothome.co.za` Cloudflare zone with a token that has `account.zone.create`; the connected token currently cannot create zones.
- Create restricted Cloudflare Turnstile widgets for web and Expo/mobile, then store the public site keys in public env and the secret key only in Edge/server secrets.
- Configure WordPress as the SEO editorial CMS with draft-first publishing, protected previews, no-index drafts, approved media only, and canonical article URLs on the Zoot website.

## Do Not Collect In Chat

Never paste these into chat:

- service-role keys
- API keys
- OAuth client secrets
- private keys
- webhook secrets
- Twilio auth tokens
- Brevo SMTP/API secrets
- KIE/OpenAI/Airtable/WordPress app-password tokens
- App Store Connect `.p8` contents
- Google Play JSON
- Android keystores
- database passwords
