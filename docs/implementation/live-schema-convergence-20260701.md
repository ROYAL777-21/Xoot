# Live Schema Convergence - App Runtime

Date: 2026-07-01

## Scope

This pass fixed staging/production schema drift that directly affected current web app and Edge Function runtime paths. It did not attempt to rewrite historical migration chains, copy prototype-only tables, or repair Supabase branch-runner metadata.

## Migration

- Local file: `supabase/migrations/20260701154818_live_schema_convergence_app_runtime.sql`
- Staging live row: `20260701155102_live_schema_convergence_app_runtime`
- Production live row: `20260701155154_live_schema_convergence_app_runtime`

## Runtime Fixes

- Created/secured `public.booking_zooter_profiles` in production and refreshed it in staging.
- Added Zooter public-profile compatibility columns used by app-facing views:
  - `background_checked`
  - `airbnb_specialist`
  - `premium_care_plus`
  - `languages_spoken`
  - `reliability_flagged`
- Added `saved_addresses.city` and `saved_addresses.postal_code`.
- Added `booking_status_events.meta`.
- Added the Care+ placement fields expected by `activate-care-plus`.
- Added Zooter onboarding compatibility fields expected by `submit-zooter-application`, admin review, and KYC pages.
- Added `zooter_applications_user_id_key` where missing so the current onboarding Edge Function can safely `upsert` on `user_id`.

## Verification

Both staging and production passed the targeted SQL verification:

- Required columns are present.
- `zooter_applications_user_id_key` exists.
- `booking_zooter_profiles` has `security_invoker=true` and `security_barrier=true`.
- `booking_zooter_profiles` grants `SELECT` to `authenticated`.
- `booking_zooter_profiles` does not grant `SELECT` to `anon`.

Supabase security advisors were rechecked after the migration in both environments. The only remaining security advisor warning is `auth_leaked_password_protection`.

## Remaining Supabase Work

- Supabase Auth redirect allowlists still need live dashboard/API configuration.
- Supabase leaked-password protection needs enabling or explicit launch risk acceptance.
- The production `main` branch migration-failed dashboard metadata still needs controlled CLI repair or Supabase support if it persists after repair.
- Storage owner-only policies and provider smoke tests remain tracked in `blocker.md`.
