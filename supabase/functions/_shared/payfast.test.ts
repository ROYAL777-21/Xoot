import { describe, expect, it, vi } from "vitest";
import {
  amountMatches,
  recordAmountCents,
  payfastGrossCents,
  merchantMatches,
  buildSignatureBase,
  md5Hex,
  normaliseStatus,
  payfastUrlEncode,
  sourceAllowed,
  timingSafeEqual,
  validateWithPayFast,
  verifySignature,
} from "./payfast.ts";

/**
 * ── Why the MD5 vectors come first ─────────────────────────────────────────────────────────────
 * Deno's WebCrypto has no MD5, so `md5Hex` is a local implementation, and a subtly wrong one would
 * not look wrong — it would produce a plausible 32-character hex string that never matches PayFast,
 * rejecting every genuine payment. The symptom would be "PayFast integration doesn't work", which
 * points at credentials, not at arithmetic.
 *
 * These are the RFC 1321 test suite values. They are the only thing standing between this file and
 * a very expensive week.
 */
describe("md5Hex — RFC 1321 vectors", () => {
  const vectors: Array<[string, string]> = [
    ["", "d41d8cd98f00b204e9800998ecf8427e"],
    ["a", "0cc175b9c0f1b6a831c399e269772661"],
    ["abc", "900150983cd24fb0d6963f7d28e17f72"],
    ["message digest", "f96b697d7cb7938d525a2f31aaf161d0"],
    ["abcdefghijklmnopqrstuvwxyz", "c3fcd3d76192e4007dfb496cca67e13b"],
    ["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", "d174ab98d277d9f5a5611c2c9f419d9f"],
    ["12345678901234567890123456789012345678901234567890123456789012345678901234567890", "57edf4a22be3c955ac49da2e2107b67a"],
  ];

  it.each(vectors)("md5(%j)", (input, expected) => {
    expect(md5Hex(input)).toBe(expected);
  });

  it("crosses the 64-byte block boundary correctly", () => {
    // 56-63 bytes is where length padding spills into a second block. Off-by-one here passes the
    // short vectors above and fails on real ITN bodies, which are always longer.
    expect(md5Hex("a".repeat(55))).toBe("ef1772b6dff9a122358552954ad0df65");
    expect(md5Hex("a".repeat(56))).toBe("3b0c8ac703f828b04c6c197006d17218");
    expect(md5Hex("a".repeat(64))).toBe("014842d480b571495a4a0363793f7367");
  });
});

describe("payfastUrlEncode — PHP urlencode, not encodeURIComponent", () => {
  it("encodes spaces as + rather than %20", () => {
    expect(payfastUrlEncode("Deep Clean")).toBe("Deep+Clean");
  });

  it("uses uppercase hex", () => {
    // encodeURIComponent gives %3a for ':' in some engines' output casing; PayFast wants %3A.
    expect(payfastUrlEncode("a:b")).toBe("a%3Ab");
    expect(payfastUrlEncode("a/b")).toBe("a%2Fb");
  });

  it("escapes the characters encodeURIComponent leaves alone", () => {
    // These are the ones that silently differ and cause a mismatch nobody can see by eye.
    expect(payfastUrlEncode("!")).toBe("%21");
    expect(payfastUrlEncode("(")).toBe("%28");
    expect(payfastUrlEncode("*")).toBe("%2A");
    expect(payfastUrlEncode("'")).toBe("%27");
  });
});

describe("buildSignatureBase", () => {
  it("preserves received order, never alphabetical", () => {
    // The single most common cause of a signature mismatch. If this ever starts sorting, every
    // payment fails and the hash still looks correct.
    const params = new URLSearchParams();
    params.append("m_payment_id", "XOOT-1");
    params.append("amount", "387.00");
    params.append("item_name", "Deep Clean");
    expect(buildSignatureBase(params, "")).toBe("m_payment_id=XOOT-1&amount=387.00&item_name=Deep+Clean");
  });

  it("excludes the signature field itself", () => {
    const params = new URLSearchParams();
    params.append("amount", "10.00");
    params.append("signature", "deadbeef");
    expect(buildSignatureBase(params, "")).toBe("amount=10.00");
  });

  it("drops empty values, as PayFast does", () => {
    const params = new URLSearchParams();
    params.append("amount", "10.00");
    params.append("name_last", "");
    params.append("item_name", "Clean");
    expect(buildSignatureBase(params, "")).toBe("amount=10.00&item_name=Clean");
  });

  it("appends the passphrase when set, and not when blank", () => {
    const params = new URLSearchParams();
    params.append("amount", "10.00");
    expect(buildSignatureBase(params, "s3cret")).toBe("amount=10.00&passphrase=s3cret");
    expect(buildSignatureBase(params, "   ")).toBe("amount=10.00");
  });
});

describe("verifySignature", () => {
  const signed = (passphrase: string) => {
    const params = new URLSearchParams();
    params.append("m_payment_id", "XOOT-42");
    params.append("amount_gross", "387.00");
    params.append("payment_status", "COMPLETE");
    params.append("signature", md5Hex(buildSignatureBase(params, passphrase)));
    return params;
  };

  it("accepts a correctly signed notification", () => {
    expect(verifySignature(signed("s3cret"), "s3cret").ok).toBe(true);
  });

  it("REJECTS a tampered amount", () => {
    // The defect this exists for: an attacker who replays a real ITN with the amount raised.
    const params = signed("s3cret");
    params.set("amount_gross", "1.00");
    expect(verifySignature(params, "s3cret")).toMatchObject({ ok: false, reason: "signature mismatch" });
  });

  it("REJECTS the right body signed with the wrong passphrase", () => {
    expect(verifySignature(signed("wrong"), "s3cret").ok).toBe(false);
  });

  it("REJECTS a missing signature rather than treating absence as valid", () => {
    const params = new URLSearchParams();
    params.append("amount_gross", "387.00");
    expect(verifySignature(params, "s3cret")).toMatchObject({ ok: false, reason: "signature field missing" });
  });

  it("REJECTS when the passphrase is unset but the sender used one", () => {
    // A misconfigured deploy must fail closed, not accept everything.
    expect(verifySignature(signed("s3cret"), "").ok).toBe(false);
  });
});

