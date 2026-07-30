# Xoot Master Discovery Report

Reviewed: 2026-06-24
Phase: 0 - Repository Discovery, Baseline and Governance
Branch: `codex/full-zoot-iphone-pwa-auth-security`

## Executive Finding

Xoot has a substantial React/Vite website, a separate Expo mobile application, two Supabase environments, and a broad Edge Function action layer. It is not ready for provider activation or store submission.

The main blocker is schema and policy divergence:

- Staging follows the local migration chain and contains the newer booking states and RLS hardening.
- Production uses a separate migration history and still exposes legacy booking states and broader client write policies.
- Local application code assumes columns and states that do not exist in the inspected production schema.

No further production deployment or provider configuration should occur until Phase 1 governance and migration reconciliation are approved.

## Repository Architecture

| Area | Location | Current role |
| --- | --- | --- |
| Website and browser app | repository root, `src/` | React 18, Vite, TypeScript, Tailwind and shadcn/ui |
| Native mobile app | `mobile/` | Expo SDK 56, Expo Router, TypeScript, React Native 0.85 |
| Supabase schema | `supabase/migrations/` | Local forward migration chain |
| Supabase backend | `supabase/functions/` | Edge Functions for sensitive actions and webhooks |
| Native integration source | `native/ios/`, `native/android/` | App Intents, Live Activities and Android shortcut source files |
| Public deployment assets | `public/` | PWA manifests, headers, SPA rewrites and association-file targets |
| Operational documentation | `docs/` | Environment, release, security and provider runbooks |
| SEO content | `content/seo/`, `src/lib/blog-posts.ts` | Draft queue and published article registry |

The web app remains independent from the Expo app. They share Supabase types and backend contracts, not UI components.

## Git Baseline

- Current branch tracks `origin/codex/full-zoot-iphone-pwa-auth-security`.
- The working tree contains a large, uncommitted multi-phase implementation.
- `package-lock.json` and `mobile/package-lock.json` exist and pass the repository lockfile validator.
- GitHub CLI 2.95.0 is installed as a portable user tool.
- GitHub CLI authorization is not complete.
- CodeRabbit CLI is not installed because its official Windows support requires WSL, which is not installed.
- No commit, push or pull request was created during Phase 0.

## Web Application

The web app includes:

- public home, Care+, trust, blog and legal routes;
- authenticated client, Xooter and admin routes;
- route-level lazy loading;
- fail-loud Supabase configuration checks;
- no production mock fallback;
- Sentry browser integration when a DSN is configured;
- Mapbox GL JS integration when a restricted public token is configured;
- Content Security Policy and static security headers;
- PWA manifests and native association-file generation;
- Xoot Concierge deterministic knowledge and optional server-side OpenAI fallback.

Regression-sensitive areas:

- auth callbacks and password reset routes;
- booking pricing and state transitions;
- Care+ activation and billing;
- XootCred ledger writes;
- sensitive household access;
- admin and integration outbox writes;
- public support bot rate limiting and redaction;
- native deep-link route validation.

## Expo Mobile Application

Verified configuration:

- Expo SDK: 56
- React Native: 0.85.3
- Router: Expo Router
- TypeScript: enabled
- App scheme: `zoot`
- Production bundle/package ID: `za.co.zoothome.app`
- Preview bundle/package ID: `za.co.zoothome.app.preview`
- Session storage: Expo SecureStore
- Push package: Expo Notifications
- Map package: `@rnmapbox/maps`
- Monitoring package: Sentry React Native
- iOS Sign in with Apple capability requested
- EAS project: initialized

EAS environment separation exists for development, preview and production. Public Supabase values are configured per environment. No EAS builds exist.

Missing release inputs:

- Apple Team ID and App Store Connect record;
- iOS signing and APNs credentials;
- Android release signing credentials and SHA-256 fingerprints;
- Google Play record and service account;
- Mapbox public mobile token and private downloads token;
- Sentry mobile environment;
- privacy declarations, reviewer accounts and final legal review.

