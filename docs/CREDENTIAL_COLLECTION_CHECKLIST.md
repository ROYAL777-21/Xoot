# Zoot Credential Collection Checklist

Reviewed: 2026-07-09

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
| EAS public env | Baseline exists, but each environment must be rechecked before builds so `EXPO_PUBLIC_SUPABASE_PROJECT_ID` matches the project ref in `EXPO_PUBLIC_SUPABASE_URL`. |
| GitHub public env | Required Vite Supabase variables are present and consistent. Public site URL, EAS project ID, and PostHog public variables are present; optional Mapbox/Sentry/OAuth/Turnstile/WordPress public values still wait on provider setup. |
| Supabase Auth advisor | Leaked password protection is still disabled; official docs list this as Pro plan and above |
| Staging backend deployment runbook | Added in `docs/STAGING_BACKEND_DEPLOYMENT.md`; scripts live in `scripts/ops/` |

The Supabase URL is public project metadata. Publishable keys are public-safe but should still be stored through EAS/GitHub/hosting environment management rather than hardcoded.

## Domain-Dependent Items

Zoot does not have a registered domain yet. Do not force or fake domain-dependent setup. Record these as pending until the final domain is registered and pointed to the selected DNS provider:

- Cloudflare zone creation, DNS, TLS, WAF, bot/rate-limit rules, Turnstile origin restrictions, R2 custom domains, and Access policies.
- Production OAuth origins and redirect URLs for Supabase Auth, Google, Apple, Expo deep links, and app links.
- Brevo sender-domain authentication records, SPF, DKIM, DMARC, bounce handling, and tracking domain.
- Hostinger production custom-domain deployment and SSL verification.
- WordPress production URL, headless API URL, preview URL, canonical URLs, and sitemap ownership.
- Mapbox public token URL restrictions for the website and web-app.
- Apple associated domains, AASA file hosting, Android asset links, support URL, privacy URL, account deletion URL, and store listing URLs.

Use temporary localhost, staging, and Expo development URLs only for development and preview. Revisit this section after domain registration.

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
| PostHog public project token | PostHog project settings | EAS env, web host env | `EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN`, `VITE_POSTHOG_PROJECT_TOKEN` |
| PostHog ingest host | PostHog project settings | EAS env, web host env | `EXPO_PUBLIC_POSTHOG_HOST`, `VITE_POSTHOG_HOST` |
| Mapbox public token | Mapbox dashboard | EAS env, web host env | `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN`, `VITE_MAPBOX_PUBLIC_TOKEN` |
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
| Mapbox secret token | Mapbox dashboard | Supabase Edge Function secrets or CI/server secret store only |
| Mapbox downloads token | Mapbox dashboard | EAS/CI secret store only |
| PostHog private API key | PostHog project settings | CI/server secret store only if dashboard/export automation is built |
| PostHog project ID | PostHog project settings | CI/server config only |
| Cloudflare Turnstile secret | Cloudflare Turnstile dashboard | Supabase Edge Function secrets |
| Cloudflare R2 endpoint | Cloudflare R2 dashboard | CI/server config |
| Cloudflare R2 access key ID/secret | Cloudflare R2 dashboard | CI/server secret store only |
| Cloudflare Access service token | Cloudflare Zero Trust dashboard | CI/server secret store only |

Rules:

- The support bot must not perform refunds, payment changes, admin decisions, or direct account changes.
- Generated content and images need human approval before publishing.
- Provider tokens must not be embedded in Expo or Vite bundles.
- The PostHog private `phx_` API key was pasted into chat and must be rotated before production automation uses it. Browser and Expo builds may only receive the public `phc_` project token.

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

Release records that must exist before store submission:

- Apple Developer bundle ID: `za.co.zoothome.app`.
- App Store Connect app record using the same bundle ID.
- App Store Connect app-specific metadata: SKU, category, primary language, support URL, privacy policy URL, review contact, demo credentials, screenshots, app privacy answers, and export compliance answer.
- EAS iOS credentials: Apple Team ID, distribution certificate, provisioning profile, APNs key, associated domains capability, Sign in with Apple capability if enabled, and App Store Connect API key material.
- Google Play app record using package `za.co.zoothome.app`.
- Google Play app-specific metadata: app category, store listing, screenshots, support email, privacy policy URL, content rating, Data Safety, target audience, permissions declarations, AI-generated content declaration if applicable, and testing track setup.
- EAS Android credentials: upload key or EAS-managed signing, package name, version-code auto-increment, Google Play service account file secret, and SHA-256 signing fingerprints for OAuth/App Links/provider dashboards.
- EAS project configuration: project ID, development/preview/production environments, build profiles, submit profiles, remote version source, and secrets for non-public signing/upload values.

The App Store Connect API key environment names used by EAS CLI are `EXPO_ASC_API_KEY_PATH`, `EXPO_ASC_KEY_ID`, and `EXPO_ASC_ISSUER_ID` when running non-interactive submit flows. Prefer EAS credential storage or a secure CI/vault-backed path over local plaintext files.

## OAuth

