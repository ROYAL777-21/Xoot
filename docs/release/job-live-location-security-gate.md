# GPS-backed Mapbox journeys — backend privacy gate (16 October 2026)

## State: source prepared, NOT DEPLOYED

This branch prepares an authenticated, job-specific **90-second-expiring** worker-position source. It intentionally does **not** activate or publish GPS sharing: `XOOT_ENABLE_LIVE_LOCATION` is **OFF by default** in the Edge Function; no public client can insert/select `public.job_live_positions` directly, and no frontend publishes or polls coordinates yet.

The Edge Function `job-live-location` (JWT required) supports `publish`, `read` and `stop`; the actor is from Supabase `auth.getUser()`, never body input. Server verifies active accepted job, approved active Xooter, exact assigned worker and customer owner. It only serves fresh observations. A database BEFORE trigger independently checks assignment and status under row locks; AFTER triggers on booking and job updates delete positions when the job leaves en-route, is reassigned or cancelled. A pg_cron job removes expired rows every minute. Both project catalogs were inspected and `pg_cron` v1.6.4 exists; nonetheless the deployment workflow is held until staging migration history is reconciled.

**Critical pending feature:** a production consent lifecycle requires persisted and revocable worker sharing sessions and a tested stop-versus-in-flight-publish race barrier. The current per-publish `sharingConsent:true` is insufficient to guarantee that a request already in flight cannot arrive after Stop. Do **not** enable `XOOT_ENABLE_LIVE_LOCATION` or merge for customer production until session fencing, a worker start/stop UI, native Android/iOS permissions, and concurrent cancellation tests are implemented.

## Promotion / security requirements

1. Resolve staging Supabase migration ledger divergence and management token scopes; otherwise do not apply a new schema migration. Verify DB schema equivalence and production-only existing hardening first.
2. On a disposable Postgres 17 + pg_cron, run the migration and test negative SQL roles for `anon`, `authenticated`, service grant, zero direct client read/insert/update/delete, and cancellation/reassignment/complete cleanup. Test simultaneous GPS publish vs Stop and status change.
3. On real staging accounts: worker A cannot publish job B; customer A cannot read customer B or worker B; admin has no automatic arbitrary tracking in the customer endpoint; anonymous cannot use Edge; permission refused/stale GPS/false accuracy rejects. Verify signed JWT, no credential logs, RLS and no cross-account fallback.
4. Obtain explicit consent/disclosure, retention policy and POPIA review. Publishing must stop at arrived/complete/reassign/cancel, force-quitting leaves 90-second expiry and minute-level physical purge.
5. Implement native iOS/Android foreground sharing (only in an installed EAS build, not Expo Go), worker opt-in and persistent revoke UI; web worker equivalent; customer read-only map, route and genuine server-produced ETA. Do not show fictional location/ETA if missing.
6. Verify real Mapbox tile/Geocoding/Directions account usage, signed physical devices, automated regression, load and rate-limit proof; only then enable the private server gate and public feature flag in a controlled staging pilot. Never enable production on green source tests alone.

The current PR deliberately makes **no live database, payment, voice, or map-account changes**. Do not treat it as complete live tracking.