The checked-in `native/ios` and `native/android` directories are integration source/reference assets. They are not generated Expo `ios/` or `android/` projects.

## Supabase Environments

| Environment | Project | Verified state |
| --- | --- | --- |
| Staging | `fxmxyabdjqviqbcxmvlp` | 29 migrations, 51 public tables, 7 storage buckets, active Edge Functions, clean security advisor |
| Production | `mvlrkelahhsyjrwgsxaf` | 12 recorded migrations, active Edge Functions, 7 storage buckets, divergent schema and policies |

Both projects currently use:

- Site URL: `http://localhost:3000`
- Empty additional redirect allowlist
- Google OAuth disabled
- Apple OAuth disabled
- leaked-password protection disabled

This configuration is not release-ready.

## Existing Data Model

Major public tables include:

- Identity and roles: `profiles`, `user_roles`
- Xooters: `zooters`, `zooter_applications`, `zooter_documents`, `zooter_jobs`, `zooter_earnings`
- Training and quality: `training_modules`, `zooter_training_progress`, `zooter_training_completions`, `zooter_reliability_metrics`
- Bookings: `bookings`, `booking_status_events`, `booking_completion_photos`, `recurring_schedules`
- Household data: `household_profiles`, `saved_addresses`, `property_accounts`
- Communication: `messages`, `notifications`, `notification_templates`, `support_tickets`, `support_followups`
- Money: `payment_records`, `zootcred_ledger`, `user_subscriptions`, `subscription_plans`
- Operations: `integration_outbox`, `admin_review_queue`, `admin_audit_log`, `analytics_events`, `automation_skills`
- Trust: `trust_incidents`, `sensitive_booking_access`, `sensitive_access_logs`
- Provider logs: `twilio_webhook_events`

Production core operational tables inspected during Phase 0 contained zero rows. This reduces data-migration risk but does not remove schema or authorization risk.

## Authoritative Booking State

The intended application state machine exists in:

- `src/lib/booking-state-machine.ts`
- `supabase/functions/_shared/booking-state-machine.ts`

Locked states:

`draft`, `pending_payment`, `payment_confirmed`, `awaiting_assignment`, `assigned`, `contractor_accepted`, `en_route`, `in_progress`, `completed`, `rated`, `cancelled`, `replacement_required`, `replacement_offered`, `reassigned`.

Current conflicts:

- Staging also retains legacy enum values.
- Production only exposes legacy enum values: `pending`, `confirmed`, `enroute`, `arrived`, `in_progress`, `completed`, `cancelled`, `reassigned`.
- The local state machine permits `draft -> payment_confirmed`, which skips `pending_payment`.
- `create-booking-request` still writes a legacy `pending` event.
- `ops-workflow` still contains an `arrived` label/event.

Phase 1 must establish one server-controlled transition authority and a production-safe reconciliation migration.

## Payment Verification Source

Intended authority:

- `confirm-payment` Edge Function;
- provider-signed webhook;
- provider reference, amount and currency match;
- server update of `payment_records`;
- booking transition after verified payment;
- audit and outbox records.

Current gaps:

- one generic HMAC implementation is used for Stitch and Ozow despite provider-specific signature requirements;
- no Stitch or Ozow checkout/session function exists;
- no provider-specific webhook idempotency table or unique event constraint exists;
- local booking creation uses `manual_pending`;
- frontend receives a local pending route, not a real hosted checkout;
- production schema lacks local columns used by the function, including `paid_at` and newer booking timestamps.

Payment is not production-ready.

## Care+ Source Of Truth

Intended source:

- `user_subscriptions` for membership status;
- `subscription_plans` for server-owned plan configuration;
- verified `payment_records` for activation;
- `zootcred_ledger` for the R30 welcome credit — one row per member at activation, not a recurring grant.

Duplicate functionality:

- `care-plus-membership` creates pending membership/payment state.
- `activate-care-plus` activates a paid membership and also handles a separate placement application flow.
- `care_plus_applications` in the inspected production schema does not contain the placement columns expected by `activate-care-plus`.

