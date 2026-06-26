# Zoot Staging Backend Deployment

Reviewed: 2026-06-24

## Current State

- Staging project: `Zoot Staging` / `fxmxyabdjqviqbcxmvlp`.
- Staging has the application migration chain, storage policies, helper-function hardening, training modules, and Twilio webhook audit schema applied.
- The five Twilio webhook functions are deployed to staging and production and pass signed/unsigned boundary smoke tests.
- Supabase Branching is unavailable on the current plan, so staging is a separate free project.
- Production migration history still differs from the local migration file list and must remain reconciled before broad migration pushes.
- The local migration chain contains legacy prototype seed data; `20260619001000_remove_demo_seed_data.sql` removes the hardcoded demo Zooters after those migrations run.
- Production and staging have the Zooter optional training gamification prerequisite and expanded training module migration applied.
- The Phase 1 helper hardening migration `supabase/migrations/20260621000000_helper_function_hardening.sql` is applied to staging. The staging security advisor now reports no security lints.
- The accepted-job destination hardening migration `supabase/migrations/20260624224551_accepted_zooter_job_destination.sql` is versioned locally and must be applied to staging first, then production. It creates `get_zooter_job_cards()` and returns `destination_address` only after a Zooter accepts the assigned job.
- Production's remaining security-advisor warning is leaked-password protection. Enable it when the selected Supabase plan exposes the control.
- Any private Supabase keys pasted into chat must be rotated in the Supabase dashboard before they are used for staging or production operations.

## Required Local Credentials

Do not paste these into chat.

Set one of these paths:

- `SUPABASE_ACCESS_TOKEN` plus `SUPABASE_DB_PASSWORD`, for `supabase link` and function deployment.
- `SUPABASE_DB_URL`, for database migration push by connection string.

Set `SUPABASE_ACCESS_TOKEN` for Edge Function deployment and Edge secret updates.

Do not pass live secrets through chat. Prefer a local password manager, an uncommitted environment file outside the repository, or an approved vault.

## Dry Run

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ops/deploy-staging-backend.ps1 -DryRun
```

## Deploy Schema

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ops/deploy-staging-backend.ps1
```

## Set Edge Secrets

1. Copy `supabase/functions/.env.staging.example` outside the repository.
2. Fill the real values locally.
3. Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ops/set-supabase-edge-secrets.ps1 -EnvFile C:\secure\zoot-staging-edge.env
```

## Deploy Edge Functions

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ops/deploy-staging-backend.ps1 -DeployFunctions
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
- real staging client/admin/Zooter users can complete smoke flows

## Storage Buckets

Migration file:

- `supabase/migrations/20260620000000_storage_buckets_and_policies.sql`

Required buckets:

| Bucket | Public | Purpose |
| --- | --- | --- |
| `kyc-docs` | No | Zooter identity and onboarding documents. |
| `zooter-avatars` | Yes | Public Zooter profile photos only. |
| `booking-completion-photos` | No | Booking proof/completion photos for participants and admins. |
| `support-attachments` | No | Client/Zooter support case attachments. |
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
https://staging.zoothome.co.za/auth/callback
https://staging.zoothome.co.za/auth/reset
https://zoothome.co.za/auth/callback
https://zoothome.co.za/auth/reset
https://www.zoothome.co.za/auth/callback
https://www.zoothome.co.za/auth/reset
zoot://auth/callback
zoot://auth/reset
```

Provider dashboards should use the Supabase provider callback URL for each project:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```
