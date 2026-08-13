import { describe, expect, it, vi } from "vitest";
import { checkRateLimit, resetRateLimitsForTests } from "./rate-limit";
import { sanitiseInput, sanitiseSearchParam } from "./sanitise";
import { BookingInput, ProfileUpdateInput, SupportCaseInput, XooterApplicationInput } from "./validators";

describe("phase 5 security helpers", () => {
  it("sanitises text and URL params before rendering", () => {
    expect(sanitiseInput("<img src=x onerror=alert(1)> Rosebank")).toBe("Rosebank");
    expect(sanitiseSearchParam("<script>alert(1)</script>".repeat(20))).not.toContain("<");
  });

  it("enforces client-side rate windows", () => {
    resetRateLimitsForTests();
    vi.useFakeTimers();
    expect(checkRateLimit("auth", 2, 1000)).toBe(true);
    expect(checkRateLimit("auth", 2, 1000)).toBe(true);
    expect(checkRateLimit("auth", 2, 1000)).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(checkRateLimit("auth", 2, 1000)).toBe(true);
    vi.useRealTimers();
  });

  it("validates critical form payloads", () => {
    expect(BookingInput.safeParse({ service_type: "residential", home_size: "small", address: "12 Long Street, Rosebank", date: "2026-06-14", time: "08:00", extras: [] }).success).toBe(true);
    expect(SupportCaseInput.safeParse({ category: "Booking", description: "Please help me with a booking issue that needs review.", booking_id: "" }).success).toBe(true);
    const xooterApplication = XooterApplicationInput.safeParse({ full_name: "Nomsa Dlamini", phone: "+27 82 123 4567", suburb: "Rosebank", years_experience: 5 });
    expect(xooterApplication.success).toBe(true);
    expect(xooterApplication.success ? xooterApplication.data.phone : "").toBe("+27821234567");
    const profileUpdate = ProfileUpdateInput.safeParse({ full_name: "Nomsa Dlamini", phone: "082 123 4567", address: "8 Oxford Road, Rosebank" });
    expect(profileUpdate.success).toBe(true);
    expect(profileUpdate.success ? profileUpdate.data.phone : "").toBe("0821234567");
  });
});
