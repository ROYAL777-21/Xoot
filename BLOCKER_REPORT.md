# Zoot Production Readiness Findings

Reviewed: 2026-06-24

## Resolved

- Staging and production share a forward schema-convergence checkpoint:
  - `20260624114802_production_schema_convergence_and_sensitive_access_notifications.sql`
  - `20260624114953_booking_policy_and_sensitive_access_notifications.sql`
  - `20260624121516_policy_performance_hardening.sql`
- Both environments enforce the canonical booking status check and default new bookings to `draft`.
- Broad client writes were removed from bookings, payment records, Care+ subscriptions, ZootCred, integration outbox, and notification content.
- Missing production support tables for native push, sensitive-access logs, E2EE public keys, and refund requests were added.
- A one-minute database scheduler notifies an assigned Zooter when sensitive access opens 45 minutes before the scheduled start.
- The Zooter Jobs UI shows the exact unlock time and explains that a notification will be sent.
- Local Supabase config contains the required web and `zoot://` redirect URLs.
- GitHub CLI 2.95.0 is installed.

Historical migration ledgers are intentionally not rewritten. These migrations are the shared forward baseline; future migrations must run on staging first and production second in the same order.

## Account-Level Blockers

### Supabase Auth

- Live staging and production redirect allowlists are empty.
- The active dashboard tab is signed out, and the database connector cannot update Auth settings.
- Sign in to Supabase and apply the exact values in `docs/OAUTH_AND_REDIRECTS.md`.

### Twilio

- Account status: Trial.
- Incoming phone numbers: none.
- WhatsApp senders: none.
- Existing Messaging Service classification: marketing.
- Upgrade the account, purchase or port a South African number, create a transactional/notifications Messaging Service, complete regulatory registration, and approve a WhatsApp sender/templates.
- Rotate all Twilio credentials previously pasted into chat before production.

### Mapbox

- No restricted browser, native, or build-download tokens are available.
- Create separate least-privilege tokens:
  - browser token restricted to approved Zoot HTTPS origins;
  - native public token for Expo builds;
  - secret downloads token stored only in EAS/CI.

### Cloudflare

- The account contains no zones.
- The connected API token lacks `account.zone.create`, so it cannot create `zoothome.co.za`.
- Confirm domain ownership, grant a narrowly scoped zone-creation token or add the zone in the dashboard, update registrar nameservers, then enable WAF, rate limits, and Turnstile.

### Apple And Google

- Apple Team ID, App Store Connect record, Google Play record, Android signing fingerprints, and store declarations are unavailable.
- Completion requires active developer-console access, legal business details, privacy/data-safety declarations, and final submission approval.

### GitHub And CodeRabbit

- GitHub CLI is installed but not authenticated.
- The GitHub connector cannot authenticate the local CLI or push this mixed local working tree.
- CodeRabbit CLI requires WSL on this Windows host.
- Preferred path: authenticate GitHub, push a scoped branch, open a PR, and run CodeRabbit through the GitHub App.

## Verification

- Staging migrations: applied.
- Production migrations: applied.
- Sensitive-access cron job: active in both environments.
- Scheduler dry run: zero queued notifications with zero eligible bookings.
- Test suite: 17 files and 74 tests passed.
- ESLint: passed.
- Production build: passed.
- Secret and frontend-write security scans: passed.
- Mobile typecheck, config validation, and lint: passed.
- Deno 2.8.3 checked all 29 Edge Function entrypoints.
- Staging Supabase security advisor: no findings.
- Production Supabase security advisor: only leaked-password protection remains disabled.
