# Job-scoped Xooter live location — deployment and privacy gate (16 October 2026)

STATUS: Source implementation under review. NOT deployed to either Xoot database or client. Merged Mapbox booking PR #69 remains a different workstream.

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

## Preconditions for applying even to staging

1. Reconcile staging and production migration-history drift first. Do not blindly apply this migration to production or repair migration history. Both current projects have PostgreSQL 17 and pg_cron 1.6.4 installed in the live catalogue.
2. Execute the migration on disposable PostgreSQL. Confirm pg_cron retention runs, RLS and GRANT semantics, and negative anon/authenticated direct reads/writes. Run Supabase database/security advisors.
3. Independently verify Edge JWT authentication, nonparticipant reads, forged worker writes, cross-account requests, revoked ownership, stale and inaccurate GPS, cancellation/reassignment/completion, and concurrent client calls. The source tests in CI do NOT prove deployed security.
4. Implement a transparent worker consent and revoke UI, foreground location permissions, native Expo/iOS/Android capture, server-side lifecycle hooks and a job-scoped customer map view. No continuous background tracking unless separately approved with platform review.
5. Use two unrelated consenting customer accounts, two verified worker identities and a staging administrator to run actual jobs on iOS and Android. Confirm GPS freshness, foreground/background transitions, network loss, battery use, retention and Mapbox Directions on both clients.
6. Have POPIA/privacy/legal and external security review sign off retention, location sharing, provider SDK telemetry and auditing. Keep the current customer screen status-only until these gates pass.
7. The current exact release build still needs Vercel capacity and browser proof. A READY older preview cannot attest to a newer commit.

This source change provides a service-only, expiring GPS transport foundation, not a production Mapbox GPS/ETA feature or a public worker tracker.
