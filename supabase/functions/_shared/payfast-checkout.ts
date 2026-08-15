/**
 * PayFast checkout initiation — the half of the integration that was never built.
 *
 * ── Why this is separate from `payfast.ts` ─────────────────────────────────────────────────────
 * `payfast.ts` verifies an ITN *arriving from* PayFast. This builds the form that *sends a customer
 * to* PayFast. They share the encoder and the hash and nothing else: one is a security boundary
 * facing an untrusted sender, the other constructs a request we author ourselves. Keeping them in
 * one file invites reusing a verification helper in a construction path, where "reject on
 * mismatch" has no meaning.
 *
 * ── The one rule that breaks every first attempt ───────────────────────────────────────────────
 * PayFast signs the fields **in the order they appear in the posted form**, not alphabetically. So
 * the signature and the form must be generated from a single ordered structure — the moment the
 * two are built separately, they drift and every payment fails with a signature error that looks
 * like a credential problem. `buildCheckoutFields` returns an ordered array and
 * `signCheckoutFields` reads that same array. There is no object literal in between, deliberately:
 * an object round trip is exactly how the order gets lost.
 *
 * ── What is verified and what is not ───────────────────────────────────────────────────────────
 * The field names and their order are PayFast's documented custom-integration set.
 * `developers.payfast.co.za` is blocked by this environment's egress proxy — the same constraint
 * recorded in `payfast.ts` — so **this has not been exercised against a live sandbox merchant**.
 * The encoding, ordering and hashing are shared with the ITN path, which means a signature this
 * module builds is verified by the same code PayFast's callbacks are verified with; `payfast-checkout.test.ts`
 * asserts that round trip. That is a real check of internal consistency and **not** a substitute
 * for one sandbox transaction. Nobody should call this integration proven until that has run.
 */

import { buildSignatureBase, md5Hex, payfastUrlEncode } from "./payfast.ts";

export type CheckoutField = readonly [name: string, value: string];

export type CheckoutInput = {
  merchantId: string;
  merchantKey: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  /** `payment_records.provider_reference`. This is the key `confirm-payment` looks the record up by. */
  paymentReference: string;
  /** Rands, from the database. Never from the client — see `create-payment-session`. */
  amount: number;
  itemName: string;
  itemDescription?: string;
  nameFirst?: string;
  emailAddress?: string;
};

/**
 * Amounts go to PayFast as a plain decimal string with exactly two places and no separator.
 *
 * `toFixed(2)` on a float is the obvious version and is wrong at the boundary — 387.005 rounds
 * down under IEEE 754 on some values and up on others. Rounding to integer cents first makes the
 * conversion exact and matches `amountMatches` in `payfast.ts`, which compares in cents. The two
 * halves of the integration therefore round identically, so a payment cannot be built at one
 * figure and rejected at another.
 */
export const formatAmount = (rands: number): string => {
  if (!Number.isFinite(rands) || rands < 0) throw new Error("amount must be a non-negative number");
  const cents = Math.round(rands * 100);
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
};

/**
 * PayFast rejects an `item_name` over 100 characters outright, and silently truncates
 * `item_description` at 255. Both are trimmed here rather than at the call site so no caller has
 * to remember, and so the string that gets SIGNED is the same string that gets SENT — truncating
 * after signing is another way to produce a permanently invalid signature.
 */
const clamp = (value: string, max: number) => value.replace(/\s+/g, " ").trim().slice(0, max);

/**
 * The ordered field list. Order is PayFast's, and is load-bearing — see the module note.
 *
 * Empty values are omitted entirely rather than sent blank: `buildSignatureBase` drops empty
 * fields from the string it signs, so a blank field present in the form but absent from the
 * signature is a guaranteed mismatch.
 */
export const buildCheckoutFields = (input: CheckoutInput): CheckoutField[] => {
  const ordered: CheckoutField[] = [
    ["merchant_id", input.merchantId],
    ["merchant_key", input.merchantKey],
    ["return_url", input.returnUrl],
    ["cancel_url", input.cancelUrl],
    ["notify_url", input.notifyUrl],
    ["name_first", clamp(input.nameFirst ?? "", 100)],
    ["email_address", clamp(input.emailAddress ?? "", 100)],
    ["m_payment_id", input.paymentReference],
    ["amount", formatAmount(input.amount)],
    ["item_name", clamp(input.itemName, 100)],
    ["item_description", clamp(input.itemDescription ?? "", 255)],
  ];
  return ordered.filter(([, value]) => value.trim() !== "");
};

/**
 * Sign the ordered fields. `URLSearchParams` preserves insertion order, which is why the fields
 * are fed through it rather than through an object — the same reason `confirm-payment` parses the
 * raw body instead of `Object.fromEntries`.
 */
export const signCheckoutFields = (fields: CheckoutField[], passphrase: string): string => {
  const params = new URLSearchParams();
  for (const [name, value] of fields) params.append(name, value);
  return md5Hex(buildSignatureBase(params, passphrase));
};

/**
 * The complete signed field set, ready to be POSTed to the process URL as a form.
 *
 * `signature` is appended LAST. PayFast excludes it from the hash, and appending it last also
 * means a caller iterating the array to build form inputs produces the exact field order that was
 * signed.
 */
export const buildSignedCheckout = (input: CheckoutInput, passphrase: string): CheckoutField[] => {
  const fields = buildCheckoutFields(input);
  return [...fields, ["signature", signCheckoutFields(fields, passphrase)] as CheckoutField];
};

/**
 * A urlencoded body, for callers that would rather redirect than render a form.
 *
 * Uses PayFast's own encoder, not `URLSearchParams.toString()`. The two differ on `!'()*` and on
 * hex case — precisely the difference documented in `payfast.ts` as the most common cause of a
 * signature mismatch — and a body encoded one way with a signature computed the other is the bug
 * this function exists to make impossible.
 */
export const toFormBody = (fields: CheckoutField[]): string =>
  fields.map(([name, value]) => `${name}=${payfastUrlEncode(value)}`).join("&");
