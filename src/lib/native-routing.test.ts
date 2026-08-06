import { describe, expect, it } from "vitest";

import { resolveNativeRoute } from "./native-routing";

describe("resolveNativeRoute", () => {
  it("keeps supported app paths and strips non-auth query data", () => {
    expect(resolveNativeRoute("https://zoot.co.za/app/bookings/booking-123?gate_code=1234#details")).toBe(
      "/app/bookings/booking-123",
    );
    expect(resolveNativeRoute("/app/support/case-789?private_note=hidden")).toBe("/app/support");
  });

  it("preserves auth callback parameters needed for email verification and reset flows", () => {
    expect(resolveNativeRoute("https://zoot.co.za/auth/callback?code=abc&type=signup")).toBe(
      "/auth/callback?code=abc&type=signup",
    );
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
  });

  it("maps zoot URL scheme shortcuts onto existing app routes", () => {
    expect(resolveNativeRoute("zoot://app/bookings/booking_456")).toBe("/app/bookings/booking_456");
    expect(resolveNativeRoute("zoot://bookings?id=booking-456")).toBe("/app/bookings/booking-456");
    expect(resolveNativeRoute("zoot://book-cleaner")).toBe("/app");
    expect(resolveNativeRoute("https://xoot.co.za/app?intent=book_clean")).toBe("/app?intent=book_clean");
    expect(resolveNativeRoute("zoot://book?intent=book_clean&service=office&date=2026-07-03&area=Rosebank")).toBe(
      "/app?area=Rosebank&date=2026-07-03&intent=book_clean&service=office",
    );
    expect(resolveNativeRoute("zoot://book?intent=book_clean&gate_code=1234")).toBe("/app?intent=book_clean");
    expect(resolveNativeRoute("zoot://book?intent=https://evil.example&service=office")).toBe(
      "/app?service=office",
    );
    expect(resolveNativeRoute("zoot://book?intent=book_clean&area=../admin")).toBe("/app?intent=book_clean");
    expect(resolveNativeRoute("zoot://clean-house?intent=book_clean&date=2026-07-03&service=residential")).toBe(
      "/app?date=2026-07-03&intent=book_clean&service=residential",
    );
    expect(resolveNativeRoute("zoot://office-clean?intent=book_clean&service=office&access_code=1234")).toBe(
      "/app?intent=book_clean&service=office",
    );
    expect(resolveNativeRoute("zoot://airbnb-turnover?intent=book_clean&service=airbnb")).toBe(
      "/app?intent=book_clean&service=airbnb",
    );
    expect(resolveNativeRoute("zoot://care-plus/apply")).toBe("/care-plus/apply");
    expect(resolveNativeRoute("zoot://office-dashboard")).toBe("/app/properties/office");
  });

  it("maps structured push payloads to authenticated surfaces", () => {
    expect(resolveNativeRoute({ type: "booking_update", bookingId: "booking-789" })).toBe(
      "/app/bookings/booking-789",
    );
    expect(resolveNativeRoute({ data: { screen: "host_dashboard" } })).toBe("/app/properties/airbnb");
    expect(resolveNativeRoute({ payload: { event_type: "zoot_cred" } })).toBe("/app/loyalty");
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
    expect(resolveNativeRoute("zoot://app/bookings/../../support")).toBeNull();
    expect(resolveNativeRoute({ bookingId: "booking/with/slash" })).toBeNull();
  });
});