The duplicate activation paths must be consolidated before Care+ is enabled.

## XootCred Source Of Truth

The intended source is the append-only `zootcred_ledger`.

Existing protections:

- client hook calculates balances from ledger entries;
- expiry and pending state are considered;
- a database balance trigger exists in local/staging migrations;
- redemption is handled through an Edge Function.

Current conflict:

- production RLS grants `ALL` on the ledger to an owner or admin;
- the locked model requires service/backend-owned writes and owner read-only access.

## Existing Invoice Pattern

There is no invoice table, immutable invoice snapshot, PDF worker or private invoice bucket.

Existing references are only:

- outbox event names;
- B2B invoice review queue labels;
- email playbook concepts.

Phase 4 must extend the existing outbox rather than create a second event queue.

## Existing Support Pattern

Support uses:

- `support_tickets`;
- `support_followups`;
- `admin_review_queue`;
- `create-support-case`;
- `support-respond`;
- deterministic knowledge first;
- optional OpenAI response path;
- human escalation keywords.

Current gaps:

- no central anonymous rate limiter;
- no Turnstile verification;
- OpenAI fallback is enabled whenever a key exists, rather than through a separate kill switch;
- Sentry sanitization is not comprehensive;
- no versioned database-backed knowledge base.

## Existing Feature Flags

There is no central feature-flag or kill-switch model.

Current controls are fragmented across:

- environment variables;
- deployment configuration;
- provider credential presence;
- hardcoded behavior;
- inactive code paths.

No PostHog SDK or feature-flag integration is present.

Phase 1 must create one backend-controlled contract rather than add another local flag helper.

## Existing Native Capability

Available source modules:

- iOS App Intents and App Shortcuts;
- iOS Live Activity and Widget source;
- Android static shortcuts;
- Expo deep-link routing;
- native association-file generation.

Not yet verified:

- Xcode compilation;
- Expo config-plugin integration for the Swift sources;
- generated iOS/Android projects;
- physical-device behavior;
- signed universal/app links;
- Live Activity APNs updates.

Siri currently opens and prefills safe routes. It does not create or charge a booking.

## Provider Integration Inventory

### Twilio

Verified read-only state:

- account is active but Trial;
- no incoming phone number;
- one Messaging Service exists and is classified as marketing;
- Verify service exists with six-digit codes;
- TwiML App exists but has no voice or status callback;
- no verified production WhatsApp sender was found;
- one regulatory bundle exists in draft state;
- signed webhook endpoints are deployed, but provider resources are not assigned to them.

The existing marketing-classified Messaging Service conflicts with the locked operational-notification policy and must not be reused without an approved redesign.

### Brevo

Templates and env inventory exist. No verified sender-domain or live credential state was available.

### PostHog

Named in the approved stack, but no SDK or event contract exists in code.

### Sentry

Web and mobile packages exist. DSNs, release auth, environment rules and full PII scrubbing remain unconfigured.

### Stitch And Ozow

Env inventory and generic webhook scaffolding exist. Real checkout/session orchestration, exact signature verification, idempotency and reconciliation are missing.

### Mapbox

Web and native components exist. No web, native public or native downloads token is configured.

Required token separation:

- URL-restricted public web token;
- separate public native token without URL restrictions;
- private downloads token in EAS/CI only.

### Cloudflare

The connected account contains no zones. DNS proxying, TLS, WAF, rate limiting, Turnstile and origin protection cannot be configured until the Xoot domain is added.

### Expo And EAS

Project initialized and environment-separated. No builds or signing credentials exist.

### Apple And Google

No verified store records, signing assets, Team ID, SHA fingerprints or privacy declarations exist.

## Duplicate Functionality Risks

1. `care-plus-membership` and `activate-care-plus`.
2. `create-booking` and `create-booking-request`.
3. typed admin Edge Functions and remaining operations inside `ops-workflow`.
4. frontend and backend copies of the booking state machine.
5. legacy booking enum values and locked booking states.
6. multiple support entry paths using the same tables.
7. older Twilio voice functions in production and newer webhook functions.
8. Capacitor documentation and the approved Expo implementation.
9. static analytics tables without an approved PostHog event contract.

