# Job-scoped Xooter live location — deployment and privacy gate (16 October 2026)

STATUS: Source implementation under review. NOT deployed to either Xoot database or client. Merged Mapbox booking PR #69 remains a different workstream.

## Intended first release

The assigned, approved Xooter actively opts in to foreground-only sharing while a currently accepted booking is en route. An authenticated Edge Function checks the caller's JWT, exact booking, accepted job, worker ownership, current status and non-revoked sensitive access before accepting a fresh position.

Only the booking customer and assigned Xooter can request the last current point. Cross-account requests reveal no coordinates. No public map or Xooter directory ever receives private positions. A single row per booking is kept, not a breadcrumb history.

Coordinates expire from reads after 60 seconds, and a required pg_cron job physically deletes stale rows once per minute. Only service_role has direct database grants; anon and authenticated have no direct table read/write permissions or RLS policies. The table must not be added to Supabase Realtime publications.

The Edge service rejects absent consent, spoofed worker IDs, offered or completed jobs, stale/replayed positions, imprecise fixes and repeated updates faster than the published limit. Stop sharing clears the current position. Edge reading also rejects cancelled/reassigned/completed jobs.

## Preconditions for applying even to staging

1. Reconcile staging and production migration-history drift first. Do not blindly apply this migration to production or repair migration history. Both current projects have PostgreSQL 17 and pg_cron 1.6.4 installed in the live catalogue.
2. Execute the migration on disposable PostgreSQL. Confirm pg_cron retention runs, RLS and GRANT semantics, and negative anon/authenticated direct reads/writes. Run Supabase database/security advisors.
3. Independently verify Edge JWT authentication, nonparticipant reads, forged worker writes, cross-account requests, revoked ownership, stale and inaccurate GPS, cancellation/reassignment/completion, and concurrent client calls. The source tests in CI do NOT prove deployed security.
4. Implement a transparent worker consent and revoke UI, foreground location permissions, native Expo/iOS/Android capture, server-side lifecycle hooks and a job-scoped customer map view. No continuous background tracking unless separately approved with platform review.
5. Use two unrelated consenting customer accounts, two verified worker identities and a staging administrator to run actual jobs on iOS and Android. Confirm GPS freshness, foreground/background transitions, network loss, battery use, retention and Mapbox Directions on both clients.
6. Have POPIA/privacy/legal and external security review sign off retention, location sharing, provider SDK telemetry and auditing. Keep the current customer screen status-only until these gates pass.
7. The current exact release build still needs Vercel capacity and browser proof. A READY older preview cannot attest to a newer commit.

This source change provides a service-only, expiring GPS transport foundation, not a production Mapbox GPS/ETA feature or a public worker tracker.
