# Xoot Staging Backend Deployment

Reviewed: 2026-06-30

## Current State

- Staging project: `Xoot Staging` / `fxmxyabdjqviqbcxmvlp`.
- The repository contains the application migration chain, storage policies, helper-function hardening, training modules, and Twilio webhook audit schema.
- Live staging and production application must still be verified with authenticated client/admin/Xooter smoke flows before these items can be treated as release-ready.
- Phase 4 invoice public schema and Phase 6 Xoot Black public schema were applied to staging and production through connector-safe live migrations on 2026-06-30. The remaining database deployment gap is owner-only private `storage.objects` policies for generated invoice PDFs and Xoot Black certificate PDFs. The `zoot_black.*` operational controls must remain disabled until founder, operations, supplier and legal approvals are complete.
- Supabase Branching is unavailable on the current plan, so staging is a separate free project.
- Production migration history still differs from the local migration file list and must remain reconciled before broad migration pushes.
- The local migration chain contains legacy prototype seed data; `20260619001000_remove_demo_seed_data.sql` removes the hardcoded demo Xooters after those migrations run.
- Production and staging live histories now include the Xooter optional training gamification prerequisite, expanded training module migration, storage policies, Twilio webhook audit schema, convergence migrations, booking policy, sensitive-access notification scheduler, policy performance hardening, accepted-job destination hardening, governance controls, zooter-job-card service-boundary, duplicate-index cleanup, legacy RLS policy convergence, booking chat public schema, Concierge public schema, invoice public schema, Xoot Black public schema, payment readiness schema, Twilio readiness schema, and `live_schema_convergence_app_runtime`.
- The app-runtime convergence migration fixes the live objects currently used by the web app and Edge Functions: `booking_zooter_profiles`, saved-address city/postal code fields, Care+ placement fields, Xooter onboarding compatibility fields, booking event metadata, and the Xooter application `user_id` uniqueness constraint.
- The production dashboard still reports `MIGRATIONS_FAILED` at branch metadata level because production uses squashed historical migrations and later connector-applied migrations have Supabase-generated timestamps. The live catalog contains the applied app schema, but migration history repair must be done narrowly. See `docs/implementation/supabase-migration-status-repair-20260630.md`.
- The accepted-job destination hardening migration creates `get_zooter_job_cards()` and returns `destination_address` only after a Xooter accepts the assigned job. Real role-based smoke tests with staging client/admin/Xooter users are still required.
- Production needed the accepted-job migration to repair drift in `public.zooter_jobs` by adding the optional response columns before creating the job-card RPC. Keep that idempotent compatibility step in the migration.
- Production's remaining security-advisor warning is leaked-password protection. Enable it when the selected Supabase plan exposes the control.
- Duplicate generated production indexes were removed with `20260627105044_drop_duplicate_production_indexes` in staging and `20260627105059_drop_duplicate_production_indexes` in production. Direct catalog checks now report zero duplicate public index groups in both projects.
- Legacy RLS policy convergence was applied with `20260627110000_legacy_rls_policy_convergence` in both projects. Direct catalog checks now show the targeted `support_tickets`, `user_roles`, `zooter_reliability_metrics`, and `zooters` policies use explicit command-specific policies for `authenticated`, no targeted `ALL` policies remain, anonymous users cannot read the `zooters` base table, and `zooters_public` is anonymous select-only.
- Performance advisor cleanup was applied with `20260627113000_performance_advisor_cleanup` and `20260627120000_legacy_auth_initplan_cleanup` in both projects. Direct catalog checks now show zero missing public FK-covering indexes, zero old targeted policy residues, zero missing expected advisor-cleanup policies, zero raw `auth.uid()` predicates in public policies, and zero duplicate-permissive groups for `admin_review_queue`, `favorites`, `messages`, and `referrals`. Staging and production performance advisors now report only workload-dependent unused-index candidates.
- Supabase CLI `2.108.0` is installed globally via Scoop on this Windows machine. The repo deploy scripts still use pinned `npx supabase@2.108.0` for reproducibility. In the Codex sandbox, set `DO_NOT_TRACK=1` when invoking the global CLI so Supabase does not try to write telemetry under the user profile. Docker is still required only for local `supabase start`/reset workflows.
- Any private Supabase keys pasted into chat must be rotated in the Supabase dashboard before they are used for staging or production operations.

## Required Local Credentials

Do not paste these into chat.

Set one of these paths:

- `SUPABASE_ACCESS_TOKEN` plus the matching `ZOOT_STAGING_SUPABASE_DB_PASSWORD` or `ZOOT_PRODUCTION_SUPABASE_DB_PASSWORD`, for `supabase link` and function deployment.
- `ZOOT_STAGING_SUPABASE_DB_URL` or `ZOOT_PRODUCTION_SUPABASE_DB_URL`, for database migration push by connection string.

For one-off local use, the shared deploy wrapper also accepts generic
`SUPABASE_DB_URL` and `SUPABASE_DB_PASSWORD` for the selected target. Prefer the
environment-specific names when both staging and production values are present
in the same shell.

Set `SUPABASE_ACCESS_TOKEN` for Edge Function deployment and Edge secret updates.

Do not pass live secrets through chat. Prefer a local password manager, an uncommitted environment file outside the repository, or an approved vault.

## Dry Run

```powershell
npm run ops:supabase:deploy:staging -- -DryRun
```

