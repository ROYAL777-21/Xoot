# Security Regression Matrix

Reviewed: 2026-07-02

| Control | Regression test or check | Command or evidence | Required before |
| --- | --- | --- | --- |
| No committed secrets | Secret scanner and manual diff review | `npm run security:scan` | Every PR and release |
| Frontend cannot write admin/outbox/payment state directly | Frontend-write guard | `node scripts/security/assert-no-frontend-admin-queue-writes.mjs` | Every PR |
| Public env is real and non-secret | Public env validation | `npm run config:check` | Web build |
| Web app does not regress | Lint, tests, build | `npm run lint`, `npm test`, `npm run build` | Merge/release |
| Mobile config is valid | Expo env/type checks | `npm run mobile:config:check`, `npm run mobile:typecheck` | EAS build |
| Supabase runtime schema is safe | Live verification SQL and advisors | `npm run ops:supabase:verify:live`, Supabase advisors | Staging/prod deploy |
| Auth redirect allowlists are correct | Dry-run and live config readback | `npm run ops:supabase:auth-config` with approved args | Auth/OAuth launch |
| Migration metadata repair is safe | Plan-only output and guarded live run | `npm run ops:supabase:repair-migrations -- -PlanOnly` then explicit repair | Closing Supabase migration blocker |
| Sensitive access window holds | Unit, Edge, and role smoke tests | `npm test`, `get-sensitive-access` staging smoke | Zooter launch |
| Booking state cannot skip states | Unit and Edge tests | `src/lib/booking-state-machine.test.ts`, function smoke | Booking launch |
| Provider webhooks reject forgery | Signed/unsigned smoke tests | Provider-specific smoke records | Provider activation |
| Concierge avoids fake actions | Unit/fallback and live smoke | Fallback tests, `support-respond` staging smoke | Public support launch |
| Native assistants are safe | Deep-link and device smoke | iOS/Android device checklist | Store submission |
| Load readiness is evidenced | k6 staging run | `npm run load:test:10k:staging` with staging env and stored summary | 10,000-request claim |
| Operations are replay-safe | Ops dashboard and outbox review | `/admin/ops`, outbox/dead-letter records | Automation activation |

## Failure Rule

If any required check fails, stop the release path, update `blocker.md`, and add a decision or runbook note when the failure changes the operating model.
