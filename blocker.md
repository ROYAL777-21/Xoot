# Zoot Production Blockers

Reviewed: 2026-07-01 05:20 SAST

This file lists unresolved blockers only. Resolved implementation history lives in git commits, Supabase migration history, and phase reports.

## Supabase

- Live Supabase Auth redirect allowlists still need API/dashboard configuration and verification for local web, staging, production, Expo dev client, `zoot://auth/callback`, Google OAuth, and Apple Sign in callbacks. Local `supabase/config.toml` contains the intended redirects, and `scripts/ops/set-supabase-auth-config.ps1` can dry-run them with `-UseLocalConfig` without credentials. Live apply still requires a rotated local `SUPABASE_ACCESS_TOKEN`, target project ref, and explicit `-SiteUrl` so localhost is not applied to staging/production accidentally.
- Staging and production Supabase security advisors still report leaked password protection disabled. Enable it if the current Supabase plan supports it, or record an explicit launch risk acceptance before public launch.
- Supabase CLI `2.108.0` is installed but not authenticated in this shell. On 2026-06-30 23:05 SAST, `npm run ops:provider-auth:check` still returned `LegacyPlatformAuthRequiredError`, and no local `SUPABASE_ACCESS_TOKEN`, `ZOOT_PRODUCTION_SUPABASE_DB_URL`, `ZOOT_STAGING_SUPABASE_DB_URL`, or `SUPABASE_DB_URL` environment variable is available. Set a rotated `SUPABASE_ACCESS_TOKEN` locally or run `supabase login --token <token>` in an interactive shell. Do not paste the token into chat.
- Production and staging migration histories are still different because production started from launch squashed migrations while staging follows the local chain. Connector-applied migrations now also use Supabase-generated timestamps instead of local filenames. Future deploys must use the controlled migration scripts rather than assuming a clean `supabase db push`.
- The production `main` branch still reports `MIGRATIONS_FAILED` through Supabase branch metadata even after successful connector-applied migrations on 2026-06-30. The database catalog now contains the booking chat, Concierge, invoice public schema, Zoot Black public schema, payment readiness, and Twilio readiness migrations. The dashboard's skipped/pending/failed count appears to come from migration-version drift and failed branch-runner metadata, not missing app schema. Use `npm run ops:supabase:repair-migrations` for the dry-run guard, then rerun with `-- -ConfirmRepair` only after an approved production database URL is loaded locally and `docs/implementation/supabase-migration-status-repair-20260630.md` has been reviewed.
- A working PostgreSQL client is available at the local Scoop extraction path used by the provider-auth diagnostic. Docker is still unavailable on this Windows host, so full local Supabase database reset still requires Docker or a separate ops shell. Live catalog-readiness SQL was rechecked through the Supabase connector on 2026-06-29 and passed in staging and production.
- Supabase performance advisors still report workload-dependent unused-index candidates in staging and production. Direct catalog checks show no missing public FK-covering indexes, no targeted legacy policy residues, no missing expected advisor-cleanup policies, no raw `auth.uid()` predicates in public policies, no duplicate-permissive groups for the targeted tables, and no duplicate public index groups.
- Phase 2 booking chat database migration and Edge Functions were applied to staging and production through the Supabase connector on 2026-06-30. `send-booking-message`, `report-booking-message`, and `mark-booking-message-read` are active in both environments with JWT verification enabled. Remaining Phase 2 blocker is role-based smoke testing with real staging/prod booking participants: direct `messages` inserts revoked, participant sends through Edge Function, read receipts written, and reports queued for admin review.
- Phase 4 completed-booking invoice public schema, immutable snapshot trigger, and private bucket metadata were applied to staging and production through connector-safe migrations on 2026-06-30. The remaining live database blocker is the private PDF read policy on `storage.objects`, which requires Supabase CLI/dashboard access with the correct storage policy owner role. Edge Function deployment/smoke execution still requires `generate-booking-invoice` and `resend-booking-invoice`.
- Completed-booking invoice generation requires final reviewed legal/VAT values in Supabase Edge Function secrets: `ZOOT_INVOICE_LEGAL_ENTITY`, `ZOOT_INVOICE_LEGAL_ENTITY_REGISTRATION`, `ZOOT_INVOICE_VAT_RATE`, and `ZOOT_INVOICE_VAT_NUMBER` when VAT applies.
- Phase 5 Zoot Concierge database migration was applied to staging and production through the Supabase connector on 2026-06-30. Live function deployment/smoke execution still requires Supabase CLI/session access or dashboard function deployment for `support-respond` and `report-concierge-answer`.
- Anonymous Concierge Turnstile enforcement must stay disabled until a production domain and restricted Cloudflare Turnstile widget exist. When available, set `support.turnstile_required` or `ZOOT_REQUIRE_CONCIERGE_TURNSTILE=true` only after the rotated Turnstile secret is stored in Supabase Edge Function secrets.
- Phase 6 Zoot Black public schema, disabled controls, eligibility function, compatibility Zooter columns, line-item/certificate tables, and private certificate bucket metadata were applied to staging and production through connector-safe migrations on 2026-06-30. The remaining live database blocker is the private certificate PDF read policy on `storage.objects`, which requires Supabase CLI/dashboard access with the correct storage policy owner role.
- Zoot Black activation remains blocked by founder, operations, supplier, and legal approvals. Do not enable `zoot_black.enabled`, `zoot_black.area_pilot`, or `zoot_black.certificates`, expose a customer purchase path, or publish availability claims until approvals, pilot areas, equipment evidence rules, line-item amount, certificate wording, and smoke tests are complete.
- Phase 7 payments and payout verification database migration was applied to staging and production through the Supabase connector on 2026-06-30. The controls remain disabled by default until provider credentials, callback setup, approvals, and signed smoke tests are complete.
- Phase 7 live payment/payout activation remains blocked by Stitch/Ozow production credentials, provider callback configuration, signed webhook smoke tests, finance approval, legal approval, payout account verification workflow, payout hold policy, and production reconciliation runbook. Do not enable `payments.provider_checkout`, `payments.hosted_checkout.stitch`, `payments.hosted_checkout.ozow`, or `payouts.enabled` until all approvals and tests are complete.
- Phase 8 native launch experience is implemented locally in `/mobile`. Android EAS preview build `114d0c10-c754-4426-9a90-9fdfeadb8a06` finished on 2026-07-01 and produced preview APK versionCode `5`, downloaded locally to `outputs/zoot-preview-android-v5.apk`. Real-device install and smoke testing are still blocked on this Windows machine because no Android device is connected and `adb` is not installed or discoverable. iOS preview install readiness is blocked because EAS has no internal-distribution iOS credentials suitable for non-interactive preview builds. iOS development-build verification is still required for normal launch, reduced-motion static launch, urgent route bypass, and safe Siri/Gemini deep links before native release use.
- Phase 9 Twilio Verify and masked voice database migration was applied to staging and production through the Supabase connector on 2026-06-30. Live function deployment/smoke execution still requires Supabase CLI/session access or dashboard function deployment for `create-masked-call` and the relevant `ops-workflow` paths.
- Phase 10 Siri/App Intents and Android assistant shortcut foundation is implemented locally through `mobile/plugins/withZootAssistantIntents.cjs`. Real Expo prebuild output inspection, EAS development builds, and physical iOS/Android assistant tests are still required before native release use.

