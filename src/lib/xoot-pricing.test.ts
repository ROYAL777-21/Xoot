import { describe, expect, it } from "vitest";
import {
  ADD_ON_CENTS,
  isPriced,
  BOOKING_COVER_CENTS,
  LINEN_ON_SITE_CENTS,
  LONG_JOB_FLOOR_CENTS_PER_HOUR,
  LONG_JOB_FLOOR_FROM_HOURS,
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
    expect(ok(quote({ service: "regular", hours: 5.5, bookingCover: false })).baseCents).toBe(29700);
    expect(ok(quote({ service: "regular", hours: 8, bookingCover: false })).baseCents).toBe(43200);
    expect(ok(quote({ service: "regular", hours: 10, bookingCover: false })).baseCents).toBe(54000);
  });

  it("reconciles with the superseded ZD-007 prices once their bundled add-on is removed", () => {
    // ZD-007 quoted add-on-inclusive prices. The gap at each size's default hours was exactly one
    // R30 add-on, which is what proved ZD-020 was not a price cut.
    //
    // ⚠️ NARROWED 2026-08-12. The reconciliation now only holds below the long-job floor, and it
    // has to: the floor deliberately RAISES long jobs past what ZD-007 quoted. Medium (5.5h) is
    // R297 against ZD-007's R325 — a R28 gap rather than R30 — and large (8h) is R432 against
    // R400, which is R32 *above* it. Loosening the bounds to keep all three cases would have
    // turned a proof into a tautology, so the cases that the floor supersedes are asserted as
    // superseded instead, below.
    const cases: [number, number][] = [
      [4, 28000], // small, ZD-007 R280 — below the floor, untouched
    ];
    for (const [hours, legacyCents] of cases) {
      const base = ok(quote({ service: "regular", hours, bookingCover: false })).baseCents;
      expect(legacyCents - base).toBeGreaterThanOrEqual(2900);
      expect(legacyCents - base).toBeLessThanOrEqual(3000);
    }

    // Medium and large are now set by the floor, not by ZD-007. Recorded so the change is a fact
    // in the suite rather than a hole in it.
    expect(ok(quote({ service: "regular", hours: 5.5, bookingCover: false })).baseCents).toBe(29700);
    expect(ok(quote({ service: "regular", hours: 8, bookingCover: false })).baseCents).toBe(43200);
    expect(43200).toBeGreaterThan(40000); // large is above ZD-007's R400, on purpose
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
    // The one-time service fee is part of the total now; it was not when this line was written,
    // and the R3900 gap it left was visible to customers on the confirm screen. See
    // pricing-parity.test.ts for the client/server equality that keeps it honest.
    expect(q.totalCents).toBe(q.baseCents + q.addOnsCents + q.coverCents + q.serviceFeeCents);

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

/**
 * The long-job floor, asserted as an invariant over the ladders rather than as a list of rungs.
 *
 * The tables in `xoot-pricing.ts` are hand-written literals, and the floor is the reason several
 * of them hold the values they do. Checking the property directly means someone editing a rung
 * back down — for a promotion, a transcription fix, a "round number" tidy-up — fails here with
 * the reason, instead of silently reintroducing R27.95/h.
 */
describe("the long-job floor", () => {
  const SERVICES = ["regular", "office", "express", "airbnb", "moving"] as const;

  it("never charges under R54 per booked hour from 5.5 hours up", () => {
    for (const service of SERVICES) {
      for (const hours of hoursFor(service)) {
        if (hours < LONG_JOB_FLOOR_FROM_HOURS) continue;
        const base = ok(quote({ service, hours, bookingCover: false })).baseCents;
        expect({ service, hours, meetsFloor: base >= LONG_JOB_FLOOR_CENTS_PER_HOUR * hours }).toEqual(
          { service, hours, meetsFloor: true },
        );
      }
    }
  });

  it("only ever raised a price — no rung fell", () => {
    // The pre-floor ladders, as they stood on 2026-08-11. Kept as data so the claim "this is a
    // floor, not a repricing" is checkable rather than asserted in a comment.
    const before: Record<string, Record<string, number>> = {
      regular: { "5.5": 29600, "6": 31000, "6.5": 32600, "7": 34000, "7.5": 35600, "8": 37000,
                 "8.5": 38600, "9": 40000, "9.5": 41600, "10": 43000 },
      airbnb: { "5.5": 34200, "6": 36200, "6.5": 36200, "7": 37200, "7.5": 40000, "8": 42600 },
      moving: { "5.5": 34400, "6": 36400, "6.5": 37600, "7": 39000, "7.5": 40400, "8": 43000,
                "8.5": 44800, "9": 46200, "9.5": 46800, "10": 47800 },
      office: { "5.5": 47600, "6": 50400, "6.5": 51800, "7": 54000, "7.5": 55800, "8": 59200,
                "8.5": 61800, "9": 63800, "9.5": 64600, "10": 66000 },
    };
    for (const [service, rungs] of Object.entries(before)) {
      for (const [hours, wasCents] of Object.entries(rungs)) {
        const now = ok(
          quote({ service: service as (typeof SERVICES)[number], hours: Number(hours), bookingCover: false }),
        ).baseCents;
        expect({ service, hours, fell: now < wasCents }).toEqual({ service, hours, fell: false });
      }
    }
  });

  it("leaves office and express entirely alone, because they were already above it", () => {
    // Both were compared against the floor and neither moved. If a future edit makes one of them
    // depend on the floor, that is a real change to those services and should be seen, not
    // absorbed.
    for (const hours of hoursFor("office")) {
      const base = ok(quote({ service: "office", hours, bookingCover: false })).baseCents;
      expect({ hours, aboveFloor: base > LONG_JOB_FLOOR_CENTS_PER_HOUR * hours }).toEqual({
        hours,
        aboveFloor: true,
      });
    }
    // Express tops out at 3 hours, so the floor cannot reach it at all.
    expect(hoursFor("express").every((h) => h < LONG_JOB_FLOOR_FROM_HOURS)).toBe(true);
  });

  it("clears the R35/h Xooter pay floor at the worst commission rate on every ladder", () => {
    // The whole point of the change. 35% is the STARTING rate — the worst any Xooter is on — so
    // if it clears here it clears everywhere.
    const MIN_XOOTER_HOURLY_CENTS = 3500;
    for (const service of SERVICES) {
      for (const hours of hoursFor(service)) {
        const base = ok(quote({ service, hours, bookingCover: false })).baseCents;
        const netPerHour = Math.round((base * 0.65) / hours);
        expect({ service, hours, clears: netPerHour >= MIN_XOOTER_HOURLY_CENTS }).toEqual({
          service,
          hours,
          clears: true,
        });
      }
    }
  });
});
