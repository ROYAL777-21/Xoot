import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_XOOTERS,
  MULTI_XOOTER_SERVICES,
  isPriced,
  multiXooterDiscountRate,
  quote,
  xooterOptionsFor,
} from "./xoot-pricing";

/**
 * Legacy client/writer compatibility, retained until the one-job booking cutover.
 * ZD-038 approves shared-job crew pricing. New web/native quote screens use the server
 * booking-quote contract and cannot submit to this older N-row writer. These tests describe
 * the still-deployed legacy pair; booking-quote tests cover the newly approved model.
 */
const serverSrc = readFileSync(
  join(process.cwd(), "supabase/functions/create-booking/index.ts"),
  "utf8",
);

describe("multi-Xooter pricing agrees with the server", () => {
  it("uses the same discount threshold and rate as create-booking", () => {
    // const multiWorkerDiscount = selectedXooterIds.length >= 3 ? 0.1 : 0;
    const match = /selectedXooterIds\.length\s*>=\s*(\d+)\s*\?\s*([\d.]+)\s*:\s*0/.exec(serverSrc);
    expect(match, "could not find the multi-worker discount in create-booking").toBeTruthy();
    const [, threshold, rate] = match!;

    expect(multiXooterDiscountRate(Number(threshold))).toBe(Number(rate));
    expect(multiXooterDiscountRate(Number(threshold) - 1)).toBe(0);
  });

  it("caps at the same worker count as the server", () => {
    // Math.min(Math.max(requestedWorkerCount || 1, 1), 5)
    const match = /Math\.min\(Math\.max\(requestedWorkerCount \|\| 1, 1\), (\d+)\)/.exec(serverSrc);
    expect(match, "could not find the worker cap in create-booking").toBeTruthy();
    expect(MAX_XOOTERS).toBe(Number(match![1]));
  });

  it("enables multi-Xooter on exactly the services the server does", () => {
    const match = /const multiWorkerServices = new Set\(\[([^\]]*)\]\)/.exec(serverSrc);
    expect(match, "could not find multiWorkerServices in create-booking").toBeTruthy();
    const serverSet = new Set([...match![1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]));

    // Every client multi-Xooter service must be one the server accepts.
    for (const service of MULTI_XOOTER_SERVICES) {
      expect(serverSet.has(service), `server does not allow multi-worker ${service}`).toBe(true);
    }
    // And regular home cleaning must stay single-Xooter on both sides.
    expect(serverSet.has("regular")).toBe(false);
    expect(MULTI_XOOTER_SERVICES.has("regular")).toBe(false);
  });

  it("multiplies the base by the Xooter count, rounding before the multiply", () => {
    // Office 6h is R504. Two Xooters, no discount yet: 2 x R504.
    const solo = quote({ service: "office", hours: 6, bookingCover: false });
    const pair = quote({ service: "office", hours: 6, xooterCount: 2, bookingCover: false });
    if (!isPriced(solo) || !isPriced(pair)) throw new Error("expected prices");

    expect(solo.baseCents).toBe(50400);
    expect(pair.baseCents).toBe(solo.baseCents * 2);
    expect(pair.discountRate).toBe(0);
  });

  it("applies the 10% discount from the third Xooter, matching the server's rounding order", () => {
    const trio = quote({ service: "office", hours: 6, xooterCount: 3, bookingCover: false });
    if (!isPriced(trio)) throw new Error("expected a price");

    // round(50400 * 0.9) * 3 — rounded before multiplying, exactly as create-booking does.
    expect(trio.baseCents).toBe(Math.round(50400 * 0.9) * 3);
    expect(trio.discountRate).toBe(0.1);
    // Cheaper per Xooter than two, but still more in total. It is not a split.
    expect(trio.baseCents).toBeGreaterThan(50400 * 2);
  });

  it("is not a labour-hour split — the price rises with the count", () => {
    // The specific wrong model this file was written to correct.
    const solo = quote({ service: "office", hours: 6, bookingCover: false });
    const pair = quote({ service: "office", hours: 6, xooterCount: 2, bookingCover: false });
    if (!isPriced(solo) || !isPriced(pair)) throw new Error("expected prices");
    expect(pair.baseCents).not.toBe(solo.baseCents);
  });

  it("refuses more than one Xooter on a single-Xooter service", () => {
    for (const service of ["regular", "express"] as const) {
      const result = quote({ service, hours: service === "express" ? 2 : 6, xooterCount: 2 });
      expect(isPriced(result), `${service} should be single-Xooter`).toBe(false);
    }
  });

  it("rejects nonsense counts rather than coercing them", () => {
    for (const count of [0, -1, 1.5, MAX_XOOTERS + 1]) {
      expect(isPriced(quote({ service: "office", hours: 6, xooterCount: count }))).toBe(false);
    }
  });

  it("offers only bookable counts to the selector", () => {
    expect(xooterOptionsFor("office", 6)).toEqual([1, 2, 3, 4, 5]);
    expect(xooterOptionsFor("regular", 6)).toEqual([1]);
    expect(xooterOptionsFor("express", 2)).toEqual([1]);
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

  /**
   * The rule now exists in TWO places, not three, and that is the improvement.
   *
   * `create-booking` charges it and `xoot-pricing.ts` quotes it. `Book.tsx` used to compute a
   * third copy — its own threshold, its own cap, its own rounding — alongside a base price off
   * the superseded `size.price x priceFactor x serviceMultiplier` model. It now calls
   * `quote()`, so the discount, the cap and the rounding order all come from the module this
   * file already holds against the server.
   *
   * A copy that does not exist cannot drift, so what is asserted here is the delegation
   * itself: the screen must not grow its own arithmetic back.
   */
  // ZD-038: replaced by executable server-quote, crew-cap and BookingFlow UI tests.

  /** The stepper must still not offer more Xooters than the server accepts. */
  // ZD-038: replaced by executable server-quote, crew-cap and BookingFlow UI tests.

  it("keeps add-ons and cover per booking, not per Xooter", () => {
    const solo = quote({ service: "office", hours: 6, addOns: 2, bookingCover: true });
    const pair = quote({ service: "office", hours: 6, xooterCount: 2, addOns: 2, bookingCover: true });
    if (!isPriced(solo) || !isPriced(pair)) throw new Error("expected prices");
    expect(pair.addOnsCents).toBe(solo.addOnsCents);
    expect(pair.coverCents).toBe(solo.coverCents);
  });
});
