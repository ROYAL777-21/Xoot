# Security Decision Log

Reviewed: 2026-07-02

| Date | Decision | Rationale | Consequence |
| --- | --- | --- | --- |
| 2026-07-02 | Keep Supabase MCP read-only for inspection. | Reduces accidental production writes and matches the current safety model. | Live Auth config, migration repair, and storage policy work require Supabase CLI/dashboard with locally loaded credentials. |
| 2026-07-02 | Codex is the automation harness, not an unchecked production operator. | Agents need bounded authority and evidence loops. | Agents follow observe -> decide -> act -> verify -> learn and cannot self-approve sensitive actions. |
| 2026-07-02 | Do not use chat-pasted secrets for live writes or long-lived production use. | Chat exposure invalidates secret confidentiality. | Pasted secrets must be rotated and loaded locally through approved stores before use. |
| 2026-07-02 | Do not claim 10,000-request readiness without k6 staging evidence. | Build success is not load proof. | `npm run load:test` must run against staging with local env values and recorded results. |
| 2026-07-02 | Public website cannot be made completely unscrapable. | Public SEO content must remain crawlable. | Protect private data through RLS, Edge Functions, private storage, WAF/rate limits, and data minimisation. |
| 2026-07-02 | Keep SEO automation draft-first, including future WordPress. | Avoid fake claims, hallucinated local proof, and weak content. | Human editorial approval remains required before publish. |
| 2026-07-02 | Keep provider channels disabled until signed smoke tests pass. | Prevent real payments, messages, OTPs, calls, and cover flows from firing from unproven setup. | Operational controls stay off for Stitch, Ozow, Twilio, Brevo, KIE, and Zoot Black. |
| 2026-07-02 | Native widgets and assistants can open safe screens but not complete sensitive actions. | Voice and lock-screen surfaces are high-leakage contexts. | Booking/payment/account changes require in-app authenticated confirmation. |

## Review Rule

Any change to RLS, payment state, provider webhooks, admin actions, sensitive access, native assistant scope, or production deployment must add or update a decision here.
