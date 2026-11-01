import { describe, expect, it } from "vitest";
import { bookingCrewCap, changeBookingService, createBookingInput } from "./booking-flow";
import { crewCapFor as webCap, MULTI_XOOTER_SERVICES } from "./xoot-pricing";
import { crewCapFor as serverCap } from "../../supabase/functions/_shared/pricing";
import { parseBookingQuoteInput } from "../../supabase/functions/_shared/booking-quote";
import type { BookingService } from "./booking-contract";

const now = Date.parse("2026-10-28T10:00:00Z");
describe("founder crew eligibility — Airbnb and office only", () => {
  it.each(["regular", "express", "moving"] as const)("keeps %s solo on every size and refuses a crafted crew quote", service => {
    for (const size of ["small", "medium", "large"] as const) {
      expect(bookingCrewCap(service, size)).toBe(1);
      expect(webCap(service, size)).toBe(1);
      expect(serverCap(service, size)).toBe(1);
      const input = { ...createBookingInput(service, now), homeSize: size };
      expect(() => parseBookingQuoteInput(input, now)).not.toThrow();
      expect(() => parseBookingQuoteInput({ ...input, crewSize: 2 }, now)).toThrow(/Xooters/);
    }
  });
  it.each(["airbnb", "office"] as const)("keeps %s's existing crew quote available", service => {
    const input = { ...createBookingInput(service, now), crewSize: 2 };
    expect(bookingCrewCap(service, "medium")).toBeGreaterThan(1);
    expect(() => parseBookingQuoteInput(input, now)).not.toThrow();
  });
  it("resets a selected crew when changing to a solo service", () => {
    const input = { ...createBookingInput("office", now), crewSize: 4 };
    for (const service of ["regular", "express", "moving"] as BookingService[]) {
      expect(changeBookingService(input, service).crewSize).toBe(1);
    }
  });
  it("keeps laundry and unrecognised services solo in both pricing engines", () => {
    for (const service of ["laundry", "unknown"]) {
      expect(webCap(service, "large")).toBe(1);
      expect(serverCap(service, "large")).toBe(1);
    }
    expect([...MULTI_XOOTER_SERVICES].sort()).toEqual(["airbnb", "office"]);
  });
});
