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
    expect(resolveNativeRoute("zoot://auth/reset#access_token=token&type=recovery")).toBe(
      "/auth/reset#access_token=token&type=recovery",
    );
  });

  it("maps zoot URL scheme shortcuts onto existing app routes", () => {
    expect(resolveNativeRoute("zoot://app/bookings/booking_456")).toBe("/app/bookings/booking_456");
    expect(resolveNativeRoute("zoot://bookings?id=booking-456")).toBe("/app/bookings/booking-456");
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
    expect(resolveNativeRoute("/admin/ops")).toBeNull();
    expect(resolveNativeRoute("zoot://app/bookings/../../support")).toBeNull();
    expect(resolveNativeRoute({ bookingId: "booking/with/slash" })).toBeNull();
  });
});