## Provider Secrets And External Dashboards

- Real production secrets for Stitch, Ozow, Twilio, Brevo, KIE, OpenAI, Airtable, Hostinger, Cloudflare, Sentry, Expo/EAS, Apple, Google, Mapbox, and WordPress still need to be set in their correct secret stores.
- Private secrets must not be committed or placed in frontend/mobile env files. Store them only in Supabase Edge Function secrets, EAS secrets, GitHub/environment secrets, provider dashboards, or the approved password manager.
- Secrets pasted into chat, including Supabase, Cloudflare, Expo, PostHog private API, and Mapbox token values, must be rotated before production launch. A Supabase CLI access token was also pasted into chat on 2026-06-30 and must be rotated before it is used for production operations. The Twilio secret values previously pasted in chat were reported rotated on 2026-06-28; keep using only rotated values in approved secret stores.
- Live Edge Function inventories for staging and production now show the required app functions active, including `admin-control-management`, `confirm-payment`, `support-respond`, Twilio webhooks, `get-booking-public-keys`, and the Phase 2 booking chat functions. Provider secret verification and signed smoke tests still require an authenticated Supabase CLI/session, dashboard secret setter, or real provider dashboard access.
- Brevo invoice templates and delivery worker wiring still need live provider setup for outbox events `booking_invoice_created` and `booking_invoice_resend`.

## Domain Registration

- No production domain is registered yet. The founder reconfirmed this on 2026-06-30, so domain-dependent setup cannot be completed without the final domain and registrar/DNS access.
- Pending until domain registration: Cloudflare zone/DNS/TLS/WAF/Turnstile restrictions, production Supabase Auth redirect allowlists, Google/Apple OAuth origins and callbacks, Brevo sender-domain DNS, Hostinger custom-domain SSL, WordPress production/canonical URLs, Mapbox URL-restricted browser tokens, Apple AASA, Android assetlinks, privacy/support/account-deletion URLs, and store listing URLs.
- Use localhost, staging project URLs, and Expo development URLs for preview only. Do not mark production launch ready until the final domain is registered, configured, and verified.

## Twilio

