# Staging Role Smoke Tests

Reviewed: 2026-06-28

These checks verify the Phase 1 role boundary with real staging users. They intentionally require local environment variables so no secrets or passwords are committed, printed, or pasted into chat.

## What It Tests

- Client, admin, and Zooter staging-only auth users can sign in.
- Client users cannot read admin-only operational controls.
- Admin users can read operational controls.
- Client users cannot receive Zooter job cards.
- Assigned Zooters can see the accepted job destination after accepting the job.
- Clients cannot reveal Zooter-only sensitive household access.
- Assigned Zooters can reveal approved sensitive access only through `get-sensitive-access`.
- Zooters receive the `sensitive_access_available` notification for the accepted job window.

## Current Staging State

On 2026-06-28, staging had zero auth users, zero profiles, zero admin roles, zero Zooter roles, zero bookings, and zero Zooter jobs. Real role smoke tests therefore cannot be run honestly until staging smoke users and fixtures are created.

## Safe Local Setup

Set these values in a local shell, password manager injection, or CI secret context. Do not place them in `.env`, docs, screenshots, commits, or chat.

```powershell
$env:ZOOT_ALLOW_STAGING_SMOKE = "true"
$env:ZOOT_STAGING_SUPABASE_URL = "https://fxmxyabdjqviqbcxmvlp.supabase.co"
$env:ZOOT_STAGING_SUPABASE_PUBLISHABLE_KEY = "<staging publishable key>"
$env:ZOOT_STAGING_SERVICE_ROLE_KEY = "<staging service-role key>"

$env:ZOOT_SMOKE_CLIENT_EMAIL = "client-smoke@<staging-test-domain>"
$env:ZOOT_SMOKE_CLIENT_PASSWORD = "<strong staging-only password>"
$env:ZOOT_SMOKE_ADMIN_EMAIL = "admin-smoke@<staging-test-domain>"
$env:ZOOT_SMOKE_ADMIN_PASSWORD = "<strong staging-only password>"
$env:ZOOT_SMOKE_ZOOTER_EMAIL = "zooter-smoke@<staging-test-domain>"
$env:ZOOT_SMOKE_ZOOTER_PASSWORD = "<strong staging-only password>"
```

## Run

```powershell
npm run ops:smoke:staging -- --all
```

The script refuses to run unless `ZOOT_ALLOW_STAGING_SMOKE=true` and the Supabase URL host is exactly `fxmxyabdjqviqbcxmvlp.supabase.co`.

Use `--seed` to create/update fixtures only and `--test` to test an existing fixture.

## Evidence

After a successful run, record the run date, staging project ref, and redacted output summary in `docs/implementation/`. Do not include emails, passwords, API keys, or sensitive household values.
