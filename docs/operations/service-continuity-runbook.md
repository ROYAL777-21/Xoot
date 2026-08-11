# Service Continuity Runbook

Reviewed: 2026-07-02

This runbook defines how Xoot keeps core operations safe during provider, deployment, database, or automation failures.

## Core Principles

- Fail closed for payments, payouts, provider messages, sensitive access, admin mutations, and verification decisions.
- Keep public marketing online where possible, but disable unsafe interactive paths rather than guessing.
- Prefer in-app status and support routing over external channels when Twilio/Brevo/provider setup is impaired.
- Preserve evidence before retrying failed automations.

## Failure Modes

| Failure | Customer-safe behavior | Operator action |
| --- | --- | --- |
| Supabase Auth redirect misconfiguration | Show sign-in error and support path; do not bypass auth | Verify `supabase/config.toml`, run auth-config dry-run, apply only with approved project ref/site URL |
| Supabase migration metadata failure | Do not run broad `db push`; keep runtime schema verification separate from metadata repair | Run plan-only repair, review split migrations, live repair only with local rotated credentials |
| Edge Function deploy failure | Keep affected feature disabled or show retry/escalation | Roll back function, inspect logs, smoke test staging before production |
| Payment provider outage | Do not mark payment successful; show pending/payment retry state | Queue reconciliation, verify provider dashboard, avoid manual confirmation without audit |
| Twilio/Brevo outage | Keep in-app notifications as source; avoid duplicate external sends | Inspect outbox, retry only idempotent messages, do not replay unknown signed events |
| Concierge model outage | Use deterministic fallback and escalation | Keep OpenAI fallback optional; never invent answers |
| Cloudflare/domain unavailable | Use staging/local preview only; do not claim production readiness | Register domain, create zone, verify DNS/TLS/WAF before launch |
| Mobile build failure | Keep web app available; do not submit stale binaries | Review EAS logs, rebuild preview, real-device smoke before release |
| k6/load failure | Do not claim capacity readiness | Capture p95, error rate, bottleneck, and mitigation plan |

## Safe Recovery Flow

1. Identify the failing service and affected user journey.
2. Disable the smallest unsafe feature flag or operational control.
3. Preserve logs and outbox/dead-letter rows.
4. Patch or reconfigure in staging first.
5. Run the relevant smoke test and regression check.
6. Re-enable only after evidence is recorded.
7. Update `blocker.md`, the decision log, or the release gate if readiness changes.

## Customer Communication Rules

- Be specific about the affected feature and safe next step.
- Do not disclose internal provider secrets, stack traces, gate codes, security details, or other users' data.
- For payment or safety incidents, escalate to human support.
- For provider delays, avoid promises about exact resolution time unless confirmed.
