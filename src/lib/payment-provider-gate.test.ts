import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  hostedCheckoutBlockReason,
  hostedCheckoutControlKey,
} from "../../supabase/functions/_shared/payment-provider-gate";

/**
 * What must be true before Xoot may take a customer's money.
 *
 * Two kinds of thing, and they are not interchangeable:
 *
 *   **evidence** — `payment_provider_capabilities`: someone verified hosted checkout works, the
 *                  webhook signature was checked against a real message, the callback URLs
 *                  resolve, and a payment could be reconciled afterwards.
 *   **intent**   — `payments.provider_checkout` and `payments.hosted_checkout.payfast`: the
 *                  founder saying it should be on today.
 *
 * Requiring both means a migration seeding a capability row cannot switch on a provider nobody
 * chose, and flipping a control cannot switch on one nobody verified.
 *
 * The decision is a pure function precisely so this can test it for real, rather than asserting on
 * source text the way the Edge-Function parity tests must.
 */

const ALL_VERIFIED = {
  hosted_checkout_enabled: true,
  webhook_signature_verified: true,
  callback_urls_verified: true,
  reconciliation_verified: true,
};

const ON = { providerCheckoutEnabled: true, providerGateEnabled: true };

describe("hosted checkout gate", () => {
  it("allows checkout only when every gate is open", () => {
    expect(hostedCheckoutBlockReason({ ...ON, capability: ALL_VERIFIED })).toBeNull();
  });

  it("refuses when there is no capability record at all", () => {
    /*
     * Absence of evidence is not evidence of readiness. A provider with no row has had nothing
     * verified about it, and treating that as permission is how an untested integration starts
     * charging people.
     */
    expect(hostedCheckoutBlockReason({ ...ON, capability: null })).toMatch(/no capability record/);
  });

  it.each([
    ["hosted_checkout_enabled", /hosted checkout is not verified/],
    ["webhook_signature_verified", /signature has not been verified/],
    ["callback_urls_verified", /callback URLs have not been verified/],
    ["reconciliation_verified", /reconciliation has not been verified/],
  ])("refuses when %s is false, and says so", (flag, expected) => {
    const reason = hostedCheckoutBlockReason({
      ...ON,
      capability: { ...ALL_VERIFIED, [flag]: false },
    });
    expect(reason).toMatch(expected);
  });

  it("refuses when the founder has not switched it on, even with everything verified", () => {
    // This is today's state: PayFast seeded blocked, both controls false. Verified by query
    // against staging on 2026-08-13.
    expect(
      hostedCheckoutBlockReason({ providerCheckoutEnabled: false, providerGateEnabled: true, capability: ALL_VERIFIED }),
    ).toMatch(/provider_checkout is switched off/);
    expect(
      hostedCheckoutBlockReason({ providerCheckoutEnabled: true, providerGateEnabled: false, capability: ALL_VERIFIED }),
    ).toMatch(/switched off for this provider/);
  });

  it("treats a null flag as not verified", () => {
    // The column is nullable, and `null` means nobody answered the question — which is the same
    // as "no" for the purpose of taking money.
    expect(
      hostedCheckoutBlockReason({ ...ON, capability: { ...ALL_VERIFIED, reconciliation_verified: null } }),
    ).toMatch(/reconciliation has not been verified/);
  });

  it("builds the control key the database actually holds", () => {
    // `payments.hosted_checkout.payfast`, read from operational_controls on 2026-08-13. A typo
    // here would silently resolve to "control missing" — which fails closed, so nothing would
    // break loudly and checkout would simply never turn on.
    expect(hostedCheckoutControlKey("payfast")).toBe("payments.hosted_checkout.payfast");
    expect(hostedCheckoutControlKey(" PayFast ")).toBe("payments.hosted_checkout.payfast");
  });
});

describe("the gate's placement", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("guards the checkout, and deliberately not the webhook", () => {
    /*
     * ⚠️ If the gate were on `confirm-payment`, switching a control off while a customer sat on
     * PayFast's payment page would mean their money arrives and the notification is refused —
     * cash in the bank with no booking against it. Starting a checkout is reversible; recording
     * one is not.
     */
    expect(read("supabase/functions/create-payment-session/index.ts")).toMatch(
      /hostedCheckoutBlockReason\(/,
    );
    expect(
      read("supabase/functions/confirm-payment/index.ts"),
      "the ITN handler must never refuse money because a gate closed",
    ).not.toMatch(/hostedCheckoutBlockReason/);
  });

  it("fails closed when it cannot read its own rules", () => {
    const source = read("supabase/functions/create-payment-session/index.ts");
    expect(source).toMatch(/gate lookup failed; failing closed/);
    expect(source).toMatch(/allowed: false/);
  });

  it("keeps the rules module free of Deno globals, so this suite can import it", () => {
    /*
     * ⚠️ This is a CI-only failure mode and it already bit once.
     *
     * When this module imported `governance-utils.ts` (which uses `Deno.env`), everything passed
     * locally — `vitest` does not type-check and `vite build` does not follow test files — while
     * `tsc --noEmit -p tsconfig.app.json` in CI followed the import chain out of THIS test and
     * reported five `Cannot find name 'Deno'` errors in a file the change never touched.
     *
     * `_shared/payfast.ts` is kept pure for the same reason and says so in its header.
     */
    /*
     * Comments are stripped first. The header of that module explains the `Deno.env` trap at
     * length, and a check that reads prose as code would fail on the very explanation of why the
     * rule exists — which is what happened on the first attempt at this test.
     */
    const code = read("supabase/functions/_shared/payment-provider-gate.ts")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(code, "the rules module must not reference Deno").not.toMatch(/\bDeno\./);
    expect(code, "the rules module must not import anything that might").not.toMatch(
      /^\s*import\s/m,
    );
  });
});
