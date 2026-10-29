# Payment launch — 29 October 2026

Current release authority: [production-checklist.md](production-checklist.md).
This records the founder's requested methods and measured readiness. It does not enable money
movement or turn a provider's product listing into Xoot merchant acceptance.

## What instant means in Xoot

After PayFast confirms a payment, one database transaction records payment, booking state,
history, owner notification, assignment outbox, audit and receipt. A return URL proves nothing.
The booking detail refreshes saved state on payment return and offers a read-only refresh;
it never starts another checkout to check status. The real sandbox notification and duplicate
resend now pass. Worker availability and acceptance remain separate from receiving payment.

Funds reaching PayFast, funds becoming withdrawable, merchant bank settlement and Xooter
payouts are different events. Do not advertise immediate worker cash-out or bank settlement.
Do not enable paid immediate payouts while the founder is controlling costs.

## Requested methods

| Method | Provider support | Xoot implementation / required acceptance |
| --- | --- | --- |
| Credit and debit cards | Hosted checkout, codes cc/dc | Existing signed server form does not force a method. Verify live account/card approval and a consented signed payment, duplicate callback and refund/reconciliation. |
| Instant EFT | Hosted Aggregation checkout, code ef | Verify account enablement and actual provider confirmation; a screenshot or browser return never proves received funds. Do not substitute manual bank-deposit instructions. |
| Apple Pay | Hosted checkout, code ap | Verify merchant toggle/card eligibility and a real authorised compatible-device test. No custom Apple wallet UI or successful-wallet badge before proof. Native Apple OAuth enrolment is a separate dependency. |
| Samsung Pay | Hosted checkout, code sp | Verify merchant toggle and compatible Samsung Wallet/device/card acceptance. An Android tablet alone does not establish Samsung Wallet eligibility. |
| Google Pay | Hosted checkout, code gp | Verify merchant/card eligibility and toggle, then an authorised wallet test. Google sign-in working does not enable Google Pay. |
| Care+ subscriptions | PayFast supports recurring card subscriptions and tokenisation | The delivered bundle adds a one-cycle membership loop only. No current recurring agreement/token/renewal writer is accepted as deployed. Build the mandate, explicit consent, signed per-cycle settlement, cancel/pause, failed-payment states and reconciliation first. |
| Commissions | Xoot ledger plus gated payouts; PayFast separately offers split payments | Calculate from the struck approved commission, store immutable once-only completion/earnings evidence, reconcile refunds and verified recipients. Do not send an immediate provider split to an unverified worker or confuse customer fare-sharing with platform commission. |

The existing builder deliberately omits payment_method. PayFast documents that omission as
showing all available methods. Keep method eligibility on the provider's hosted page until
Xoot has a verified merchant capability source; do not add five misleading local enabled buttons.
Merchant navigation is Settings → Payment Methods. The official live login is
[my.payfast.io/login](https://my.payfast.io/login), separate from the sandbox account.
The founder has been given a prepared sign-in; no credentials are requested in chat.

## Genuine callback evidence

- Staging fxmxyabdjqviqbcxmvlp; callback46; signature transport source82b23e11.
- Normal founder Auth and deployed server quote created one unassigned solo test fixture.
  Its provider route was then changed under a guarded audit for callback-only acceptance.
- Booking bc08e972-c63a-4dbc-a060-ccfe34adcaef; payment
  d9aeb89f-783e-4680-9dea-668c68d2df4b; R289/ZAR; sandbox funds only.
- Official ITN2020364 / provider transaction3482365 was completed by the founder. Failed
  signature attempts were retained, then the privately corrected staging salt allowed the
  official replay to settle at2026-10-29T00:18:36.575326Z.
- Duplicate official replay leaves one processed payment event, one receipt, one owner
  notification, one assignment outbox item and the original paid time. No worker is approved.
- The older separate virtual transaction3481790/ITN2020040 is retained as genuine earlier
  failed evidence; do not relabel it as the accepted transaction or silently delete it.
- Both staging and production provider capability rows remain all-false. No normal checkout,
  recurring charge, admin AAL2, worker fulfilment or production method is certified by this test.

## Cost and launch boundaries

Use the existing hosted integration and provider account. No new paid wallet SDK, account
upgrade or credit purchase is authorised. PayFast Aggregation lists no monthly/setup fee,
but processed payments, refunds and payouts have transaction fees. Official current rates
include card/wallet3.2%+R2 exVAT, Instant EFT2% with R2minimum exVAT, and immediate payout0.8%
with R14minimum exVAT. Recheck merchant-specific fees before live activation; do not invent
customer surcharges or silently turn on an expensive frequent payout schedule.

Live activation still requires exact production schema review/rollback, frozen function
readback, a genuine ordinary-owner checkout, approved live merchant credentials/passphrase,
consented signed live smoke and verified payout recipients plus a gated first run. Admin money
actions require actual enrolled TOTP/AAL2. Gift fulfilment and recurring Care+ are separate
financial contracts; their refusal must remain until those contracts and tests are complete.

## Primary sources checked 29 October

- [PayFast developer documentation](https://developers.payfast.co.za/) — hosted method codes,
  omitted payment_method behaviour, signature/ITN and recurring integration.
- [Payment methods](https://payfast.io/features/payment-methods/) — supported wallets/EFT/cards.
- [Google Pay eligibility and toggle](https://support.payfast.help/portal/en/kb/articles/google-pay).
- [Recurring subscriptions](https://payfast.io/features/subscriptions/) — card mandate lifecycle.
- [Split payments](https://payfast.io/features/split-payments/) — provider commission facility;
  not evidence Xoot's ledger or recipient accounts are ready.
- [Immediate payouts](https://payfast.io/features/immediate-payout/) and
  [current fees](https://payfast.io/fees/) — bank payout timing/cost is separate from checkout.
