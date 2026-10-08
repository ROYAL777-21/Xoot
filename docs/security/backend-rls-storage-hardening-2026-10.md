# Backend RLS and storage hardening — 2026-10-05

## Scope

This pass hardens the Supabase backend for the website and app. It is implemented as the migration `20261004160000_backend_rls_and_storage_hardening.sql` and is designed to be applied before the next production deploy.

Integration correction, 7 October: `storage.foldername()` excludes the filename.
The incoming migration's `= 2` folder checks therefore reject the current two-segment
upload paths and admit an unintended extra folder. The additive
`20261007140000_storage_upload_path_contract.sql` preserves this migration and changes
only the five write checks to one folder. The executable isolated SQL proof is
`scripts/ops/verify-storage-path-contract.mjs`; hosted Storage API delivery, MIME/size
enforcement and the required CI step remain gates in the
[production checklist](../release/production-checklist.md).

## Controls added

- Revoked `anon` and `authenticated` insert/update/delete privileges from operational tables that have no client-facing write policy.
- Tightened review-queue inserts so a non-admin signed-in user must set `user_id = auth.uid()`; only admins may create an unowned operational row.
- Scoped booking-tip policies to `authenticated` and stabilized auth lookups with `(select auth.uid())`.
- Made storage bucket limits explicit for KYC, avatars, completion photos, invoices, support/KIE files, and Xoot Black certificates.
- Replaced avatar upload/update rules with owner-folder, exactly-two-path-segment, and image-extension checks.
- Kept KYC private and limited reads to the document owner or admin; writes require an owner folder and approved document extension.
- Kept completion photos private and participant-readable, while removing authenticated-client update/delete paths so evidence cannot be overwritten or erased from a browser session.
- Revoked all access to `storage.objects` and `storage.buckets` from `anon`.

## Validation completed

- Website TypeScript check: passed.
- Production Vite build: passed.
- Security-definer grant regression tests: passed.
- Schema-contract regression tests: passed.
- Upload and invite security tests: passed (30 tests across the targeted suite).
- Migration file exists, is non-empty, and passes `git diff --check`.
- The migration was reviewed against repository migrations and legacy analytics/booking-profile names not present in this schema were excluded to avoid a relation error.

## Required live verification

Apply the migration to a staging Supabase project first, then production only after the staging checks pass:

1. Confirm the migration applies without errors and is recorded in `supabase_migrations.schema_migrations`.
2. Query `pg_policies` for each affected table and `storage.objects`; confirm no anonymous policy exists.
3. With an anonymous client, verify reads/writes to private buckets and affected tables fail.
4. With a normal customer session, verify own profile/address/tip flows still work, while operational tables remain non-writable.
5. With a Xooter session, upload a valid avatar and completion photo; verify a renamed executable, oversized file, wrong extension, and path with extra segments are rejected.
6. Verify a Xooter cannot read KYC, invoices, or another booking's completion evidence.
7. Verify an admin can review KYC and operational queues through the existing server/admin path.
8. Run Supabase Security Advisor and inspect all remaining warnings; do not treat a clean local build as proof of live RLS correctness.
9. Re-run the application smoke checklist for sign-in, booking, split fare, Xooter checklist, uploads, messaging, and admin workflows.

## Important limitation

This migration is defensive code, not a penetration-test certificate. The live database, storage policy state, Auth redirect allowlist, provider secrets, rate limits, and Edge Function deployment still need verification in the Supabase project that serves production.

## Edge Function hardening added — 2026-10-05

- Added a 256 KiB streaming cap to the shared JSON request parser. Oversized or malformed bodies now follow the existing validation-failure path instead of being parsed without a limit.
- Migrated the remaining browser-facing JSON handlers to the bounded parser, including booking, payment, support, Care+, Xooter application, fare-split, sensitive-access, Twilio-token, and admin workflows.
- Replaced database error messages returned by the sensitive-access read/save endpoints with generic client-safe messages; detailed errors remain server logs only.
- Made the shared `ALLOWED_ORIGINS` resolver fall back to the known safe defaults when the environment variable is empty or whitespace-only.

### Additional live verification

- Send a request body larger than 256 KiB to an authenticated JSON endpoint and confirm it returns a normal validation error without a function crash.
- Confirm production `ALLOWED_ORIGINS` contains only owned HTTPS origins; never include wildcard, loopback, preview, or arbitrary customer-controlled domains.
- Confirm sensitive-access failures do not return Postgres, encryption, or provider error text to the browser.
