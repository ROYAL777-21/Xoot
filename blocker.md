# Zoot Production Blockers

Reviewed: 2026-06-29 12:20 SAST

This file lists unresolved blockers only. Resolved implementation history lives in git commits, Supabase migration history, and phase reports.

## Supabase

- Live Supabase Auth redirect allowlists still need dashboard/API configuration and verification for local web, staging, production, Expo dev client, `zoot://auth/callback`, Google OAuth, and Apple Sign in callbacks. Local `supabase/config.toml` contains the intended redirects, but the available connector exposes no safe redirect setter.
- Staging and production Supabase security advisors still report leaked password protection disabled. Enable it if the current Supabase plan supports it, or record an explicit launch risk acceptance before public launch.
- Supabase CLI `2.108.0` is installed but not authenticated in this shell. On 2026-06-29, `supabase projects list --debug` still returned `LegacyPlatformAuthRequiredError` because no local profile or `SUPABASE_ACCESS_TOKEN` is available. Set `SUPABASE_ACCESS_TOKEN` locally or run `supabase login --token <token>` in an interactive shell. Do not paste the token into chat.
- Production and staging migration histories are still different because production started from launch squashed migrations while staging follows the local chain. Current catalog checks show the schemas and booking states are converged, but future deploys must use the controlled migration scripts rather than assuming a clean `supabase db push`.
- A working PostgreSQL client is available at the local Scoop extraction path, but Scoop did not finish creating the `psql` shim on PATH. Docker is still unavailable on this Windows host, so full local Supabase database reset still requires Docker or a separate ops shell. Live catalog-readiness SQL was rechecked through the Supabase connector on 2026-06-29 and passed in staging and production.
- Supabase performance advisors still report workload-dependent unused-index candidates in staging and production. Direct catalog checks show no missing public FK-covering indexes, no targeted legacy policy residues, no missing expected advisor-cleanup policies, no raw `auth.uid()` predicates in public policies, no duplicate-permissive groups for the targeted tables, and no duplicate public index groups.
- Phase 2 booking chat action-layer migration and Edge Functions are implemented locally but still need staging/prod deployment after Supabase CLI/session access is restored: `20260629113000_booking_chat_action_layer.sql`, `send-booking-message`, `report-booking-message`, and `mark-booking-message-read`.

## Provider Secrets And External Dashboards

- Real production secrets for Stitch, Ozow, Twilio, Brevo, KIE, OpenAI, Airtable, Hostinger, Cloudflare, Sentry, Expo/EAS, Apple, Google, Mapbox, and WordPress still need to be set in their correct secret stores.
- Private secrets must not be committed or placed in frontend/mobile env files. Store them only in Supabase Edge Function secrets, EAS secrets, GitHub/environment secrets, provider dashboards, or the approved password manager.
- Secrets pasted into chat, including Supabase, Cloudflare, Expo, PostHog private API, and Mapbox token values, must be rotated before production launch. The Twilio secret values previously pasted in chat were reported rotated on 2026-06-28; keep using only rotated values in approved secret stores.
- Live Edge Function inventories for staging and production now show the required app functions active, including `admin-control-management`, `confirm-payment`, `support-respond`, Twilio webhooks, and `get-booking-public-keys`. Provider secret verification and signed smoke tests still require an authenticated Supabase CLI/session, dashboard secret setter, or real provider dashboard access.

## Domain Registration

- No production domain is registered yet. Domain-dependent setup cannot be completed without the final domain and registrar/DNS access.
- Pending until domain registration: Cloudflare zone/DNS/TLS/WAF/Turnstile restrictions, production Supabase Auth redirect allowlists, Google/Apple OAuth origins and callbacks, Brevo sender-domain DNS, Hostinger custom-domain SSL, WordPress production/canonical URLs, Mapbox URL-restricted browser tokens, Apple AASA, Android assetlinks, privacy/support/account-deletion URLs, and store listing URLs.
- Use localhost, staging project URLs, and Expo development URLs for preview only. Do not mark production launch ready until the final domain is registered, configured, and verified.

## Twilio

- The Twilio account still needs production readiness work: trial status removal, approved or ported phone number, WhatsApp sender approval, Messaging Service classification corrected to transactional/operational use, sender verification, webhook assignments, regulatory registrations, and approved message templates.
- Twilio SMS, WhatsApp, voice, phone, Verify OTP, and email-adjacent flows must remain disabled through `twilio.operational_messages` until dashboard channel setup, rotated secret verification, and signed webhook smoke tests are complete.
- No Twilio account-management MCP/API tool is currently exposed in this Codex session, so the dashboard configuration cannot be completed from the repo alone.

## Mapbox

- Restricted Mapbox tokens are not configured.
- A Mapbox secret token was supplied in chat. It must not be used as a public `VITE_` or `EXPO_PUBLIC_` token, and it must be rotated before production use because chat exposure makes it unsuitable as a long-lived production secret.
- Required tokens remain:
  - browser token restricted to approved Zoot HTTPS origins;
  - native Expo token for iOS and Android builds;
  - secret downloads token stored only in EAS or CI for native SDK build access;
  - optional server-side `MAPBOX_SECRET_TOKEN` stored only in Supabase Edge Function secrets or CI/server secret storage if backend geocoding/routing is implemented.

