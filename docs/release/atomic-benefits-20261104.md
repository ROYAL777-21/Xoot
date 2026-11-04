# Atomic booking benefits — bounded source repair

Base: approved 75674d60. This is a source-only security repair; it does not activate
payments, run a provider request, apply hosted SQL, or make a production-readiness claim.
Release owns independent review and delivery. Correctness owns the eventual full
transactional booking-creation path.

## Completed boundary

Both legacy writers, create-booking and create-booking-request, now refuse credit or
referral inputs immediately after JSON parsing, before coverage, rate-limit, booking,
payment, outbox, ledger or referral writes. Both aliases are checked independently,
including the reviewed quote's nested input. A refusal is explicit HTTP409; the route
does not remove a benefit or create a differently priced booking. Existing pure quote,
price, referral and commission calculations remain unchanged. Historical legacy benefit
code stays behind this containment until the full creation transaction replaces it.

The new service-only redeem_booking_xootcred RPC takes the verified owner, booking,
canonical payment, UUID request key, exact accepted current cents and exact credit cents.
It acquires the complete account set before reading benefits, then payments by ID, then
the booking, matching the current settlement/cancellation order. It rejects ambiguous
payments, other owners, unsupported crews/currency, changed amounts, routed, paid,
cancelled or receipted terminal money. R50 remains the payment floor. It uses the existing
booking_credit_effect expiry/legacy-ledger semantics and refuses insufficient credit
instead of silently reducing the accepted discount.

The debit, payment amount, audit and private immutable receipt share one PostgreSQL
transaction. Any rejection rolls them all back. A retry with identical owner, payment,
amounts and key returns the original committed receipt; a changed definition refuses.
Distinct accepted redemptions remain possible while the payment is pending/unrouted.
An original receipt can replay after payment/cancellation without changing later history.
Its updated_balance is the historical post-redemption balance, not a fresh balance.
Public/anonymous/customer execution and direct service receipt writes are revoked.
The RPC definer is private; its public wrapper is an invoker restricted to service_role.
No admin-on-behalf authority is added: this customer endpoint is owner-only.

Checkout now atomically reserves only its signed snapshot: pending status, owner, amount,
currency, provider, reference, payment kind and booking identity must still match.
If redemption commits first, the stale checkout refuses; if routing commits first,
provider=payfast makes further redemption refuse. No provider reference is rewritten.

## Endpoint contract and limits

POST redeem-xootcred now requires:

```json
{
  "booking_id": "<booking UUID>",
  "payment_record_id": "<canonical payment UUID>",
  "request_key": "<UUID retained across retries>",
  "expected_amount_cents": 20000,
  "amount": 70
}
```

This example accepts exactly R70 against an unchanged R200 pending amount. Actor identity
comes only from the verified bearer. Monetary inputs must be exact cents; malformed or
missing consent refuses before any financial write. Only whole transactions retry for
40001/40P01, at most three times with the same key. A success requires a matching receipt.
The legacy handler's old amount-only request is deliberately unsupported.

The source tree has no frontend caller of redeem-xootcred. This patch does not invent
UI consent or claim a completed booking-benefit user journey. Full atomic creation,
referral reservation/burn and the accepted quote's complete booking/payment/outbox
transaction remain for the next slice. No paid-history compensation or migration
backfill is performed.

## Delivery and rollback

1. Review immutable SQL/handler source and required CI. Read actual hosted prerequisites,
   grants and canonical payment columns before any apply. Do not infer deployment from
   source or write generated production types by hand.
2. Deliver containment on both legacy writers and checkout reservation before allowing
   new atomic redemption traffic. Each Edge bundle freezes the shared helper.
3. Apply the additive migration 20261104045943 through the reviewed migration process.
   Keep redemption traffic paused during the SQL/function transition (or serve an
   explicit temporary503); never expose the new redemption handler with stale checkout
   reservation. Normal migration-before-consumer ordering applies.
4. Regenerate types from the actual delivered database using the pinned production
   process, then deploy redeem-xootcred and verify exact bundled source. The migration
   itself grants no anonymous/customer RPC access and enables no financial control.
5. Prove owner/other-owner, exact replay, amount-change, pending/paid/cancelled and
   checkout races using authorized staging identities before production enablement.

Rollback means pause redemption or deploy a refusing endpoint. Never restore the old
multi-request redemption writer, remove the legacy containment, delete receipts/debits,
reprice paid records, refill benefits, or relax provider/settlement/cancellation checks.
Retain all committed history for reconciliation.

## Evidence

Local, synthetic checks:

- Actual isolated PostgreSQL reproduced the old rejected-debit/independent-price commit.
- 44 actual SQL assertions pass: service-only authority, exact owner/identity/amount,
  paid/route/cancellation/settlement barriers, multiple-payment refusal, request replay,
  and complete rollback on audit/receipt failures.
- 109 focused cases pass across four real HTTP handlers, referral/pricing parity,
  provider lifecycle/gates, ITN integrity and settlement contracts.
- Checkout negative control removes its six new snapshot conditions: all six stale
  signature cases fail against that defect; the exact source was restored.
- Deno typechecks all four changed handlers; application typecheck and scoped lint pass.

Native PostgreSQL17 CI executes eight independent-session scenarios and requires seven
observed pg_stat_activity/pg_blocking_pids lock barriers, including two bookings
sharing one owner's credit account, concurrent request replay, stale due, both checkout orders,
paid/cancelled state races and stale REPEATABLE READ. The terminal-transition scenarios
execute the actual common lock helper/source lock order; they are not full provider or
cancellation acceptance. Manual Tests run41778196140 at immutable48337a15 passed both
native jobs, with eight scenarios and seven observed blocking barriers on each actual
server version170006 and170011. Its separate SQL-contract job also passed. Local
Docker's engine is unavailable; the native results above come from CI, not PGlite.

The full unit/rendered job passed2256tests in219files (including43rendered checks),
with seven existing skips, and failed one deliberate live-schema guard:
rpc-names-exist.test.ts reports the new redeem_booking_xootcred RPC absent from the
actual generated types. Its source migration has not been delivered. The guard is
preserved; no type entry or exception is invented. Lint and web/native typechecks in
that job passed before the suite. CodeQL, Semgrep/security review, actual-schema type
comparison and existing referral privilege checks passed. Separate design/security
run41778177698 failed in the unchanged closed-notification fixture; root reproduced
that timestamp-ordering defect and owns its independent correction inPR118. PR119
remains draft pending root review, real schema/type convergence, rebase and all gates.
No genuine JWT, hosted write, provider payment or device acceptance occurred here.
