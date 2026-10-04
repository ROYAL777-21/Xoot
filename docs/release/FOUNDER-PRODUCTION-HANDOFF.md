# Xoot production handoff

**Purpose:** finish the external provider steps that cannot be performed from the repository sandbox, then hand control back to the release workflow for verification.

**Current code commit:** `5a9e231` on `main`

> Do not paste passwords, API tokens, private keys, or payment credentials into chat, GitHub issues, source files, screenshots, or terminal logs. Enter them only in the provider’s protected settings or the GitHub secret form.

## What is already complete

- Website and mobile source changes are merged to `main`.
- Split fare is implemented in the web and mobile clients using authenticated server functions.
- Xooter progress checklist is database-backed, server-authoritative, and visible to customers.
- One-default-home constraints and checklist RLS/function protections are in the migration.
- Website TypeScript, production build, tests, Semgrep, production-readiness guard, and native iOS Swift checks pass on `5a9e231`.
- The live-deploy check is the remaining web release gate because the public domain is still serving an older build.

## Phase A — connect the public website

### A1. Stop the old GoDaddy site

1. Open GoDaddy **My Products → Websites + Marketing**.
2. Find the Website Builder site attached to `xoot.co.za`.
3. Choose **Unpublish** or remove `xoot.co.za` from the builder site.
4. Do not delete the domain registration.
5. Wait until the builder is no longer the authoritative site for the domain.

**Why:** the current public response identifies itself as `Starfield Technologies; Go Daddy Website Builder` and returns a 404-style page. Until this is removed, a Netlify deployment can be healthy while customers still receive the old builder site.

### A2. Point DNS to the existing Netlify project

1. Open the existing Netlify project: `xoot-home-care`.
2. Confirm its production branch is `main`.
3. Confirm its build settings come from `netlify.toml`:
   - Build command: `npm ci --no-audit --prefer-offline && npm run build`
   - Publish directory: `dist`
   - Production branch: `main`
4. Confirm these **public build variables** exist in Netlify’s production environment:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_APP_ENV=production`
   - `VITE_PUBLIC_SITE_URL=https://xoot.co.za`
   - `VITE_MAPBOX_PUBLIC_TOKEN`
   - Any configured public Sentry, Turnstile, Google, Apple, and association-file variables.
5. In GoDaddy **Domains → xoot.co.za → DNS**, use the exact DNS records Netlify displays for the project.
6. Remove stale GoDaddy Website Builder forwarding, `@` A records, or `www` CNAME records that conflict with Netlify.
7. Keep the domain’s required verification and TLS records intact.
8. Save the DNS changes and wait for propagation.

Do not create a second Netlify site. The existing project already owns the production domain configuration and should be connected to this repository’s `main` branch.

### A3. Trigger and verify the web deploy

1. In Netlify, open **Deploys → Trigger deploy → Deploy site** if the repository link does not automatically start a build.
2. Wait for the deploy to finish with status **Published**, not merely Preview or Ready.
3. Confirm the deploy is from commit `5a9e231` or a newer `main` commit.
4. In GitHub, open **Actions → Verify live deploy**.
5. Run the workflow against `main`, leaving `expected_commit` blank unless verifying a specific commit.
6. The required result is: **Live site is serving this commit**.
7. Also open these URLs in a normal browser:
   - `https://xoot.co.za/`
   - `https://xoot.co.za/build-info.json`
   - `https://xoot.co.za/manus-routes.json`
   - `https://xoot.co.za/auth`
8. Confirm the response is the Xoot app, not the GoDaddy builder, and that `/build-info.json` reports the current commit.

## Phase B — authorize production backend deployment

### B1. Add the production database secret

1. Open GitHub repository **Settings → Secrets and variables → Actions → Secrets**.
2. Create this repository secret exactly:
   - Name: `SUPABASE_DB_PASSWORD_PRODUCTION`
   - Value: the database password for Supabase project `mvlrkelahhsyjrwgsxaf`
3. Do not overwrite the existing `SUPABASE_DB_PASSWORD`; that value belongs to staging.
4. Never place the value in a workflow file, `.env` file, issue, commit, or chat message.

### B2. Run the production migration dry run

1. Open GitHub **Actions → Database migration push**.
2. Choose **Run workflow** from `main`.
3. Select environment: `production`.
4. Select `dry_run: true`.
5. Run it.
6. Confirm it reaches the migration planning step and reports the pending migration set rather than `SQLSTATE 28P01`.
7. Stop if it reports an unexpected migration, connection error, or missing secret.

### B3. Apply production migrations

1. Run the same workflow again from `main`.
2. Select `production`.
3. Select `dry_run: false`.
4. When the workflow asks for the confirmation string, type the exact production project ref:
   `mvlrkelahhsyjrwgsxaf`
5. Wait for completion.
6. Confirm the migration job is green and records the migration filenames in Supabase’s migration history.

The database migration must be completed **before** Edge Functions are deployed.

### B4. Deploy production Edge Functions

