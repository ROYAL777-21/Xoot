# Private GPS/ETA continuation evidence — 21 October 2026

PR #71 targets `release/xoot-production`; it is not approved for production tracking or merge.

## Implementation and conflict resolution

Merged the current release base into the feature branch and retained both sets of CI/privacy/database checks. The incoming complete-name launch-region matcher was preserved; no homepage redesign was substituted. Fixed outdated GPS parser assertions and Windows line-ending sensitivity in the source-mirror test.

The manual two-pair staging harness now calls the real staging `/auth/v1/user` endpoint for each supplied token before any location write. It rejects repeated identities even when JWT strings differ, expired/invalid sessions, anonymous users and non-staging destinations. It marks attempted uploads before sending, so a timeout after a successful server write still triggers cleanup. Cleanup failure is now visible and fails the run.

Documented `MAPBOX_DIRECTIONS_TOKEN` in the Edge template. Repaired the Expo slug to match the actual `@don-pacho777/zoot` project while preserving installed Xoot identity. [Exact protected provider setup and acceptance](../../mapbox-founder-setup.md).

## Staging evidence

- Project `fxmxyabdjqviqbcxmvlp`, `xoot-job-location` v6, ACTIVE, `verify_jwt=true`. All five returned source files matched repository handler/shared dependencies after line-ending normalisation.
- Private GPS table has RLS on, zero client policies, no direct client SELECT and no Realtime publication. Atomic publish RPC remains service-only.
- One active per-minute expiry cron task; successful cron history with DELETE 0 observed. This is **not** proof that a seeded expired physical position was removed. Real expiry acceptance remains open.
- Unauthenticated and malformed-token POST probes returned 401 without coordinates. Four actual authorised user JWTs and two accepted synthetic bookings were unavailable, so the real GPS/ETA harness refused with exit 2 before requests/writes. No user was impersonated with service-role access.
- The owner supplied two founder emails; only one was registered in staging, without a Xooter profile. The other was absent. No trust-status or role change was made.
- The separate PR #81 staging coverage endpoint is v2, with a dormant full-resolution Gauteng candidate. Accepted GPS/ETA journeys are intentionally independent of service-zone polygons.
- Production GPS/zone schema is absent. Staging/production ledgers remain divergent: 88 versus 82 entries, seven staging-only migrations and production-only safety-PIN patch `20261008011821`. No production migration or repair was attempted.

## Automated validation

- Full Vitest: **158 files passed; 1,612 tests passed, seven skipped** with two workers. The missing token-template assertion was fixed; an unrelated UI timeout passed its focused rerun and the full suite.
- GPS privacy Node tests: 18 passed. Real-identity preflight offline tests: four passed. Routing/parsing checks: 13 passed. Native maps: ten passed; visit lifecycle: six passed.
- Disposable PostgreSQL 17.6: 11 checks passed, covering schema/RLS/service grants, atomic publish/throttle, lifecycle deletion and lifetime constraint. The vanilla database does not have pg_cron; that footer is deliberately outside this local fixture and is not claimed as executed.
- Website TypeScript, mobile TypeScript and lint passed. Development web build passed. Approved homepage source and rendered 390px/1440px smoke passed. Signing-dependent Apple/Android association files were skipped for missing real inputs.
- Secret, frontend privileged-write, unsafe DOM and static-host scans passed individually. The Windows live-header test detected the deliberate bad headers but its subprocess crashed on exit with code 3221226505; that local wrapper failure remains recorded. All three unchanged tests passed in an isolated Linux Node 24.16.0 container, with network disabled and repository mounted read-only. No assertion was weakened.
- Independent Claude security CI previously failed for insufficient provider credits; it did not produce a clean security verdict. Production generated-type parity CI reflects unresolved actual database/type drift and must not be disabled.

## Release blockers

Missing real user sessions and two approved Xooters, Mapbox secret/billing entitlement and real API success, AAL1/AAL2 admin tests, physical expiry and lifecycle acceptance, POPIA/provider telemetry/security review, identified boundary review and separately verified worker capacity, current signed Android/iPhone builds and device permission/offline/STOP checks, reviewed backup/migration order and production release approval.

No production function, credential, flag or homepage was changed. No production launch or merge is inferred from source tests, an ACTIVE Edge version or Vercel READY.
