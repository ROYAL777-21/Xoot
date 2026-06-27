# Phase 1 Governance Controls

Reviewed: 2026-06-27

This note records the next Phase 1 implementation slice: backend-owned feature flags, kill switches, provider event idempotency, approval requests, rate-limit primitives, agent contracts and analytics privacy contracts.

## Added Artifacts

- Migration: `supabase/migrations/20260627090000_phase1_governance_controls.sql`
- Client monitoring scrubber: `src/lib/monitoring.ts`
- Readiness checks: `scripts/ops/verify-production-readiness.ps1`

## Database Contracts

| Table/function | Purpose | Client access |
| --- | --- | --- |
| `public.operational_controls` | Server-read feature flags, kill switches, provider gates and release gates. | Admin read only. Writes through service-role/admin tooling only. |
| `public.approval_requests` | Auditable approval queue for provider activation, release gates and high-risk actions. | Admin read only. |
| `public.provider_events` | Central webhook/provider idempotency registry. | Admin read only. Edge Functions claim events before side effects. |
| `private.claim_provider_event(...)` | Service-role helper that detects duplicate provider events. | Service role only. |
| `private.mark_provider_event_processed(...)` | Service-role helper that records provider event outcome. | Service role only. |
| `public.rate_limit_events` | Hashed actor counters for anonymous and authenticated rate limits. | Admin read only. |
| `private.consume_rate_limit(...)` | Service-role helper for fixed-window rate limits. | Service role only. |
| `public.experiment_registry` | Approved experiment and metric-owner registry. | Admin read only. |
| `public.agent_action_contracts` | Machine-readable action boundaries for Concierge, native assistants and future Hermes agents. | Admin read only. |
| `public.analytics_event_contracts` | PostHog/Sentry privacy contracts and allowed property lists. | Admin read only. |

## Default Controls

All provider and AI expansion controls remain disabled by default:

- `payments.provider_checkout`
- `support.openai_fallback`
- `twilio.operational_messages`
- `care_plus.checkout`
- `native.voice_booking_prefill`

The sensitive-access kill switch is seeded as enabled because sensitive access is already intentionally implemented, but it is now centrally visible as a kill-switch control.

## Rollout

1. Apply to staging first.
2. Verify tables, policies and functions exist.
3. Smoke-test duplicate provider event claims with a staging service-role session.
4. Smoke-test rate-limit exhaustion with hashed test actors only.
5. Update Edge Functions to use `private.claim_provider_event(...)` before payment, Twilio, Brevo, Expo or OpenAI side effects.
6. Apply to production after staging verification and founder/security approval.

## Rollback

This migration is additive. If rollback is needed before any Edge Function depends on the new contracts, drop the newly created tables and private helper functions. After Edge adoption, prefer a forward fix by disabling relevant `operational_controls` rows and reverting Edge Functions to the previous release.

## Remaining Phase 1 Work

- Wire provider webhook functions to `private.claim_provider_event(...)`.
- Wire anonymous Concierge and support paths to `private.consume_rate_limit(...)`.
- Add an approved admin-only control-management Edge Function.
- Connect PostHog only after event contracts and privacy settings are approved.
- Run role-based staging smoke tests before considering this phase closed.