## Deploy Schema

```powershell
npm run ops:supabase:deploy:staging
```

## Deploy Production Schema

Production uses the same shared deployment script as staging, but with the
production project reference and production database credentials. Run staging
first, verify it, then run production.

If the Supabase dashboard shows skipped/pending migrations while the catalog
checks pass, do not run a broad production `db push` as a repair. First run the
migration-history procedure in
`docs/implementation/supabase-migration-status-repair-20260630.md`.

```powershell
$env:ZOOT_PRODUCTION_SUPABASE_PROJECT_REF="mvlrkelahhsyjrwgsxaf"
$env:ZOOT_PRODUCTION_SUPABASE_DB_URL="postgresql://..."
npm run ops:supabase:deploy:production -- -DryRun
npm run ops:supabase:deploy:production -- -VerifyLive
```

Do not paste the database URL into chat or commit it.

## Set Edge Secrets

1. Copy `supabase/functions/.env.staging.example` outside the repository.
2. Fill the real values locally.
3. Run:

```powershell
npm run ops:supabase:secrets:staging -- -EnvFile C:\secure\zoot-staging-edge.env
```

For production, keep a separate production-only secrets file outside the repo:

```powershell
npm run ops:supabase:secrets:production -- -EnvFile C:\secure\zoot-production-edge.env
```

## Deploy Edge Functions

```powershell
npm run ops:supabase:deploy:staging -- -DeployFunctions
```

## GitHub Public Variables

Set the three public-safe GitHub variables from the local environment:

```powershell
$env:VITE_SUPABASE_URL="https://production-project-ref.supabase.co"
$env:VITE_SUPABASE_PUBLISHABLE_KEY="production-public-key"
$env:VITE_SUPABASE_PROJECT_ID="production-project-ref"
powershell -ExecutionPolicy Bypass -File scripts/ops/set-github-public-vars.ps1
```

Do not commit these values to the repo.

## Verification After Deployment

Run:

```powershell
npm run security:scan
npm run config:check
npm run lint
npm run test
npm run build
npm --prefix mobile run config:check
npm --prefix mobile run typecheck
$files = @(Get-ChildItem -Path supabase\functions -Recurse -Filter *.ts | ForEach-Object { $_.FullName })
deno check @files
```

Then check Supabase:

- staging migration list is non-empty
- `20260621000000_helper_function_hardening` appears in migration history
- staging Edge Function list contains the app functions
- staging security advisor has no security findings
- authenticated clients cannot directly read active `user_encryption_keys` rows for unrelated users
- `get-booking-public-keys` returns active public keys only for verified booking participants
- direct authenticated RPC execution of `can_access_sensitive_data` is denied, while `get-sensitive-access` works through service role
- real staging client/admin/Xooter users can complete smoke flows

Live metadata verification can be run after staging and production deployment:

```powershell
$env:SUPABASE_DB_URL="postgresql://..."
npm run ops:supabase:verify:live
```

For deploy-and-verify in one step, pass `-VerifyLive` to either
`deploy-staging-backend.ps1` or `deploy-production-backend.ps1` after setting the
matching `ZOOT_<ENV>_SUPABASE_DB_URL` variable.

## Storage Buckets

Migration file:

- `supabase/migrations/20260620000000_storage_buckets_and_policies.sql`

Required buckets:

| Bucket | Public | Purpose |
| --- | --- | --- |
| `kyc-docs` | No | Xooter identity and onboarding documents. |
| `zooter-avatars` | Yes | Public Xooter profile photos only. |
| `booking-completion-photos` | No | Booking proof/completion photos for participants and admins. |
| `support-attachments` | No | Client/Xooter support case attachments. |
| `kie-prompts` | No | KIE prompt payload records for approved admin use. |
| `kie-outputs` | No | KIE generated output artifacts for approved admin use. |
| `marketing-assets` | Yes | Public approved brand, blog, and SEO media. |

Apply this migration only after `public.profiles` and `public.bookings` exist, because the storage RLS policies reference those tables.

## Auth Redirect URLs

Add these in Supabase Auth for staging and production as applicable:

```text
http://localhost:5173/auth/callback
http://localhost:5173/auth/reset
http://127.0.0.1:5173/auth/callback
http://127.0.0.1:5173/auth/reset
http://127.0.0.1:4173/auth/callback
http://127.0.0.1:4173/auth/reset
https://staging.xoot.co.za/auth/callback
https://staging.xoot.co.za/auth/reset
https://xoot.co.za/auth/callback
https://xoot.co.za/auth/reset
https://www.xoot.co.za/auth/callback
https://www.xoot.co.za/auth/reset
zoot://auth/callback
zoot://auth/reset
```

Provider dashboards should use the Supabase provider callback URL for each project:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

The dashboard can be replaced by the Management API script once `SUPABASE_ACCESS_TOKEN` is available locally:

```powershell
$env:ZOOT_SUPABASE_PROJECT_REF="fxmxyabdjqviqbcxmvlp"
npm run ops:supabase:auth-config -- -UseLocalConfig -SiteUrl "https://<approved-staging-domain-or-preview-origin>"
npm run ops:supabase:auth-config -- -UseLocalConfig -SiteUrl "https://<approved-staging-domain-or-preview-origin>" -Apply
```

Do not use `-Apply` with placeholder domains, mixed staging/production URLs, or a token pasted into chat.