describe("timingSafeEqual", () => {
  it("matches equal values regardless of case or padding", () => {
    expect(timingSafeEqual("ABCdef", "abcdef ")).toBe(true);
  });
  it("rejects different lengths without throwing", () => {
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });
});

describe("amountMatches — integer cents, never floats", () => {
  it("accepts an exact match", () => {
    expect(amountMatches("387.00", 38700).ok).toBe(true);
  });

  it("rejects even a one-cent underpayment or overcharge", () => {
    expect(amountMatches("386.99", 38700).ok).toBe(false);
    expect(amountMatches("387.01", 38700).ok).toBe(false);
  });

  it("rejects malformed decimals, exponent values, partial numbers and negative amounts", () => {
    for (const value of ["387", "387.0", "387.000", "387.00abc", "3.87e2", "-387.00", "", " 387.00", "0.001"]) {
      expect(amountMatches(value, 38700).ok).toBe(false);
    }
    expect(payfastGrossCents("0.01")).toBe(1);
    expect(payfastGrossCents("8.70")).toBe(870);
    expect(recordAmountCents("8.7")).toBe(870);
    expect(recordAmountCents(8.7)).toBe(870);
    expect(recordAmountCents("8.701")).toBeNull();
    expect(recordAmountCents(1e20)).toBeNull();
  });

  it("REJECTS an underpayment", () => {
    expect(amountMatches("1.00", 38700)).toMatchObject({ ok: false });
  });

  it("REJECTS a non-numeric amount rather than coercing it to zero", () => {
    // Number("") is 0, which would compare "equal" against a zero-rand order.
    expect(amountMatches("", 38700).ok).toBe(false);
    expect(amountMatches(undefined, 38700).ok).toBe(false);
  });

  it("handles a value that float arithmetic gets wrong", () => {
    // 0.1 + 0.2 territory: 8.7 * 100 is 869.9999... in IEEE 754.
    expect(amountMatches("8.70", 870).ok).toBe(true);
  });
});

describe("validateWithPayFast — fails closed", () => {
  it("accepts VALID", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, text: async () => "VALID" });
    expect((await validateWithPayFast("a=b", "https://x", fetchImpl as never)).ok).toBe(true);
  });

  it.each(["INVALID", "VALIDATION FAILED", "VALID but reversed", "VALID\\nINVALID", "", "PENDING"])(
    "REJECTS any postback that is not exactly VALID (%s)", async (message) => {
      const fetchImpl = vi.fn().mockResolvedValue({ ok: true, text: async () => message });
      expect((await validateWithPayFast("a=b", "https://x", fetchImpl as never)).ok).toBe(false);
    },
  );

  it("REJECTS when PayFast is unreachable, rather than assuming the best", async () => {
    // An integration that credits an order when its verifier is down can be credited by taking the
    // verifier down.
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network"));
    expect((await validateWithPayFast("a=b", "https://x", fetchImpl as never)).ok).toBe(false);
  });

  it("REJECTS a non-200", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 502, text: async () => "" });
    expect((await validateWithPayFast("a=b", "https://x", fetchImpl as never)).ok).toBe(false);
  });
});

describe("sourceAllowed — skips loudly when unconfigured", () => {
  it("skips when the allowlist is empty", () => {
    // Deliberate: the list could not be read from PayFast's docs, and a wrong list rejects real
    // payments silently. The caller logs the skip.
    expect(sourceAllowed("1.2.3.4", "")).toMatchObject({ ok: true, skipped: true });
  });

  it("allows a listed address", () => {
    expect(sourceAllowed("197.97.145.144", "197.97.145.144,41.74.179.194")).toMatchObject({ ok: true, skipped: false });
  });

  it("REJECTS an unlisted address once a list exists", () => {
    expect(sourceAllowed("8.8.8.8", "197.97.145.144")).toMatchObject({ ok: false });
  });

  it("uses the first hop of an X-Forwarded-For chain", () => {
    expect(sourceAllowed("197.97.145.144, 10.0.0.1", "197.97.145.144")).toMatchObject({ ok: true });
  });
});

describe("normaliseStatus", () => {
  it("only COMPLETE is COMPLETE", () => {
    expect(normaliseStatus("COMPLETE")).toBe("COMPLETE");
    expect(normaliseStatus("complete")).toBe("COMPLETE");
    expect(normaliseStatus("completed")).toBe("UNKNOWN");
    expect(normaliseStatus(undefined)).toBe("UNKNOWN");
  });
});

describe("PayFast merchant identity / checkout record binding", () => {
  it("matches only the configured merchant identifier and fails closed if unset", () => {
    expect(merchantMatches("10000100", "10000100")).toBe(true);
    expect(merchantMatches("10000101", "10000100")).toBe(false);
    expect(merchantMatches("10000100", "")).toBe(false);
    expect(merchantMatches(null, "10000100")).toBe(false);
    expect(merchantMatches("10000100", "unconfigured")).toBe(false);
  });

  it("requires exact cents and rejects a mismatched signed notification", () => {
    expect(amountMatches("500.00", recordAmountCents("500.00")!).ok).toBe(true);
    expect(amountMatches("499.99", recordAmountCents("500.00")!).ok).toBe(false);
  });
});
