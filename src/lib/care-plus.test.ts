import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CADENCE_DISCOUNT,
  CARE_PLUS_MONTHLY_CENTS,
  FREE_MONTHS_AT_SIGNUP,
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

  /** The paywall with comments removed, so a note about deleted copy is not read as the copy. */
  const livePaywallSource = () =>
    readFileSync(join(process.cwd(), "src/pages/CarePlusPaywall.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

  it("prices one live tier at R99, with the R199 arm unsold", () => {
    expect(CARE_PLUS_MONTHLY_CENTS).toBe(9900);
    // Nothing to fall back to: the win-back price IS the membership price now.
    expect(WIN_BACK_MONTHLY_CENTS).toBe(CARE_PLUS_MONTHLY_CENTS);
    // The R199 arm is retained for a future A/B test and is not a live price. It used to
    // anchor a "half the price of Premium" claim on the decline screen; with Premium unsold
    // there is nothing for the half to be measured against, so that copy is gone. An
    // unqualified saving would imply R99 was once higher, which it never was — a false price
    // representation under the CPA. This asserts the claim's absence, not its arithmetic.
    // Comments stripped first. The paywall carries a note explaining what was removed and why,
    // and matching the raw file made that note trip its own guard — the same trap
    // `pricing-parity.test.ts` documents for `Book.tsx`. A guard that fails on its own
    // explanation teaches people to delete the explanation.
    expect(livePaywallSource()).not.toMatch(/Half the price/i);
    expect(livePaywallSource()).not.toMatch(/PREMIUM_MONTHLY_CENTS/);
  });

  it("opens with a free month, and the CTA only says so while that is true", () => {
    // "Join Care+ for free" is a promise with a condition. If the free period ever goes to
    // zero the button has to change in the same commit, and this is what makes that fail
    // rather than ship a button that lies.
    expect(FREE_MONTHS_AT_SIGNUP).toBeGreaterThan(0);
    const paywall = readFileSync(join(process.cwd(), "src/pages/CarePlusPaywall.tsx"), "utf8");
    expect(paywall).toMatch(/Join Care\+ for free/);
    // And the qualifier stays with it: the cleans are still charged during the free month.
    expect(paywall).toMatch(/still charged for the cleans/);
  });

  it("is only ahead on money at weekly cadence, even at R99", () => {
    // The arithmetic that keeps the paywall outcome-led rather than discount-led. R99 moved
    // weekly from break-even to genuinely ahead, and that is the only cadence it did. A
    // fortnightly member is still down every month, and the copy must not imply otherwise —
    // claiming a saving someone does not get is a false price representation under the CPA.
    expect(savingsFor("weekly", MEDIUM, "standard").netCents).toBeGreaterThan(0);
    expect(savingsFor("biweekly", MEDIUM, "standard").netCents).toBeLessThan(0);
    expect(savingsFor("monthly", MEDIUM, "standard").netCents).toBeLessThan(0);
  });

  it("charges the same whichever tier name a caller passes, while there is one tier", () => {
    // `Tier` survives for the A/B arm, so "premium" is still a valid argument. Until that arm
    // is live it must not quietly cost more than the price on the paywall.
    for (const cadence of ["weekly", "biweekly", "monthly"]) {
      expect(savingsFor(cadence, MEDIUM, "premium").feeCents)
        .toBe(savingsFor(cadence, MEDIUM, "standard").feeCents);
      expect(savingsFor(cadence, MEDIUM, "premium").feeCents).toBe(CARE_PLUS_MONTHLY_CENTS);
    }
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
