# Job-scoped Xooter live location — deployment and privacy gate (16 October 2026)

STATUS: GPS schema and JWT-verified Edge Function deployed to **staging only** on 17 October 2026. Production and client feature flags remain OFF; end-to-end account/device acceptance is not complete. Merged Mapbox booking PR #69 remains a different workstream.

## Intended first release

The assigned, approved Xooter actively opts in to foreground-only sharing while a currently accepted booking is en route. An authenticated Edge Function checks the caller's JWT, exact booking, accepted job, worker ownership, current status and non-revoked sensitive access before accepting a fresh position.

Only the booking customer and assigned Xooter can request the last current point. Cross-account requests reveal no coordinates. No public map or Xooter directory ever receives private positions. A single row per booking is kept, not a breadcrumb history.

Coordinates expire from reads after 60 seconds, and a required pg_cron job physically deletes stale rows once per minute. Only service_role has direct database grants; anon and authenticated have no direct table read/write permissions or RLS policies. The table must not be added to Supabase Realtime publications.

The Edge service rejects absent consent, spoofed worker IDs, offered or completed jobs, stale/replayed positions, imprecise fixes and repeated updates faster than the published limit. Stop sharing clears the current position. Edge reading also rejects cancelled/reassigned/completed jobs.

## Source continuation — 17 October 2026 (still disabled)

PR #71 now includes these additional, reviewable changes:

- Corrected PostgreSQL trigger function delimiters and added a service-role-only `public.xoot_publish_private_job_location` RPC. The RPC rechecks active booking / accepted job / approved Xooter inside PostgreSQL row locks, atomically throttles conflicting updates and preserves the GPS capture timestamp for 60-second expiry. The Edge API remains the only authenticated client-facing boundary; it requires a booking-participant JWT and explicit consent.
- Added disposable PostgreSQL 17 CI with actual RLS/GRANT, worker/job lifecycle deletion and atomic RPC tests. The stock CI container has **no pg_cron**, so the job definition is checked statically; actual scheduled physical deletion must still be proven in staging with installed pg_cron. Source/CI checks are not a live Edge cross-account security test.
- Added separate `VITE_ENABLE_LIVE_JOURNEY=false` (web) and `EXPO_PUBLIC_ENABLE_LIVE_JOURNEY=false` (native). Both must stay **false** through all unapproved environments and deployments. The native viewer is customer-owned and opt-in; the native Xooter publisher requires accepted/en-route status, Android foreground permission or iOS When-In-Use, a fresh ≤100m GPS fix and a second explicit sharing tap. App backgrounding/unmount stops sharing; only current point, no history. Web/native variants do not expose a native map on unsupported platforms. Native SDK uses visible attribution.
- Never consider source compilation proof of physical-device location permissions, Mapbox SDK functionality, telemetry/POPIA, Geocoding Permanent licence, Maps billing, or authorised Edge endpoint behaviour.

### Deployment and sign-off checklist

1. **Schema history reconciliation first.** Staging has versions `20260903120000`, `20261003140000`, `20261015102137` and `20261015155437` absent from production. Production has `20261008011821` absent from staging. Document schema diffs, apply genuine missing migrations in reviewed order, and reconcile history only to actual SQL state; never mark a migration applied merely to quiet CI.
2. Apply GPS migration to an **isolated disposable Supabase-compatible PostgreSQL 17** with pg_cron and real Supabase roles, then staging under a reviewed release action; inspect `has_table_privilege`, `pg_policies`, `pg_publication_tables`, the cron job owner and its successful deletion of an expired synthetic point. Production stays unchanged pending gates.
3. Deploy the `xoot-job-location` Edge handler to **staging only** with JWT verification on. Exercise direct anonymous + participant + two unrelated user JWTs; try nonparticipant reads, forged Xooter ID, offered/revoked/completed jobs, stale/future/invalid precision, simultaneous uploads, rapid replay, stop-after-inflight, cancellation and reassignment. Inspect read/write logs for **zero raw GPS or household address values**.
4. Test installed EAS iOS/Android preview binaries with two consenting customer/worker pairs, approved Xooter profiles and real accepted/en-route synthetic bookings. Confirm native Mapbox public-token use, mandatory attribution, iOS When-In-Use / Android foreground permission, denial recovery, battery impact, network loss, stale marker removal, backgrounding, app-switching, stop-sharing and post-job deletion.
5. Secure privacy/legal and external security approval for **POPIA** and provider SDK telemetry, plus owner approval of Mapbox billing and Geocoding Permanent entitlement. An incomplete Claude audit caused by low credits is a failed security gate, not an approval.
6. Verify a preview deployed from the **exact current PR head**, full green CI, mobile build and both devices before approving release. Enabling the flags and merging is a separate explicit production launch decision. No precise tracking, route geometry or unverified ETA claims before approval.

