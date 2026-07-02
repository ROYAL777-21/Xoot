# Edge Function And Webhook Threat Model

Reviewed: 2026-07-02

## Surfaces

- Authenticated app functions: booking creation, booking chat, sensitive access, Care+, ZootCred, admin actions, masked calls, invoice generation.
- Anonymous or provider-facing functions: `support-respond`, Concierge reports, Twilio webhooks, future payment webhooks.
- Shared libraries: action utilities, admin utilities, Twilio webhook verification, Turnstile verification, invoice helpers, Zoot knowledge.

## Threats

| Threat | Example | Required control |
| --- | --- | --- |
| Forged webhook | Attacker posts fake payment/Twilio callback | Signature verification, replay controls, provider event idempotency |
| Privilege escalation | Client invokes admin-like function | JWT validation, role lookup, typed action, audit log |
| Duplicate processing | Provider retries callback | Idempotency claim before mutation |
| Data leakage | Function returns full household/profile/payment data | Field allowlist and role/time checks |
| Prompt injection | User asks Concierge to reveal internal data | Source-bounded prompt, no tools, escalation |
| Secret exposure | Function logs provider tokens or service role | Redaction and no secret logs |

## Controls

- `verify_jwt=true` for authenticated functions unless provider/anonymous route requires otherwise.
- Anonymous functions must have their own abuse controls and must not perform sensitive mutations.
- Provider webhooks must return minimal errors and log redacted diagnostic data.
- Service-role usage is limited to functions that validate actor, target object, and action before mutation.
- Every payment, payout, admin, trust, and sensitive-access action needs an audit or immutable event.

## Verification

- Signed and unsigned webhook smoke tests for each provider.
- Unit tests for shared verification helpers.
- Edge smoke tests with client, Zooter, admin, and anonymous actors.
- Security scan for direct frontend writes and committed secrets.
