import { getEdgeEnvironment, isOperationalControlEnabled } from "./governance-utils.ts";

// Deno Edge Function shared module. Bundled into each consuming function at deploy time, so a
// change here reaches nothing until every consumer is redeployed.
type SupabaseServiceClient = any;

/**
 * May this provider take a customer's money right now?
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
 * ── Where this must NOT be used ─────────────────────────────────────────────────
 * **Never gate an inbound webhook on this.** If a control is switched off while a customer is on
 * PayFast's payment page, their money still arrives — and an ITN handler that refused it because
 * the gate closed would leave the payment in the bank with no booking against it. The gate belongs
 * on *starting* a checkout, which is reversible, not on *recording* one, which is not.
 * `confirm-payment` therefore does not call this, deliberately.
 */

export type PaymentProviderCapability = {
  hosted_checkout_enabled: boolean | null;
  webhook_signature_verified: boolean | null;
  callback_urls_verified: boolean | null;
  reconciliation_verified: boolean | null;
};

/**
 * The decision itself, pure so it can be tested for real rather than by reading source text.
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

export const hostedCheckoutControlKey = (provider: string) =>
  `payments.hosted_checkout.${provider.trim().toLowerCase()}`;

/**
 * Read the gates and decide.
 *
 * A lookup failure returns blocked, for the same reason `getConciergeCapabilities` fails closed: a
 * gate that opens when it cannot read its own rules is not a gate.
 */
export const checkHostedCheckoutAllowed = async (
  supa: SupabaseServiceClient,
  provider: string,
  environment = getEdgeEnvironment(),
): Promise<{ allowed: boolean; reason: string | null; environment: string }> => {
  try {
    const [providerCheckoutEnabled, providerGateEnabled] = await Promise.all([
      isOperationalControlEnabled(supa, "payments.provider_checkout", environment),
      isOperationalControlEnabled(supa, hostedCheckoutControlKey(provider), environment),
    ]);

    const { data, error } = await supa
      .from("payment_provider_capabilities")
      .select("hosted_checkout_enabled,webhook_signature_verified,callback_urls_verified,reconciliation_verified")
      .eq("provider", provider)
      .eq("environment", environment)
      .maybeSingle();

    if (error) throw new Error(error.message);

    const reason = hostedCheckoutBlockReason({
      providerCheckoutEnabled,
      providerGateEnabled,
      capability: (data as PaymentProviderCapability | null) ?? null,
    });
    return { allowed: reason === null, reason, environment };
  } catch (error) {
    console.warn("hosted checkout gate lookup failed; failing closed", {
      provider,
      message: error instanceof Error ? error.message : String(error),
    });
    return { allowed: false, reason: "provider readiness could not be confirmed", environment };
  }
};