## 17 October 2026 staging verification evidence

Supabase staging `fxmxyabdjqviqbcxmvlp` has the new `xoot_job_live_positions` table and `xoot_publish_private_job_location` RPC installed from migration `20261016234838` via a tracked database migration. Live catalogue read-back: RLS enabled; **zero** policies; no public Realtime publications; anon and authenticated `SELECT` denied; service-role CRUD and RPC granted; authenticated RPC execution denied; both booking and accepted-job cleanup triggers installed. Scheduled `xoot-live-location-expiry` is active at `* * * * *`, and `cron.job_run_details` reports a **succeeded** execution. This confirms the scheduled statement runs, not a physical expired-record deletion test with a seeded booking.

The `xoot-job-location` Edge Function is deployed to staging as **version 2** with `verify_jwt=true`, bundling `_shared/action-utils.ts` and `_shared/live-dispatch.ts`. No worker/customer/administrator JWT end-to-end test or Mapbox provider request was performed. Native and website flags are OFF. Production Supabase `mvlrkelahhsyjrwgsxaf` has not been modified; the table/RPC and Edge function are absent there. The production live-generated-types gate still fails as expected.

Source PR now includes an opt-in user/customer traffic-routing estimate and an administrator dispatch viewer, using AAL2 admin MFA and job lifecycle / fresh-GPS checks. Both are still release gated. Proposed privacy and POPIA notices are included for legal review before launch.

## Outstanding production acceptance gates (staging schema/Edge already installed)

1. Reconcile staging and production migration-history drift first. Do not blindly apply this migration to production or repair migration history. Both current projects have PostgreSQL 17 and pg_cron 1.6.4 installed in the live catalogue.
2. Execute the migration on disposable PostgreSQL. Confirm pg_cron retention runs, RLS and GRANT semantics, and negative anon/authenticated direct reads/writes. Run Supabase database/security advisors.
3. Independently verify Edge JWT authentication, nonparticipant reads, forged worker writes, cross-account requests, revoked ownership, stale and inaccurate GPS, cancellation/reassignment/completion, and concurrent client calls. The source tests in CI do NOT prove deployed security.
4. Implement a transparent worker consent and revoke UI, foreground location permissions, native Expo/iOS/Android capture, server-side lifecycle hooks and a job-scoped customer map view. No continuous background tracking unless separately approved with platform review.
5. Use two unrelated consenting customer accounts, two verified worker identities and a staging administrator to run actual jobs on iOS and Android. Confirm GPS freshness, foreground/background transitions, network loss, battery use, retention and Mapbox Directions on both clients.
6. Have POPIA/privacy/legal and external security review sign off retention, location sharing, provider SDK telemetry and auditing. Keep the current customer screen status-only until these gates pass.
7. The current exact release build still needs Vercel capacity and browser proof. A READY older preview cannot attest to a newer commit.

## 19 October — GPS/ETA sharing reliability fixes and acceptance

The PR now has native and website **Share travel estimate** actions in the authenticated customer's opt-in journey view. A shared message contains only a recent Mapbox driving duration, kilometre estimate and calculation time, with a traffic disclaimer. It deliberately contains **no address, GPS coordinates, customer identity, booking identifier or private map link**. The shared formatter refuses routes whose calculation or GPS fix is 60 seconds old or more, invalid durations, bad timestamps and invalid kilometre distances. Native invokes the operating system share sheet. Website uses Web Share and falls back to copying text where supported. A share-sheet cancellation does not expose GPS.

