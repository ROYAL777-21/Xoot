/**
 * Care+ membership pricing, the recurring-booking discount, and the win-back offer.
 *
 * ── Why R199 is an outcome tier, not a discount tier ─────────────────────────────
 * A membership is only rational when monthly savings exceed the fee. On a R296 clean:
 *
 *   Weekly (4.3/mo, R1286 spend)   15% saves R193 — roughly break-even at R199
 *   Fortnightly (2.2/mo, R643)     15% saves  R96 — R103 down every month
 *   Monthly (1/mo, R296)           15% saves  R44 — R155 down every month
 *
 * So R199 cannot be sold on savings to anyone who books less than weekly; they would
 * churn, correctly. It is sold on the outcomes instead — the same Xooter every time,
 * the slot you actually want, a home that is remembered — with the discount sized so a
 * weekly member's fee washes out rather than pretending to be the reason to join.
 *
 * The win-back tier exists for exactly the people the maths excludes.
 */

export const STANDARD_MONTHLY_CENTS = 9900;
export const PREMIUM_MONTHLY_CENTS = 19900;

/**
 * The win-back price is the standard tier, unchanged — R99.
 *
 * It is presented as half price, and that claim is anchored to **Premium**, which is a
 * real tier at a real R199. R99 is exactly half of R199, so the comparison is true and
 * checkable.
 *
 * It is deliberately NOT written as an unqualified "50% off". An unqualified discount
 * claim implies the item's own former price, and R99 has never been higher — that would
 * be a false price representation under the Consumer Protection Act and would fail
 * App Store review. Every surface must name what the 50% is measured against.
 */
export const WIN_BACK_MONTHLY_CENTS = STANDARD_MONTHLY_CENTS;

export type Tier = "premium" | "standard";

/**
 * Who funds the recurring-booking discount.
 *
 * Deliberately a setting rather than a hardcoded rule, because the founder's plan is to
 * start on "shared" to drive early frequency and move to "commission" once volume is
 * there. Switching should be a config change, not a deploy.
 *
 * ⚠️ "shared" reduces what a Xooter earns on Care+ jobs. The visible failure mode is
 * not a complaint — it is Xooters quietly declining Care+ bookings, which hits exactly
 * the members you can least afford to serve badly. `xooterShareOfDiscount` is capped by
 * `MIN_XOOTER_PAY_CENTS` below so it can never breach the documented pay floor.
 */
export type DiscountFunding = "commission" | "shared";

export const DISCOUNT_FUNDING: DiscountFunding = "shared";

/** Fraction of the discount borne by the Xooter when funding is "shared". */
export const XOOTER_SHARE_OF_DISCOUNT = 0.4;

/**
 * Documented minimum pay for dignified work, from `CarePlusApply`: R220 half-day,
 * R300 full-day. Treated as a hard floor — a discount may never push a Xooter below it,
 * whatever the funding split says.
 */
export const MIN_XOOTER_PAY_HALF_DAY_CENTS = 22000;
export const MIN_XOOTER_PAY_FULL_DAY_CENTS = 30000;

/**
 * Split one booking's discount between Xoot and the Xooter, respecting the pay floor.
 * Returns what each side actually absorbs in cents.
 */
export function splitDiscount(
  discountCents: number,
  xooterPayBeforeCents: number,
  hours: number,
): { xootCents: number; xooterCents: number; flooredBy: number } {
  if (DISCOUNT_FUNDING === "commission") {
    return { xootCents: discountCents, xooterCents: 0, flooredBy: 0 };
  }
  const floor = hours >= 6 ? MIN_XOOTER_PAY_FULL_DAY_CENTS : MIN_XOOTER_PAY_HALF_DAY_CENTS;
  const wanted = Math.round(discountCents * XOOTER_SHARE_OF_DISCOUNT);
  // Never take a Xooter below the floor; Xoot absorbs whatever the cap refuses.
  const allowed = Math.max(0, Math.min(wanted, xooterPayBeforeCents - floor));
  return { xootCents: discountCents - allowed, xooterCents: allowed, flooredBy: wanted - allowed };
}

