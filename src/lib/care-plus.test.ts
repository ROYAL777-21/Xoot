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
    expect(WIN_BACK_MONTHLY_CENTS).toBe(4950);
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
    const biweekly = savingsFor("biweekly", MEDIUM, "standard");
    expect(biweekly.savedCents - WIN_BACK_MONTHLY_CENTS).toBeGreaterThan(0);
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
});
