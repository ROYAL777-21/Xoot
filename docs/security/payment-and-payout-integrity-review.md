# Payment And Payout Integrity Review

Reviewed: 2026-07-02

## Integrity Rules

- Payment success is never accepted from the browser or mobile app.
- Payment status changes require provider confirmation or verified provider webhook.
- Refunds, payouts, manual payment confirmation, and payout-account changes require audited admin actions and human approval.
- Provider events must be idempotent, signed, replay-aware where possible, and reconciled.
- XootCred debits must not create a negative available balance.

## Current State

Payment and payout controls are implemented as disabled-by-default foundations. They are not production-active until Stitch/Ozow credentials, callbacks, signed smoke tests, finance/legal approvals, and reconciliation runbooks are complete.

## Required Proof

| Flow | Required smoke |
| --- | --- |
| Checkout creation | Server creates provider session; frontend cannot forge success |
| Payment callback | Unsigned callback rejected; signed callback accepted once |
| Duplicate callback | Second callback is idempotent and does not duplicate ledger/invoice |
| Manual confirmation | Admin reason and audit log required |
| Refund/payout | Human approval and immutable event record |
| Invoice | Completed paid booking creates one immutable invoice and private PDF |

## Stop Conditions

- Any frontend path can set paid/completed/refunded/payout state.
- Any provider secret is present in frontend/mobile/CI logs.
- Any provider webhook accepts unsigned or replayed events.
- Any invoice PDF is publicly readable.
