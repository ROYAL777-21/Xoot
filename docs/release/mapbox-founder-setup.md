# Mapbox founder setup and acceptance — 21 October 2026

Use this guide for PR #71 private GPS/ETA and PR #81 service coverage. The founder approved Gauteng Province as intended operating geography and authorised implementation/staging tests. Production tracking, merge and release remain gated by real acceptance.

## Protected account setup

The signed-in Mapbox account is `don-pacho`. The connected Expo account is `don-pacho777`, project [@don-pacho777/zoot](https://expo.dev/accounts/don-pacho777/projects/zoot), EAS ID `b4c6e0b8-e2e7-40c5-b259-3b34c79be30b`. The repository slug now matches that existing project; installed Xoot names, bundle IDs and link schemes are preserved.

1. Open [Mapbox Access Tokens](https://console.mapbox.com/account/access-tokens/). For the initial staging connection, create a public token named **Xoot Staging Backend**, keep default public/read scopes, select no secret/admin/write scopes, and leave browser URL restrictions empty. Mapbox has no separate `geocoding:read` or `directions:read` secret scope to select. Dedicated tokens for each API/environment make later usage and rotation clearer.
2. Open [Zoot Staging Edge secrets](https://supabase.com/dashboard/project/fxmxyabdjqviqbcxmvlp/functions/secrets). Confirm project **Zoot Staging**, reference **fxmxyabdjqviqbcxmvlp**. The Supabase main-branch badge may say “PRODUCTION”; the project reference identifies the staging project. Actual Xoot production is **mvlrkelahhsyjrwgsxaf**.
3. Paste the token directly into the protected values for **MAPBOX_GEOCODING_TOKEN** and **MAPBOX_DIRECTIONS_TOKEN**, then Save. One dedicated staging backend token can initially serve both names; separate tokens are supported. The browser credential-entry policy requires the owner to complete credential creation/entry/submission. Never paste a value into chat, Git, screenshots or a shell command.
4. Check [Mapbox billing/settings](https://console.mapbox.com/account/settings/) and confirm Permanent Geocoding entitlement and Directions usage pricing. Coverage sends Geocoding v6 `permanent=true`; Mapbox documents a valid payment method or active enterprise contract as a prerequisite. Token presence alone does not prove entitlement. Temporary results must not be persisted as a workaround.
5. After saving, report only **keys saved**. Verify names/digests without displaying values, then run the authorised staging requests. Supabase Edge secrets are independent of Vercel and EAS.

At the 21 October dashboard inspection, both Mapbox server secret names were absent. Forms were prepared with the two names and empty masked values. No value was created, copied or submitted by the agent.

## Website and mobile keys

| Consumer | Exact setting | Destination |
| --- | --- | --- |
| Server coverage | `MAPBOX_GEOCODING_TOKEN` | Staging Supabase Edge secrets |
| Server GPS road ETA, including temporary address geocoding | `MAPBOX_DIRECTIONS_TOKEN` | Staging Supabase Edge secrets |
| Website maps/address assistance | `VITE_MAPBOX_PUBLIC_TOKEN` | Correct Vercel preview/production context |
| Native Mapbox SDK | `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN` | Correct EAS preview/production environment |

Use a separate public `pk.` token for native maps, without browser URL restrictions. Restrict the website's public token to the actual approved website/preview origins. Backend tokens remain server-side even if Mapbox calls their token type public. Never put a secret `sk.` token into `VITE_` or `EXPO_PUBLIC_`. Do not copy the existing Mapbox secret token into a client.

EAS preview currently lacks `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN`. The latest inspected Android preview build is from 13 July; the iOS artifact is a July simulator build. Neither represents these PRs. EAS reports no Apple team for this account. The owner must supply the Android/iPhone test devices and Apple Developer team/provisioning access; no device was selected or used without authorisation. Native maps require a real native build, not Expo Go.

## Genuine staging acceptance

Use **two distinct customers, two distinct approved active Xooters, and two synthetic accepted en-route bookings** in staging. Resolve every test JWT through staging Auth before any fixture write. Refresh tokens for one account do not count as separate identities. The acceptance harness now verifies four distinct non-anonymous Auth users and reports any uncertain cleanup.

The owner supplied two founder emails. Only the first was registered in staging at inspection and it had no Xooter profile; the second was absent. No account was created, role changed, contractor activated or verification badge granted. Normal user sign-in is still required; service-role impersonation and handcrafted JWTs do not prove real access.

For `scripts/ops/test-mapbox-private-journey-staging.mjs`, supply the following privately as process environment variables, never command-line literal values:

- `XOOT_TEST_STAGING_URL=https://fxmxyabdjqviqbcxmvlp.supabase.co`
- `XOOT_TEST_STAGING_ANON_KEY` (staging public key)
- `XOOT_TEST_CUSTOMER_A_JWT`, `XOOT_TEST_CUSTOMER_B_JWT`
- `XOOT_TEST_WORKER_A_JWT`, `XOOT_TEST_WORKER_B_JWT`
- `XOOT_TEST_BOOKING_A`, `XOOT_TEST_BOOKING_B` (distinct synthetic bookings)
- `XOOT_TEST_SYNTHETIC_CONSENT=YES`
- Both `XOOT_TEST_ADMIN_AAL1_JWT` and `XOOT_TEST_ADMIN_AAL2_JWT` for actual MFA-dispatch acceptance.

Run `node scripts/ops/test-mapbox-private-journey-staging.mjs`. This performs real authenticated Edge/provider requests and always attempts cleanup after publishing. Its offline identity tests are separate and are not real JWT evidence. The older three-identity `verify-live-mapbox-journey.mjs` runner covers a different acceptance subset; do not mix its variable names with this two-pair runner.

Coverage provider/geography unit tests use explicit offline doubles. Real authorised checks still need inside/outside Gauteng, wrong-country/low-quality address, missing/inactive zone, rate limit, provider 403/429/outage and latency, followed by both booking writers with the staging strict gate. Keep real billing requests behind confirmed entitlement. No active zone was created to bypass review.

## Release sequence and rollback

1. Review the pinned MDB/OCHA Gauteng source checksum, currency, exact polygon and service list; obtain an identified authorised boundary reviewer. The dormant candidate has no fabricated reviewer or date. Province eligibility never proves roster capacity.
2. Complete POPIA/security review of location notice/consent, Mapbox data transfer and SDK telemetry, retention, MFA dispatch and participant isolation.
3. Complete actual signed-in/provider checks, physical expiry, cancellation/reassignment, STOP during in-flight requests, offline/permission denial, and installed signed Android/iPhone acceptance. Record tested source and build IDs.
4. Reconcile production migration history with its live schema, dependencies and safety-PIN patch. Review a backup/restore and a narrowly ordered production plan. Never repair-stamp absent schema or run an indiscriminate migration push.
5. After those gates pass, review merge and a matched production schema/Edge/web/native release. Leave feature switches off until the production acceptance decision.

No production migrations, functions, credentials or flags were changed in this continuation. Source defaults for `VITE_ENABLE_LIVE_JOURNEY`, `EXPO_PUBLIC_ENABLE_LIVE_JOURNEY`, `VITE_VERIFIED_COVERAGE`, `EXPO_PUBLIC_VERIFIED_COVERAGE` and `XOOT_STRICT_GEO_COVERAGE` remain false. Remote production flag values were not decrypted in this task.

Staging rollback: keep client/server switches off; deactivate only the reviewed candidate if later activated; restore the prior JWT-protected function bundle if a deployment regression appears. Preserve schema/data for investigation rather than dropping tables. The initial candidate is inactive. Do not reapply migration `20261019185331` to staging: it is already recorded.

Official references: [Mapbox tokens](https://docs.mapbox.com/accounts/guides/tokens/), [Geocoding](https://docs.mapbox.com/api/search/geocoding/), [Directions](https://docs.mapbox.com/api/navigation/directions/), [Supabase Edge secrets](https://supabase.com/docs/guides/functions/secrets), [EAS environment variables](https://docs.expo.dev/eas/environment-variables/manage/).
