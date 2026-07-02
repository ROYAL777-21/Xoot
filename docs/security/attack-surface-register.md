# Attack Surface Register

Reviewed: 2026-07-02

| ID | Surface | Primary risks | Existing controls | Remaining hardening |
| --- | --- | --- | --- | --- |
| AS-001 | Public website and article routes | Scraping, fake SEO claims, XSS, credential stuffing entry points | Static build, legal pages, SEO validation, secret scan | Cloudflare zone, WAF/rate limits, Turnstile on abuse-prone anonymous flows |
| AS-002 | Auth and password flows | Account takeover, weak/leaked passwords, redirect abuse | Autocomplete, generated strong passwords, fail-loud env checks | Supabase leaked-password protection, live redirect allowlist verification, MFA for admins |
| AS-003 | Booking flow | Price tampering, state skipping, fake payment completion | Booking state machine, Edge Functions, config guards | Provider-backed payment smoke tests and role-based booking smoke tests |
| AS-004 | Zooter job acceptance | Premature address/access exposure, impersonation | Job-card Edge Function, accepted-job address migration, sensitive access window | Real participant smoke tests and device verification |
| AS-005 | Household sensitive access | Gate/alarm/access code leakage | `can_access_sensitive_data`, reveal component, access logs | Live storage policy owner updates and signed smoke tests |
| AS-006 | Admin operations | Unreviewed data mutation, missing audit, role abuse | Typed admin actions, `admin_audit_log`, admin docs | Admin MFA enrollment and production admin account ceremony |
| AS-007 | Concierge bot | Hallucinated claims, data leakage, prompt injection, unsafe actions | Deterministic fallback, company knowledge, report function, escalation rules | Live function deployment, Turnstile/domain controls, signed smoke tests |
| AS-008 | Payments and payouts | Forged callbacks, fake success, duplicate invoices, payout fraud | Disabled operational controls, idempotency plans, invoice snapshots | Provider credentials, signed webhooks, legal/finance approvals |
| AS-009 | Twilio SMS/WhatsApp/voice | Spam, trial restrictions, unsafe routine WhatsApp, forged webhooks | Webhook functions, signature helpers, disabled controls | Production sender, transactional classification, regulatory approvals, smoke tests |
| AS-010 | File uploads and storage | Malware, public documents, overbroad bucket access | Upload validation, private bucket plans | Storage owner policy deployment and periodic bucket audit |
| AS-011 | Mobile deep links and assistants | Unsafe action from speech/deep link, data disclosure | Safe route allowlist, App Intents/shortcuts, no sensitive widget text | Physical device tests, app association files with final IDs/fingerprints |
| AS-012 | Native widgets and Live Activities | Lock-screen leakage, stale sensitive state | Public-safe widget content and deep links | Real-device review and cancellation/completion sanitization tests |
| AS-013 | Analytics and monitoring | PII leakage, replay exposure, noisy alerts | Sentry scrubber, analytics contract docs | Final PostHog/Sentry project policies and data retention review |
| AS-014 | CI/CD and dependencies | Supply-chain compromise, network flakes, leaked artifacts | Lockfile check, retrying npm install, secret scan, CodeRabbit/GitHub checks | Dependency audit cadence, protected branch rules, store-signing controls |
| AS-015 | Supabase migration history | Drift, unsafe repair, production metadata failure | Guarded repair planner, MCP read-only rule | Live repair with local rotated credentials and split-migration review |

## Priority

1. Fix live Supabase Auth redirects and migration metadata safely.
2. Complete domain/Cloudflare setup after domain registration.
3. Run staging k6 and role-based smoke tests.
4. Complete provider dashboard setup and signed webhook smokes.
5. Complete mobile real-device smoke and store credential readiness.