/**
 * Recurring-booking discount by cadence.
 *
 * ⚠️ CONFIRM before this charges anyone: the percentages are sized to make the
 * membership wash out at weekly cadence, not derived from a known take rate. If Xoot's
 * commission is below ~15% these are margin-negative on every weekly member.
 */
export const CADENCE_DISCOUNT: Record<string, number> = {
  weekly: 0.15,
  biweekly: 0.1,
  monthly: 0.05,
  once: 0,
};

/** Bookings per month implied by a cadence. 4.345 = 52 weeks / 12 months. */
const PER_MONTH: Record<string, number> = { weekly: 4.345, biweekly: 2.173, monthly: 1, once: 0 };

export type Savings = {
  bookingsPerMonth: number;
  discountRate: number;
  spendCents: number;
  savedCents: number;
  feeCents: number;
  /** Positive means the member is ahead on money alone. */
  netCents: number;
};

/** What a member actually saves, so the paywall can show real arithmetic. */
export function savingsFor(cadence: string, baseBookingCents: number, tier: Tier): Savings {
  const bookingsPerMonth = PER_MONTH[cadence] ?? 0;
  const discountRate = CADENCE_DISCOUNT[cadence] ?? 0;
  const feeCents = tier === "premium" ? PREMIUM_MONTHLY_CENTS : STANDARD_MONTHLY_CENTS;
  const spendCents = Math.round(baseBookingCents * bookingsPerMonth);
  const savedCents = Math.round(spendCents * discountRate);
  return { bookingsPerMonth, discountRate, spendCents, savedCents, feeCents, netCents: savedCents - feeCents };
}

export function discountedBookingCents(baseCents: number, cadence: string): number {
  return Math.round(baseCents * (1 - (CADENCE_DISCOUNT[cadence] ?? 0)));
}

/* ── Win-back offer ──────────────────────────────────────────────────────────────
 * The countdown is real. The expiry is written once, on first decline, and read back
 * from storage — it does not restart when the screen remounts and it cannot be reset
 * by closing the app. A countdown that silently renews is the thing app-store review
 * and consumer-protection regulators actually look for, and it is trivially detectable
 * by any user who waits.
 */

const OFFER_KEY = "xoot.careplus.winback";
export const OFFER_WINDOW_MS = 24 * 60 * 60 * 1000;

export type WinBackOffer = { expiresAt: number };

/** Starts the window on first decline; every later call returns the original expiry. */
export function startOrGetOffer(now = Date.now()): WinBackOffer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(OFFER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WinBackOffer>;
      if (typeof parsed?.expiresAt === "number") return { expiresAt: parsed.expiresAt };
    }
    const offer = { expiresAt: now + OFFER_WINDOW_MS };
    window.localStorage.setItem(OFFER_KEY, JSON.stringify(offer));
    return offer;
  } catch {
    return null;
  }
}

export function offerRemainingMs(offer: WinBackOffer | null, now = Date.now()): number {
  if (!offer) return 0;
  return Math.max(0, offer.expiresAt - now);
}

export function isOfferLive(offer: WinBackOffer | null, now = Date.now()): boolean {
  return offerRemainingMs(offer, now) > 0;
}

export function formatCountdown(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Outcome-led benefits. Each names what the member *gets*, not what the feature is —
 * "the same person every time" rather than "favourite-Xooter continuity".
 */
export const PREMIUM_OUTCOMES = [
  { title: "The same person every time", body: "Someone who knows your home, not a stranger each visit." },
  { title: "The slot you actually want", body: "Priority on early mornings and weekends before they open to everyone." },
  { title: "Nobody has to be told twice", body: "Your gate code, your pets, your fragile shelf — remembered." },
  { title: "A person when something's wrong", body: "Priority support, not a queue." },
];

export const STANDARD_OUTCOMES = [
  { title: "Your favourite, when they're free", body: "We'll try for the same Xooter each visit." },
  { title: "Your home, remembered", body: "Access notes and preferences saved between visits." },
  { title: "1.5× XootCred", body: "Loyalty builds faster on every completed booking." },
];
