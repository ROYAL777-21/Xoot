# Security Release Gate

Reviewed: 2026-07-09 23:24 SAST

Zoot cannot be marked production-ready until every required gate below is either passed with evidence or explicitly deferred with founder/legal risk acceptance.

## Mandatory Gates

| Gate | Required evidence | Status |
| --- | --- | --- |
| Web build integrity | `npm run lint`, `npm test`, `npm run build`, `npm run security:scan`, and GitHub Web build pass on merge candidate | Passing on `main` commit `d4e931c`; re-run before the next release candidate |
| Mobile preview integrity | Android and iOS preview/development builds install on real devices and pass auth/deep-link/widget smoke tests | Pending real-device smoke and iOS internal credentials |
| Supabase schema and migration health | Runtime schema smoke passes and production `MIGRATIONS_FAILED` metadata is repaired through guarded CLI flow | Pending live repair |
| Metadata drift controls | `npm run ops:readiness -- -Json`, `npm run seo:validate`, Supabase drift checks, and release docs agree with current `main` | Passing locally for source/article/docs; live Supabase repair still pending |
| Supabase Auth redirects | Local, staging, production, Expo, `zoot://auth/callback`, Google, and Apple redirects are configured and read back | Pending live configuration |
| Sensitive access | Zooter access works only for assigned booking and approved window; every reveal is logged; cancelled/completed behavior verified | Pending live role smoke |
| Payments and payouts | Stitch/Ozow callbacks verified, idempotent, reconciled, disabled controls intentionally enabled only after approval | Pending provider credentials and smoke |
| Communications | Twilio/Brevo setup verified, signed webhooks pass, operational messaging gates enabled only after approval | Pending provider setup |
| Concierge | Guest answers are useful, source-guided, non-fake; account actions require sign-in; reports/escalation work | Pending live function smoke |
| Load readiness | `npm run load:test:10k:staging` records p95 latency, p99 latency, error rate, and rate-limit behavior before any 10,000-request claim | Pending staging run |
| Domain and Cloudflare | Domain registered, Cloudflare zone active, TLS/WAF/rate limits/Turnstile configured and verified | Pending domain |
| Store readiness | Apple/Google app records, signing credentials, privacy/data-safety, account deletion, legal URLs, and review metadata complete | Pending external records |
| Legal readiness | Terms, Privacy, POPIA, Cookie, Refund, Care+, Zooter, AI Concierge, account deletion, and trust/legal copy reviewed | Drafts exist; legal review pending |

## Stop Conditions

- Any private secret is found in git, frontend, Expo bundle, logs, screenshots, docs, or PR comments.
- Frontend/mobile can mark payment successful, issue refunds, change payouts, or make admin mutations without an audited Edge Function.
- Sensitive household data appears in push, SMS, WhatsApp, email, widget, lock screen, public page, analytics, or Concierge output.
- Provider webhook verification cannot distinguish signed from unsigned or replayed events.
- Supabase migration repair plan proposes broad repair of known split/partial migrations.
- Store build is submitted before real-device auth, assistant, notification, and widget smoke tests pass.

## Approval Rule

Production launch requires a final release note linking:

- Current `blocker.md` with no unresolved launch blockers.
- Current `docs/PRODUCTION_COMPLETION_AUDIT.md`.
- Latest GitHub checks.
- Supabase runtime schema and Auth redirect verification.
- Provider signed smoke evidence.
- k6 staging evidence.
- Real-device mobile smoke evidence.
- Legal/store approval evidence.
