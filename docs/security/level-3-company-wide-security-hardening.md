# Level 3 Company-Wide User-Data Security Hardening

Reviewed: 2026-07-11

Status: defined as a launch gate; not fully satisfied until live evidence is attached.

This document defines Zoot's Level 3 security standard for operating with real user data. It is stricter than a local implementation checklist: Level 3 requires repository controls, staging proof, live configuration readback, human approvals, and operational recovery evidence before any public production launch, paid provider activation, store submission, or broad customer data processing.

## Level Model

| Level | Meaning | Required proof |
| --- | --- | --- |
| Level 1 | Source controls exist in the repo. | Tests, lint, build, secret scan, policy docs, and fail-loud config checks pass locally and in CI. |
| Level 2 | Controls work in staging. | Staging migrations, RLS, Edge Functions, provider test webhooks, support flows, mobile builds, and role smoke tests pass without production data. |
| Level 3 | Controls are production-operable for user data. | Live readback proves configuration, runtime protections, incident recovery, monitoring, access review, and external-provider controls are in place. |

Zoot may continue preview and internal testing below Level 3. Zoot must not represent the platform, Concierge, mobile apps, payments, provider messaging, or support workflows as production-ready for real users until Level 3 is passed or a named founder/legal/finance risk acceptance explicitly defers a specific gate.

## Level 3 Required Controls

| Control | Required Level 3 evidence | Current status |
| --- | --- | --- |
| Data classification | Every user-data surface has a classification, owner, retention expectation, and public/private boundary. | Partial; inventory exists, live provider stores still need final review. |
| Identity and privileged access | Admin/internal accounts use MFA, least-privilege roles, audited role assignment, and no shared admin password. | Pending live admin account creation and access review. |
| RLS and object authorization | Client, Zooter, support, finance, and admin role smokes prove one user cannot read or mutate another user's data. | Pending live staging/prod role smoke. |
| Supabase configuration | Auth redirects, leaked-password protection decision, migration metadata health, storage policies, and Edge Function deployments are read back from staging and production. | Pending live Auth redirects, leaked-password protection, migration repair, private storage policies, and function smoke. |
| Sensitive household access | Access notes are revealed only to assigned Zooters in the approved time window and never in chat, analytics, notifications, widgets, emails, SMS, WhatsApp, or logs. | Pending live role/device smoke. |
| Payment and payout integrity | Frontend cannot fake success; provider callbacks are signed, idempotent, replay-aware, reconciled, and human-approved before enablement. | Pending provider credentials and signed smoke tests. |
| Communications integrity | Twilio/Brevo channels are transactional, signed, rate-limited, redacted, and disabled until provider dashboards and Edge secrets are verified. | Pending provider production setup and smoke tests. |
| Concierge safety | Concierge answers only from approved knowledge or safe account tools, cannot perform consequential actions, redacts sensitive input, and escalates high-risk issues to humans. | Local controls exist; live deployment, approvals, RLS smoke, privacy verification, and handoff tests pending. |
| Analytics and observability privacy | Sentry/PostHog payloads are allowlisted or scrubbed; no raw chat, address, access code, booking ID, payment reference, or support-case body is sent. | Local scrubbers/tests exist; production provider settings pending verification. |
| Secrets and provider credentials | Private keys are stored only in approved secret stores, chat-pasted secrets are rotated, and frontend/mobile bundles contain only public-safe variables. | Pending final rotation/readback for pasted and provider secrets. |
| Domain and edge protection | Domain, TLS, Cloudflare WAF/rate limits/Turnstile, bot controls, and origin protection are active without blocking approved SEO content. | Pending domain registration and Cloudflare zone. |
| Mobile and store safety | Android and iOS builds pass real-device auth, deep-link, assistant, widget, notification, and sensitive-data smoke tests before store submission. | Pending real-device tests and iOS internal credentials. |
| Load and abuse readiness | k6 staging run records 10,000-request evidence with latency, error-rate, and rate-limit behavior before any scale claim. | Pending live staging run. |
| Public ingress abuse resistance | Every unauthenticated Edge Function enforces a byte cap, accepted media types, signature or Turnstile controls where applicable, and fail-closed rate limiting before privileged work. | Repository guards and regression tests pass for all nine public functions; staging abuse/timeout smoke is pending. |
| Incident recovery | Backup restore, rollback, account-takeover, leaked-secret, payment-fraud, privacy-incident, and outage runbooks are tabletop-tested. | Runbooks exist; tabletop/restore evidence pending. |
| Metadata drift prevention | Branch/PR source map, Supabase drift allowlist, command evidence, blocker ledger, and release audit match current `main`. | Source controls pass locally; live Supabase metadata repair pending. |
| Agent and automation control | Agents follow observe -> decide -> act -> verify -> learn, cannot self-approve sensitive actions, and leave auditable decisions in ops review. | Repo rules exist; ops dashboard/live review still pending. |
| Vulnerability disclosure | Researchers have a restricted, rate-limited, privacy-safe reporting route with legal scope, named security reviewers, retention controls, and an emergency kill switch. | Repo route, schema, Edge Function, redaction, Turnstile gate, and runbook exist; legal/owner approval, staging deploy, and smoke evidence pending. |

