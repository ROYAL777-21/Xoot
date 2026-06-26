# Zoot Production Blockers

Reviewed: 2026-06-26

This file now lists unresolved blockers only. Resolved implementation history lives in git commits and phase reports.

Canonical blocker file: `blocker.md`.

## Supabase

- Supabase MCP migration tools are currently unusable in this session. Listing migrations for staging `fxmxyabdjqviqbcxmvlp` and production `mvlrkelahhsyjrwgsxaf` both failed with `MCP startup failed: timed out handshaking with MCP server after 29.9999996s`.
- Local Supabase CLI is available through `npx supabase` but is not authenticated. `npx supabase projects list` fails because no access token is configured.
- `psql` and Docker are not installed on this Windows host, so direct database fallback and local Supabase reset/test fallback are unavailable.
- The accepted-job destination migration `20260624224551_accepted_zooter_job_destination.sql` is versioned and pushed, but live staging/production application still needs verification through an authenticated Supabase path.
- Live Supabase Auth redirect allowlists still need dashboard configuration. Local `supabase/config.toml` contains the intended redirect values, but the connector exposes no safe Auth redirect setter.

## Twilio

- The Twilio account still needs production readiness work: trial status must be removed, an approved phone number or ported number must be attached, and a WhatsApp sender must be approved.
- The existing Messaging Service classification must be corrected to transactional/operational use before customer or Zooter operational messages are sent.
- Regulatory registrations, sender verification, webhook assignments, and approved templates remain incomplete.
- Twilio credentials that were pasted into chat must be rotated before production.

## Mapbox

- Restricted Mapbox tokens are not configured.
- Required tokens remain:
  - browser token restricted to approved Zoot HTTPS origins;
  - native Expo token for iOS and Android builds;
  - secret downloads token stored only in EAS or CI for native SDK build access.

## Cloudflare

- The connected Cloudflare account currently has no Zoot zone.
- The available Cloudflare app/API permissions cannot create `zoothome.co.za`; the prior create attempt failed because the token lacks `account.zone.create`.
- WAF, bot/rate-limit rules, Turnstile, DNS, TLS, and origin protection cannot be activated until the zone exists and the token has the required scoped permissions.

## Apple, Google, Expo, And Stores

- Apple Team ID, App Store Connect app record, Google Play app record, Android signing fingerprints, store privacy declarations, and final legal/business metadata remain unavailable.
- EAS credentials and submit profiles still need final provider-backed credentials.
- Store submission cannot proceed until developer-console access, signing credentials, privacy/data-safety answers, account deletion URLs, support URLs, and legal review are complete.

## GitHub And CodeRabbit

- GitHub CLI is installed but unauthenticated. Local `gh auth status` reports no logged-in GitHub hosts.
- CodeRabbit CLI is installed and reports version `0.6.4`, but it is not authenticated.
- `coderabbit auth login --agent` is not usable on this Windows session because localhost callback and stdin fallback are unavailable.
- CodeRabbit review requires one of:
  - `coderabbit auth login --api-key <api-key>` using a key from an approved vault; or
  - installation of the CodeRabbit GitHub App on the repository.
- Local setup can now be retried with `scripts/ops/setup-local-provider-auth.ps1` once the approved local environment variables or browser logins are available.

## Provider Secrets And External Dashboards

- Real production secrets for Stitch, Ozow, Brevo, KIE, OpenAI, Airtable, Hostinger, Cloudflare, Sentry, Expo/EAS, Apple, Google, and Mapbox still need to be set in their correct secret stores.
- Do not paste these values into chat. Store private secrets only in Supabase Edge Function secrets, EAS secrets, GitHub/environment secrets, provider dashboards, or the approved password manager.

## Verification Still Needed After Unblocking

- Re-run staging migrations and migration history verification through an authenticated Supabase path.
- Apply the accepted-job destination migration to staging first, then production, and verify `get_zooter_job_cards()` returns destination addresses only after the assigned Zooter accepts the job.
- Configure Supabase Auth redirects in both environments and verify web, mobile, and OAuth callbacks.
- Deploy/redeploy Edge Functions after secrets are configured.
- Run `scripts/ops/setup-local-provider-auth.ps1`, `scripts/ops/set-github-public-vars.ps1`, `scripts/ops/deploy-staging-backend.ps1`, and `scripts/ops/set-supabase-edge-secrets.ps1` from a local shell that has the approved provider credentials in environment variables or browser sessions.
- Run `scripts/ops/verify-production-readiness.ps1 -IncludeExternal -RequireLive` after provider access is configured. It must pass before the production-readiness blockers can be closed.
- Run real staging smoke tests with client, admin, and Zooter users.
- Run CodeRabbit review once authenticated.
- Confirm Cloudflare WAF/rate-limit/Turnstile rules after the zone is added.
