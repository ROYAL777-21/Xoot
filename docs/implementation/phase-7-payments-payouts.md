# Phase 7 - Payments And Payout Verification

Reviewed: 2026-06-30

## Status

Implemented locally as an inactive foundation.

This phase does not enable live customer checkout, payment success, Xooter payout release, Stitch, Ozow, or payout provider calls. Activation remains blocked until provider credentials, signed webhook tests, finance approval, legal approval, dashboard callback configuration, and staging smoke tests are complete.

## What Was Added

- `supabase/migrations/20260630005420_phase7_payments_payouts_foundation.sql`
  - `public.payment_provider_capabilities`
  - `public.payment_reconciliation_checks`
  - `public.zooter_payout_accounts`
  - `public.payout_change_requests`
  - `public.zooter_payout_holds`
  - `public.can_activate_payment_provider(provider, environment)`
  - `public.can_release_zooter_payout(zooter_id, booking_id)`
- `src/lib/operations.ts`
  - `canCreateProviderCheckout`
  - `buildPaymentReconciliationReference`
  - `canReleaseXooterPayout`
- `src/lib/operations.test.ts`
  - Hosted checkout stays blocked unless every provider gate is proven.
  - Reconciliation references are non-secret and deterministic.
  - Payout release stays blocked by missing verification, active holds, pending payout account changes, or trust/dispute review.

## Controls

The migration seeds these controls without activating providers:

- `payments.hosted_checkout.stitch` - disabled
- `payments.hosted_checkout.ozow` - disabled
- `payments.webhook_signature_required` - enabled
- `payments.reconciliation_required` - enabled
- `payouts.enabled` - disabled
- `payouts.account_change_step_up` - enabled
- `payouts.default_hold` - enabled

The existing `payments.provider_checkout` control remains the global provider-checkout gate.

## Security Rules

- Payment success is never trusted from frontend redirects or client state.
- Customer checkout must be provider-hosted and backend-confirmed.
- Provider webhook signatures or hashes must be verified server-side.
- Amount, currency and provider reference must reconcile before booking/payment state changes.
- Payout account records store hashes/references only, never raw bank account numbers or uploaded documents.
- Payout account changes require step-up verification and an audit trail.
- Payout release requires a verified account, enabled payout control, no pending payout account change, and no active hold.

## Activation Checklist

Before enabling this phase in staging:

1. Rotate any provider secrets that were pasted into chat.
2. Store Stitch/Ozow secrets only in Supabase Edge Function secrets or provider dashboards.
3. Configure provider callback URLs in Stitch/Ozow dashboards.
4. Run signed webhook smoke tests for successful, failed, duplicate and mismatched-amount events.
5. Verify `payment_reconciliation_checks` records matched and mismatched outcomes correctly.
6. Create a finance approval request and link it to `payment_provider_capabilities.approval_request_id`.
7. Enable only the staging provider-specific control after approvals.

Before enabling this phase in production:

1. Repeat the staging smoke tests against production callbacks.
2. Confirm legal and refund/cancellation policies are reviewed.
3. Confirm finance reconciliation owners and daily runbook.
4. Confirm payout hold period and dispute handling policy.
5. Confirm Xooter payout account verification workflow.
6. Enable provider controls only after founder, finance, legal and provider approval.

## Rollback

- Disable `payments.provider_checkout`, `payments.hosted_checkout.stitch`, `payments.hosted_checkout.ozow`, and `payouts.enabled`.
- Leave reconciliation and payout audit tables intact.
- Revert Edge Functions to the previous deployed versions if a provider callback deployment caused the issue.
- Mark affected provider events as `failed` or `ignored` with an audit reason rather than deleting evidence.
