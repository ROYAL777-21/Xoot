# Zoot Production Blockers

Reviewed: 2026-06-28

This file lists unresolved blockers only. Resolved implementation history lives in git commits, Supabase migration history, and phase reports.

## Supabase

- Supabase Auth redirect allowlists still need dashboard/API configuration for local web, staging, production, Expo dev client, `zoot://auth/callback`, Google OAuth, and Apple Sign in callbacks. Local `supabase/config.toml` contains the intended redirects, but the connector exposes no safe redirect setter.
- Production Supabase security advisor still reports leaked password protection disabled. This must be enabled or explicitly risk-accepted before launch.
- Production and staging migration histories remain materially different because production started from launch squashed migrations while staging follows the local chain. Current convergence, booking, sensitive-access, training, storage, Twilio, accepted-job destination, governance, zooter-job-card service-boundary, and legacy RLS policy convergence artifacts were verified live in both projects, but future deploys must use the controlled migration scripts rather than assuming a clean `supabase db push`.
- Real role-based smoke tests are still required with staging client, admin, and Zooter users for accepted-job destination visibility, sensitive-access reveal windows, admin-only governance reads, and notification delivery. Staging had zero auth users/roles/bookings when checked on 2026-06-28; `npm run ops:smoke:staging -- --all` now provides a guarded staging-only seed and test path once local staging secrets are available.
- Local `psql` and Docker are not available on this Windows host, so local database reset still requires Docker/PostgreSQL client tools or a separate ops shell. The live catalog-readiness SQL was run through the authenticated Supabase connector on 2026-06-28 and passed in staging and production.
- Supabase CLI is installed but not authenticated in this shell. The provider diagnostic reports `supabase-auth` false until `SUPABASE_ACCESS_TOKEN` is set locally or `supabase login` is completed.
- Supabase performance advisors still report workload-dependent unused-index candidates in staging and production. Direct catalog checks now show zero missing public FK-covering indexes, zero old targeted policy residues, zero missing expected advisor-cleanup policies, zero raw `auth.uid()` predicates in public policies, zero duplicate-permissive groups for `admin_review_queue`/`favorites`/`messages`/`referrals`, and zero duplicate public index groups in staging or production.

## Provider Secrets And External Dashboards

- Real production secrets for Stitch, Ozow, Twilio, Brevo, KIE, OpenAI, Airtable, Hostinger, Cloudflare, Sentry, Expo/EAS, Apple, Google, Mapbox, and WordPress still need to be set in their correct secret stores.
- Private secrets must not be committed or placed in frontend/mobile env files. Store them only in Supabase Edge Function secrets, EAS secrets, GitHub/environment secrets, provider dashboards, or the approved password manager.
- Secrets pasted into chat, including Supabase, Cloudflare, Expo, and Mapbox token values, must be rotated before production launch. The Twilio secret values previously pasted in chat were reported rotated on 2026-06-28; keep using only the rotated values in approved secret stores.
- `admin-control-management`, `confirm-payment`, `support-respond`, and the Twilio webhook functions are active in staging and production with Phase 1 governance helper calls deployed. Twilio still needs live dashboard channel setup, Edge secret verification with the rotated values, and signed webhook smoke tests before operational messaging can be enabled.

## Twilio

- The Twilio account still needs production readiness work: trial status removal, approved phone number or ported number, WhatsApp sender approval, Messaging Service classification corrected to transactional/operational use, sender verification, webhook assignments, regulatory registrations, and approved message templates.
- Twilio SMS, WhatsApp, voice, phone, Verify OTP, and email-adjacent flows must remain disabled through `twilio.operational_messages` until the above work and secret rotation are complete.

## Mapbox

- Restricted Mapbox tokens are not configured.
- A Mapbox secret token was supplied in chat. It must not be used as a public `VITE_` or `EXPO_PUBLIC_` token, and it must be rotated before production use because chat exposure makes it unsuitable as a long-lived production secret.
- Required tokens remain:
  - browser token restricted to approved Zoot HTTPS origins;
  - native Expo token for iOS and Android builds;
  - secret downloads token stored only in EAS or CI for native SDK build access;
  - optional server-side `MAPBOX_SECRET_TOKEN` stored only in Supabase Edge Function secrets or CI/server secret storage if backend geocoding/routing is implemented.

## Cloudflare

