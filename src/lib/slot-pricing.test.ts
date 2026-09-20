import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  GRADED_SLOT_PRICING,
  HIGH_DEMAND_SLOT_RATE,
  SLOT_PREMIUM_CURVE,
  SURGE_SLOT_RATE_RANGE,
  calculateBookingQuote,
  isHighDemandSlot,
  slotPremiumRate,
} from "./operations";

/**
 * Graded slot pricing is built and switched off. This file's main job is to prove the second
 * half of that sentence.
 *
 * Shipping a pricing model behind a flag is only safe if the flag-off path is provably the old
 * path. "It should be the same" is not a claim worth making about money, and a curve that
 * quietly moved one slot would show up as a customer charged more than they were quoted — the
 * exact defect this repo shipped once with the R39 service fee.
 *
 * So every bookable slot is checked against the old rule directly, rather than against a
 * remembered expectation.
 */

/** The bookable grid, from `create-booking`'s `allowedTimes`. */
const BOOKABLE_TIMES = [
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "14:00", "15:00", "16:00", "17:00",
];

/** The rule as it stood before the curve existed, written out rather than imported. */
const legacyRate = (time: string) => (Number(time.split(":")[0]) >= 16 ? 0.15 : 0);

describe("slot pricing with the curve off", () => {
  it("is the flag's default, so nothing shipped enabled by accident", () => {
    expect(GRADED_SLOT_PRICING).toBe(false);
  });

  it("prices every bookable slot exactly as the old binary rule did", () => {
    for (const time of BOOKABLE_TIMES) {
      expect({ time, rate: slotPremiumRate(time) }).toEqual({ time, rate: legacyRate(time) });
    }
  });

  it("produces identical quotes to the old arithmetic, in rands", () => {
    // Not just the rate — the number a customer sees. Rounding is where a "harmless" refactor
    // usually costs someone a rand.
    for (const time of BOOKABLE_TIMES) {
      const quote = calculateBookingQuote({
        basePrice: 296,
        addOnCount: 1,
        frequency: "one_time",
        time,
        bookingCoverOptIn: true,
      });
      const subtotal = 296 + 30;
      expect({ time, premium: quote.highDemandPremium }).toEqual({
        time,
        premium: Math.round(subtotal * legacyRate(time)),
      });
      expect(quote.total).toBe(subtotal + quote.highDemandPremium + 39 + 22);
    }
  });

  it("keeps isHighDemandSlot itself untouched for its non-pricing callers", () => {
    expect(isHighDemandSlot("15:00")).toBe(false);
    expect(isHighDemandSlot("16:00")).toBe(true);
    expect(isHighDemandSlot("17:00")).toBe(true);
  });
});

describe("the curve, for when it is switched on", () => {
  /** What `slotPremiumRate` would return with the flag flipped. */
  const gradedRate = (time: string) => SLOT_PREMIUM_CURVE[time] ?? 0;

  it("rises monotonically through the afternoon", () => {
    // Scarcity increases toward the end of the day. A curve that dipped anywhere would be
    // harder to explain than the cliff it replaces.
    const graded = Object.keys(SLOT_PREMIUM_CURVE).sort();
    let previous = 0;
    for (const time of graded) {
      expect(SLOT_PREMIUM_CURVE[time]).toBeGreaterThan(previous);
      previous = SLOT_PREMIUM_CURVE[time];
    }
  });

  it("stays inside the range that was declared and never used", () => {
    // `SURGE_SLOT_RATE_RANGE` has carried 0.10–0.15 since it was written with nothing reading it.
    // The curve's top matches the declared maximum, which is what makes that constant mean
    // something again rather than being decoration.
    const rates = Object.values(SLOT_PREMIUM_CURVE);
    expect(Math.max(...rates)).toBe(SURGE_SLOT_RATE_RANGE.max);
    expect(Math.max(...rates)).toBe(HIGH_DEMAND_SLOT_RATE);
    for (const rate of rates) expect(rate).toBeLessThanOrEqual(SURGE_SLOT_RATE_RANGE.max);
  });

  it("only ever prices slots that can actually be booked", () => {
    // A premium on a time nobody can select is a number that will one day be wrong and never be
    // noticed, because no quote exercises it.
    for (const time of Object.keys(SLOT_PREMIUM_CURVE)) {
      expect(BOOKABLE_TIMES).toContain(time);
    }
  });

  it("leaves the latest slot where it is, and softens the step below it", () => {
    // The point of the change: 17:00 is unchanged, and the single 0%-to-15% step between 15:00
    // and 16:00 becomes two smaller ones.
    expect(gradedRate("17:00")).toBe(legacyRate("17:00"));
    expect(gradedRate("16:00")).toBeLessThan(legacyRate("16:00"));
    expect(gradedRate("15:00")).toBeGreaterThan(legacyRate("15:00"));

    const legacyStep = legacyRate("16:00") - legacyRate("15:00");
    const gradedStep = gradedRate("16:00") - gradedRate("15:00");
    expect(gradedStep).toBeLessThan(legacyStep);
  });

  it("is documented as the supply-side pricing Xoot is willing to do", () => {
    // The policy page is what stops this being read as licence for the other kind.
    const policy = readFileSync(join(process.cwd(), "docs/dynamic-pricing-policy.md"), "utf8");
    expect(policy).toContain(
      "**Rewarding frequency with a better rate is fine. Surcharging perceived affluence is not.**",
    );
    expect(policy).toContain("SURGE_SLOT_RATE_RANGE");
    // And the same line is carried by the Semgrep rule, so the guard and the doc cannot drift
    // into saying different things.
    const rules = readFileSync(join(process.cwd(), ".semgrep/rules/xoot.yaml"), "utf8");
    expect(rules).toMatch(/rewarding frequency with a\r?\n {6}better rate is fine/);
  });
});