1. Open GitHub **Actions → Deploy Edge Functions**.
2. Run it from `main` with environment `production`.
3. Use the full function list generated by the workflow unless the workflow explicitly requires a blank list for all functions.
4. Confirm the deployment completes without stale-function or schema mismatch errors.
5. Confirm the new `xooter-job-checklist` function is included and deployed.
6. Confirm its gateway setting matches `supabase/config.toml`; do not enable gateway JWT protection on webhook functions that perform their own signature validation.

### B5. Remove orphaned pre-rename functions

After the new functions are live, remove only functions that are listed as orphaned in the repository’s release guide and have no current source or caller:

- `approve-zooter`
- `admin-reject-zooter`
- `submit-zooter-application`
- `get-zooter-job-cards`
- `redeem-zootcred`
- `respond-zooter-job`

Use the repository’s guarded retirement workflow if available. Do not delete any function that still exists in `supabase/functions` or is referenced by current source.

## Phase C — production secrets and payment readiness

These steps require owner/provider access. Do not enable payment collection until the sandbox smoke test succeeds.

### C1. Supabase Edge Function secrets

Set production values in **Supabase → Edge Functions → Secrets** for project `mvlrkelahhsyjrwgsxaf`:

- `ENCRYPTION_KEY`
- PayFast merchant credentials and passphrase, if PayFast is the selected provider
- `PAYFAST_MODE=live` only after the signed production configuration is verified
- Twilio production credentials, if voice is being enabled
- Email, monitoring, and other provider secrets required by the deployed functions
- Invoice legal entity variables:
  - `XOOT_INVOICE_LEGAL_ENTITY`
  - `XOOT_INVOICE_LEGAL_ENTITY_REGISTRATION`
  - `XOOT_INVOICE_VAT_RATE`
  - `XOOT_INVOICE_VAT_NUMBER` when VAT applies

Use different credentials for staging and production. Never share a staging payment or Twilio account with production.

### C2. Payment smoke test

1. Keep production payment capability flags disabled.
2. Run the provider’s sandbox payment flow in staging.
3. Verify the signed callback/webhook is accepted.
4. Verify duplicate callbacks are idempotent.
5. Verify `payment_records` and reconciliation rows are created correctly.
6. Verify a forged success response is rejected.
7. Only after those checks pass, enable the production capability rows for the approved provider.
8. Perform one controlled real payment with the founder’s approval and reconcile it manually.

## Phase D — mobile release preparation

### D1. Expo production variables

In Expo/EAS **Project → Environment Variables**, set these for the `production` environment:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PROJECT_ID`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_EAS_PROJECT_ID`
- `EXPO_PUBLIC_SITE_URL`

The project ID must match the Supabase URL. The production build intentionally fails when these are missing or fake.

### D2. Deep-link association variables

Set the web host’s production build variables:

- `XOOT_APPLE_TEAM_ID`
- `XOOT_IOS_APP_ID`
- `XOOT_ANDROID_SHA256_CERT_FINGERPRINTS`

Then rebuild the website so `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` are generated with real values.

### D3. Real-device checks

On a real Android device and a real iPhone/TestFlight device:

1. Install the production or internal-distribution build.
2. Create a real account and verify email/phone authentication.
3. Sign in and sign out.
4. Create a booking using a real staging or approved production test user.
5. Open the booking and verify split fare appears only when eligible.
6. Test Xooter job acceptance and checklist actions.
7. Confirm customer-side progress updates after each Xooter action.
8. Test push/deep links without exposing addresses, gate codes, or alarm information.
9. Test account deletion and password reset.
10. Record device model, OS version, app build, result, and screenshots in the release evidence.

## Phase E — security and operational sign-off

Before launch, confirm:

- Admin and staff accounts use MFA.
- Supabase leaked-password protection is enabled.
- RLS tests pass for customer, Xooter, support, finance, and admin roles.
- Sensitive booking details are time-windowed and never sent through push/SMS/email.
- Payment webhooks verify signatures and reject replays.
- Contractor documents are private, validated server-side, and served by short-lived URLs.
- Rate limits and abuse alerts are enabled for authentication, booking creation, address reads, and payment endpoints.
- Incident runbooks exist for account takeover, payment fraud, malicious uploads, data leakage, and outage recovery.
- A rollback owner and release window are recorded.

## Final completion test

The release can be called production only when all of these are green:

- [ ] Public domain serves the current `main` commit.
- [ ] `Verify live deploy` passes.
- [ ] Production migrations apply successfully.
- [ ] Schema verification passes.
- [ ] Edge Functions deploy successfully.
- [ ] Orphaned functions are retired.
- [ ] Auth redirects work on web and mobile.
- [ ] Real-device Android and iOS smoke tests pass.
- [ ] Payment sandbox and signed webhook tests pass.
- [ ] Production payment enablement is explicitly approved.
- [ ] Security, legal, provider, and rollback sign-offs are recorded.

Until every box is checked, use the status **release candidate / pre-production**, not “fully live.”