- The connected Cloudflare account currently has no Zoot zone. On 2026-06-28, the Cloudflare API `/zones?name=zoothome.co.za` call returned zero zones for the connected account.
- The available Cloudflare app/API permissions cannot create `zoothome.co.za`; the latest create attempt failed because the token lacks `com.cloudflare.api.account.zone.create`.
- Cloudflare Turnstile widgets are not verified. The connector lists Turnstile widget APIs, but the account-level widget list call still returned authentication error `10000` on 2026-06-28, so create restricted web/mobile Turnstile widgets in the dashboard or with a rotated token that has the required Turnstile permissions.
- WAF, bot/rate-limit rules, Turnstile, DNS, TLS, and origin protection cannot be activated until the zone exists and the token has the required scoped permissions.

## Apple, Google, Expo, And Stores

- Apple Team ID, App Store Connect app record, Google Play app record, Android signing fingerprints, store privacy declarations, and final legal/business metadata remain unavailable.
- EAS credentials and submit profiles still need final provider-backed credentials.
- Native association files are skipped during build until `ZOOT_APPLE_TEAM_ID` or `ZOOT_IOS_APP_ID` and `ZOOT_ANDROID_SHA256_CERT_FINGERPRINTS` are supplied.
- Store submission cannot proceed until developer-console access, signing credentials, privacy/data-safety answers, account deletion URLs, support URLs, and legal review are complete.

## GitHub, CodeRabbit, And CI

- GitHub CLI is installed but unauthenticated. Local `gh auth status` reports no logged-in GitHub hosts.
- GitHub repository/environment variables for optional public integrations still need approved public-safe values where applicable: Expo public Supabase values, site URL, Mapbox public token, Sentry public DSN, Google/Apple public OAuth client IDs, Cloudflare Turnstile site key, and WordPress public API URL if used. Private provider secrets must not be GitHub repository variables.
- GitHub connector can read PR-triggered workflow runs but cannot write repository variables. On 2026-06-28, PR #7 pointed at commit `ee5e6fa4ccdb084d2f304d208fe338865c695d86`, but the connector returned no combined statuses and no PR-triggered workflow runs for that commit.
- CodeRabbit CLI is not on PATH in this shell. The provider diagnostic checks both `coderabbit` and `cr`; neither is currently available.
- `coderabbit auth login --agent` is not usable on this Windows session because localhost callback and stdin fallback are unavailable.
- The requested `Sukarth/CodeRabbit-Windows` path is an unofficial community wrapper. Do not run it for production readiness without an approved checksum and security review; the official CodeRabbit GitHub App or API-key CLI auth is safer.
- CodeRabbit review requires either `coderabbit auth login --api-key <api-key>` using a key from an approved vault, or installation of the CodeRabbit GitHub App on the repository.

## WordPress SEO Stack

- WordPress has been added as a target SEO/content stack, but the production WordPress host, domain/subdomain, security hardening, editorial roles, backup policy, API access model, and publish/sync workflow are not provisioned yet.
- WordPress must not become a path for unaudited plugins, fake testimonials, weak content, or leaked credentials. Any headless integration must use read-only public APIs for published content and server-side secrets for protected actions.

## Netlify And Hosting

- Netlify project `zoot-home-care` exists. Public-safe Netlify env var writes for Supabase URL, project ID, site URL, `VITE_APP_ENV`, and the active production Supabase publishable key from the Supabase connector reported success, but Netlify env readback still returned an empty list; do not treat Netlify env as verified until the dashboard/build confirms it.
- Hostinger production deployment credentials and final domain wiring still need dashboard verification.

## Verification Still Needed

- Run `npm run ops:smoke:staging -- --all` with local staging-only secrets to seed and verify client, admin, and Zooter users.
- Configure Supabase Auth redirects in both environments and verify web, mobile, and OAuth callbacks.
- Run signed Twilio webhook smoke tests after Twilio dashboard channels and Edge secrets are verified with the rotated values.
- Run `scripts/ops/setup-local-provider-auth.ps1`, `scripts/ops/set-github-public-vars.ps1`, `scripts/ops/deploy-staging-backend.ps1`, `scripts/ops/deploy-production-backend.ps1`, and `scripts/ops/set-supabase-edge-secrets.ps1` from a local shell that has approved provider credentials in environment variables or browser sessions when those credentials are available.
- Run `scripts/ops/verify-production-readiness.ps1 -IncludeExternal -RequireLive` after provider access is configured. It must pass before the production-readiness blockers can be closed.
- Run CodeRabbit review once authenticated.
- Confirm Cloudflare WAF/rate-limit/Turnstile rules after the zone is added.
