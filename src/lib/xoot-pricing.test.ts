import { describe, expect, it } from "vitest";
import {
  ADD_ON_CENTS,
  isPriced,
  BOOKING_COVER_CENTS,
  LINEN_ON_SITE_CENTS,
  formatRand,
  hoursFor,
  quote,
  serviceBounds,
} from "./xoot-pricing";

const ok = (q: ReturnType<typeof quote>) => {
  if (!isPriced(q)) throw new Error(`expected a quote, got: ${q.reason}`);
  return q;
};

describe("xoot pricing", () => {
  it("prices regular cleaning off the shared hour ladder", () => {
    expect(ok(quote({ service: "regular", hours: 3.5, bookingCover: false })).baseCents).toBe(23600);
    expect(ok(quote({ service: "regular", hours: 4, bookingCover: false })).baseCents).toBe(25000);
    expect(ok(quote({ service: "regular", hours: 5.5, bookingCover: false })).baseCents).toBe(29600);
    expect(ok(quote({ service: "regular", hours: 8, bookingCover: false })).baseCents).toBe(37000);
    expect(ok(quote({ service: "regular", hours: 10, bookingCover: false })).baseCents).toBe(43000);
  });

  it("reconciles with the superseded ZD-007 prices once their bundled add-on is removed", () => {
    // ZD-007 quoted add-on-inclusive prices. The gap at each size's default hours is
    // exactly one R30 add-on, which is what proved this is not a price cut.
    const cases: [number, number][] = [
      [4, 28000],   // small,  ZD-007 R280
      [5.5, 32500], // medium, ZD-007 R325
      [8, 40000],   // large,  ZD-007 R400
    ];
    for (const [hours, legacyCents] of cases) {
      const base = ok(quote({ service: "regular", hours, bookingCover: false })).baseCents;
      // Medium is R29 rather than R30 — rounding in the original R325, flagged in ZD-020.
      expect(legacyCents - base).toBeGreaterThanOrEqual(2900);
      expect(legacyCents - base).toBeLessThanOrEqual(3000);
    }
  });

  it("keeps express flat across its whole range", () => {
    for (const h of [1, 1.5, 2, 2.5, 3]) {
      expect(ok(quote({ service: "express", hours: h, bookingCover: false })).baseCents).toBe(22000);
    }
  });

  it("charges add-ons at R30, booking cover at R22, and on-site linen at R20", () => {
    const q = ok(quote({ service: "regular", hours: 4, addOns: 3 }));
    expect(q.addOnsCents).toBe(3 * ADD_ON_CENTS);
    expect(q.coverCents).toBe(BOOKING_COVER_CENTS);
    expect(q.totalCents).toBe(q.baseCents + q.addOnsCents + q.coverCents);

    // The one add-on in the product that is not R30.
    const air = ok(quote({ service: "airbnb", hours: 5, linenOnSite: true, bookingCover: false }));
    expect(air.linenCents).toBe(LINEN_ON_SITE_CENTS);
    expect(LINEN_ON_SITE_CENTS).not.toBe(ADD_ON_CENTS);
  });

  it("preselects booking cover and only drops it when explicitly deselected", () => {
    expect(ok(quote({ service: "regular", hours: 4 })).coverCents).toBe(BOOKING_COVER_CENTS);
    expect(ok(quote({ service: "regular", hours: 4, bookingCover: true })).coverCents).toBe(BOOKING_COVER_CENTS);
    expect(ok(quote({ service: "regular", hours: 4, bookingCover: false })).coverCents).toBe(0);
  });

  it("refuses off-ladder hours instead of interpolating a price nobody approved", () => {
    const q = quote({ service: "regular", hours: 4.25 });
    expect(q.ok).toBe(false);
    if (!isPriced(q)) expect(q.reason).toMatch(/half-hour/);
  });

  it("refuses hours outside a service's own bounds", () => {
    expect(quote({ service: "express", hours: 4 }).ok).toBe(false); // express caps at 3
    expect(quote({ service: "regular", hours: 3 }).ok).toBe(false); // regular starts at 3.5
    expect(quote({ service: "airbnb", hours: 8.5 }).ok).toBe(false); // airbnb caps at 8
    expect(quote({ service: "office", hours: 2 }).ok).toBe(true); // office starts at 2
  });

  it("refuses to price laundry at all, rather than guessing at inferred bands", () => {
    const q = quote({ service: "laundry", hours: 4.5 });
    expect(q.ok).toBe(false);
    if (!isPriced(q)) expect(q.reason).toMatch(/No agreed price ladder/);
  });

  it("marks reconstructed ladders as unconfirmed so callers can warn", () => {
    expect(ok(quote({ service: "regular", hours: 4 })).confirmed).toBe(true);
    expect(ok(quote({ service: "office", hours: 5 })).confirmed).toBe(true);
    expect(ok(quote({ service: "express", hours: 1 })).confirmed).toBe(true);
    // Moving is a reconstruction; Airbnb has a known contradiction at 7 hours.
    expect(ok(quote({ service: "moving", hours: 6 })).confirmed).toBe(false);
    expect(ok(quote({ service: "airbnb", hours: 5 })).confirmed).toBe(false);
    expect(ok(quote({ service: "airbnb", hours: 5 })).caveat).toMatch(/R372|R388/);
  });

  it("exposes only half-hour steps within each service's bounds", () => {
    const regular = hoursFor("regular");
    expect(regular[0]).toBe(3.5);
    expect(regular.at(-1)).toBe(10);
    for (const h of regular) expect(h * 2 === Math.round(h * 2)).toBe(true);
    expect(serviceBounds("office")).toMatchObject({ min: 2, max: 10, confirmed: true });
  });

  it("formats rands without cents", () => {
    expect(formatRand(25000)).toBe("R250");
    expect(formatRand(43000)).toBe("R430");
  });
});
