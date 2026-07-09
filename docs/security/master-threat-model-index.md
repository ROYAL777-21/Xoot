# Zoot Master Threat Model Index

Reviewed: 2026-06-24
Owner: Product and Engineering Reliability

## Security Objectives

1. Prevent unauthorized access to household, identity and financial data.
2. Prevent frontend or agent control of prices, payment state, booking state, ZootCred, Care+ or contractor verification.
3. Preserve traceability for admin and automated actions.
4. Reject forged, replayed or duplicate provider events.
5. Keep public marketing crawlable while limiting abuse.
6. Preserve safe rollback and environment isolation.

## Trust Boundaries

| Boundary | Untrusted side | Trusted side | Required control |
| --- | --- | --- | --- |
| Browser/Expo to Supabase | public client | RLS and authenticated Edge Function | publishable key only, JWT validation, ownership checks |
| Provider webhook to Zoot | internet/provider request | Edge Function/service role | exact signature, timestamp/replay controls, idempotency |
| Edge Function to database | function input | service-role mutation | typed action, validation, audit event, least privilege |
| Admin UI to backend | admin browser | typed admin function | role, MFA, reason, audit record |
| Zooter to household data | contractor device | sensitive access function | assignment, time window, field allowlist, access log |
| Concierge to OpenAI | redacted low-risk text | optional model response | feature flag, redaction, cost/rate limit, no tools |
| CI/EAS to providers | build pipeline | signing and deploy systems | scoped secrets, protected environments, approvals |
| Cloudflare to origin | public traffic | Hostinger/origin | proxied DNS, TLS, WAF, rate limit, origin restriction |
| Siri/Android assistant to app | spoken request | validated deep link | allowlist, safe parameters, in-app confirmation |

## Asset Register

### Critical

- Supabase service-role and secret keys.
- Database passwords and access tokens.
- Stitch/Ozow signing secrets and payment records.
- Apple/Google signing credentials.
- Zooter identity and banking evidence.
- household access codes and instructions.
- admin roles and audit records.

### Sensitive

- names, phone numbers, email and addresses;
- bookings and service history;
- support and trust incident details;
- location and tracking data;
- ZootCred and Care+ state;
- push tokens and device metadata.

### Public

- marketing pages and approved articles;
- intentionally public Zooter profile fields;
- public Mapbox web token with URL restrictions;
- Sentry DSN;
- Supabase publishable key.

## Threat Index

| ID | Threat | Current control | Gap | Target phase |
| --- | --- | --- | --- | --- |
| TM-001 | Client changes payment status | Edge Function intent exists | production owner `ALL` policy and schema divergence | Phase 1 |
| TM-002 | Client manipulates ZootCred | ledger and trigger in staging | production owner `ALL` policy | Phase 1 |
| TM-003 | Client changes Care+ state | Edge Functions exist | duplicate activation paths and broad production policy | Phase 1 |
| TM-004 | Booking state bypass | state machine copies exist | legacy production enum and direct update policy | Phase 1 |
| TM-005 | Forged payment webhook | HMAC check | provider-specific algorithms and replay controls missing | Phase 7 |
| TM-006 | Duplicate provider event | some idempotent responses | no central provider event/idempotency registry | Phase 1 |
| TM-007 | Forged Twilio webhook | signature validation and redacted log | provider resources not assigned, credentials exposed in chat | Phase 9 |
| TM-008 | OTP abuse | Twilio Verify service exists | no application flow, cooldown, rate limit or Turnstile | Phase 9 |
| TM-009 | Phone number exposure | masked-call Edge Function intent | no number/proxy resource or token eligibility verification | Phase 9 |
| TM-010 | Household code exposure | sensitive access function and private storage | production schema/policy parity and device tests required | Phase 1/2 |
| TM-011 | Cross-booking chat access | booking RLS in staging | duplicate policies and production divergence | Phase 2 |
| TM-012 | Support prompt injection/data leakage | sanitization and deterministic knowledge | no Turnstile, central limiter or complete PII scrub | Phase 1/5 |
| TM-013 | OpenAI uncontrolled action | no tools and escalation rules | fallback enabled by key presence, no kill switch | Phase 1/5 |
| TM-014 | Admin action without audit | typed functions and audit table | `ops-workflow` retains broad responsibilities; MFA absent | Phase 1 |
| TM-015 | Public scraping/credential stuffing | static headers and noindex on private routes | no Cloudflare zone/WAF/rate limits | Phase 1 |
| TM-016 | Mapbox token abuse | env separation | no restricted tokens configured | release track |
| TM-017 | Secret committed to git | secret scan | previously pasted secrets require rotation | immediate operational gate |
| TM-018 | Store signing compromise | no credentials exist | credential ownership and rotation policy missing | release track |
| TM-019 | Malicious native deep link | route allowlist and sanitization | association files cannot be signed without IDs/fingerprints | Phase 10 |
| TM-020 | Sensitive lock-screen disclosure | safe Live Activity source | not compiled or device-tested | Phase 10/release |
| TM-021 | Analytics PII leakage | limited Sentry initialization | no centralized scrub and no PostHog contract | Phase 1 |
| TM-022 | Agent exceeds authority | docs describe agents | no machine-enforced approval or action contract | Phase 1/11 |
| TM-023 | Outbox tampering | staging RLS hardening | production owner `ALL` policy | Phase 1 |
| TM-024 | Invoice duplication or public PDF | no invoice implementation | full immutable/idempotent architecture missing | Phase 4 |
| TM-025 | Supply-chain dependency compromise | lockfiles and CI checks | routine dependency audit policy missing | Phase 1 |

## Required Phase 1 Security Artifacts

- feature flag and kill-switch schema;
- approval request schema;
- provider idempotency/event schema;
- privacy-safe analytics event contract;
- Sentry scrubber;
- rate-limit and Turnstile verification helper;
- RLS role matrix;
- production reconciliation migration;
- key rotation register;
- admin MFA enforcement plan;
- environment access matrix.

## Cloudflare Baseline Plan

Do not activate until the domain zone and origin are approved.

Proposed controls:

1. Proxy public DNS through Cloudflare.
2. Full strict TLS.
3. Managed WAF rules.
4. Challenge suspicious automated traffic.
5. Rate-limit auth, support, Concierge and write-heavy paths.
6. Turnstile on anonymous support/Concierge and abuse-prone forms.
7. Block direct origin access where hosting allows.
8. Preserve crawlability for approved public pages.
9. Exclude static hashed assets from unnecessary challenges.
10. Review security events before changing rules from challenge to block.

## Incident Severity

| Severity | Example | Required response |
| --- | --- | --- |
| Critical | service-role leak, payment mutation, household code exposure | kill switch, credential rotation, containment, founder/legal notification |
| High | cross-user data access, forged webhook accepted, admin takeover | disable module, preserve evidence, patch and verify |
| Medium | rate-limit bypass, excessive error data, provider delivery abuse | contain route, tune controls, monitor |
| Low | public content scraping, non-sensitive enumeration | rate limit or cache controls without harming SEO |

## Review Cadence

- before every phase;
- after every RLS or provider webhook change;
- before staging external traffic;
- before TestFlight or Play internal testing;
- before production launch;
- quarterly after launch.
