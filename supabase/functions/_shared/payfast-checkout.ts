import {
  PAYFAST_PROCESS_URL_LIVE,
  PAYFAST_PROCESS_URL_SANDBOX,
  buildSignatureBase,
  md5Hex,
} from "./payfast.ts";

/**
 * The outbound half of PayFast: building and signing the form that sends a customer to pay.
 *
 * ── Why this is separate from `payfast.ts`, and why it imports from it ──────────
 * `payfast.ts` verifies notifications coming IN. This builds the redirect going OUT. They are
 * opposite directions of the same protocol, and the one thing they must never disagree about is
 * how a signature is computed.
 *
 * So the signature is not reimplemented here. `buildSignatureBase` and `md5Hex` are imported from
 * the inbound module and used unchanged. Two implementations that "should" produce the same hash
 * is exactly how a payment integration develops a bug that no test catches — each side passes its
 * own tests and only PayFast sees the mismatch, reporting nothing more useful than a declined
 * payment.
 *
 * A concrete consequence worth stating: `payfast-checkout.test.ts` signs a checkout with this
 * module and verifies it with `verifySignature` from the other. That assertion is only meaningful
 * because both call the same code.
 *
 * ⚠️ **NOT VERIFIED AGAINST PAYFAST.** Nothing in this environment can reach `payfast.co.za` — the
 * egress proxy refuses third-party hosts. This matches PayFast's *documented* rules and is
 * self-consistent with the verifier. It is **not** proof PayFast accepts the form. A sandbox
 * payment is the first honest test.
 */

export type PayFastMode = "sandbox" | "live";

/** Sandbox unless explicitly told otherwise — the wrong default here spends real money. */
export const resolveMode = (raw: string | undefined | null): PayFastMode =>
  String(raw ?? "").trim().toLowerCase() === "live" ? "live" : "sandbox";

export const processUrlFor = (mode: PayFastMode, override?: string | null) =>
  (override && override.trim()) ||
  (mode === "live" ? PAYFAST_PROCESS_URL_LIVE : PAYFAST_PROCESS_URL_SANDBOX);

export type CheckoutInput = {
  merchantId: string;
  merchantKey: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  /** `payment_records.provider_reference`. Echoed back on the ITN as `m_payment_id`. */
  reference: string;
  /** Taken in cents so no caller hands PayFast a float it rounded itself. */
  amountCents: number;
  itemName: string;
  emailAddress?: string | null;
  passphrase?: string | null;
  mode: PayFastMode;
  processUrlOverride?: string | null;
};

/**
 * PayFast's field order, which is also the signature's field order.
 *
 * ⚠️ **The signature is computed over the fields in the order they are SUBMITTED, not sorted.**
 * Reordering this array silently changes every signature — the form still posts, PayFast still
 * responds, and every payment is declined with nothing that points back to here. The order below
 * follows PayFast's documented sequence: merchant details, then return URLs, then the payment.
 */
const FIELD_ORDER = [
  "merchant_id",
  "merchant_key",
  "return_url",
  "cancel_url",
  "notify_url",
  "m_payment_id",
  "amount",
  "item_name",
  "email_address",
] as const;

/**
 * Build the signed field set for the checkout form.
 *
 * Returns fields as ordered pairs rather than an object, because the browser must submit them in
 * this order and any `Object.keys()` round trip is entitled to reorder them.
 *
 * **The passphrase is used and not returned.** It goes into the hash and nowhere else. The
 * merchant *key* does travel to the browser — that is PayFast's redirect design and unavoidable —
 * which makes it easy to leak the passphrase alongside it by accident. `payfast-checkout.test.ts`
 * asserts it never appears in the output.
 */
export const buildPayfastCheckout = (
  input: CheckoutInput,
): { url: string; fields: Array<[string, string]> } => {
  if (!input.merchantId?.trim() || !input.merchantKey?.trim()) {
    throw new Error("PayFast merchant credentials are not configured");
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("PayFast checkout amount must be a positive whole number of cents");
  }

  const values: Record<string, string> = {
    merchant_id: input.merchantId.trim(),
    merchant_key: input.merchantKey.trim(),
    return_url: input.returnUrl,
    cancel_url: input.cancelUrl,
    notify_url: input.notifyUrl,
    m_payment_id: input.reference,
    /*
     * Rendered from integer cents, once, here.
     *
     * `confirm-payment` compares `Math.round(payment.amount * 100)` against
     * `Math.round(amount_gross * 100)` with **no tolerance** — a one-cent disagreement rejects the
     * payment with a 409 after the customer has already been charged. So the amount PayFast is
     * asked for has to be derived from the same integer the record holds, not re-rounded from a
     * float somewhere up the call stack.
     */
    amount: (input.amountCents / 100).toFixed(2),
    item_name: input.itemName,
    email_address: (input.emailAddress ?? "").trim(),
  };

  const ordered = new URLSearchParams();
  for (const name of FIELD_ORDER) {
    const value = values[name] ?? "";
    // Empty optional fields are omitted rather than sent blank: PayFast drops them from the string
    // it signs, so submitting `email_address=` would produce a hash it never computes.
    if (value.trim() !== "") ordered.append(name, value);
  }

  const signature = md5Hex(buildSignatureBase(ordered, input.passphrase ?? ""));

  const fields: Array<[string, string]> = [...ordered.entries()];
  // Last, because it is computed over everything before it.
  fields.push(["signature", signature]);

  return { url: processUrlFor(input.mode, input.processUrlOverride), fields };
};
