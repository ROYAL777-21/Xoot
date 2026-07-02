import { describe, expect, it } from "vitest";

import { resolveNotificationLink } from "./notification-routing";

describe("resolveNotificationLink", () => {
  it("keeps approved authenticated app notification routes", () => {
    expect(resolveNotificationLink("/app/bookings/booking-123")).toBe("/app/bookings/booking-123");
    expect(resolveNotificationLink("zoot://booking?id=booking-123")).toBe("/app/bookings/booking-123");
    expect(resolveNotificationLink("/zooter/jobs/job-123")).toBe("/zooter/jobs");
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