- Phase 9 local controls now exist for `twilio.verify_otp`, `twilio.masked_voice`, and `twilio.whatsapp_urgent`, with Verify attempt redaction, masked-call eligibility, direct client write revocation for `masked_call_sessions`, and no-recording/no-transcription metadata. These controls remain disabled until provider setup and signed staging smoke tests pass.
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
- EAS Android internal preview credentials now exist on Expo's remote credential store and produced Android preview APK `114d0c10-c754-4426-9a90-9fdfeadb8a06`. EAS iOS internal-distribution credentials are still missing for non-interactive preview builds. Private `SENTRY_ORG` and `SENTRY_AUTH_TOKEN` are required only for native source-map upload, not for installing preview builds. Final iOS credentials, Play/App Store submit credentials, store records, and privacy/legal metadata still need final provider-backed setup.
- Latest pasted Expo public Supabase values mix a staging project reference with a production Supabase URL. Keep the currently configured production GitHub variables as-is, and define separate EAS/GitHub environment profiles before adding staging mobile values.
- Native association files are skipped during build until `ZOOT_APPLE_TEAM_ID` or `ZOOT_IOS_APP_ID` and `ZOOT_ANDROID_SHA256_CERT_FINGERPRINTS` are supplied.
- Store submission cannot proceed until developer-console access, signing credentials, privacy/data-safety answers, account deletion URLs, support URLs, and legal review are complete.

## GitHub, CodeRabbit, And CI

- GitHub CLI is authenticated and the required public Supabase variables are present. Public site URL, EAS project ID, and PostHog public variables are also present. Optional public-safe GitHub repository variables are still missing where applicable because no restricted public values are available yet: Mapbox public token, Sentry public DSN, Google/Apple public OAuth client IDs, Cloudflare Turnstile site key, and WordPress public API URL. Private provider secrets must not be GitHub repository variables. Open PRs `#7` and `#8` were checked on 2026-06-30 22:33 SAST and are green; remaining failed GitHub runs are stale closed/merged historical runs, not current open-PR blockers.
- CodeRabbit CLI `0.6.4` is installed, but `coderabbit auth status --agent` still reports `not_authenticated` as of 2026-06-30 23:05 SAST.
- On 2026-06-30, `coderabbit auth login --agent` returned `environment_unsupported` because localhost callback and stdin fallback are unavailable in this Windows session. Use `coderabbit auth login --api-key <api-key>` with a key from an approved vault, or install the official CodeRabbit GitHub App on the repository.
- CodeRabbit self-hosted login is available through `npm run ops:provider-auth:setup -- -CodeRabbitSelfHosted`, but no Zoot self-hosted CodeRabbit URL has been supplied. Use it only if Zoot actually provisions a self-hosted instance; otherwise use the official GitHub App or API-key CLI auth.
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
- Smoke-test the Phase 2 booking chat action layer in staging/prod with real booking participants: direct `messages` inserts revoked, participant sends through Edge Function, read receipts written, and message reports queued for admin review.
- Deploy the remaining Phase 4 invoice storage-object policy and Edge Functions with storage-owner/CLI credentials, then smoke-test in staging/prod: completed paid booking generates exactly one immutable invoice, uploads a private PDF, queues Brevo delivery, owner/admin can read it, and resend queues the original PDF path without regenerating.
- Smoke-test the Phase 9 Twilio layer in staging/prod after Edge Functions and Twilio account resources exist: Verify rate-limit/redaction tests, unsigned webhook denial, signed webhook acceptance, masked-call denial outside the window, non-participant denial, terminal-booking denial, no-recording/no-transcription metadata, and provider-gated queue creation.
- Run Phase 10 assistant-device tests after EAS development builds exist: Siri and Android assistant shortcuts open booking, Concierge, Care+, booking status, and Zooter jobs; unsafe params are ignored; no booking or payment is completed from speech/deep-link input alone.
- Run authenticated booking-chat public-key lookup smoke tests against `get-booking-public-keys` with real staging client/Zooter booking participants.
- Run `npm run ops:provider-auth:setup`, `npm run ops:supabase:auth-config`, `npm run ops:github-vars`, `npm run ops:supabase:repair-migrations`, `npm run ops:supabase:deploy:staging`, `npm run ops:supabase:deploy:production`, `npm run ops:supabase:secrets:staging`, and `npm run ops:supabase:secrets:production` from a local shell that has approved provider credentials in environment variables or browser sessions when those credentials are available.
- Run `scripts/ops/verify-production-readiness.ps1 -IncludeExternal -RequireLive` after provider access is configured. It must pass before the production-readiness blockers can be closed.
- Run CodeRabbit review once authenticated.
- Confirm Cloudflare WAF/rate-limit/Turnstile rules after the zone is added.
