import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  CADENCE_DISCOUNT,
  DISCOUNT_FUNDING,
  CARE_PLUS_MONTHLY_CENTS,
  FREE_MONTHS_AT_SIGNUP,
  MIN_XOOTER_HOURLY_CENTS,
  NATIONAL_MINIMUM_WAGE_CENTS,
  NATIONAL_MINIMUM_WAGE_EFFECTIVE_FROM,
  NMW_REVIEW_BY,
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
   * ⚖️ THE LEGAL FLOOR. Every rung of every ladder must pay at least the national minimum wage.
   *
   * Until 2026-08-12 the worst cell was **R27.95/h** — a 10-hour regular clean at R430 on the 35%
   * starting commission — and the national minimum wage has been **R30.23/h since 1 March 2026**,
   * with domestic workers at parity since 2024. So that ladder was not merely ungenerous, it was
   * **paying below the legal minimum**, and this test previously recorded the number without ever
   * comparing it to anything.
   *
   * `xoot-pricing.ts` now floors gross at R47/booked hour from 5.5h up, which returns R30.55/h.
   * Computed from the ladder rather than transcribed, so re-flattening any tail fails here.
   */
  it("pays at least the national minimum wage on every rung of every ladder", () => {
    /** Cents per booked hour a Xooter keeps, at a given commission rate. */
    const netPerHour = (service: ServiceId, hours: number, keepFraction: number) => {
      const q = quote({ service, hours, bookingCover: false });
      if (!isPriced(q)) throw new Error(`${service} refused at ${hours}h`);
      return Math.round((q.baseCents * keepFraction) / hours);
    };

    // 0.65 = the STARTING commission of 35%, the worst rate any Xooter can be on. Every rank above
    // `new` keeps more, so if this clears, all of them clear.
    for (const service of ["regular", "office", "express", "airbnb", "moving"] as const) {
      for (const hours of hoursFor(service)) {
        const net = netPerHour(service, hours, 0.65);
        expect(
          { service, hours, legal: net >= NATIONAL_MINIMUM_WAGE_CENTS },
          `${service} at ${hours}h pays ${net}c/h, under the R30.23 minimum wage`,
        ).toEqual({ service, hours, legal: true });
      }
    }

    // The worst cell on each ladder, recorded so a change has to move a number here.
    const worstOn = (service: ServiceId) =>
      Math.min(...hoursFor(service).map((h) => netPerHour(service, h, 0.65)));
    expect(worstOn("regular")).toBe(3055);
    expect(worstOn("airbnb")).toBe(3454);
    expect(worstOn("moving")).toBe(3107);
    expect(worstOn("office")).toBe(4290);
    expect(worstOn("express")).toBe(4767);

    // The number that used to be illegal is unreachable.
    expect(worstOn("regular")).toBeGreaterThan(2795);
  });

  /**
   * ⏰ A DELIBERATE TIME BOMB, and the reasoning for it.
   *
   * The founder chose R47/h on 2026-08-12 — the cheapest floor that is still lawful — to keep the
   * price rise off customers (a R54 floor raised the 8-hour default 16.8%). The trade is that
   * **R30.55 is 1% above the R30.23 minimum**, and the minimum has risen about 5% every March.
   * The March 2027 increase will put this ladder below the legal minimum.
   *
   * A test that fails on a calendar date is normally hostile — it breaks CI on a day nobody chose,
   * for a reason unrelated to the commit. It is right here anyway, because the alternative is
   * *silently paying below minimum wage* and the only thing standing between the two is somebody
   * remembering. CI going red in January, a month before the increase and while the ladder is
   * still legal, is the cheapest possible warning.
   *
   * To fix it when it fires: look up the new national minimum wage, update
   * `NATIONAL_MINIMUM_WAGE_CENTS` and `NMW_REVIEW_BY`, and raise
   * `LONG_JOB_FLOOR_CENTS_PER_HOUR` in `xoot-pricing.ts` until the test above passes again.
   * Do NOT simply push the review date out.
   */
  it("forces a minimum-wage review before the next March increase", () => {
    const reviewBy = new Date(`${NMW_REVIEW_BY}T00:00:00.000Z`).getTime();
    expect(Number.isFinite(reviewBy)).toBe(true);

    const overdue = Date.now() > reviewBy;
    expect(
      { reviewBy: NMW_REVIEW_BY, overdue },
      `The national minimum wage review is overdue. The ladder pays R30.55/h against a minimum ` +
        `that was R30.23 on ${NATIONAL_MINIMUM_WAGE_EFFECTIVE_FROM} and rises ~5% each March — it ` +
        `is probably illegal now. Look up the current rate, update NATIONAL_MINIMUM_WAGE_CENTS ` +
        `and NMW_REVIEW_BY, and raise LONG_JOB_FLOOR_CENTS_PER_HOUR until the ladder clears it. ` +
        `Do not just move the date.`,
    ).toEqual({ reviewBy: NMW_REVIEW_BY, overdue: false });

    // The review date must actually precede a March increase, or it buys nothing.
    expect(NMW_REVIEW_BY < "2027-03-01").toBe(true);
    expect(NMW_REVIEW_BY > NATIONAL_MINIMUM_WAGE_EFFECTIVE_FROM).toBe(true);
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
