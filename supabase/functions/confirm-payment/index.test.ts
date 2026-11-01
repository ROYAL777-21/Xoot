import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  handle: null as null | ((req: Request) => Promise<Response>),
  from: vi.fn(), claim: vi.fn(), settle: vi.fn(), postback: vi.fn(),
}));
vi.mock("../_shared/action-utils.ts", () => ({
  getServiceClient: () => ({ from: h.from }), handlePreflight: () => null,
  fail: (error: string, _origin: unknown, status = 400) => new Response(JSON.stringify({ error }), { status }),
  ok: (data: unknown) => new Response(JSON.stringify(data), { status: 200 }),
}));
vi.mock("../_shared/governance-utils.ts", () => ({ claimProviderEvent: h.claim }));
vi.mock("../_shared/payment-confirmation.ts", () => ({
  assertBookingCanConfirmPayment: async () => ({ ok: true }), applyBookingPaymentConfirmed: h.settle,
}));
beforeAll(async () => {
  vi.stubGlobal("Deno", { serve: (handler: typeof h.handle) => { h.handle = handler; }, env: {
    get: (key: string) => ({ PAYFAST_PASSPHRASE: "test-only", PAYFAST_MERCHANT_ID: "10000100", PAYFAST_MODE: "sandbox" })[key],
  } });
  vi.stubGlobal("fetch", h.postback);
  await import("./index");
});
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
  vi.clearAllMocks();
  h.postback.mockImplementation(async () => new Response("VALID"));
  h.claim.mockResolvedValue({ providerEventId: "event", payloadHash: "hash" });
  h.settle.mockResolvedValue({ payment_record_id: "payment", status: "paid" });
  h.from.mockImplementation(() => {
    const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ error: null, data: {
      id: "payment", user_id: "buyer", booking_id: "booking", amount: 289, currency: "ZAR", status: "pending",
      provider: "payfast", provider_reference: "TEST-1", payment_kind: "booking",
    } }) }; return q;
  });
});

const canonical = "merchant_id=10000100&m_payment_id=TEST-1&pf_payment_id=123456&payment_status=COMPLETE&amount_gross=289.00";
function fields(emptyField = false): [string, string][] {
  const base = canonical + (emptyField ? "&custom_str1=" : "");
  return [...new URLSearchParams(base).entries(), ["signature", createHash("md5").update(`${base}&passphrase=test-only`).digest("hex")]];
}
function request(entries = fields(), boundary?: string) {
  const body = boundary ? entries.map(([key, value]) => `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`).join("") + `--${boundary}--\r\n` : new URLSearchParams(entries).toString();
  return new Request("https://example.test/confirm-payment", { method: "POST", body, headers: {
    "Content-Type": boundary ? `multipart/form-data; boundary=${boundary}` : "application/x-www-form-urlencoded",
  } });
}

describe("PayFast notification HTTP boundary", () => {
  it("verifies an official-style multipart retry, including empty fields", async () => {
    expect((await h.handle!(request(fields(true), "PayFastRetryA"))).status).toBe(200);
    expect(h.postback.mock.calls[0][1].body).toBe(`${canonical}&custom_str1=`);
    expect(h.settle).toHaveBeenCalledOnce();
  });
  it("posts the signed notification fields back without the signature or passphrase", async () => {
    expect((await h.handle!(request())).status).toBe(200);
    expect(h.postback.mock.calls[0][1].body).toBe(canonical);
    expect(h.postback.mock.calls[0][0]).toBe("https://sandbox.payfast.co.za/eng/query/validate");
  });
  it("gives equivalent form and multipart retries the same provider-event payload identity", async () => {
    for (const boundary of [undefined, "PayFastRetryA", "PayFastRetryB"]) {
      expect((await h.handle!(request(fields(), boundary))).status).toBe(200);
    }
    const payloads = h.claim.mock.calls.map(call => call[1].rawPayload);
    expect(new Set(payloads).size).toBe(1);
    expect(payloads[0]).toBe(new URLSearchParams(fields()).toString());
  });
  it.each([undefined, "PayFastRetryA"])("rejects duplicate critical fields before any lookup (%s)", async boundary => {
    expect((await h.handle!(request([...fields(), ["m_payment_id", "ANOTHER"]], boundary))).status).toBe(400);
    expect(h.from).not.toHaveBeenCalled(); expect(h.postback).not.toHaveBeenCalled();
  });
  it.each([undefined, "PayFastRetryA"])("still rejects a bad signature before provider or database access (%s)", async boundary => {
    const entries = fields().map(([key, value]) => [key, key === "signature" ? "0".repeat(32) : value] as [string, string]);
    expect((await h.handle!(request(entries, boundary))).status).toBe(401);
    expect(h.from).not.toHaveBeenCalled(); expect(h.postback).not.toHaveBeenCalled();
  });
  it("rejects a file masquerading as a multipart payment field", async () => {
    const body = '--bad\r\nContent-Disposition: form-data; name="merchant_id"; filename="id.txt"\r\nContent-Type: text/plain\r\n\r\n10000100\r\n--bad--\r\n';
    expect((await h.handle!(new Request("https://example.test/confirm-payment", { method: "POST", body,
      headers: { "Content-Type": "multipart/form-data; boundary=bad" } }))).status).toBe(400);
    expect(h.postback).not.toHaveBeenCalled(); expect(h.from).not.toHaveBeenCalled();
  });
  it("rejects JSON instead of reinterpreting it as a signed form", async () => {
    expect((await h.handle!(new Request("https://example.test/confirm-payment", { method: "POST", body: "{}",
      headers: { "Content-Type": "application/json" } }))).status).toBe(415);
    expect(h.postback).not.toHaveBeenCalled(); expect(h.from).not.toHaveBeenCalled();
  });
});
