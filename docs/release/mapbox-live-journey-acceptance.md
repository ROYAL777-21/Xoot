# Mapbox real staging journey acceptance — runbook

**Test status:** The executable `scripts/ops/verify-live-mapbox-journey.mjs` is committed and its guardrails run in CI. A green `--self-test` is **NOT** a live authenticated test. To certify production, the live staging mode must actually run with three independent consenting test identities.

## Preparation

Latest continuation: staging `xoot-job-location` v6 is JWT protected and source-matched. [Founder setup and two-pair acceptance](mapbox-founder-setup.md) covers the newer four-identity runner, exact variables, Mapbox secret form and remaining signed-device/MFA gates. The three-identity runner below is a separate subset; its self-test is not a live authenticated result.

1. Use the **staging** project `fxmxyabdjqviqbcxmvlp` only. Confirm `xoot-job-location` is deployed there with `verify_jwt=true`, and `xoot_job_live_positions` has RLS on, no direct anonymous/authenticated SELECT, job-lifecycle triggers and an active expiry cron task. Confirm edge handler source matches the release candidate being tested. Do not run this against the production project `mvlrkelahhsyjrwgsxaf`.
2. Create/use **consenting synthetic** test identities in staging: one approved active Xooter, one customer owning a booking assigned to that Xooter, and an unrelated customer. The booking must have an **accepted job** for the same Xooter, its status must be `en_route` or legacy `enroute`, and it cannot be cancelled/completed/revoked. Never use real customer addresses, real job IDs or actual GPS coordinates in this test.
3. Obtain each test account's **own short-lived Supabase JWT** through its normal login. Supply JWTs and the staging *public* key as process environment variables only, not Git, commits, CI logs, terminal history or ChatGPT. Do **not** use any service_role/secret key as the test user.
4. Separately obtain an admin test JWT with validated AAL2 MFA to test dispatch. Leave this absent until MFA setup; then admin-dispatch coverage will explicitly report that it was not tested.
5. The chosen synthetic GPS point is a fictional Johannesburg-area test coordinate, not an actual worker fix. Keep this test in staging only, after confirming all three accounts consent and the worker's test booking has no customer-sensitive data.

## Run (locally with private environment variables)

Use a trusted shell with `XOOT_STAGING_LOCATION_E2E_APPROVED=consenting-synthetic-test-only`, `XOOT_STAGING_TEST_BOOKING_ID`, `XOOT_STAGING_TEST_WORKER_JWT`, `XOOT_STAGING_TEST_CUSTOMER_JWT`, `XOOT_STAGING_TEST_OUTSIDER_JWT` and `XOOT_STAGING_PUBLISHABLE_KEY`. Optionally `XOOT_STAGING_TEST_ADMIN_AAL2_JWT`. Do not paste the values in any public issue or conversation.

Run `node scripts/ops/verify-live-mapbox-journey.mjs` from the repository root. It checks outsider denial, explicit consent, stale/replayed fixes, inaccurate fixes, customer write denial, successful worker publish, customer read of the fresh point, `Cache-Control: private, no-store`, outsider inability to read after publish, rapid replay throttling, worker stop and immediate customer loss of access. When available, it checks AAL2 admin dispatch as well. It always attempts to stop a published synthetic point on failure. It prints no GPS coordinate, address, token or customer identity. The script refuses any project URL other than staging.

Run `node scripts/ops/verify-live-mapbox-journey.mjs --self-test` to verify the safeguard code **without network requests**; CI runs this only and therefore does not prove successful Mapbox/Edge service operation.

## Additional mandatory tests outside this script

- **Android and iPhone native builds:** install preview EAS binaries, open worker's assigned active job, explicitly allow foreground location, start sharing, confirm only current location appears to owning customer in native Visit detail and authenticated website booking detail, and that OS backgrounding / screen unmount and Stop revoke it. Confirm two physically separate devices, loss of network, denied permissions, revoked account, expired position and cancelled/reassigned job.
- **Live Mapbox provider:** from authorised production and preview origins, use browser devtools and native debug logs to confirm real style/tiles are HTTP 200 and Geocoding v6/Mapbox Directions succeed (403/429 and billing errors must be handled safely). Ensure no secret token is embedded in a client, logo/attribution remain visible and all traffic is expected under Mapbox billing. Permanent Geocoding may incur charges and must have billing approval.
- **Real coverage:** a textual suburb match is not proof the destination lies in an approved service polygon or that an Xooter can accept it. Get founder-approved operating polygons; verify server-side point-in-zone checks and actual roster capacity for the requested service/date.
- **Admin dispatch:** with MFA-protected admin test account, confirm only active consenting en-route positions show, unauthorized or expired sessions get no data, and all underlying job ownership and lifecycle conditions are rechecked.
- **Legal/security:** POPIA notice, customer and worker consent, location retention, route-sharing privacy, production migration parity, live RLS negative probes and independent security review. Do not enable `VITE_ENABLE_LIVE_JOURNEY` or `EXPO_PUBLIC_ENABLE_LIVE_JOURNEY` until every material gate passes.
- **Final production deploy:** exact approved commit on Vercel, native signed production builds, deployed production GPS migration & matching JWT-protected Edge version, CDN/security headers, account-isolation negative tests, device logs and rollback evidence. Never assume a READY deployment alone proves that a customer can get an ETA.

## Evidence checklist

For each run retain: tested git SHA; staging function version and schema migration version; date/time SAST; summary pass/fail statuses without tokens; two device/OS build IDs; redacted Mapbox tile/Geocoding/Directions status codes and pricing acceptance; live cron retention success; cross-account negative cases; reviewer decisions; final production deployed SHA.

If no real test accounts or authenticated Edge access can be supplied, leave the tracking flags OFF and clearly report that end-to-end testing was not performed.
