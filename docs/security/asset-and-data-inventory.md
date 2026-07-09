# Asset And Data Inventory

Reviewed: 2026-07-02

This inventory identifies what Zoot protects, where it lives, and which controls must apply.

## Critical Secrets And Privileges

| Asset | Location | Exposure rule | Required control |
| --- | --- | --- | --- |
| Supabase service-role key, secret API key, database password, CLI token | Provider dashboard, local ops shell, Supabase Edge secrets where needed | Never in frontend, Expo, git, screenshots, logs, or chat | Rotate pasted values; store in password manager or secret store; use only for audited live operations |
| Payment provider secrets and webhook secrets | Stitch/Ozow dashboards and Edge Function secrets | Never public | Signed webhook verification, idempotency, audit trail, disabled controls until smoke tested |
| Twilio/Auth/Verify/API secrets | Twilio dashboard and Edge Function secrets | Never public | Signature checks, redaction, operational-message gates |
| Brevo/KIE/OpenAI/Airtable/Hostinger/Cloudflare/Mapbox private tokens | Provider dashboards, CI/EAS/Supabase secret stores | Never public | Least privilege, rotation, environment separation |
| Apple/Google/EAS signing and submission credentials | Apple, Google, EAS credential stores | Never in repo | Owner-controlled access, app records, privacy declarations, signing fingerprints |

## Sensitive User And Operations Data

| Data class | Examples | Authoritative system | Minimum control |
| --- | --- | --- | --- |
| Household access | Gate codes, alarm codes, lockbox codes, parking, access instructions, pet entry notes | Supabase private tables and `get-sensitive-access` | Zooter assignment, time window, access log, no push/email/widget disclosure |
| Identity and screening | ID documents, selfies, background-check files, review notes | Private storage and admin/Zooter onboarding tables | Private buckets, signed access, staff role gates, audit logs |
| Payment and payout | Provider references, invoices, payout decisions, refunds | Edge Functions, payment provider, ledger tables | Provider confirmation only, no frontend success, immutable audit records |
| Booking and property | Addresses, property profiles, booking state, chat, instructions | Supabase tables and Edge Functions | RLS ownership, state machine, message safety filters |
| Support and trust | Complaints, safety issues, escalations, Concierge reports | Support tables and admin queue | Role-scoped access, human escalation, redaction |
| Analytics and monitoring | Events, errors, session metadata | PostHog, Sentry, local logs | PII minimisation, scrubbers, opt-in where required |

## Public Or Public-Safe Data

- Published website pages, approved articles, public legal pages, and public marketing assets.
- Intentionally public Zooter profile fields exposed through public-safe views.
- Public Supabase publishable key, public Sentry DSN, public PostHog project token, public Mapbox browser token, and public Turnstile site key only when restricted and non-secret.

## Data Retention Baseline

| Data | Baseline |
| --- | --- |
| Household access notes | Retain only while operationally needed; revoke Zooter visibility at booking end or cancellation. |
| ID and screening evidence | Retain only under approved contractor-screening policy; restrict export and review quarterly. |
| Booking records | Retain for operations, disputes, invoices, trust, and legal obligations. |
| Support and trust incidents | Retain per severity and legal risk; redact where possible. |
| Bot transcripts | Do not store secrets or access codes; escalation records should keep only needed context. |
| Logs | Exclude secrets, OTPs, gate codes, alarm codes, full documents, and raw payment secrets. |

## Open Inventory Gaps

- Final domain, registrar, and Cloudflare zone are not available.
- Production WordPress host and editorial workflow are not provisioned.
- Final payment, communications, monitoring, and store credentials remain external blockers.
- Legal retention periods need South African legal review before launch.