## Company-Wide Invariants

- Clients, mobile apps, widgets, assistant shortcuts, and Concierge are never authoritative for prices, payments, refunds, payouts, booking state, roles, Care+, ZootCred, Booking Cover, contractor approval, or sensitive access.
- Public pages may be crawlable for SEO, but private data must be protected by RLS, private storage, audited Edge Functions, and provider-side controls.
- Sensitive household access, identity documents, bank details, payment details, trust incidents, and admin evidence never appear in public content, notifications, analytics, logs, support transcripts, widgets, or model prompts.
- Every production write path that affects money, trust, safety, identity, booking state, or user access must have server-side validation, audit records, rollback or reversal guidance, and a named owner.
- Every public Edge Function must reject oversized, compressed, malformed, or unexpected-media-type request bodies before parsing or privileged provider/database work.
- Payment webhook identity comes from exactly one verified provider-specific signature header. Request payloads cannot select their own provider or secret.
- Every launch claim must be backed by current evidence from the release candidate, not historical PR success.

## Level 3 Stop Conditions

Stop launch, store submission, production provider enablement, or public user-data processing if any of the following are true:

- `blocker.md` still contains unresolved launch blockers without explicit risk acceptance.
- Production branch metadata reports failed migrations or live schema drift is not explained by the approved drift allowlist.
- Supabase Auth redirects are not read back for web, mobile, OAuth, and deep-link flows.
- Any service-role key, database password, provider secret, private token, access code, payment detail, or ID document appears in git, public docs, frontend/mobile bundles, logs, screenshots, analytics, or chat transcripts.
- Concierge can disclose account data to an unauthenticated user or perform booking, payment, refund, Care+, ZootCred, Booking Cover, payout, admin, or sensitive-access actions.
- Payment/Twilio/Brevo/webhook paths are enabled without signed provider smoke evidence.
- Real-device mobile tests have not proved safe notification, widget, assistant, and deep-link behavior.
- Monitoring cannot detect failed auth spikes, webhook failures, provider delivery failures, suspicious booking activity, admin export attempts, support escalation failures, and privacy scrubber failures.

## Operating Cadence

Level 3 review is required:

- before production launch;
- before store submission;
- before enabling any production payment, payout, messaging, AI, or partner provider;
- after every Supabase migration repair or schema convergence;
- after any incident involving credentials, personal data, payment state, household access, or provider webhooks;
- at least quarterly after launch.

The Level 3 owner is Product and Engineering Reliability. Final launch acceptance must include founder approval and the relevant legal, finance, support, trust, and operations approvals for the gates they own.
