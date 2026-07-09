# Production Completion Audit

Reviewed: 2026-07-09

This file defines the evidence needed before the active Zoot goal can be considered complete. `blocker.md` lists unresolved blockers; this audit lists the proof gates that remain necessary even after blockers are closed.

Use `docs/release/production-command-center.md` as the index for source ownership, gate order, and founder inputs.

## Completion Gates

- Web app: required GitHub checks green on current `main`, with `npm run lint`, `npm test`, `npm run build`, `npm run security:scan`, and `npm run ops:readiness` passing on the release candidate.
- Mobile app: EAS Android and iOS preview or development builds install on real devices, auth works, protected routes work, assistant deep links open safe screens, and widget surfaces show no sensitive data.
- Supabase: production `MIGRATIONS_FAILED` branch metadata repaired through the guarded CLI flow, staging and production runtime schema smoke tests pass, Auth redirects are configured, and Edge Functions are deployed with required secrets.
- Security hardening: baseline inventory, trust boundary map, attack surface register, security decision log, regression matrix, incident severity matrix, continuity runbook, and release gate are current and linked from launch review.
- Load readiness: k6 staging evidence exists before any claim of 10,000-request readiness; failures include response status, p95 latency, and rate-limit behavior.
- Payments and communications: Stitch/Ozow/Twilio/Brevo/KIE paths remain disabled until signed provider smoke tests prove webhook verification, idempotency, audit logging, and no fake success states.
- Concierge: public answers are source-guided, guests get useful general help, account-specific actions require sign-in, and payment/refund/safety/legal/account-risk issues escalate to humans.
- Security: no private secrets in git, frontend, Expo bundle, public env files, screenshots, or logs; pasted secrets are rotated before production use.
- Legal and store readiness: South African legal review, POPIA notices, privacy/data-safety answers, account deletion flow, support URLs, App Store and Play records, Apple Team ID, signing credentials, and Android SHA fingerprints are complete.
- Operations: `/admin/ops` or equivalent ops dashboard shows outbox retries, dead letters, recent agent decisions, and manual replay gates.

## Current Agent Architecture Rule

Codex is the execution harness. Agents must run the loop `observe -> decide -> act -> verify -> learn`, with Supabase MCP kept read-only for inspection and live writes performed only through typed Edge Functions, audited admin actions, or Supabase CLI after approved credentials are loaded locally.
