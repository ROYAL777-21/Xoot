import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  amountMatches, merchantMatches, payfastGrossCents, recordAmountCents,
  validateWithPayFast,
} from "../../supabase/functions/_shared/payfast";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const itn = read("supabase/functions/confirm-payment/index.ts");
const checkout = read("supabase/functions/create-payment-session/index.ts");

describe("PayFast payment acceptance invariant — provider message is never a receipt", () => {
  it("matches signed ITNs to Xoot's configured eight-digit merchant account", () => {
    expect(merchantMatches("10000100", "10000100")).toBe(true);
    expect(merchantMatches("10000100", "10000101")).toBe(false);
    expect(merchantMatches("10000100", "")).toBe(false);
    expect(itn).toContain("merchantMatches(params.get(\"merchant_id\"), Deno.env.get(\"PAYFAST_MERCHANT_ID\"))");
    expect(itn).toContain('params.getAll(field).length !== 1');
  });

  it("accepts only exact integer cent amounts, refusing one-cent drift and invalid decimal encodings", () => {
    expect(recordAmountCents("125.01")).toBe(12501);
    expect(recordAmountCents(125.01)).toBe(12501);
    expect(recordAmountCents("125.001")).toBeNull();
    expect(payfastGrossCents("125.01")).toBe(12501);
    expect(payfastGrossCents("125.0")).toBeNull();
    expect(payfastGrossCents("125.01garbage")).toBeNull();
    expect(amountMatches("125.01", 12501).ok).toBe(true);
    expect(amountMatches("125.00", 12501).ok).toBe(false);
    expect(amountMatches("125.02", 12501).ok).toBe(false);
    expect(checkout).toContain("recordAmountCents(payment.amount)");
    expect(itn).toContain("amountMatches(grossAmount, expectedCents)");
    expect(itn).not.toMatch(/Math\.round\(Number\(payment\.amount\)/);
  });

  it.each(["VALIDATION FAILED", "VALID but not really", "VALID\nINVALID"])(
    "refuses spoofable PayFast validation responses (%s)", async message => {
      const response = await validateWithPayFast("amount_gross=125.01", "https://example.test/validate",
        async () => new Response(message, { status: 200 }));
      expect(response.ok).toBe(false);
    },
  );

  it("rejects unpersisted checkout routing and refuses to credit wrong provider records", () => {
    expect(checkout).toContain("if (routingError || !routed?.id)");
    expect(itn).toContain('if (payment.provider !== "payfast")');
    expect(itn).toContain('applyBookingPaymentConfirmed(supa');
    expect(itn).not.toContain('if (payment.status === "paid" || payment.status === "admin_confirmed")');
    expect(itn).toContain("pf_payment_id");
    expect(itn).toContain('claimProviderEvent(');
    expect(itn).toContain('.neq("status", "processed")');
  });
});
