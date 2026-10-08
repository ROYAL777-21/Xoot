import { webcrypto } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { handleBookingQuoteRequest } from "../../supabase/functions/_shared/booking-quote-handler";

const now = Date.parse("2026-09-27T10:00:00Z");
beforeAll(() => vi.stubGlobal("crypto", webcrypto));
afterAll(() => vi.unstubAllGlobals());
const input = {
  contractVersion: 1, service: "airbnb", propertyType: "airbnb", homeSize: "medium",
  hours: 5.5, crewSize: 2, addOns: [], linen: "none", date: "2026-09-28", time: "08:00",
  frequency: "once", repeatDays: [], referralCode: "", requestedCreditCents: 0, coverRequested: false,
};
const facts = {
  buyerId: "verified-buyer", carePlusMember: false, availableCreditCents: 0,
  referralRecord: null, completedBookingCount: 0, hasPriorRedemption: false, coverAvailable: false,
};
function dependencies() {
  return {
    isAllowedOrigin: (origin: string | null) => !origin || origin === "https://xoot.co.za",
    corsHeaders: () => ({ "Access-Control-Allow-Origin": "https://xoot.co.za" }),
    authenticate: vi.fn(async () => "verified-buyer" as string | null),
    consumeLimit: vi.fn(async () => true),
    loadFacts: vi.fn(async () => facts),
    now: () => now,
  };
}
function request(body: unknown = input, options: RequestInit = {}) {
  return new Request("https://example.test/functions/v1/get-booking-quote", {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "https://xoot.co.za" },
    body: JSON.stringify(body), ...options,
  });
}

describe("authenticated booking quote endpoint", () => {
  it("returns the approved R393 crew base and one itemized total without authorizing the legacy writer", async () => {
    const deps = dependencies();
    const response = await handleBookingQuoteRequest(request({ ...input, buyerId: "attacker-chosen", totalCents: 1 }), deps);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body.data.quote).toMatchObject({ baseCents: 39300, totalCents: 43200, currency: "ZAR" });
    expect(body.data.quote.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(body.data.bookingSubmissionAvailable).toBe(false);
    expect(deps.loadFacts).toHaveBeenCalledWith("verified-buyer", "", now);
    expect(JSON.stringify(body)).not.toContain("attacker-chosen");
  });
  it("requires authentication before reading account facts", async () => {
    const deps = dependencies(); deps.authenticate.mockResolvedValue(null);
    const response = await handleBookingQuoteRequest(request(), deps);
    expect(response.status).toBe(401);
    expect(deps.loadFacts).not.toHaveBeenCalled();
    expect(deps.consumeLimit).not.toHaveBeenCalled();
  });
  it("accepts authenticated native requests without an Origin header", async () => {
    const response = await handleBookingQuoteRequest(request(input, { headers: { "Content-Type": "application/json" } }), dependencies());
    expect(response.status).toBe(200);
  });
  it("rejects an unapproved origin before authentication", async () => {
    const deps = dependencies();
    expect((await handleBookingQuoteRequest(request(input, { headers: { Origin: "https://untrusted.test" } }), deps)).status).toBe(403);
    expect(deps.authenticate).not.toHaveBeenCalled();
  });
  it("handles preflight and disallows reads through GET", async () => {
    const deps = dependencies();
    expect((await handleBookingQuoteRequest(request(null, { method: "OPTIONS", body: null }), deps)).status).toBe(204);
    expect((await handleBookingQuoteRequest(request(null, { method: "GET", body: null }), deps)).status).toBe(405);
    expect(deps.authenticate).not.toHaveBeenCalled();
  });
  it("rate limits the authenticated account before loading facts", async () => {
    const deps = dependencies(); deps.consumeLimit.mockResolvedValue(false);
    const response = await handleBookingQuoteRequest(request(), deps);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("300");
    expect(deps.consumeLimit).toHaveBeenCalledWith("verified-buyer");
    expect(deps.loadFacts).not.toHaveBeenCalled();
  });
  it.each([null, [], { ...input, crewSize: "2" }, { ...input, contractVersion: 0 }])(
    "rejects invalid input before database reads: %j", async (body) => {
      const deps = dependencies();
      expect((await handleBookingQuoteRequest(request(body), deps)).status).toBe(400);
      expect(deps.loadFacts).not.toHaveBeenCalled();
    },
  );
  it("rejects oversized bodies without trusting Content-Length", async () => {
    const deps = dependencies();
    const response = await handleBookingQuoteRequest(request({ ...input, notes: "x".repeat(9000) }), deps);
    expect(response.status).toBe(413);
    expect(deps.loadFacts).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON and unsupported media types", async () => {
    expect((await handleBookingQuoteRequest(request(null, { body: "{" }), dependencies())).status).toBe(400);
    expect((await handleBookingQuoteRequest(request(input, { headers: { "Content-Type": "text/plain" } }), dependencies())).status).toBe(415);
  });
  it("does not expose database errors or private facts", async () => {
    const deps = dependencies(); deps.loadFacts.mockRejectedValue(new Error("secret connection details"));
    const response = await handleBookingQuoteRequest(request(), deps);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
  });
  it("fails closed if account facts do not belong to the verified buyer", async () => {
    const deps = dependencies(); deps.loadFacts.mockResolvedValue({ ...facts, buyerId: "another-account" });
    expect((await handleBookingQuoteRequest(request(), deps)).status).toBe(503);
  });
});
