/**
 * May a provider take a customer's money right now?
 *
 * ── Why three gates and not one ─────────────────────────────────────────────────
 * `payment_provider_capabilities` is **evidence**: a row saying someone verified hosted checkout
 * works in this environment, that the webhook signature was checked against a real message, and
 * that a payment could be reconciled afterwards.
 *
 * `payments.provider_checkout` and `payments.hosted_checkout.payfast` are **intent**: the founder
 * saying it should be on today. Both exist in `operational_controls` with `environment = 'all'`,
 * and both are `false` — verified by query 2026-08-13, not assumed.
 *
 * Requiring evidence and intent together means neither alone starts charging people. A migration
 * seeding a capability row cannot switch on a provider nobody chose, and flipping a control cannot
 * switch on one nobody verified. PayFast is seeded with every capability flag false precisely so
 * this returns a reason rather than a checkout.
 *
 * ── Deliberately free of `Deno` globals, and it has to stay that way ────────────
 * ⚠️ This module imports **nothing**. That is what lets `src/lib/payment-provider-gate.test.ts`
 * import it and test the decision for real rather than asserting on source text.
 *
 * It was briefly written to import `getEdgeEnvironment` and `isOperationalControlEnabled` from
 * `governance-utils.ts`, which uses `Deno.env`. Nothing failed locally — `vitest` does not
 * type-check and `vite build` does not follow test files — but `tsc --noEmit -p tsconfig.app.json`
 * in CI followed the import chain out of the test and reported five `Cannot find name 'Deno'`
 * errors in a file this change never touched.
 *
 * The reading of the gates lives in `create-payment-session`, its only caller. The *rules* are
 * what deserve to be shared and tested; a database round trip with one consumer does not.
 * `_shared/payfast.ts` is kept pure for the same reason and says so.
 */

export type PaymentProviderCapability = {
  hosted_checkout_enabled: boolean | null;
  webhook_signature_verified: boolean | null;
  callback_urls_verified: boolean | null;
  reconciliation_verified: boolean | null;
};

/**
 * The decision, pure.
 *
 * Returns the reason it is blocked, or `null` when the provider may charge. Phrased as "why not"
 * because every caller has to tell someone what is missing — a checkout that fails with
 * "unavailable" and no reason is how a launch blocker goes unnoticed for a week.
 *
 * **Fails closed on a missing row.** No capability row means nobody made the claim. That is not
 * the same as the claim being false, but it has to be treated identically: absence of evidence
 * cannot be a licence to charge.
 */
export const hostedCheckoutBlockReason = (input: {
  providerCheckoutEnabled: boolean;
  providerGateEnabled: boolean;
  capability: PaymentProviderCapability | null;
}): string | null => {
  if (!input.capability) return "no capability record for this provider and environment";
  if (!input.capability.hosted_checkout_enabled) return "hosted checkout is not verified for this provider";
  if (!input.capability.webhook_signature_verified) return "the payment webhook signature has not been verified";
  if (!input.capability.callback_urls_verified) return "the provider callback URLs have not been verified";
  if (!input.capability.reconciliation_verified) return "payment reconciliation has not been verified";
  if (!input.providerCheckoutEnabled) return "payments.provider_checkout is switched off";
  if (!input.providerGateEnabled) return "hosted checkout is switched off for this provider";
  return null;
};

/** The control key each provider's switch lives under. */
export const hostedCheckoutControlKey = (provider: string) =>
  `payments.hosted_checkout.${provider.trim().toLowerCase()}`;

/** The columns `create-payment-session` must select for the decision above to be complete. */
export const CAPABILITY_COLUMNS =
  "hosted_checkout_enabled,webhook_signature_verified,callback_urls_verified,reconciliation_verified";
