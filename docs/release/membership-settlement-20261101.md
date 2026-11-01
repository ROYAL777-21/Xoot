# Care+ settlement preparation — 1 November 2026

The current request creates separate payment and subscription records without a durable link or
provider reference. Checkout/callback only fulfil booking payments. Client activation can insert
another subscription and a separate R30 credit. These are four observed source gaps, not a
completed payment loop. No new membership, money, credit, provider gate or recurring agreement has
been enabled by this patch.

## Shared provider transaction boundary

`20261101223000_payfast_cross_kind_transaction_bindings.sql` adds a private, immutable
transaction-to-payment binding used by the current booking receipt trigger. A valid payment/event
binding must match payment kind, exact cents, reference and `payfast:<transaction>` event identity.
The existing signature, merchant, amount and PayFast server-postback checks remain the upstream
trust boundary. A provider event row or payload hash alone is not signature verification.

The registry has unique constraints on external transaction and payment ID, with no cascading
financial/customer/event FK. It retains only opaque payment/provider IDs, kind, amount, reference
and bound time. Existing booking-event `ON DELETE SET NULL` cleanup remains possible after a
binding exists; it cannot release the external transaction. Second charges and cross-kind reuse
are reconciliation cases. Existing paid/refunded/cancelled receipts and admin-first late ITNs
retain their state and consequences. No public RPC or direct service-role write grant is added.

The migration takes payment then event EXCLUSIVE table locks before receipts, drains existing
row-locking settlement transactions while allowing ordinary reads, uses a five-second timeout and
validates every pre-existing non-null receipt transaction in the same transaction as trigger
installation. Unverifiable history aborts the entire migration. No receipt is inferred from a
paid flag. Do not delete audit evidence, repair-stamp this version or skip invalid rows to deploy.

Local verification executes the actual original and later account-lock-aware booking settlement
SQL, with and without the real account-guard foundation. It checks rollback, receipt idempotency,
admin-first corroboration, event cleanup, deletion-resistant bindings, cross-kind conflicts,
different transactions for one payment and actual role refusals. The fixture keeps production's
unique provider-event identity. Valid backfill and invalid-backfill rollback run separately. A
missing automatic booking guard is deliberately planted in a disposable database and detected.
This is actual local PostgreSQL execution, not concurrent hosted or signed-provider acceptance.

Independent review found that SHARE source locks could deadlock with an in-flight late callback's
receipt/event lock upgrade. That unapplied DDL now uses EXCLUSIVE in the existing writer order.
No hosted schema received the earlier draft. Current real PostgreSQL concurrency acceptance is
still separate; the isolated single-session runtime does not simulate simultaneous connections.

Run with pinned isolated tooling, outside app dependencies:

```powershell
node scripts/ops/verify-payment-bindings.mjs <pglite-0.5.8-dist/index.js>
```

## Remaining coordinated Care+ delivery

- Canonical plan/account/payment/subscription identities and atomic pending requests, with exact
  retries and ambiguous legacy rows held for review.
- A durable, once-per-account opening trial receipt. The published one-month-free promise must
  not silently become an upfront payment; browser onboarding flags cannot establish eligibility.
- Paid settlement and current entitlement periods, cancellation, expired/past-due access and
  late-charge reconciliation. Use the existing sorted account guards before source locks, and a
  fresh server timestamp after waiting. Staging currently lacks the full production foundation;
  converge it forward through reviewed SQL instead of pretending its historical version ran.
- One-time R30 add-on credit, excluding an account that used the opening trial, with enforceable
  add-on-only use. A generic credit flag or once-per-cycle grant is insufficient.
- Membership settlement must use the same private provider transaction binder as booking. Its
  signed webhook/admin-AAL2 path must commit the payment, period, credit decision, notification,
  outbox, audit and receipt together. Client activation may only read that receipt.
- Matching Plans/paywall/quote/benefit readers, all affected frozen Edge bundles, actual generated
  schema types, SQL rollback/concurrency and real authorised JWT/provider acceptance.
- Automatic recurring billing still needs a real mandate, signed cycle callbacks, cancellation
  and past-due evidence. An ordinary checkout or admin-confirmed renewal is not a recurring debit.

The new receipt-transport helper is preparatory and is not imported by any deployed handler.
It validates complete owner/plan/subscription/result bindings and only retries whole serialization
or deadlock aborts. It cannot create membership or grant credit. Its target membership RPC is
not present live yet; release/schema guards must keep that distinction visible.

No production application/schema deployment is claimed here. Cross-role review, real staging
delivery and current release gates remain required before a production migration or bundle change.
Weekly beneficiary payouts, a priced/supported instant cash-out, gift balances/refunds and Rewards
redemption remain separate money contracts. Reward12then24additional cleans does not itself
waive the R39 booking fee or create Care+ membership.
