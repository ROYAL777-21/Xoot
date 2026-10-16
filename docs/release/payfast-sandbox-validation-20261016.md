# PayFast sandbox-to-production acceptance — Xoot
_Status: **NOT authorised for live charges** (16 October 2026)._

## Actual integration

Xoot already has a signed, authenticated `create-payment-session` Edge Function, a PayFast form handoff, and unauthenticated PayFast ITN receiver `confirm-payment` with server-to-server validation. The callback **must** be publicly reachable and must not require a customer's Supabase JWT; the session creator **must** require a JWT. The 16 Oct hardening branch refuses a deceptive `VALIDATION FAILED` postback, a different PayFast merchant ID, duplicate critical fields, imprecise monetary values, unpersisted provider routing and a payment in the manual/EFT lane. It stores the provider transaction reference for reconciliation.

The public documentation is [PayFast custom integration and ITN](https://developers.payfast.co.za/docs/itn-instant-transaction-notification/). PayFast mandates a hosted form POST, signed fields, notification to a public callback, validation and comparison with the original merchant/order details. User return redirects **never** prove payment success.

## Current read-only inventory

- Production Supabase: `mvlrkelahhsyjrwgsxaf`. Staging: `fxmxyabdjqviqbcxmvlp`.
- At time of audit, both projects had `payments.provider_checkout=false`, `payments.hosted_checkout.payfast=false` and a PayFast `payment_provider_capabilities` row with **all evidence flags false**. Keep them false until signed sandbox evidence is complete.
- Both deploy `create-payment-session` as JWT-protected and `confirm-payment` as unauthenticated. This is configuration inventory, **not a successful live payment**.
- `PAYFAST_MODE=sandbox` is required on staging. Do not set production mode to `live` or any production capability flag to true until proven by a reviewed release. `XOOT_APP_ENV=staging` must be explicitly configured on staging; the payment gate otherwise may consult the wrong environment.
- Production must retain its migration reconciliation gate; the PayFast branch must not bypass missing ledger/history, quote/referral or booking fulfilment dependencies. Gift a Clean / Care+ financial fulfilment remains gated separately.

## Founder/provider setup (secret values must not enter Git, frontend VITE_/EXPO_PUBLIC, tickets or chat)

1. Create a [PayFast sandbox account](https://sandbox.payfast.co.za/), establish its merchant ID and merchant key, and set a **security passphrase** on the PayFast account. Obtain live credentials separately only after sandbox acceptance and merchant business verification.
2. In the **staging** Supabase Edge Function secrets set `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_MODE=sandbox` and `XOOT_APP_ENV=staging`. Keep production credentials separate; never copy staging keys to production. An explicit `PAYFAST_NOTIFY_URL` may be set only if it exactly targets the correct project's public `confirm-payment` function.
3. Register/check the publicly accessible staging ITN address:
   `https://fxmxyabdjqviqbcxmvlp.supabase.co/functions/v1/confirm-payment`
   and ensure JWT verification is **disabled for this webhook only**. The signed ITN postback must be validated against `https://sandbox.payfast.co.za/eng/query/validate`, not the live validation host. Do **not** point callback at a static page or at `xoot.co.za/app/bookings`. The return/cancel pages are for user navigation, not settlement.
4. Run `npm ci`, `npx vitest run supabase/functions/_shared/payfast.test.ts src/lib/payfast-checkout.test.ts src/lib/payment-provider-gate.test.ts src/lib/payfast-itn-integrity.test.ts`, `npm run typecheck`, `npm run security:scan`, and the normal reviewed release CI.
5. Set up a dedicated **non-real customer staging test account** and a **priced staging booking** using the server-authoritative path; verify exactly one `payment_records` row with expected ZAR cents and unique reference. If the booking schema/migration is not ready, stop here; do not fabricate it.
6. Staging capability evidence should be recorded *only after* reviewed merchant config, callback availability, auth/RLS checks and schema are established. To attempt an actual sandbox hosted payment, both intended staging operational controls must be enabled by an authorised operator after test approval; they are currently false. Do not enable live environment controls as a shortcut.
7. Execute a **real PayFast sandbox buyer journey** and capture non-secret evidence: submitted reference and amount, PayFast sandbox transaction ID, source/server validation result, exactly one payment row transition, exactly one provider event and the intended booking status + job-offer outbox transition. Never copy payment passphrase or entire raw customer ITN into shared evidence.
8. Run negative cases: malformed/duplicate ITN fields, wrong merchant ID, wrong passphrase, invalid validation reply, 1-cent mismatch, replayed valid ITN, failed/cancelled status, callback timeout and unavailable service. A return-page redirect with no verified ITN must remain **unpaid**. Inspect audit events and rerun reconciliation.
9. Verify recovery after partial writes. The existing payment-status update and downstream booking/job/notification actions are separate database operations. A provider event can be marked failed after a financial row changes; **a reviewed transactional reconciliation/recovery procedure is required** before claiming the full payment consistency gate green. Never re-run a callback as a substitute for an idempotent repair plan.
10. Only after independent review, clean staging runs, complete evidence, merchant verification and operational authorisation: promote the audited code through `release/xoot-production`, perform reviewed production migrations, configure distinct live credentials, double-check the live callback, then explicitly set verified production capability evidence and payment controls. Test a genuine low-value live transaction only with founder approval (PayFast fees apply).

## Acceptance / stop conditions

- **GREEN SANDBOX:** real sandbox customer is redirected with correct signed ZAR order, provider ITN authenticates, order amount matches exactly, two separate webhook deliveries do not double-credit, booking fulfilment/outbox reconciles with payment record, and unauthorized users cannot initiate another customer's checkout. Negative cases rejected.
- **RED / STOP:** missing account credentials, wrong Supabase project or environment, unverified provider validation, any mismatched merchant/amount, absent migration, callback not publicly reachable, unverified partial-write recovery, or independent security review missing.
- **NO LIVE AUTHORIZATION:** source-level tests, Vercel READY, or Supabase Edge Function ACTIVE do not equal a paid PayFast sandbox test. Do not mark production-ready or change financial gates on that basis.

**Owner acknowledgement needed before sandbox payment and live launch:** provide merchant-account setup through the relevant provider consoles; confirm the PayFast account and settlement/legal terms; explicitly authorize the sandbox test. No secret values need be pasted into chat.
