import { describe, expect, it } from "vitest";
import {
  buildPayfastCheckout,
  processUrlFor,
  resolveMode,
} from "../../supabase/functions/_shared/payfast-checkout";
import { verifySignature } from "../../supabase/functions/_shared/payfast";

/**
 * The outbound checkout, checked against the inbound verifier.
 *
 * ── Why this suite can do something the parity tests cannot ─────────────────────
 * Both PayFast modules are free of `Deno` globals, so this imports them and computes **real
 * MD5 hashes** rather than asserting on source text. The central test signs a checkout with
 * `buildPayfastCheckout` and verifies it with `verifySignature` — the two halves of the
 * integration, agreeing or not agreeing, for real.
 *
 * That round trip is the whole reason `payfast-checkout.ts` imports the hash and encoder from
 * `payfast.ts` instead of carrying its own. If each side had its own implementation this assertion
 * would be circular in the worst way: both wrong together, both green.
 *
 * ⚠️ These prove the two halves agree with each other and with PayFast's **documented** rules.
 * They cannot prove PayFast agrees — nothing here can reach `payfast.co.za`. Sandbox first.
 */

const base = {
  merchantId: "10000100",
  merchantKey: "46f0cd694581a",
  returnUrl: "https://xoot.co.za/app/bookings?payment=return",
  cancelUrl: "https://xoot.co.za/app/bookings?payment=cancelled",
  notifyUrl: "https://fxmxyabdjqviqbcxmvlp.supabase.co/functions/v1/confirm-payment",
  reference: "xoot_booking_1234abcd-0000-4000-8000-000000000000_1755088000000",
  amountCents: 50000,
  itemName: "Xoot booking",
  mode: "sandbox" as const,
};

const fieldMap = (fields: Array<[string, string]>) => Object.fromEntries(fields);

describe("payfast checkout signing", () => {
  it("produces a signature the ITN verifier accepts", () => {
    /*
     * The assertion this file exists for. `verifySignature` is the function that will judge the
     * notification PayFast sends back, and it is the closest thing available here to PayFast's own
     * opinion. If the outbound and inbound halves ever disagree, this fails.
     */
    const { fields } = buildPayfastCheckout({ ...base, passphrase: "s3cret" });
    const params = new URLSearchParams(fields);
    expect(verifySignature(params, "s3cret")).toEqual({ ok: true });
  });

  it("fails that verification under a different passphrase", () => {
    // Proves the check above is actually checking something.
    const { fields } = buildPayfastCheckout({ ...base, passphrase: "s3cret" });
    const params = new URLSearchParams(fields);
    expect(verifySignature(params, "different").ok).toBe(false);
  });

  it("renders the amount from integer cents, never from a float", () => {
    /*
     * `confirm-payment` compares amounts with NO tolerance, so a cent of drift here rejects a
     * payment the customer has already made.
     */
    expect(fieldMap(buildPayfastCheckout(base).fields).amount).toBe("500.00");
    expect(fieldMap(buildPayfastCheckout({ ...base, amountCents: 39 }).fields).amount).toBe("0.39");
    expect(fieldMap(buildPayfastCheckout({ ...base, amountCents: 1 }).fields).amount).toBe("0.01");
    expect(fieldMap(buildPayfastCheckout({ ...base, amountCents: 123456 }).fields).amount).toBe("1234.56");
  });

  it("never returns the passphrase", () => {
    /*
     * The merchant KEY does travel to the browser — that is PayFast's redirect design. The
     * passphrase must not, and the two sitting next to each other in the same config object is
     * exactly how one would follow the other by accident.
     */
    const { fields } = buildPayfastCheckout({ ...base, passphrase: "s3cret-do-not-leak" });
    const serialised = JSON.stringify(fields);
    expect(serialised).not.toContain("s3cret-do-not-leak");
    expect(serialised).not.toContain("passphrase");
  });

  it("puts the signature last, after everything it covers", () => {
    const { fields } = buildPayfastCheckout({ ...base, passphrase: "s3cret" });
    expect(fields[fields.length - 1][0]).toBe("signature");
    expect(fields.filter(([name]) => name === "signature")).toHaveLength(1);
  });

  it("submits the fields in PayFast's documented order", () => {
    /*
     * Order is not cosmetic: PayFast signs the fields in the order submitted. If this array is
     * reordered, every signature changes, every payment declines, and nothing in the failure
     * points back at the ordering.
     */
    const { fields } = buildPayfastCheckout({ ...base, emailAddress: "customer@example.com" });
    expect(fields.map(([name]) => name)).toEqual([
      "merchant_id",
      "merchant_key",
      "return_url",
      "cancel_url",
      "notify_url",
      "m_payment_id",
      "amount",
      "item_name",
      "email_address",
      "signature",
    ]);
  });

  it("is order-sensitive, which is why the order above is pinned", () => {
    const { fields } = buildPayfastCheckout({ ...base, passphrase: "s3cret" });
    const signed = fields.filter(([name]) => name !== "signature");
    const swapped = new URLSearchParams([signed[1], signed[0], ...signed.slice(2)]);
    swapped.append("signature", fieldMap(fields).signature);
    expect(verifySignature(swapped, "s3cret").ok).toBe(false);
  });

  it("omits an empty optional field rather than sending it blank", () => {
    // PayFast drops blank fields from the string it signs, so `email_address=` would produce a
    // hash it never computes.
    const withoutEmail = buildPayfastCheckout(base).fields.map(([name]) => name);
    expect(withoutEmail).not.toContain("email_address");
    expect(buildPayfastCheckout({ ...base, emailAddress: "   " }).fields.map(([n]) => n)).not.toContain(
      "email_address",
    );
  });

  it("carries the booking's own reference, so the ITN can find the record", () => {
    // `confirm-payment` looks the payment record up by `m_payment_id` against
    // `payment_records.provider_reference`. A different reference scheme here means every
    // notification arrives for a record that cannot be found.
    expect(fieldMap(buildPayfastCheckout(base).fields).m_payment_id).toBe(base.reference);
  });
});

