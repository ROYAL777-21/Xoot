import { describe, expect, it } from "vitest";

import { buildSignatureBase, md5Hex, verifySignature } from "./payfast.ts";
import {
  buildCheckoutFields,
  buildSignedCheckout,
  formatAmount,
  signCheckoutFields,
  toFormBody,
} from "./payfast-checkout.ts";

/**
 * ── What these tests can and cannot prove ──────────────────────────────────────────────────────
 *
 * They prove the two halves of the PayFast integration agree with each other: a checkout signed by
 * `payfast-checkout.ts` verifies under `payfast.ts`, the code that verifies PayFast's own
 * callbacks. That is a real check — it is the one that catches field reordering, encoder drift and
 * clamp-after-sign, which are the three ways this integration breaks.
 *
 * They **cannot** prove PayFast accepts it. `developers.payfast.co.za` is unreachable from this
 * environment, so the field names and ordering come from PayFast's published custom-integration
 * set rather than from a live response. Until one sandbox transaction completes, "the signature is
 * internally consistent" is the whole claim. It is not "payments work".
 */

const BASE = {
  merchantId: "10000100",
  merchantKey: "46f0cd694581a",
  returnUrl: "https://xoot.co.za/app/bookings/abc?payment=return",
  cancelUrl: "https://xoot.co.za/app/bookings/abc?payment=cancelled",
  notifyUrl: "https://ref.supabase.co/functions/v1/confirm-payment",
  paymentReference: "xoot_booking_abc_1755000000000",
  amount: 387,
  itemName: "Xoot deep clean booking",
};

describe("formatAmount — cents, exactly, in both halves of the integration", () => {
  it("always renders two decimal places", () => {
    expect(formatAmount(387)).toBe("387.00");
    expect(formatAmount(387.5)).toBe("387.50");
    expect(formatAmount(0.05)).toBe("0.05");
  });

  it("rounds through integer cents, so it cannot disagree with the ITN amount check", () => {
    // `amountMatches` in payfast.ts does Math.round(gross * 100). Doing anything else here is how a
    // payment gets built at one figure and rejected at another.
    for (const value of [1234.005, 99.995, 0.014, 1.005]) {
      expect(formatAmount(value)).toBe(
        `${Math.floor(Math.round(value * 100) / 100)}.${String(Math.round(value * 100) % 100).padStart(2, "0")}`,
      );
    }
  });

  it("refuses a negative or non-finite amount rather than signing one", () => {
    expect(() => formatAmount(-1)).toThrow();
    expect(() => formatAmount(Number.NaN)).toThrow();
  });
});

describe("buildCheckoutFields", () => {
  it("emits PayFast's documented order, which is what gets signed", () => {
    const names = buildCheckoutFields(BASE).map(([name]) => name);
    expect(names).toEqual([
      "merchant_id",
      "merchant_key",
      "return_url",
      "cancel_url",
      "notify_url",
      "m_payment_id",
      "amount",
      "item_name",
    ]);
  });

  it("omits empty optional fields entirely instead of sending them blank", () => {
    // buildSignatureBase drops empty values from the signed string. A blank field present in the
    // form but absent from the signature is a guaranteed mismatch.
    const names = buildCheckoutFields({ ...BASE, nameFirst: "", emailAddress: "" }).map(([n]) => n);
    expect(names).not.toContain("name_first");
    expect(names).not.toContain("email_address");
  });

  it("places optional identity fields in order when present", () => {
    const names = buildCheckoutFields({
      ...BASE,
      nameFirst: "Thandi",
      emailAddress: "thandi@example.co.za",
      itemDescription: "Xoot booking abc",
    }).map(([n]) => n);
    expect(names.indexOf("name_first")).toBeLessThan(names.indexOf("m_payment_id"));
    expect(names.indexOf("email_address")).toBeLessThan(names.indexOf("m_payment_id"));
    expect(names.at(-1)).toBe("item_description");
  });

  it("clamps before signing, so the signed string is the sent string", () => {
    const long = "x".repeat(400);
    const fields = buildCheckoutFields({ ...BASE, itemName: long, itemDescription: long });
    const itemName = fields.find(([n]) => n === "item_name")![1];
    const itemDescription = fields.find(([n]) => n === "item_description")![1];
    expect(itemName).toHaveLength(100);
    expect(itemDescription).toHaveLength(255);
    // Truncating after signing is the other way to build a permanently invalid signature.
    expect(signCheckoutFields(fields, "pass")).toBe(
      md5Hex(
        buildSignatureBase(
          new URLSearchParams(fields.map(([n, v]) => [n, v] as [string, string])),
          "pass",
        ),
      ),
    );
  });
});

describe("the signature round-trips against the ITN verifier", () => {
  /**
   * The load-bearing test. `verifySignature` is the function that decides whether a real PayFast
   * callback is genuine. If a checkout this repo signs does not verify under it, the two halves
   * disagree — and the symptom in production is every payment failing with what looks like a
   * credentials error.
   */
  it("verifies under payfast.ts, with a passphrase", () => {
    const fields = buildSignedCheckout(BASE, "a-real-passphrase");
    const params = new URLSearchParams();
    for (const [name, value] of fields) params.append(name, value);
    expect(verifySignature(params, "a-real-passphrase")).toEqual({ ok: true });
  });

  it("verifies with no passphrase set", () => {
    const fields = buildSignedCheckout(BASE, "");
    const params = new URLSearchParams();
    for (const [name, value] of fields) params.append(name, value);
    expect(verifySignature(params, "")).toEqual({ ok: true });
  });

  it("fails under the wrong passphrase", () => {
    const fields = buildSignedCheckout(BASE, "right");
    const params = new URLSearchParams();
    for (const [name, value] of fields) params.append(name, value);
    expect(verifySignature(params, "wrong").ok).toBe(false);
  });

  it("fails if the field order is disturbed — the failure mode this design prevents", () => {
    const fields = buildSignedCheckout(BASE, "pass");
    const signature = fields.at(-1)![1];
    // Exactly what an Object.keys() round trip does to the form.
    const reordered = [...fields.slice(0, -1)].sort(([a], [b]) => a.localeCompare(b));
    const params = new URLSearchParams();
    for (const [name, value] of reordered) params.append(name, value);
    params.append("signature", signature);
    expect(verifySignature(params, "pass").ok).toBe(false);
  });

  it("appends signature last, so iterating the array reproduces the signed order", () => {
    const fields = buildSignedCheckout(BASE, "pass");
    expect(fields.at(-1)![0]).toBe("signature");
    expect(fields.filter(([n]) => n === "signature")).toHaveLength(1);
  });
});

describe("toFormBody", () => {
  it("uses PayFast's encoder, not URLSearchParams", () => {
    // The difference is `+` for spaces and uppercase hex — the documented top cause of a mismatch.
    const body = toFormBody([["item_name", "Deep Clean"]]);
    expect(body).toBe("item_name=Deep+Clean");
    expect(body).not.toContain("%20");
  });

  it("round-trips a full signed checkout", () => {
    const fields = buildSignedCheckout(BASE, "pass");
    expect(verifySignature(new URLSearchParams(toFormBody(fields)), "pass")).toEqual({ ok: true });
  });
});
