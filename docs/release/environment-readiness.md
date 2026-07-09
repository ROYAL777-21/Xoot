# Environment Readiness

Reviewed: 2026-07-09 14:38 SAST

## Safe Public Variables

- Web: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SITE_URL`
- Mobile: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_SUPABASE_PROJECT_ID`, `EXPO_PUBLIC_EAS_PROJECT_ID`, `EXPO_PUBLIC_SITE_URL`

## Server-Only Or Secret Variables

- Supabase service role, database URLs, and access tokens
- Payment provider secrets
- Twilio, Brevo, KIE, OpenAI, Airtable, Hostinger, Cloudflare, Mapbox secret/download, Sentry auth, Apple, Google, and EAS signing credentials

## Current Local Credential State

- `SUPABASE_ACCESS_TOKEN`: not present in this shell.
- `ZOOT_PRODUCTION_SUPABASE_DB_URL`: not present in this shell.
- `ZOOT_STAGING_SUPABASE_DB_URL`: not present in this shell.
- `SUPABASE_DB_URL`: not present in this shell.
- `CODERABBIT_API_KEY`: not present as an environment variable; CodeRabbit CLI is authenticated through its local API-key credential store.

Because the Supabase token is absent, live Supabase Auth redirect configuration cannot be executed safely from this shell. Migration repair can be run without storing a DB URL if the database password is entered through the guarded `-PromptDatabasePassword` flow.

## Verified Dry Runs

- Production Supabase Auth config dry-run passed for project `mvlrkelahhsyjrwgsxaf` with `-UseLocalConfig -SiteUrl https://zoothome.co.za`; no live PATCH was attempted.
- Staging Supabase Auth config dry-run passed for project `fxmxyabdjqviqbcxmvlp` with `-UseLocalConfig -SiteUrl https://staging.zoothome.co.za`; no live PATCH was attempted.
- Both dry runs resolved 12 redirect URLs from `supabase/config.toml`, including local callback/reset URLs, staging and production callback/reset URLs, `www` production callback/reset URLs, and `zoot://auth/*` native callbacks.
- CodeRabbit CLI `0.6.4` is installed and API-key authenticated locally. `coderabbit doctor` reports 8 pass, 1 warning for browser OAuth fallback only, and `coderabbit review --type uncommitted --plain` returned no findings for the current repair-helper patch.
- Supabase migration repair planning passed for staging and production with `npm run ops:supabase:repair-migrations -- -Environment <env> -PlanOnly`; the helper refuses known partial/split migrations and refuses `-PlanOnly -ConfirmRepair`.
- Read-only migration inspection was repeated for staging and production on 2026-07-09 14:38 SAST and still supports the four-version guarded repair allowlist documented in `docs/implementation/supabase-migration-status-repair-20260630.md`.
- Supabase `security_advisor_rpc_hardening` was applied to staging and production on 2026-07-01. Security advisors now report only leaked password protection disabled; explicit SQL checks confirm anon/authenticated cannot execute the payment/payout helper RPCs and the invoice trigger helper has a pinned search path.
- Supabase `live_schema_convergence_app_runtime` was applied to staging and production on 2026-07-01. Targeted SQL checks confirm the current app-facing runtime objects are present and secured: `booking_zooter_profiles`, saved-address city/postal code fields, Care+ application fields, Zooter application compatibility fields, booking event metadata, and `zooter_applications_user_id_key`.