describe("payfast checkout configuration", () => {
  it("defaults to sandbox, and reaches the live host only when explicitly told", () => {
    expect(resolveMode(undefined)).toBe("sandbox");
    expect(resolveMode("")).toBe("sandbox");
    expect(resolveMode("production")).toBe("sandbox"); // only the exact word "live" counts
    expect(resolveMode("LIVE")).toBe("live");

    expect(buildPayfastCheckout(base).url).toContain("sandbox.payfast.co.za");
    expect(buildPayfastCheckout({ ...base, mode: "live" }).url).toBe(
      "https://www.payfast.co.za/eng/process",
    );
  });

  it("honours an explicit process URL override", () => {
    // NEEDS-FOUNDER.md documents PAYFAST_PROCESS_URL as settable per environment.
    expect(processUrlFor("sandbox", "https://example.test/process")).toBe("https://example.test/process");
    expect(processUrlFor("sandbox", "   ")).toContain("sandbox.payfast.co.za");
    expect(processUrlFor("sandbox", null)).toContain("sandbox.payfast.co.za");
  });

  it("refuses to build anything without merchant credentials", () => {
    // Failing loudly beats posting an unsignable form and reading "payment failed" on PayFast's
    // side with no indication that a secret was simply unset.
    expect(() => buildPayfastCheckout({ ...base, merchantId: "" })).toThrow(/credentials/i);
    expect(() => buildPayfastCheckout({ ...base, merchantKey: "  " })).toThrow(/credentials/i);
  });

  it("refuses a zero, negative or fractional amount", () => {
    // A R0.00 checkout would be signed, accepted, and confirm nothing.
    expect(() => buildPayfastCheckout({ ...base, amountCents: 0 })).toThrow(/positive/i);
    expect(() => buildPayfastCheckout({ ...base, amountCents: -100 })).toThrow(/positive/i);
    expect(() => buildPayfastCheckout({ ...base, amountCents: 12.5 })).toThrow(/whole number/i);
  });
});
