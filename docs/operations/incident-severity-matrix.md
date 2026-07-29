# Incident Severity Matrix

Reviewed: 2026-07-02

| Severity | Definition | Examples | Immediate action |
| --- | --- | --- | --- |
| SEV-1 Critical | Active or likely compromise of secrets, money, sensitive household data, production auth, or admin authority. | Service-role leak, payment webhook bypass, unauthorized gate-code exposure, production admin takeover, broad customer data exposure. | Freeze deploys, disable affected controls, revoke/rotate credentials, preserve evidence, notify founder/legal, start incident channel. |
| SEV-2 High | Confirmed customer-impacting security or integrity issue with contained blast radius. | Cross-user booking access, Xooter sees another booking, forged Twilio webhook accepted, invoice PDF visible to wrong user, admin action without audit. | Disable feature path, patch, run targeted verification, notify affected users if required, log root cause. |
| SEV-3 Medium | Abuse, reliability, or privacy weakness without confirmed sensitive compromise. | Rate-limit bypass, repeated provider delivery failures, bot scraping of public pages, excessive error detail, weak analytics redaction. | Add controls or rate limits, monitor, update tests, record decision. |
| SEV-4 Low | Non-sensitive defect or hardening gap. | Stale docs, minor UI disclosure risk, non-sensitive noisy logs, old failed CI run. | Triage into backlog, fix during next hardening cycle. |

## Escalation Triggers

- Payment, payout, refund, invoice, or provider callback ambiguity escalates to finance and engineering.
- Household access, client safety, theft, harassment, or contractor impersonation escalates to trust and safety.
- Legal, POPIA, public claims, AI disclosure, or store-review issues escalate to legal/founder review.
- Production deploy, migration repair, credential rotation, WAF blocking mode, and provider activation require explicit approval.

## Evidence Requirements

- Keep timestamps, affected user IDs, booking IDs, provider event IDs, Edge Function request IDs, Git commit, release/build ID, and actions taken.
- Do not paste secrets, gate codes, alarm codes, full ID documents, bank details, or private access notes into incident chat.
- Store final incident summary in an internal ops system or approved private document.