| Provider | Required setup |
| --- | --- |
| Google | Web OAuth client for Supabase Auth, iOS client ID, Android client ID, authorized origins, Supabase callback URL |
| Apple | Apple Team ID, bundle ID, Services ID for web sign-in, Key ID, private key, return URL, Sign in with Apple capability |
| Supabase | `zoot://auth/callback`, `zoot://auth/reset`, `zoot://**`, website callbacks, preview callbacks |

## Dashboard Tasks

- Keep GitHub repo variables limited to public-safe values. Required Vite Supabase variables are set; add optional Mapbox/Sentry/OAuth/Turnstile/WordPress public variables only after the provider dashboards issue restricted public values.
- Decide whether to upgrade Supabase to Pro for leaked password protection now, or use strong password rules plus OTP/OAuth until launch risk justifies the upgrade.
- Apply the repo schema/migrations to the `Zoot Staging` Supabase project after migration history is reconciled. Use `npm run ops:supabase:deploy:staging` once local Supabase auth/DB credentials are available.
- Apply approved production migrations only after staging passes. Use `npm run ops:supabase:deploy:production -- -DryRun` first, then `npm run ops:supabase:deploy:production -- -VerifyLive` with production database credentials set locally.
- Set Supabase Edge Function secrets for production and staging. Use `npm run ops:supabase:secrets:staging -- -EnvFile <outside-repo-file>` for staging and `npm run ops:supabase:secrets:production -- -EnvFile <outside-repo-file>` for production.
- Configure Supabase Auth Site URL and redirect allowlists with `npm run ops:supabase:auth-config -- -UseLocalConfig -SiteUrl "https://<target-domain>"` after `SUPABASE_ACCESS_TOKEN`, the project ref, and approved local/staging/production/native URLs are available locally. Run it first without `-Apply`; live apply requires an explicit target Site URL so localhost from `supabase/config.toml` cannot be applied to production accidentally.
- Deploy all Edge Functions after schema and secrets are set. Use `npm run ops:supabase:deploy:staging -- -DeployFunctions` first, then `npm run ops:supabase:deploy:production -- -DeployFunctions` after staging smoke tests pass.
- Expo login and EAS project initialization are complete for `@don-pacho777/zoot`.
- EAS environments and public variables are configured for development, preview, and production.
- Correct the latest supplied Expo public Supabase pair before storing it in EAS: the staging project ref must use the staging Supabase URL, and the production Supabase URL must use the production project ref.
- Configure EAS iOS and Android credentials.
- Create App Store Connect and Play Console app records.
- Create Sentry mobile project and source-map upload token.
- Create separate restricted Mapbox tokens: one public browser token restricted to Zoot web origins, one public Expo/mobile token restricted as far as Mapbox supports for native use, and one private downloads token stored only in EAS/CI. Rotate any `sk.` token pasted into chat before production.
- Configure Cloudflare DNS, app links, AASA, assetlinks, and production SSL.
- After the final domain is registered, create its Cloudflare zone with `POST /zones` using the registered domain name, `type: "full"`, and `jump_start: true`, or add it manually in the Cloudflare dashboard. The API token must include account-level zone creation permission (`com.cloudflare.api.account.zone.create`); DNS edit alone is not enough.
- Create restricted Cloudflare Turnstile widgets for web and Expo/mobile, then store the public site keys in public env and the secret key only in Edge/server secrets.
- Configure WordPress as the SEO editorial CMS with draft-first publishing, protected previews, no-index drafts, approved media only, and canonical article URLs on the Zoot website.

## Local CLI Authentication Notes

These methods were verified from the local CLI help output and should be used instead of repeatedly pasting tokens into chat:

| Tool | Preferred local setup | Notes |
| --- | --- | --- |
| Supabase CLI | Set `SUPABASE_ACCESS_TOKEN` in the local shell, then run `supabase login --token $env:SUPABASE_ACCESS_TOKEN --name zoot-local`. | `supabase login --no-browser` is also available for browserless flows. Keep the token in the password manager or shell profile, not repo files. `npm run ops:provider-auth:check` reports current status without printing tokens. |
| GitHub CLI | Current machine is authenticated as `ROYAL777-21`. If it expires, run `gh auth login --web --hostname github.com --git-protocol https`. | Do not paste GitHub PATs into chat. |
| CodeRabbit CLI | Set `CODERABBIT_API_KEY` locally, then run `coderabbit auth login --api-key $env:CODERABBIT_API_KEY`. | If Zoot later has a self-hosted CodeRabbit URL, run `coderabbit auth login --self-hosted` or `npm run ops:provider-auth:setup -- -CodeRabbit -CodeRabbitSelfHosted`. The official GitHub App remains the safest production option. |

Current status on 2026-07-09 14:38 SAST: GitHub CLI is authenticated as `ROYAL777-21`; CodeRabbit CLI is installed and authenticated through its local credential store; Supabase CLI is installed but no local `SUPABASE_ACCESS_TOKEN` or Supabase database URL is available in this shell.

Security update on 2026-06-30: a Supabase CLI access token was pasted into chat and must be rotated before production use. Load the rotated token only through the local environment or an approved secret store, not through chat or committed files.

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
