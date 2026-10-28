import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { payfastUrlEncode, verifySignature } from "../../supabase/functions/_shared/payfast";

// Independent literal canonical strings follow PayFast's Notification.php, rather than
// round-tripping through Xoot's own outbound signer. All values here are synthetic.
const signedNotification = (canonical: string, fields: [string, string][]) => {
  const params = new URLSearchParams(fields);
  params.append("signature", createHash("md5").update(`${canonical}&passphrase=test-only`).digest("hex"));
  return params;
};

describe("PayFast's inbound notification signature contract", () => {
  it("includes empty fields received in a notification", () => {
    const params = signedNotification("m_payment_id=TEST-1&custom_str1=&amount_gross=289.00&payment_status=COMPLETE", [
      ["m_payment_id", "TEST-1"], ["custom_str1", ""], ["amount_gross", "289.00"], ["payment_status", "COMPLETE"],
    ]);
    expect(verifySignature(params, "test-only")).toEqual({ ok: true });
    params.delete("custom_str1");
    expect(verifySignature(params, "test-only").ok).toBe(false);
  });

  it("preserves notification value whitespace covered by the signature", () => {
    const params = signedNotification("m_payment_id=TEST-2&item_name=+Test+visit+&amount_gross=289.00", [
      ["m_payment_id", "TEST-2"], ["item_name", " Test visit "], ["amount_gross", "289.00"],
    ]);
    expect(verifySignature(params, "test-only").ok).toBe(true);
    params.set("item_name", "Test visit");
    expect(verifySignature(params, "test-only").ok).toBe(false);
  });

  it("encodes a tilde as PHP urlencode does", () => {
    expect(payfastUrlEncode("Test~visit")).toBe("Test%7Evisit");
    const params = signedNotification("m_payment_id=TEST-3&item_name=Test%7Evisit", [
      ["m_payment_id", "TEST-3"], ["item_name", "Test~visit"],
    ]);
    expect(verifySignature(params, "test-only").ok).toBe(true);
  });
});
