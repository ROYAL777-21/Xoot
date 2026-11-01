# Bounded Care+ delivery contract — 1 November 2026

The current request writes a pending payment and subscription separately, without a provider
reference or reliable linkage. Checkout and callback settlement currently accept bookings only.
Client activation inserts a second active subscription and grants R30 outside one transaction.
These are implementation gaps, not missing founder approval to implement.

The replacement must:

1. Read current live schema/constraints and real plan values before DDL. Keep R99/month, the
   opening free-month rule and one-time non-onboarding-trial R30 credit consistent with locked facts.
2. Serialize one account's membership lifecycle through one private control row. Create the
   subscription/payment/reference/link/outbox atomically, acknowledge exact pending retries and
   fail closed for ambiguous old rows; do not delete or infer paid legacy entitlements.
3. Bind settlement to the owned canonical subscription, plan, ZAR amount and verified provider
   event/reference/transaction. Admin settlement requires the current actual AAL2 session and
   recorded reason. Share provider transaction uniqueness with booking settlement, including races.
4. Commit payment state, membership period, immutable receipt, one-time welcome grant and
   deduplicated operational/email events together. A retry cannot extend a period or re-grant credit.
5. Make client activation reconciliation-only. A paid status alone cannot create a membership.
   Null/expired periods never grant perks; cancellation/renewal use the same lifecycle authority.
6. Keep automatic recurring charges closed until an accepted real provider mandate, cycle mapping,
   cancellation/past-due and signed duplicate/out-of-order notification tests exist. Do not substitute
   an R30-per-cycle draft rule for the one-time commercial fact.
7. Keep the UI truthful: distinguish an opening trial, pending checkout, confirmed membership and
   expired/past-due state. A saved request is not a successful charge or active membership.

Validation must include actual SQL rollback/concurrency, callback amount/owner/event/transaction
tampering, duplicate request/settlement/reconciliation, cross-kind transaction replay, current MFA,
trial/welcome exclusions, cancelled/expired periods and real authorised staging JWT/provider tests.
Apply reviewed migrations before function bundles, regenerate actual production types before
clearing the schema gate, and retain all payment/payout activation controls until acceptance.

Payout, reward and gift fulfilment have related but separate ledgers. No generic non-booking
payment path may activate them as a side effect of this membership repair.
