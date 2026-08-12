import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CADENCE_DISCOUNT,
  DISCOUNT_FUNDING,
  CARE_PLUS_MONTHLY_CENTS,
  FREE_MONTHS_AT_SIGNUP,
  MIN_XOOTER_HOURLY_CENTS,
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
import { hoursFor, isPriced, quote, type ServiceId } from "./xoot-pricing";

/**
 * The 5.5h regular clean, base before add-ons — read from the ladder rather than transcribed.
 *
 * It was the literal `29600` until 2026-08-12, when the long-job floor moved it to R297. A money
 * fixture copied out of a ladder goes stale the first time the ladder moves, and then the test
 * still passes while describing a price nobody charges.
 */
const MEDIUM = (() => {
  const q = quote({ service: "regular", hours: 5.5, bookingCover: false });
  if (!isPriced(q)) throw new Error("the 5.5h regular clean must be priceable");
  return q.baseCents;
})();

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

  it("takes nothing from the Xooter, because Xoot funds the whole discount", () => {
    // `DISCOUNT_FUNDING` moved to "commission" on 2026-08-10. The 40% share was the least visible
    // deduction in the product — on no screen, in no payout breakdown — and invisible deductions
    // are resented when discovered rather than when levied. It was free to remove: `splitDiscount`
    // is called from no production code, so the deduction had never actually run.
    expect(DISCOUNT_FUNDING).toBe("commission");

    const discount = 4440; // 15% of R296
    for (const pay of [10000, 19240, 23680, 45000]) {
      for (const hours of [1, 4, 5.5, 8, 10]) {
        const split = splitDiscount(discount, pay, hours);
        expect({ pay, hours, xooter: split.xooterCents }).toEqual({ pay, hours, xooter: 0 });
        expect(split.xootCents).toBe(discount);
      }
    }
  });

  it("keeps the hourly floor correct for the day shared funding returns", () => {
    // The floor is dormant, not deleted: moving back to shared funding once volume justifies it was
    // always the plan, and the arithmetic must still be right when it does. Asserted at the source
    // level because `splitDiscount` reads the module constant and short-circuits before the floor.
    //
    // What it must never go back to is the placement day rate. R220/R300 come from
    // `CarePlusApply` — a household hiring a domestic worker for standing days — and mapping a
    // 5.5-hour clean onto them via `hours >= 6 ? full : half` put the floor above the standard job,
    // where it could never fire.
    expect(MIN_XOOTER_HOURLY_CENTS).toBe(3500);
    const carePlus = readFileSync(join(process.cwd(), "src/lib/care-plus.ts"), "utf8");
    expect(carePlus).toMatch(/const floor = Math\.round\(Math\.max\(0, hours\) \* MIN_XOOTER_HOURLY_CENTS\)/);
    expect(carePlus).not.toMatch(/hours >= 6 \? MIN_XOOTER_PAY_FULL_DAY_CENTS/);

    // And re-enabling shared funding must ship with the deduction shown to the Xooter.
    expect(carePlus).toMatch(/same commit as a\n \* line on the earnings screen showing the amount deducted/);
  });

  /**
   * The minimum-wage check, which this test exists to force someone to do again on any ladder
   * change. It does not assert a legal threshold — that would be guessing at a figure that moves
   * every March. It asserts the worst number the ladders actually produce.
   *
   * ── What it used to record, and what changed ────────────────────────────────────
   * Until 2026-08-12 the worst cell was **R27.95/h**: a 10-hour regular clean at R430 on the 35%
   * starting commission. The ladders were sub-linear in hours, so the longest jobs paid the least
   * per hour, and three of the five ladders finished under `MIN_XOOTER_HOURLY_CENTS`.
   *
   * `xoot-pricing.ts` now floors gross at R54/booked hour from 5.5h up. The worst cell is R35.10/h
   * and it is no longer service-specific — regular, airbnb and moving all bottom out on the floor
   * itself. This is computed from the ladder rather than transcribed, so re-flattening the tail of
   * any ladder fails here.
   */
  it("records the worst hourly pay the ladder produces, for the minimum-wage check", () => {
    /** Cents per booked hour a Xooter keeps, at a given commission rate. */
    const netPerHour = (service: ServiceId, hours: number, keepFraction: number) => {
      const q = quote({ service, hours, bookingCover: false });
      if (!isPriced(q)) throw new Error(`${service} refused at ${hours}h`);
      return Math.round((q.baseCents * keepFraction) / hours);
    };
    const worstOn = (service: ServiceId, keepFraction: number) =>
      Math.min(...hoursFor(service).map((h) => netPerHour(service, h, keepFraction)));

    // At the STARTING commission — the worst rate any Xooter can be on, so the binding case.
    expect(worstOn("regular", 0.65)).toBe(3510);
    expect(worstOn("airbnb", 0.65)).toBe(3510);
    expect(worstOn("moving", 0.65)).toBe(3510);
    expect(worstOn("office", 0.65)).toBe(4290);
    expect(worstOn("express", 0.65)).toBe(4767);

    // The floor holds across every priced service, which is the claim `care-plus.ts` makes.
    for (const service of ["regular", "office", "express", "airbnb", "moving"] as const) {
      expect({ service, worst: worstOn(service, 0.65) >= MIN_XOOTER_HOURLY_CENTS }).toEqual({
        service,
        worst: true,
      });
    }

    // And the specific number that used to fail this check is unreachable now.
    expect(worstOn("regular", 0.65)).toBeGreaterThan(2795);
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
