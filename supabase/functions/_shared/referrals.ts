/**
 * ZD-036 — referral eligibility and credit, on the server.
 *
 * ⚠️ **There is deliberately no client mirror of this file, and that is the whole design.**
 *
 * `docs/product/locked-commercial-facts.md` § Financial And Trust Authority already lists
 * **"referral qualification"** among the things the frontend is never authoritative for — a
 * fact locked before the 2026-09-03 design existed. That design implements every one of these
 * checks in `referral.js`, in the browser, which makes them suggestions: a screen that can
 * decide its own eligibility can decide its own discount.
 *
 * Every other duplicated money rule in this repo is mirrored client-side and pinned by
 * `pricing-parity.test.ts`. This one is not mirrored at all. The client renders the credit the
 * server returned on the quote and computes nothing.
 *
 * ── ⚠️ Corrected 2026-09-03: the schema already existed ───────────────────────────────
 * The first version of this file invented an `ownerId`, and a migration to go with it. Staging
 * refused that migration, and the reason was better than a typo: **`public.referrals` has
 * existed since 2026-04-23**, keyed on `user_id`, with a signup trigger that already issues
 * every user a code — and `public.referral_redemptions` beside it, whose
 * `referred_user_id UNIQUE` **is** the single-use burn this file was about to reinvent.
 *
 * So the types below are the real columns. A rule written against a table that does not exist
 * is a rule that will not survive contact with the one that does.
 *
 * ⛔ **Not yet wired into `create-booking`.** See `docs/implementation/design-port-plan.md`.
 */

/** Rand → cents, matching `pricing.ts`, so no float ever touches a money value. */
const r = (rands: number) => rands * 100;

/**
 * R100 each side — the referrer in credit, the referee off their first booking.
 *
 * ⚠️ **Provisional.** Against a first clean of roughly R335 this is about a third off, funded
 * by Xoot rather than by the Xooter. The design argues it pays back through
 * first-visit-to-second-visit conversion; that rate **cannot be measured yet**, because zero
 * bookings have completed. Recorded in ZD-036 as a number to revisit, not a settled one.
 */
export const REFERRAL_REWARD_CENTS = r(100);

/** Every reason a code can be refused. Returned rather than thrown so the UI can explain it. */
export type ReferralRefusal =
  | "unknown_code"
  | "own_code"
  | "already_used"
  | "not_a_first_booking";

/**
 * A row of `public.referrals`, in its real shape.
 *
 * ⚠️ There is no `active` column and no `burned_at`. A code is not withdrawn, and it is not
 * burned on the code itself — **the burn lives in `referral_redemptions`**, enforced by
 * `referred_user_id UNIQUE`. Modelling it here as a nullable timestamp would have been a
 * second, weaker copy of a constraint the database already guarantees.
 */
export type ReferralRecord = {
  code: string;
  /** `referrals.user_id` — the account the code belongs to, who earns the credit. */
  userId: string;
};

export type ReferralCheck = {
  record: ReferralRecord | null;
  /** The account attempting to redeem. */
  buyerId: string;
  /** Completed bookings for this buyer. The referee discount is a first-booking offer. */
  buyerCompletedBookings: number;
  /**
   * Whether a `referral_redemptions` row already exists for this buyer.
   *
   * The database enforces this with `referred_user_id UNIQUE`, so the insert would fail
   * anyway. Checked here as well so the customer gets an explanation instead of a 409.
   */
  buyerHasRedeemed: boolean;
};

export type ReferralVerdict =
  | { ok: true; referrerUserId: string; creditCents: number }
  | { ok: false; reason: ReferralRefusal };

/**
 * Decide whether a code may be redeemed, in one place.
 *
 * ⚠️ **Order matters and is not arbitrary.** `own_code` is checked before `already_used` so a
 * person entering their own burned code is told the honest reason rather than a misleading
 * one, and `not_a_first_booking` is checked last because it is the only refusal that is about
 * the buyer rather than the code — telling someone their code is invalid when it is their
 * history that disqualifies them sends them to support with the wrong question.
 */
export function checkReferral(input: ReferralCheck): ReferralVerdict {
  const { record, buyerId, buyerCompletedBookings, buyerHasRedeemed } = input;

  if (!record) return { ok: false, reason: "unknown_code" };

  // Self-referral. The commonest attempt, and honest more often than not — people assume the
  // code is theirs to use. It is still a discount funded by Xoot for no new customer.
  if (record.userId === buyerId) return { ok: false, reason: "own_code" };

  if (buyerHasRedeemed) return { ok: false, reason: "already_used" };

  // A referral buys a *first* customer. Someone who has already completed a booking is a
  // customer Xoot already has, and paying R100 to keep them is a different programme.
  if (buyerCompletedBookings > 0) return { ok: false, reason: "not_a_first_booking" };

  return { ok: true, referrerUserId: record.userId, creditCents: REFERRAL_REWARD_CENTS };
}

/**
 * The credit actually applied to a booking, in cents.
 *
 * ⚠️ **Capped at the work, not at the total.** The credit comes off the base and add-ons and
 * may never eat the booking fee or the cover: the fee is Xoot's own charge for arranging the
 * booking, and the cover is a premium passed through to an underwriter. Letting a referral
 * consume either would fund a discount out of someone else's money.
 *
 * Clamped at zero at both ends, so a malformed row cannot produce a negative line or a credit
 * larger than the thing it is discounting.
 */
export function referralCreditCents(input: {
  verdict: ReferralVerdict;
  baseCents: number;
  addOnsCents: number;
}): number {
  if (!input.verdict.ok) return 0;
  const discountable = Math.max(0, input.baseCents) + Math.max(0, input.addOnsCents);
  return Math.max(0, Math.min(input.verdict.creditCents, discountable));
}

/**
 * Who funds it: Xoot's commission, never the Xooter's pay.
 *
 * Stated as a constant rather than a comment because it is the rule most likely to be
 * quietly reversed under margin pressure, and because `DISCOUNT_FUNDING` already settled the
 * same question for cadence discounts. A Xooter's pay must not move because a customer
 * arrived through someone else's link.
 */
export const REFERRAL_FUNDING = "commission" as const;
