# Environment Readiness

Reviewed: 2026-07-01 12:59 SAST

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

Because the Supabase values are absent, live Supabase Auth redirect configuration and migration repair cannot be executed safely from this shell.

## Verified Dry Runs

- Production Supabase Auth config dry-run passed for project `mvlrkelahhsyjrwgsxaf` with `-UseLocalConfig -SiteUrl https://zoothome.co.za`; no live PATCH was attempted.
- Staging Supabase Auth config dry-run passed for project `fxmxyabdjqviqbcxmvlp` with `-UseLocalConfig -SiteUrl https://staging.zoothome.co.za`; no live PATCH was attempted.
- Both dry runs resolved 12 redirect URLs from `supabase/config.toml`, including local callback/reset URLs, staging and production callback/reset URLs, `www` production callback/reset URLs, and `zoot://auth/*` native callbacks.
- CodeRabbit CLI `0.6.4` is installed and API-key authenticated locally. `coderabbit doctor` reports 8 pass, 1 warning for browser OAuth fallback only, and `coderabbit review --type uncommitted --plain` returned no findings for the current repair-helper patch.
- Supabase migration repair planning passed for staging and production with `npm run ops:supabase:repair-migrations -- -Environment <env> -PlanOnly`; the helper refuses known partial/split migrations and refuses `-PlanOnly -ConfirmRepair`.
