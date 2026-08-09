/**
 * Care+ membership pricing, the recurring-booking discount, and the win-back offer.
 *
 * ── One tier, R99, everything in it (founder decision 2026-08-09) ────────────────
 * Care+ is a single membership at **R99/month**, with no booking fee and every outcome
 * included, opening with **one month free**. The two-tier R99/R199 split is retired from
 * the live product and kept below as a future A/B arm.
 *
 * ── The arithmetic, redone at R99 ────────────────────────────────────────────────
 * A membership is only rational when what it saves exceeds what it costs. On a R296 clean,
 * with the cadence discounts below and the R39 one-time booking fee waived:
 *
 *   Weekly (4.3/mo, R1286 spend)   15% saves R193 — R94 ahead every month
 *   Fortnightly (2.2/mo, R643)     10% saves  R64 — R35 down
 *   Monthly (1/mo, R296)            5% saves  R15 — R84 down
 *
 * R99 changes the shape of the honest pitch but not its substance. A weekly booker is now
 * genuinely ahead on money alone, which R199 never delivered. Everyone else is still buying
 * the outcomes — the same Xooter every time, the slot you actually want, a home that is
 * remembered — and the copy must keep saying so rather than implying the discount pays for
 * the fee at every cadence. Claiming savings a fortnightly member does not get is a false
 * price representation under the Consumer Protection Act, and it is also just untrue.
 *
 * ⚠️ KNOWN DIVERGENCE, not fixed here. `create-booking` applies a **flat 10%** to every
 * active member (`getCarePlusDiscount` returns 0 or 0.1) and ignores cadence entirely, so
 * the server does not implement `CADENCE_DISCOUNT` below. Any surface quoting 15% for weekly
 * would be quoting a discount the server does not give. Fixing it means changing what members
 * are charged, so it is written down rather than taken silently — see `pricing-parity.test.ts`.
 */

/** The live membership price. One tier, everything included. */
export const CARE_PLUS_MONTHLY_CENTS = 9900;

/**
 * Free months at signup. The CTA is "Join Care+ for free", and that sentence is only true
 * while this is above zero — if it ever goes to 0, the button copy has to change in the same
 * commit. The cleans themselves are still charged during the free month; only the membership
 * is free, and the paywall must say so.
 */
export const FREE_MONTHS_AT_SIGNUP = 1;

/**
 * Members do not pay the R39 one-time booking fee. Mirrored server-side in
 * `supabase/functions/_shared/pricing.ts`; `pricing-parity.test.ts` holds the two together,
 * because a client that shows R0 and a server that charges R39 is the exact defect this repo
 * already shipped once on `BookingConfirm`.
 */
export const MEMBER_PAYS_BOOKING_FEE = false;

/** @deprecated Use `CARE_PLUS_MONTHLY_CENTS`. Kept so older imports keep compiling. */
export const STANDARD_MONTHLY_CENTS = CARE_PLUS_MONTHLY_CENTS;

/**
 * The R199 arm, retained for a future A/B test and **not live**.
 *
 * Nothing user-facing may price against it while Care+ is one tier at R99. In particular the
 * win-back offer must not be described as "half price" any more: that claim was anchored to
 * Premium being a real tier at a real R199, and with R199 unsold there is nothing for the half
 * to be measured against. An unqualified discount claim implies the item's own former price,
 * and R99 has never been higher — a false price representation under the CPA and an App Store
 * review failure.
 */
export const PREMIUM_MONTHLY_CENTS_AB_ARM = 19900;

/** @deprecated The A/B arm, not a live price. Use `PREMIUM_MONTHLY_CENTS_AB_ARM` knowingly. */
export const PREMIUM_MONTHLY_CENTS = PREMIUM_MONTHLY_CENTS_AB_ARM;

/** The win-back price is the membership price. There is no cheaper tier to fall back to. */
export const WIN_BACK_MONTHLY_CENTS = CARE_PLUS_MONTHLY_CENTS;

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
 * The percentages are sized to make the membership wash out at weekly cadence rather than
 * derived from a take rate. That used to carry a warning that they might be margin-negative
 * "if Xoot's commission is below ~15%" — **answered and retired.** The ladder in
 * `xooter-commission.ts` runs 35% down to a 20% floor, so Care+ is positive at every cadence
 * and every rank. `docs/care-plus-unit-economics.md` solves it at both ends.
 *
 * What replaced that worry is not about margin at all: the continuity promise routes Care+
 * volume to high-ranked Xooters, who are by design our lowest take rate. Size the membership
 * against the floor, not the average.
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
  // `tier` survives for the A/B arm. While Care+ is one tier, "premium" and "standard" are
  // the same R99 unless a caller deliberately asks for the unsold arm.
  const feeCents = tier === "premium" ? CARE_PLUS_MONTHLY_CENTS : CARE_PLUS_MONTHLY_CENTS;
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
