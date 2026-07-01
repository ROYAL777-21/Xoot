# Environment Readiness

Reviewed: 2026-07-01 05:35 SAST

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

Because these values are absent, live Supabase Auth redirect configuration and migration repair cannot be executed safely from this shell.

