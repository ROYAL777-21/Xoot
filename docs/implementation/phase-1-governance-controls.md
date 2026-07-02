# Phase 1 Governance Controls

Reviewed: 2026-06-28

This note records the next Phase 1 implementation slice: backend-owned feature flags, kill switches, provider event idempotency, approval requests, rate-limit primitives, agent contracts and analytics privacy contracts.

## Live Rollout Evidence

- Staging applied via Supabase connector on 2026-06-27 as migration `20260627094915_phase1_governance_controls`.
- Production applied via Supabase connector on 2026-06-27 as migration `20260627095149_phase1_governance_controls`.
- Zooter job-card RPC service-boundary fix applied as `20260627101824_zooter_job_cards_service_boundary` in staging and `20260627102231_zooter_job_cards_service_boundary` in production.
- Governance advisor follow-up applied as `20260627103053_governance_advisor_followups` in staging and `20260627103118_governance_advisor_followups` in production.
- Staging governance smoke tests passed on 2026-06-27 for duplicate provider-event claim handling, rate-limit exhaustion, admin-read policy presence and disabled-by-default provider gates.
- Production governance smoke tests passed on 2026-06-27 for duplicate provider-event claim handling, rate-limit exhaustion, admin-read policy presence and disabled-by-default provider gates.
- Both live applications were additive only and did not activate provider checkout, OpenAI fallback, Twilio sends, Care+ checkout, or native voice booking.
- Follow-up advisor cleanup applied through `supabase/migrations/20260627103000_governance_advisor_followups.sql` to add governance FK indexes and avoid per-row auth re-evaluation in governance admin-read policies.
- Edge adoption added on 2026-06-27:
  - payment webhooks claim and close `private.claim_provider_event(...)` records before payment side effects;
  - Twilio webhooks claim and close `private.claim_provider_event(...)` records before review-queue side effects;
  - Concierge/support calls use `private.consume_rate_limit(...)` for guest and signed-in request windows;
  - OpenAI fallback is gated by `support.openai_fallback`, which remains disabled by default;
  - `admin-control-management` provides an audited admin-only control update path with required reasons and approval records.
- `admin-control-management` deployed to staging and production through the Supabase connector on 2026-06-27 with JWT verification enabled.
- `support-respond` redeployed to staging and production through the Supabase connector on 2026-06-27 with the Phase 1 rate-limit and OpenAI fallback gate helpers.
- `confirm-payment` redeployed to staging and production through the Supabase connector on 2026-06-27 with Phase 1 provider-event idempotency helpers.
- Twilio webhook functions redeployed through the Supabase connector on 2026-06-28 with JWT verification disabled for Twilio compatibility and request signature validation/idempotency enforced in function code:
  - staging: `twilio-message-webhook` v6; `twilio-whatsapp-webhook`, `twilio-status-callback`, `twilio-voice-webhook`, and `twilio-verify-webhook` v5.
  - production: `twilio-message-webhook`, `twilio-whatsapp-webhook`, `twilio-status-callback`, `twilio-voice-webhook`, and `twilio-verify-webhook` v5.

## Added Artifacts

- Migration: `supabase/migrations/20260627090000_phase1_governance_controls.sql`
- Migration: `supabase/migrations/20260627103000_governance_advisor_followups.sql`
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
| `public.agent_action_contracts` | Machine-readable action boundaries for Concierge, native assistants and future Codex harness agents. | Admin read only. |
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

1. Verify tables, policies and functions exist in both live environments using `npm run ops:supabase:verify:live`.
2. Update Edge Functions to use `private.claim_provider_event(...)` before payment, Twilio, Brevo, Expo or OpenAI side effects.
3. Keep provider-facing controls disabled until provider dashboards, secrets and legal approvals are complete.

## Rollback

This migration is additive. If rollback is needed before any Edge Function depends on the new contracts, drop the newly created tables and private helper functions. After Edge adoption, prefer a forward fix by disabling relevant `operational_controls` rows and reverting Edge Functions to the previous release.

## Remaining Phase 1 Work

- Run signed Twilio webhook smoke tests after live Twilio dashboard channel setup and current approved Edge secrets are verified.
- Connect PostHog only after event contracts and privacy settings are approved.
- Run role-based staging and production smoke tests with real client, admin and Zooter users before considering this phase closed.
