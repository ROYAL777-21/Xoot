import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CADENCE_DISCOUNT,
  MIN_XOOTER_PAY_FULL_DAY_CENTS,
  MIN_XOOTER_PAY_HALF_DAY_CENTS,
  OFFER_WINDOW_MS,
  PREMIUM_MONTHLY_CENTS,
  STANDARD_MONTHLY_CENTS,
  WIN_BACK_MONTHLY_CENTS,
  discountedBookingCents,
  formatCountdown,
  isOfferLive,
  offerRemainingMs,
  savingsFor,
  splitDiscount,
  startOrGetOffer,
} from "./care-plus";

const MEDIUM = 29600; // 5.5h regular clean, base before add-ons

describe("care+ pricing", () => {
  beforeEach(() => window.localStorage.clear());

  it("prices the tiers and the half-price win-back", () => {
    expect(PREMIUM_MONTHLY_CENTS).toBe(19900);
    expect(STANDARD_MONTHLY_CENTS).toBe(9900);
    // The win-back price IS the standard tier, unchanged.
    expect(WIN_BACK_MONTHLY_CENTS).toBe(STANDARD_MONTHLY_CENTS);
    // Its "half the price of Premium" claim must never overstate the saving. R99 is
    // 49.75% of R199 — slightly BETTER than half — so the claim is conservative and
    // true. If Premium ever drops below double the standard tier, the copy becomes a
    // false price representation and this fails.
    expect(WIN_BACK_MONTHLY_CENTS * 2).toBeLessThanOrEqual(PREMIUM_MONTHLY_CENTS);
  });

  it("shows R199 is only rational at weekly cadence", () => {
    // This is the arithmetic that decided the paywall is outcome-led rather than
    // discount-led. If someone later softens the discounts, this fails loudly.
    expect(savingsFor("weekly", MEDIUM, "premium").netCents).toBeGreaterThan(-2000);
    expect(savingsFor("biweekly", MEDIUM, "premium").netCents).toBeLessThan(-9000);
    expect(savingsFor("monthly", MEDIUM, "premium").netCents).toBeLessThan(-14000);
  });

  it("makes the win-back tier positive where R199 was not", () => {
    // The whole point of the second offer: it serves the people the maths excludes.
    // At R99 a fortnightly member is close to break-even rather than R103 down.
    const biweeklyPremium = savingsFor("biweekly", MEDIUM, "premium").netCents;
    const biweeklyStandard = savingsFor("biweekly", MEDIUM, "standard").netCents;
    expect(biweeklyStandard).toBeGreaterThan(biweeklyPremium);
    expect(savingsFor("weekly", MEDIUM, "standard").netCents).toBeGreaterThan(0);
  });

  it("discounts a booking by cadence", () => {
    expect(discountedBookingCents(MEDIUM, "weekly")).toBe(Math.round(MEDIUM * 0.85));
    expect(discountedBookingCents(MEDIUM, "once")).toBe(MEDIUM);
    expect(CADENCE_DISCOUNT.weekly).toBeGreaterThan(CADENCE_DISCOUNT.biweekly);
    expect(CADENCE_DISCOUNT.biweekly).toBeGreaterThan(CADENCE_DISCOUNT.monthly);
  });

  it("never pushes a Xooter below the documented minimum pay", () => {
    // Shared funding is the short-term setting, so this floor is load-bearing.
    const discount = 4440; // 15% of R296
    const tight = splitDiscount(discount, MIN_XOOTER_PAY_HALF_DAY_CENTS + 500, 4);
    expect(tight.xooterCents).toBeLessThanOrEqual(500);
    expect(tight.xootCents + tight.xooterCents).toBe(discount);

    // Already at the floor: the Xooter absorbs nothing and Xoot takes all of it.
    const atFloor = splitDiscount(discount, MIN_XOOTER_PAY_HALF_DAY_CENTS, 4);
    expect(atFloor.xooterCents).toBe(0);
    expect(atFloor.xootCents).toBe(discount);
    expect(atFloor.flooredBy).toBeGreaterThan(0);

    // Full-day work uses the higher floor.
    const fullDay = splitDiscount(discount, MIN_XOOTER_PAY_FULL_DAY_CENTS, 8);
    expect(fullDay.xooterCents).toBe(0);
  });

  it("splits the discount without ever losing or inventing cents", () => {
    for (const pay of [25000, 30000, 45000]) {
      for (const hours of [4, 8]) {
        const s = splitDiscount(4440, pay, hours);
        expect(s.xootCents + s.xooterCents).toBe(4440);
        expect(s.xooterCents).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("starts the win-back countdown once and never restarts it", () => {
    const t0 = 1_000_000;
    const first = startOrGetOffer(t0);
    expect(first?.expiresAt).toBe(t0 + OFFER_WINDOW_MS);

    // Reopening the screen hours later must not renew the window — a countdown that
    // silently resets is the pattern app-store review actually looks for.
    const later = startOrGetOffer(t0 + 6 * 60 * 60 * 1000);
    expect(later?.expiresAt).toBe(first?.expiresAt);
  });

  it("expires the offer for real", () => {
    const t0 = 1_000_000;
    const offer = startOrGetOffer(t0)!;
    expect(isOfferLive(offer, t0 + 1000)).toBe(true);
    expect(isOfferLive(offer, t0 + OFFER_WINDOW_MS + 1)).toBe(false);
    expect(offerRemainingMs(offer, t0 + OFFER_WINDOW_MS + 5000)).toBe(0);
  });

  it("formats the countdown as hh:mm:ss", () => {
    expect(formatCountdown(0)).toBe("00:00:00");
    expect(formatCountdown(OFFER_WINDOW_MS)).toBe("24:00:00");
    expect(formatCountdown(3 * 3600_000 + 7 * 60_000 + 9000)).toBe("03:07:09");
  });

  it("never calls the R30 credit monthly", () => {
    // Master brief §1: the credit is one-time in the member's first month, and every
    // customer-facing surface used to say "monthly" — including CarePlusTerms, which is
    // a legal page. `activate-care-plus` only ever inserted one ledger row, so the code
    // was right and the copy was wrong; this stops the wrong version coming back.
    const surfaces = [
      "src/data/care-plus.ts",
      "src/pages/app/Plans.tsx",
      "src/pages/care/CarePlus.tsx",
      "src/pages/legal/CarePlusTerms.tsx",
      "src/hooks/useXootCred.ts",
    ];
    for (const file of surfaces) {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      // The membership is billed monthly; the credit is not granted monthly. Only the
      // second is wrong, so match the credit specifically rather than the word.
      expect(src).not.toMatch(/monthly[- ](add-on )?credit/i);
      expect(src).not.toMatch(/R30 monthly/i);
    }
  });

  it("grants the credit exactly once, at activation", () => {
    // The behaviour the corrected copy now describes. A second insert, or a scheduled
    // one, would make the terms false again — and the terms are the legal page.
    const fn = readFileSync(join(process.cwd(), "supabase/functions/activate-care-plus/index.ts"), "utf8");
    const inserts = fn.match(/from\("zootcred_ledger"\)\s*\.insert\(/g) ?? [];
    expect(inserts).toHaveLength(1);
    expect(fn).toMatch(/source: "care_plus_activation"/);
  });
});
