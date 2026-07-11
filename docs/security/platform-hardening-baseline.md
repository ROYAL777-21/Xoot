# Platform Hardening Baseline

Reviewed: 2026-07-11

This baseline records the current Zoot production-readiness posture before the next hardening phase. It is an evidence map, not a launch approval.

## Scope

- React/Vite website and browser web-app.
- Expo mobile app in `mobile/`.
- Supabase database, Auth, Storage, Realtime, and Edge Functions.
- Native iOS App Intents, Live Activities, widgets, Android assistant shortcuts, and Android widget scaffolding.
- GitHub Actions, EAS builds, CodeRabbit review, local ops scripts, and release runbooks.
- Provider integrations for Stitch, Ozow, Twilio, Brevo, KIE, OpenAI, Airtable, Hostinger, Cloudflare, Mapbox, PostHog, Sentry, and WordPress SEO.

## Current Evidence

| Area | Current state | Evidence |
| --- | --- | --- |
| Web build | Current PR build, lint, tests, scan, and mobile typecheck were green on the latest checked head. | GitHub checks and local verification records in `docs/PRODUCTION_COMPLETION_AUDIT.md`. |
| Mobile build | Android preview APK and iOS simulator archive exist; real-device smoke remains pending. | `blocker.md`, `docs/native/mobile-app-build.md`, `docs/native/native-widget-motion-system.md`. |
| Supabase runtime schema | App-runtime convergence migrations are present; production branch metadata still reports failed migration status. | `blocker.md`, `docs/implementation/live-schema-convergence-20260701.md`, `docs/implementation/supabase-migration-status-repair-20260630.md`. |
| Auth redirects | Local config defines intended redirect set; dashboard/live allowlists still need controlled apply and verification. | `supabase/config.toml`, `blocker.md`. |
| Secret handling | Secret scan exists and public env validation fails loudly; pasted secrets must still be rotated before production use. | `scripts/security/secret-scan.mjs`, `docs/SECRETS_INVENTORY.md`, `blocker.md`. |
| Observability privacy | Web and mobile monitoring scrub sensitive keys, free-text contact details, access-code phrases, street-address patterns, credential-like strings, and payment-like numbers before Sentry send. PostHog remains event-allowlisted with autocapture/session replay disabled. | `src/lib/monitoring.ts`, `mobile/src/lib/monitoring-privacy.ts`, `src/lib/mobile-monitoring-privacy.test.ts`, `src/lib/analytics.tsx`, `mobile/src/lib/analytics.tsx`. |
| Agent model | Codex is the harness and agents follow observe -> decide -> act -> verify -> learn. | `docs/AGENT_OPERATING_MODEL.md`. |
| Load readiness | k6 script exists; staging proof has not been run with live staging credentials. | `scripts/load/zoot-smoke.js`, `blocker.md`. |
| Level 3 user-data hardening | Zoot now has a company-wide Level 3 launch gate for systems that handle real user data. | `docs/security/level-3-company-wide-security-hardening.md`. |
| Vulnerability disclosure | A disabled-by-default public route and service-role-only security intake are implemented with Turnstile, hashed limits, redaction, audit events, and a triage runbook. | `src/pages/security/VulnerabilityDisclosure.tsx`, `supabase/functions/submit-security-report`, migration `20260710224500`, and `docs/operations/vulnerability-disclosure-triage-runbook.md`. |
| Public Edge ingress | All nine unauthenticated functions use byte-capped, content-type-checked body readers; payment callbacks bind provider identity to one provider-specific signature header; security disclosure binds Turnstile to its expected action. | `supabase/functions/_shared/request-body.ts`, `payment-webhook-auth.ts`, `scripts/security/assert-public-edge-ingress-limits.mjs`, and `src/lib/public-ingress-hardening.test.ts`. |

## Non-Negotiable Invariants

- Frontend and mobile clients are never authoritative for payment success, booking state, refunds, payouts, admin actions, verification decisions, Care+ state, ZootCred balances, or sensitive household access.
- Zooters may access approved household access data only from 45 minutes before scheduled start until 30 minutes after completion, and access is revoked immediately on cancellation.
- Sensitive household data, ID documents, bank details, provider secrets, service-role keys, and private admin/trust evidence are never sent to public clients, widgets, lock screens, public SEO content, or chat.
- Provider webhooks must be signature-checked, replay-aware where possible, idempotent, and audited.
- Agents can propose or queue sensitive work, but cannot self-approve production deploys, refunds, payouts, bans, legal claims, migration repair, or provider dashboard changes.
- Public marketing must remain crawlable, but sensitive data must be protected by RLS, Edge Functions, private storage, and provider-side controls instead of relying on obscurity.

## Immediate Hardening Gaps

- Production `MIGRATIONS_FAILED` metadata needs guarded repair through the CLI with locally loaded rotated credentials.
- Supabase Auth redirect allowlists need live configuration and verification.
- Leaked password protection needs plan-supported enablement or explicit launch risk acceptance.
- Domain registration is absent, blocking Cloudflare zone, WAF, Turnstile restrictions, OAuth origins, AASA, assetlinks, email DNS, and store URLs.
- Real-device Android and iOS smoke tests remain pending.
- Provider channels remain disabled until credentials, callbacks, signatures, and smoke tests are complete.
- k6 staging evidence is required before any 10,000-request readiness claim.

## Baseline Decision

The repo is suitable for continued controlled hardening and preview testing. It is not yet approved for production launch, paid provider activation, broad public communications, store submission, or sensitive live customer operations.

Level 3 company-wide user-data hardening is defined, but not fully passed until every live evidence item in `docs/security/level-3-company-wide-security-hardening.md` is satisfied or explicitly risk-accepted.
