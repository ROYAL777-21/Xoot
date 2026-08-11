/**
 * Splitting one booking's cost between several people.
 *
 * ── What this does and does not do ──────────────────────────────────────────────
 * It decides and records **who owes what**. It does not move money, because nothing in Xoot moves
 * money yet: `create-booking` writes `provider_required: "Ozow/Stitch credentials not connected"`
 * and every `payment_records` row goes `pending → admin_confirmed → paid` by hand. Each share
 * becomes its own payment row so it is independently collectable the moment a provider is
 * connected, and the UI says so rather than implying a payment happened.
 *
 * ── The rule everything here exists to enforce ──────────────────────────────────
 * **Shares must sum to exactly the total.** Not approximately. A split that loses a cent
 * under-collects on every booking forever; a split that invents one over-collects, which is worse
 * because it is money taken from someone who did not agree to it.
 *
 * `Math.round(total / n)` does both, depending on the remainder. This module has been written
 * against that specific failure because this repo has already paid for it twice — most recently in
 * `impliedSubtotalCents`, where rounding to whole cents made a reverse calculation inexact.
 */

/** A share of a booking, in cents. */
export type FareShare = {
  /** Who owes it. An email until they accept and become a real user. */
  email: string;
  amountCents: number;
};

/**
 * Split a total evenly between `n` people, distributing the remainder one cent at a time.
 *
 * R100 between 3 people is 3334 + 3333 + 3333, not 3333 × 3 (a cent short) and not 3333.33 × 3
 * (not representable). The earlier payers absorb the extra cent, which is arbitrary but must be
 * *deterministic* — a split that reshuffles between renders would show someone a different number
 * each time they looked.
 *
 * @throws never. Returns an empty array for a non-positive party size, so a caller cannot
 * accidentally produce a single share equal to the whole total.
 */
export function splitEvenly(totalCents: number, parties: number): number[] {
  if (!Number.isFinite(totalCents) || !Number.isFinite(parties)) return [];
  const n = Math.floor(parties);
  if (n <= 0) return [];
  const total = Math.max(0, Math.round(totalCents));

  const base = Math.floor(total / n);
  const remainder = total - base * n;
  return Array.from({ length: n }, (_, index) => base + (index < remainder ? 1 : 0));
}

/**
 * Does this set of shares exactly account for the total?
 *
 * The single check the server runs before writing anything, and the one the database trigger
 * mirrors. Both exist on purpose: the function is where a helpful error message lives, the trigger
 * is what makes an incorrect split impossible even if some future code path forgets to ask.
 */
export const sharesAreExact = (shares: readonly number[], totalCents: number): boolean =>
  shares.length > 0 &&
  shares.every((amount) => Number.isInteger(amount) && amount >= 0) &&
  shares.reduce((sum, amount) => sum + amount, 0) === Math.round(totalCents);

/**
 * The organiser's own share, given what everyone else owes.
 *
 * Deliberately derived rather than entered. If the organiser typed their own share too, four
 * numbers would have to agree with a fifth, and the arithmetic would fail in a form rather than in
 * a function — leaving someone to work out which field to change. Here the remainder is always
 * theirs, so the split always sums.
 *
 * Returns `null` when the others already claim more than the total, which is a real input error
 * and must not silently become a negative share.
 */
export function organiserShareCents(totalCents: number, otherShares: readonly number[]): number | null {
  const total = Math.round(totalCents);
  const claimed = otherShares.reduce((sum, amount) => sum + Math.round(amount), 0);
  const remainder = total - claimed;
  return remainder >= 0 ? remainder : null;
}

/** Lowest share a person can be asked for: R10. */
export const MIN_SHARE_CENTS = 1000;

/**
 * How many people, including the organiser, may share one booking.
 *
 * Six is a household or a flatshare, which is the case this is for. It is not a fundraising tool,
 * and a cap keeps one booking from generating dozens of payment rows and invitation emails.
 */
export const MAX_SPLIT_PARTIES = 6;

export type SplitValidation = { ok: true } | { ok: false; reason: string };

/**
 * Everything the server checks before a split is written, in one place so the UI can run the
 * identical check and show the problem before anyone submits.
 */
export function validateSplit(shares: readonly FareShare[], totalCents: number): SplitValidation {
  if (shares.length < 2) return { ok: false, reason: "A split needs at least two people." };
  if (shares.length > MAX_SPLIT_PARTIES) {
    return { ok: false, reason: `A booking can be split between at most ${MAX_SPLIT_PARTIES} people.` };
  }

  const emails = shares.map((share) => share.email.trim().toLowerCase());
  if (emails.some((email) => !email.includes("@"))) {
    return { ok: false, reason: "Every person needs a valid email address." };
  }
  if (new Set(emails).size !== emails.length) {
    return { ok: false, reason: "The same person is listed twice." };
  }

  if (shares.some((share) => share.amountCents < MIN_SHARE_CENTS)) {
    return { ok: false, reason: `Each share must be at least R${MIN_SHARE_CENTS / 100}.` };
  }

  if (!sharesAreExact(shares.map((share) => share.amountCents), totalCents)) {
    return { ok: false, reason: "The shares must add up to exactly the booking total." };
  }

  return { ok: true };
}