Phase work must consolidate these systems rather than introduce replacements.

## Migration Naming Convention

The repository contains:

- early timestamp plus UUID migration names;
- later timestamp plus descriptive migration names.

Production contains separately generated descriptive migrations with different timestamps.

Forward rule:

- use Supabase CLI to create `YYYYMMDDHHMMSS_descriptive_name.sql`;
- never edit an already-applied migration;
- add reconciliation migrations after an approved schema comparison;
- apply staging first;
- record verification and rollback notes.

## Test Commands

Web:

```powershell
npm.cmd run verify
```

Mobile:

```powershell
npm.cmd --prefix mobile run config:check
npm.cmd --prefix mobile run typecheck
npx.cmd expo-doctor
```

Edge Functions:

```powershell
deno test --config supabase/functions/deno.json
deno check --config supabase/functions/deno.json <entrypoints>
```

Supabase:

- migration history comparison;
- security and performance advisors;
- clean-project reset when a local database is available;
- role-based RLS smoke tests;
- signed webhook rejection and idempotency tests.

## Unknowns Requiring Approval

1. Which schema becomes canonical: staging/local forward schema or production export?
2. Should legacy booking enum values remain temporarily for compatibility or be migrated out?
3. Should `create-booking` replace `create-booking-request`?
4. Should `activate-care-plus` be split into membership activation and placement application?
5. Is the placement product part of Care+ or a separate service?
6. Which payment provider launches first: Stitch, Ozow or both?
7. Is Booking Cover preselection legally and commercially approved?
8. Is Care+ sold in native apps as a physical-service membership outside store billing rules?
9. What legal entity name, registration number, address and Information Officer details are approved?
10. Which domain is authoritative: `zoothome.co.za`, `www.zoothome.co.za`, preview and staging subdomains?
11. Should the current Twilio trial account be upgraded, or should staging and production subaccounts be created first?
12. Is Brevo the only email provider, with SendGrid disabled?
13. Which PostHog data residency and consent configuration is approved?
14. Which Cloudflare plan and origin-hosting arrangement is approved?
15. Is WSL installation approved for CodeRabbit CLI?

## Phase 0 Verification Results

Completed on 2026-06-24:

- `npm.cmd run verify`: passed.
- ESLint: passed with no errors.
- Vitest: 17 files and 73 tests passed.
- Vite production build: passed.
- Article validation: 15 published articles passed registry, sitemap and queue checks.
- Secret scan: passed; no obvious committed secrets detected.
- Frontend privileged-write scan: passed; no direct `admin_review_queue` or `integration_outbox` mutations detected.
- `npm.cmd --prefix mobile run typecheck`: passed.
- `npm.cmd --prefix mobile run config:check`: passed for the development configuration shape.
- `npx.cmd expo-doctor`: 21 of 21 checks passed.
- Deno 2.8.3 is installed; shared Twilio webhook signature tests passed, 2 of 2.
- Staging Supabase security advisor: no active findings.
- Production Supabase security advisor: leaked-password protection remains disabled.
- Preview server: `http://127.0.0.1:4173/` returned HTTP 200.

Expected release-evidence omissions:

- Apple association generation is skipped until the approved Apple Team ID or iOS App ID is provided.
- Android association generation is skipped until release SHA-256 certificate fingerprints are available.
- GitHub CLI 2.95.0 is installed but not authenticated.
- CodeRabbit CLI is not available because official Windows use requires WSL, which is not installed.

## Phase 0 Acceptance

- Repository and provider capabilities were inspected.
- No new production implementation code was changed.
- No provider capability was assumed.
- No production deployment, communication, purchase, charge or store submission occurred.
- Duplicate chat, invoice, Care+, feature-flag and payment systems were identified before further design.

Founder review is required before Phase 1.
