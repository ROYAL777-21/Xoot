import { describe, expect, it } from "vitest";
import { bookingEntrySearch, bookingSlot, calendarWeek, sastDay, todayService, visibleTodayBookings, type TodayBooking } from "./today-handoff";

const visit = (scheduled_at: string, status = "assigned", service = "cleaning", service_type: string | null = "residential"): TodayBooking => ({ id: scheduled_at, scheduled_at, status, service, service_type });

describe("Today data and booking entry", () => {
  it("uses Johannesburg for day boundaries and selected-day rows", () => {
    expect(sastDay(new Date("2026-09-30T22:30:00Z"))).toBe("2026-10-01");
    const rows = [visit("2026-09-30T21:30:00Z"), visit("2026-09-30T22:30:00Z"), visit("2026-10-01T08:00:00Z", "cancelled")];
    expect(visibleTodayBookings(rows, "2026-10-01").map(row => row.id)).toEqual(["2026-09-30T22:30:00Z"]);
    expect(bookingSlot("2026-09-30T22:30:00Z")).toBe("morning");
    expect(calendarWeek("2026-10-01")).toEqual(["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03"]);
  });
  it("resolves the stored cleaning service from service_type", () => {
    expect(todayService(visit("2026-10-01T08:00:00Z"))).toBe("regular");
    expect(todayService(visit("2026-10-01T08:00:00Z", "assigned", "cleaning", "office"))).toBe("office");
  });
  it("preserves valid legacy booking inputs and excludes unrelated or invalid values", () => {
    expect(bookingEntrySearch("?service=airbnb&date=2026-10-01&address=14%20Example%20Street&role=admin")).toBe("service=airbnb&date=2026-10-01&address=14+Example+Street");
    expect(bookingEntrySearch("?service=invalid&date=2026-99-99&role=admin")).toBeNull();
    expect(bookingEntrySearch("?service=residential&frequency=weekly")).toBe("service=regular&frequency=weekly");
    expect(bookingEntrySearch("?xooter=12345678----------------------------&frequency=invalid")).toBeNull();
  });
});
