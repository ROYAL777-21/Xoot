# ASVS-Informed Verification Matrix

Reviewed: 2026-07-02

This matrix is informed by OWASP ASVS control themes, adapted to Zoot's architecture. It is not a certification claim and does not replace an external penetration test.

| Control area | Zoot implementation location | Test reference | Automated status | Manual review status | Risk | Owner | Known gap | Mitigation | Review date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Architecture and trust boundaries | `docs/security/trust-boundary-map.md`, `docs/security/master-threat-model-index.md` | Readiness guard and launch review | Partial | Required before launch | High | Engineering | External provider settings not all configured | Keep provider controls disabled until signed smoke tests pass | 2026-07-02 |
| Authentication | `src/pages/Auth.tsx`, `src/pages/AuthReset.tsx`, `supabase/config.toml` | `npm run config:check`, Auth redirect live verification | Partial | Required | High | Engineering | Live Supabase redirect allowlists and leaked-password protection pending | Configure through guarded script/dashboard and verify readback | 2026-07-02 |
| Session and credential handling | `mobile/src/lib/secure-storage.ts`, `src/lib/env.ts`, env templates | `npm run security:scan`, mobile config check | Partial | Required | High | Engineering | Real-device session lifecycle smoke pending | Run Android/iOS device smokes before store release | 2026-07-02 |
| Access control and RLS | Supabase migrations, `docs/security/rls-and-database-security-review.md` | Live Supabase verifier and role smoke | Partial | Required | Critical | Engineering | Production migration metadata repair and some live smokes pending | Use guarded CLI repair and role-based staging/prod smoke tests | 2026-07-02 |
| Input validation | Edge Functions, validators, booking state machine | `npm test`, function smoke tests | Partial | Required for new endpoints | High | Engineering | Provider smoke tests pending | Add signed/unsigned webhook and malformed-input tests per provider | 2026-07-02 |
| Stored and reflected XSS | React rendering, DOMPurify dependency, legal/blog content | Build/test/security scan | Partial | Required | Medium | Web | Full payload review pending | Run browser security review before production launch | 2026-07-02 |
| API and Edge Function security | `supabase/functions`, shared action utilities | Function unit/smoke tests | Partial | Required | Critical | Engineering | Live function smoke for several provider flows pending | Deploy and smoke in staging before enabling controls | 2026-07-02 |
| Webhook integrity | Twilio helpers, future payment callbacks, provider events | Signed/unsigned provider smoke | Partial | Required | Critical | Engineering/Finance | Payment/Twilio production callbacks not fully configured | Keep disabled until signed smoke tests pass | 2026-07-02 |
| File and storage security | Storage migrations, upload validation, storage review doc | Storage policy readback and smoke | Partial | Required | Critical | Engineering/Trust | Storage owner policies for private PDFs pending | Apply with correct owner role and verify private reads | 2026-07-02 |
| Sensitive data protection | `get-sensitive-access`, reveal components, mobile widgets | Unit tests and role/device smoke | Partial | Required | Critical | Trust/Engineering | Live role and device smoke pending | Smoke accepted/cancelled/completed bookings with real roles | 2026-07-02 |
| Payment and payout integrity | Payment functions, ledger rules, provider controls | Payment/payout integrity review and signed smoke | Partial | Required | Critical | Finance/Engineering | Provider credentials and approvals pending | Keep payment/payout controls disabled | 2026-07-02 |
| Logging and monitoring privacy | `src/lib/monitoring.ts`, Sentry/PostHog docs | Security scan and manual payload review | Partial | Required | High | Engineering/Ops | Final Sentry/PostHog production settings pending | Verify scrubbing and event allowlist before launch | 2026-07-02 |
| Mobile and deep-link safety | Expo app, native App Intents, Android shortcuts | Mobile typecheck, prebuild inspection, device smoke | Partial | Required | High | Mobile | Physical iOS/Android smoke pending | EAS development builds and device tests | 2026-07-02 |
| CI/CD and supply chain | GitHub Actions, lockfiles, secret scanner | GitHub checks, readiness guard | Passing locally/current PR | Review branch protection | High | Engineering | Dependency risk inventory needs regular refresh | Keep lockfile, cache/retry installs, secret scan, CodeRabbit review | 2026-07-02 |
| Operational recovery | Incident, rollback, continuity, data-integrity runbooks | Readiness guard and tabletop review | Partial | Required | High | Ops | Backup restore test not yet evidenced | Run restore/tabletop exercises before launch | 2026-07-02 |

## Release Rule

No row marked Critical or High may remain without either passing evidence or explicit founder/legal/finance risk acceptance before public production launch.
