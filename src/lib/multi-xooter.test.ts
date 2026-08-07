import { describe, expect, it } from "vitest";
import { MAX_XOOTERS, MIN_HOURS_PER_XOOTER, isPriced, quote, xooterOptionsFor } from "./xoot-pricing";

/**
 * Multi-Xooter booking, the part that decides money.
 *
 * The rule under test: **hours on the ladder are labour hours.** Adding a Xooter splits the
 * same work and finishes sooner for the same price. It does not multiply the bill.
 *
 * These assertions exist to stop that quietly becoming per-Xooter pricing, which would raise
 * a 6-hour regular clean from R310 to R620 without anyone approving R620. That is exactly the
 * kind of change someone makes on the reasonable-sounding assumption that two cleaners must
 * cost twice as much. If the founder decides otherwise, these should fail loudly and be
 * rewritten deliberately — not deleted quietly.
 */
describe("multi-Xooter pricing", () => {
  const priced = (hours: number, xooterCount?: number) => {
    const result = quote({ service: "regular", hours, xooterCount, bookingCover: false });
    if (!isPriced(result)) throw new Error(`expected a price, got: ${result.reason}`);
    return result;
  };

  it("charges the same regardless of how many Xooters share the job", () => {
    const solo = priced(6, 1);
    expect(priced(6, 2).baseCents).toBe(solo.baseCents);
    expect(priced(6, 3).baseCents).toBe(solo.baseCents);
    expect(solo.baseCents).toBe(31000); // R310, the approved ZD-020 rung
  });

  it("is not per-Xooter multiplication", () => {
    // The specific wrong answer this guards against.
    expect(priced(6, 2).totalCents).not.toBe(priced(6, 1).totalCents * 2);
  });

  it("shortens the job instead of raising the price", () => {
    expect(priced(6, 1).elapsedHours).toBe(6);
    expect(priced(6, 2).elapsedHours).toBe(3);
    expect(priced(6, 3).elapsedHours).toBe(2);
    expect(priced(6, 4).elapsedHours).toBe(1.5);
  });

  it("reports the per-Xooter shift, which is what a payout is owed on", () => {
    const pair = priced(8, 2);
    expect(pair.hoursPerXooter).toBe(4);
    // Labour hours are conserved: nobody is paid for time that was not sold.
    expect(pair.hoursPerXooter * pair.xooterCount).toBe(8);
  });

  it("defaults to one Xooter when the caller says nothing", () => {
    const result = priced(6);
    expect(result.xooterCount).toBe(1);
    expect(result.elapsedHours).toBe(6);
  });

  it("refuses a split that would send someone out for less than the minimum shift", () => {
    // 4 hours across 4 Xooters is 1 hour each, under MIN_HOURS_PER_XOOTER.
    const result = quote({ service: "regular", hours: 4, xooterCount: 4 });
    expect(isPriced(result)).toBe(false);
    if (!isPriced(result)) expect(result.reason).toContain(String(MIN_HOURS_PER_XOOTER));
  });

  it("refuses a split that does not land on a half-hour step", () => {
    // 3.5 across 2 is 1h45 — not schedulable, so 3.5 stays a one-Xooter job.
    const result = quote({ service: "regular", hours: 3.5, xooterCount: 2 });
    expect(isPriced(result)).toBe(false);
    if (!isPriced(result)) expect(result.reason).toContain("half-hour");
  });

  it("rejects nonsense counts rather than coercing them", () => {
    for (const count of [0, -1, 1.5]) {
      expect(isPriced(quote({ service: "regular", hours: 6, xooterCount: count }))).toBe(false);
    }
    expect(isPriced(quote({ service: "regular", hours: 6, xooterCount: MAX_XOOTERS + 1 }))).toBe(false);
  });

  it("reports an off-ladder hour count as a ladder problem, not a split problem", () => {
    // 6.25 is not on the ladder at all; the message must say so rather than blame the split.
    const result = quote({ service: "regular", hours: 6.25, xooterCount: 2 });
    expect(isPriced(result)).toBe(false);
    if (!isPriced(result)) expect(result.reason).toContain("ladder");
  });

  it("offers only bookable counts to the selector", () => {
    expect(xooterOptionsFor("regular", 6)).toEqual([1, 2, 3, 4]);
    // 3.5 is the shortest regular clean and cannot be shared.
    expect(xooterOptionsFor("regular", 3.5)).toEqual([1]);
  });

  it("never offers a count that would fail to price", () => {
    for (const service of ["regular", "office", "express", "airbnb", "moving"] as const) {
      for (const hours of [1, 2, 3, 3.5, 4, 5, 6, 7.5, 8, 10]) {
        for (const count of xooterOptionsFor(service, hours)) {
          expect(isPriced(quote({ service, hours, xooterCount: count }))).toBe(true);
        }
      }
    }
  });

  it("keeps add-ons and cover per booking, not per Xooter", () => {
    // Two Xooters do not mean two Booking Covers or two add-on charges.
    const solo = quote({ service: "regular", hours: 6, addOns: 2, bookingCover: true });
    const pair = quote({ service: "regular", hours: 6, xooterCount: 2, addOns: 2, bookingCover: true });
    if (!isPriced(solo) || !isPriced(pair)) throw new Error("expected prices");
    expect(pair.addOnsCents).toBe(solo.addOnsCents);
    expect(pair.coverCents).toBe(solo.coverCents);
    expect(pair.totalCents).toBe(solo.totalCents);
  });
});
