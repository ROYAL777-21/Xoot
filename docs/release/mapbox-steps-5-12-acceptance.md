# Xoot Mapbox Steps 5–12 — release acceptance matrix
**Updated:** 19 October 2026. **Decision:** staging integration in progress; NOT approved for production GPS or strict geographic coverage.

This is a live-state supplement to the canonical `docs/release/production-checklist.md`.
Do not interpret checked source code as completed platform, provider, physical-device or legal acceptance. The founder-approved homepage, `release/xoot-production`, `main`, Codex PR #46 and all payments/Twilio flags remain unchanged.

| Step | Delivered source or verified runtime | Still required before an honest production pass |
| --- | --- | --- |
| 5. South African address search | Website address/search PR #69 merged; native opt-in address search and permanent-selection safeguards implemented | Verify live Mapbox v6 requests, account Permanent Geocoding billing entitlement, consent wording, web/mobile fallbacks and restrictions |
| 6. Serviceable operating zones | Isolated PR #81 implements private approved GeoJSON, server geocoding, budget and both gated booking writers; invalid matching zones now fail closed | Founder-signed actual WGS84 polygons with services/source/date, independent GIS review, reconcile schema drift, stage schema and JWT endpoint, real inside/outside acceptance; flags OFF |
| 7. GPS-based road ETA | PR #71 authenticated `eta` accepts only booking ID; staging Edge **v4** deployed with exact source and JWT verification | Dedicated staging-only `MAPBOX_DIRECTIONS_TOKEN` secret (provider access cannot be inspected), real Mapbox Directions + temporary ZA geocode, consented synthetic outside-zone route and failure cases |
| 8. Private job GPS | Staging table/RPC, service-only privileges, no client RLS policies or Realtime, and active pg_cron cleanup verified | Authenticated two-pair staging tests, proof of physical expiry after actual synthetic seed, stop/cancel/reassignment race and no-location-leak review |
| 9. Website/Android/iOS journey | Web and native opt-in displays, foreground-only Xooter sharing, customer current-map view and short-lived ETA parser in PR #71 | Physical preview binaries installed, device GPS/permission checks, native Mapbox style tiles/attribution, offline/network recovery, per-account privacy and battery measurement |
| 10. Dispatch operations | Source-only opt-in MFA/AAL2-restricted administrator map/feed with ≤60s position and no history | Staging admin with independent AAL1/AAL2 tokens and real two-pair map acceptance, security review and audit |
| 11. Security and acceptance | Source tests, prior PostgreSQL 17 exercises, staging RLS/grants and exact Edge bundle readback | **Current** exact-head GitHub workflow, independent security/POPIA legal approval, native devices, provider bill/usage proof, map privacy and accessibility evidence |
| 12. Production promotion | Vercel feature-branch preview READY; GPS flags remain OFF, separate production Supabase has NO GPS schema/Edge | Reconcile production-only safety patch + missing prerequisite migrations; backup/dry-run, reviewed release branch/commit, explicit founder authorisation, deploy database before Edge and website, monitor and staged feature-flag activation |

## Run two-pair authenticated staging security and ETA acceptance

There is a manual, fail-closed Node 24 runner at
`scripts/ops/test-mapbox-private-journey-staging.mjs`. It **refuses production Supabase URLs** and refuses any location publish without explicit `XOOT_TEST_SYNTHETIC_CONSENT=YES`. It does not use `service_role`; the four JWTs must represent distinct, currently authenticated consenting staging identities.

Prepare **two synthetic, accepted and en-route bookings** in staging, each assigned to a different active, background-check-approved test Xooter, with a realistic but fictitious **South African postal address**. Confirm booking A and B owners are distinct; do not use genuine customers, homes or their real GPS. Only use this script after the dedicated Mapbox Edge token has been tested/billed and both test workers have consented.

Inject the following variables from your local secure vault or a GitHub environment secret store (never paste values into chat, commit them or print JWTs):

```text
XOOT_TEST_STAGING_URL=https://fxmxyabdjqviqbcxmvlp.supabase.co
XOOT_TEST_STAGING_ANON_KEY=<staging anon/publishable key>
XOOT_TEST_CUSTOMER_A_JWT=<staging customer's signed-in access JWT>
XOOT_TEST_CUSTOMER_B_JWT=<different staging customer JWT>
XOOT_TEST_WORKER_A_JWT=<accepted worker A access JWT>
XOOT_TEST_WORKER_B_JWT=<accepted worker B access JWT>
XOOT_TEST_BOOKING_A=<synthetic UUID>
XOOT_TEST_BOOKING_B=<different synthetic UUID>
XOOT_TEST_SYNTHETIC_CONSENT=YES
# Optional to exercise private dispatch:
XOOT_TEST_ADMIN_AAL1_JWT=<test admin before MFA step-up>
XOOT_TEST_ADMIN_AAL2_JWT=<same test admin after genuine MFA step-up>
```

Then run `node --check scripts/ops/test-mapbox-private-journey-staging.mjs` and
`node scripts/ops/test-mapbox-private-journey-staging.mjs`. The script exercises missing/cross-account JWTs, unauthorised publishing, consent/replay/accuracy rejection, two distinct live positions, the **synthetic Durban GPS fix outside Johannesburg's operating area**, real Mapbox traffic ETA, no coordinate leak in ETA payload, immediate STOP revocation and optional AAL1-vs-AAL2 administrator map boundaries. It attempts to stop both workers and clear synthetic GPS on exit. Never treat a skipped optional admin test as passed.

The test **does not** prove native device permission, actual background app-state revocation, physical pg_cron cleanup, Mapbox account billing, privacy sign-off or production schema equivalence. The tester must record dated redacted screenshots/screenshots of the two installed devices and Mapbox usage counters; do not include real addresses, live GPS, account tokens or private keys in evidence.

## Failure and rollback criteria

- A shared position is visible to an unrelated account, or is still readable after STOP/cancellation/expiry: **block release**.
- A verified ETA is shown without fresh approved worker GPS or a valid Mapbox `driving-traffic` response: **block release**.
- A journey outside the initial service zones stops being trackable while its accepted booking remains en-route, with consent: **block release**.
- No founder-approved, sourced actual service polygon: maintain `XOOT_STRICT_GEO_COVERAGE=false`, `VITE_VERIFIED_COVERAGE=false`; the availability wording remains review/manual, not promised.
- Staging not fully signed off: keep `VITE_ENABLE_LIVE_JOURNEY=false` and `EXPO_PUBLIC_ENABLE_LIVE_JOURNEY=false` in production, no GPS/ETA display.
- Reconciliation detects an unaccounted production migration or incompatible referral/security dependency: no production database write. Never fake the migration ledger.