## Cloudflare

- The connected Cloudflare account still has no `zoothome.co.za` zone. On 2026-06-29, listing zones returned zero matches and the Cloudflare API create-zone attempt for `zoothome.co.za` failed because the connected token lacks `com.cloudflare.api.account.zone.create`.
- WAF, bot/rate-limit rules, Turnstile, DNS, TLS, and origin protection cannot be activated until the zone exists and the connected token has the required scoped permissions.
- Cloudflare Turnstile widgets are not verified. Create restricted web/mobile widgets in the dashboard or with a rotated token that has the required Turnstile permissions.

## Apple, Google, Expo, And Stores

- Apple Team ID, App Store Connect app record, Google Play app record, Android signing fingerprints, store privacy declarations, and final legal/business metadata remain unavailable.
- EAS credentials and submit profiles still need final provider-backed credentials.
- Latest pasted Expo public Supabase values mix a staging project reference with a production Supabase URL. Keep the currently configured production GitHub variables as-is, and define separate EAS/GitHub environment profiles before adding staging mobile values.
- Native association files are skipped during build until `ZOOT_APPLE_TEAM_ID` or `ZOOT_IOS_APP_ID` and `ZOOT_ANDROID_SHA256_CERT_FINGERPRINTS` are supplied.
- Store submission cannot proceed until developer-console access, signing credentials, privacy/data-safety answers, account deletion URLs, support URLs, and legal review are complete.

## GitHub, CodeRabbit, And CI

- GitHub CLI is authenticated and the required public Supabase variables are present. Public site URL, EAS project ID, and PostHog public variables are also present. Optional public-safe GitHub repository variables are still missing where applicable because no restricted public values are available yet: Mapbox public token, Sentry public DSN, Google/Apple public OAuth client IDs, Cloudflare Turnstile site key, and WordPress public API URL. Private provider secrets must not be GitHub repository variables.
- CodeRabbit CLI `0.6.4` is installed, but `coderabbit auth status --agent` reports `not_authenticated`.
- On 2026-06-29, `coderabbit auth login --agent` returned `environment_unsupported` because localhost callback and stdin fallback are unavailable in this Windows session. Use `coderabbit auth login --api-key <api-key>` with a key from an approved vault, or install the official CodeRabbit GitHub App on the repository.
- CodeRabbit self-hosted login is available through `coderabbit auth login --self-hosted`, but no Zoot self-hosted CodeRabbit URL has been supplied. Use it only if Zoot actually provisions a self-hosted instance; otherwise use the official GitHub App or API-key CLI auth.
- The requested `Sukarth/CodeRabbit-Windows` path is an unofficial community wrapper. Do not run it for production readiness without an approved checksum and security review; the official CodeRabbit GitHub App or API-key CLI auth is safer.

## Admin Access

- There are no shared admin sign-in credentials in the repo, app, or env templates. Admin access is granted by a Supabase Auth account plus an `admin` role in `public.user_roles`.
- Staging admin smoke credentials must be supplied only through local env vars before running `npm run ops:smoke:staging -- --all`; see `docs/ADMIN_ACCESS.md`.
- Production founder/admin accounts still need secure creation, MFA enrollment, and audited role assignment before production operations.

## WordPress SEO Stack

- WordPress has been added as a target SEO/content stack, but the production WordPress host, domain/subdomain, security hardening, editorial roles, backup policy, API access model, and publish/sync workflow are not provisioned yet.
- WordPress must not become a path for unaudited plugins, fake testimonials, weak content, or leaked credentials. Any headless integration must use read-only public APIs for published content and server-side secrets for protected actions.

## Netlify, Hostinger, And Hosting

- Netlify project `zoot-home-care` exists, but dashboard/build readback is still required before treating Netlify environment configuration as production-verified.
- Hostinger production deployment credentials and final domain wiring still need dashboard verification.

## Verification Still Needed

- Configure Supabase Auth redirects in both environments and verify web, mobile, and OAuth callbacks.
- Run signed Twilio webhook smoke tests after Twilio dashboard channels and Edge secrets are verified with the rotated values.
- Deploy and smoke-test the Phase 2 booking chat action layer in staging/prod: direct `messages` inserts revoked, participant sends through Edge Function, read receipts written, and message reports queued for admin review.
- Run authenticated booking-chat public-key lookup smoke tests against `get-booking-public-keys` with real staging client/Zooter booking participants.
- Run `scripts/ops/setup-local-provider-auth.ps1`, `scripts/ops/set-github-public-vars.ps1`, `scripts/ops/deploy-staging-backend.ps1`, `scripts/ops/deploy-production-backend.ps1`, and `scripts/ops/set-supabase-edge-secrets.ps1` from a local shell that has approved provider credentials in environment variables or browser sessions when those credentials are available.
- Run `scripts/ops/verify-production-readiness.ps1 -IncludeExternal -RequireLive` after provider access is configured. It must pass before the production-readiness blockers can be closed.
- Run CodeRabbit review once authenticated.
- Confirm Cloudflare WAF/rate-limit/Turnstile rules after the zone is added.
