import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveNativeRoute } from "./native-routing";

describe("resolveNativeRoute", () => {
  it("keeps supported app paths and strips non-auth query data", () => {
    expect(resolveNativeRoute("https://xoot.co.za/app/bookings/booking-123?gate_code=1234#details")).toBe(
      "/app/bookings/booking-123",
    );
    expect(resolveNativeRoute("/app/support/case-789?private_note=hidden")).toBe("/app/support");
  });

  it("preserves auth callback parameters needed for email verification and reset flows", () => {
    expect(resolveNativeRoute("https://xoot.co.za/auth/callback?code=abc&type=signup")).toBe(
      "/auth/callback?code=abc&type=signup",
    );
    /*
     * PRE-RENAME identities, kept working on purpose (#34, ZD-028).
     *
     * A link shared before the rename, or an OAuth client whose redirect URI has not been updated
     * yet, still resolves. Deleting these would let someone "tidy up" the protocol list and turn a
     * missed allowlist entry into a sign-in that dead-ends.
     */
    expect(resolveNativeRoute("zoot://callback?code=abc&next=%2Fapp")).toBe(
      "/auth/callback?code=abc&next=%2Fapp",
    );
    expect(resolveNativeRoute("za.co.zoot.app://callback?code=abc&type=oauth")).toBe(
      "/auth/callback?code=abc&type=oauth",
    );
    expect(resolveNativeRoute("za.co.zoothome.app://callback?code=abc&type=oauth")).toBe(
      "/auth/callback?code=abc&type=oauth",
    );
    expect(resolveNativeRoute("zoot://auth/reset#access_token=token&type=recovery")).toBe(
      "/auth/reset#access_token=token&type=recovery",
    );

    // The current scheme.
    expect(resolveNativeRoute("xoot://callback?code=abc&next=%2Fapp")).toBe(
      "/auth/callback?code=abc&next=%2Fapp",
    );
    expect(resolveNativeRoute("za.co.xoot.app://callback?code=abc&type=oauth")).toBe(
      "/auth/callback?code=abc&type=oauth",
    );
    expect(resolveNativeRoute("xoot://auth/reset#access_token=token&type=recovery")).toBe(
      "/auth/reset#access_token=token&type=recovery",
    );
  });

  it("maps xoot URL scheme shortcuts onto existing app routes", () => {
    expect(resolveNativeRoute("xoot://app/bookings/booking_456")).toBe("/app/bookings/booking_456");
    expect(resolveNativeRoute("xoot://bookings?id=booking-456")).toBe("/app/bookings/booking-456");
    expect(resolveNativeRoute("xoot://book-cleaner")).toBe("/app");
    expect(resolveNativeRoute("https://xoot.co.za/app?intent=book_clean")).toBe("/app?intent=book_clean");
    expect(resolveNativeRoute("xoot://book?intent=book_clean&service=office&date=2026-07-03&area=Rosebank")).toBe(
      "/app?area=Rosebank&date=2026-07-03&intent=book_clean&service=office",
    );
    expect(resolveNativeRoute("xoot://book?intent=book_clean&gate_code=1234")).toBe("/app?intent=book_clean");
    expect(resolveNativeRoute("xoot://book?intent=https://evil.example&service=office")).toBe(
      "/app?service=office",
    );
    expect(resolveNativeRoute("xoot://book?intent=book_clean&area=../admin")).toBe("/app?intent=book_clean");
    expect(resolveNativeRoute("xoot://clean-house?intent=book_clean&date=2026-07-03&service=residential")).toBe(
      "/app?date=2026-07-03&intent=book_clean&service=residential",
    );
    expect(resolveNativeRoute("xoot://office-clean?intent=book_clean&service=office&access_code=1234")).toBe(
      "/app?intent=book_clean&service=office",
    );
    expect(resolveNativeRoute("xoot://airbnb-turnover?intent=book_clean&service=airbnb")).toBe(
      "/app?intent=book_clean&service=airbnb",
    );
    expect(resolveNativeRoute("xoot://care-plus/apply")).toBe("/care-plus/apply");
    expect(resolveNativeRoute("xoot://office-dashboard")).toBe("/app/properties/office");
  });

  it("maps structured push payloads to authenticated surfaces", () => {
    expect(resolveNativeRoute({ type: "booking_update", bookingId: "booking-789" })).toBe(
      "/app/bookings/booking-789",
    );
    expect(resolveNativeRoute({ data: { screen: "host_dashboard" } })).toBe("/app/properties/airbnb");
    expect(resolveNativeRoute({ payload: { event_type: "xoot_cred" } })).toBe("/app/loyalty");
  });

  it("only treats source_id as a booking id for booking-source payloads", () => {
    expect(resolveNativeRoute({ source_table: "bookings", source_id: "booking-abc" })).toBe(
      "/app/bookings/booking-abc",
    );
    expect(resolveNativeRoute({ source_table: "trust_incidents", source_id: "incident-abc" })).toBeNull();
  });

  it("rejects unknown routes and unsafe path segments", () => {
    expect(resolveNativeRoute("https://evil.example/app")).toBeNull();
    expect(resolveNativeRoute("http://evil.example/app")).toBeNull();
    expect(resolveNativeRoute("http://localhost:4173/app?intent=book_clean")).toBe("/app?intent=book_clean");
    expect(resolveNativeRoute("/admin/ops")).toBeNull();
    expect(resolveNativeRoute("xoot://app/bookings/../../support")).toBeNull();
    expect(resolveNativeRoute({ bookingId: "booking/with/slash" })).toBeNull();
  });
});

/**
 * The allow-list is a trust boundary: anything on it can turn a URL into an in-app route.
 * A host Xoot does not control — a lapsed domain someone else re-registers — is a deep-link
 * injection route, so the list must name only live Xoot hosts.
 */
describe("the deep-link host allow-list", () => {
  const source = readFileSync(join(process.cwd(), "src/lib/native-routing.ts"), "utf8");

  it("names no domain outside xoot.co.za", () => {
    const list = /const allowedWebHosts = new Set\(\[([^\]]*)\]\)/.exec(source);
    expect(list, "could not find allowedWebHosts").toBeTruthy();
    const hosts = [...list![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(hosts.length).toBeGreaterThan(0);
    for (const host of hosts) {
      expect(host === "xoot.co.za" || host.endsWith(".xoot.co.za"), `${host} is not a Xoot host`).toBe(true);
    }
  });

  it("rejects a link from the retired domain", () => {
    // `zoot.co.za`, removed 2026-08-07. Written literally rather than derived, because the
    // 2026-08-13 schema rename swept this file and briefly turned this assertion into a claim
    // that the LIVE domain is rejected — a test that passes while asserting the opposite of its
    // own name.
    expect(resolveNativeRoute("https://zoot.co.za/app/bookings")).toBeNull();
  });
});
