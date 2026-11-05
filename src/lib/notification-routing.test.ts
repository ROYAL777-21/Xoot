import { describe, expect, it } from "vitest";

import {
  resolveNativeRouteForRoles,
  resolveNotificationLink,
  resolveNotificationLinkForRoles,
} from "./notification-routing";

describe("resolveNotificationLink", () => {
  it("keeps approved authenticated app notification routes", () => {
    expect(resolveNotificationLink("/app/bookings/booking-123")).toBe("/app/bookings/booking-123");
    expect(resolveNotificationLink("xoot://booking?id=booking-123")).toBe("/app/bookings/booking-123");
    expect(resolveNotificationLink("/xooter/jobs/job-123")).toBe("/xooter/jobs");
    expect(resolveNotificationLink("/care-plus")).toBe("/care-plus");
  });

  it("rejects external, auth, and unsafe notification routes", () => {
    expect(resolveNotificationLink("https://evil.example/app")).toBeNull();
    expect(resolveNotificationLink("/auth/reset#access_token=secret")).toBeNull();
    expect(resolveNotificationLink("/auth/callback?code=abc")).toBeNull();
    expect(resolveNotificationLink("/admin/ops")).toBeNull();
    expect(resolveNotificationLink("/app/bookings/../../support")).toBeNull();
  });
});

describe("role-aware notification routing", () => {
  it("keeps client routes for plain clients", () => {
    expect(resolveNotificationLinkForRoles("/app/bookings/booking-123", ["user"])).toBe(
      "/app/bookings/booking-123",
    );
    expect(resolveNotificationLinkForRoles("/app/loyalty", ["user"])).toBe("/app/loyalty");
  });

  it("rewrites client routes to the Xooter portal for Xooters", () => {
    expect(resolveNotificationLinkForRoles("/app/bookings/booking-123", ["user", "xooter"])).toBe(
      "/xooter/jobs",
    );
    expect(resolveNotificationLinkForRoles("/app", ["xooter"])).toBe("/xooter");
    expect(resolveNotificationLinkForRoles("/app/loyalty", ["xooter"])).toBe("/xooter");
  });

  it("keeps Xooter routes for Xooters", () => {
    expect(resolveNotificationLinkForRoles("/xooter/jobs", ["user", "xooter"])).toBe("/xooter/jobs");
    expect(resolveNotificationLinkForRoles("/xooter", ["xooter"])).toBe("/xooter");
  });

  it("admins keep every route on both surfaces", () => {
    expect(resolveNotificationLinkForRoles("/app/bookings/booking-123", ["user", "xooter", "admin"])).toBe(
      "/app/bookings/booking-123",
    );
    expect(resolveNotificationLinkForRoles("/xooter/jobs", ["admin"])).toBe("/xooter/jobs");
  });

  it("never opens a route the base resolver rejects, whatever the roles", () => {
    expect(resolveNotificationLinkForRoles("https://evil.example/app", ["user", "xooter"])).toBeNull();
    expect(resolveNotificationLinkForRoles("/admin/ops", ["xooter"])).toBeNull();
  });

  it("resolveNativeRouteForRoles applies the same rewrites to resolved deep links", () => {
    expect(resolveNativeRouteForRoles("/app/bookings/abc", ["xooter"])).toBe("/xooter/jobs");
    expect(resolveNativeRouteForRoles("/app/support", ["xooter"])).toBe("/xooter");
    expect(resolveNativeRouteForRoles("/app/support", ["user"])).toBe("/app/support");
    expect(resolveNativeRouteForRoles("/xooter/kyc", ["xooter"])).toBe("/xooter/kyc");
  });
});