The mobile viewer now uses the Edge response's authentic recordedAt timestamp (not an approximation from expiresAt). The web customer view removes coordinates and the route once the position expires, even if offline polling stalls. The web publisher now captures its active-watch state before clearWatch on unmount and waits for an in-flight write before its final STOP; previously checking the cleared watch meant STOP might never be called. A native worker's one-off route estimate also expires after one minute, displays its calculation time and has a bounded network-failure path. These are source changes only until the code is released.

**Confirmed in staging (19 Oct, read-only SQL):** the location table and atomic RPC exist, RLS is enabled with zero client policies, anon/authenticated SELECT is denied, service_role SELECT is allowed, no Realtime publication includes private GPS, and one live pg_cron expiry job is active. The expiry job has executed successfully, and the current stale-row count is zero. Staging xoot-job-location version 3 is JWT-protected; its source and both imported shared dependencies are byte-identical to PR #71. This is NOT a two-account authenticated Edge or physical handset test; no test GPS/ETA was published.

**Blocked from production until acceptance:** PR #71 is unmerged; production still lacks the location schema and Edge endpoint and currently has no approved enabled VITE_ENABLE_LIVE_JOURNEY/EXPO_PUBLIC_ENABLE_LIVE_JOURNEY setting. The production generated-types check fails as expected because schema versions differ. Test on a signed Android/iOS EAS preview with two genuine consenting roles and one accepted en-route job, preferably staging: worker starts location sharing → customer's visible private map receives a point within a poll cycle → Mapbox Directions returns a real route → customer sees ETA and successfully shares it → backgrounding worker and STOP revoke the point → another customer cannot read location → disabled/expired GPS hides marker and ETA → cancelled/reassigned booking deletes location. Test denied permissions, offline map/route and unrelated MFA-admin access. **Never set production flags true, apply prod migration or declare it launched based on unit tests alone.**

This source change provides a service-only, expiring GPS transport foundation, not a production Mapbox GPS/ETA feature or a public worker tracker.


## 19 October — server-authorised, outside-zone ETA continuation (PR #71; NOT launched)

A new `xoot-job-location` `eta` action is source-implemented. It accepts only a booking ID from a signed-in participant and repeats approved, accepted and en-route checks. The server reads the latest expiring worker GPS fix and **the database's saved booking address**. Caller-supplied coordinates, route destination and worker ID cannot control the calculation. Crucially, there is **no service-zone predicate**: an already accepted job must remain trackable when the Xooter travels outside the booking-eligibility polygons.

The existing service-role-only `consume_rate_limit` RPC budgets at most four route requests per rolling minute per SHA-256 booking+actor identifier. Temporary ZA-only Mapbox v6 geocoding and `driving-traffic` Directions run only inside Edge and are not stored. A timeout, invalid provider payload, stale/revoked fix or wrong job returns no ETA. After the provider calls the handler rechecks booking lifecycle, worker approval and the exact original unexpired GPS fix, so STOP and cancellation invalidate an in-flight estimate. The result is marked `Cache-Control: private, no-store`.

Web and native **customer** opt-in viewers now request the ETA with `{ action: 'eta', bookingId }` only, validate its 60-second envelope, and retain private customer-share messages that contain no address or GPS. The separate assigned worker's foreground one-off directions feature stays intact. PR #81 determines *new booking eligibility* and must remain independent of GPS and ETA for an accepted journey.

**Operational dependency:** configure `MAPBOX_DIRECTIONS_TOKEN` as a Supabase Edge secret in staging, restricted to permitted Mapbox v6 Geocoding and driving-traffic requests, not browser referrer-restricted; verify provider billing. Never put it in `VITE_`, `EXPO_PUBLIC_`, code, logs, or this document. Missing token fails closed.

**Source versus live:** PR #71 carries source work, not the deployed staging Edge v3. Production still lacks the GPS schema and Edge handler. The source changes require exact-head CI, review, two unrelated consenting customer/Xooter pairs, live Mapbox routing, POPIA approval and installed iOS/Android testing before any release or enabling flags.
