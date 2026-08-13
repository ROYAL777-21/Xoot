/**
 * Tipping a Xooter after a service.
 *
 * All money is integer cents. Per ZD-021 every tunable is a named constant here rather
 * than a literal in the card, so changing the presets is an edit to one file.
 *
 * Two decisions in this module are deliberate and load-bearing, and both are recorded
 * in `docs/xoot-master-brief.md` §6.1:
 *
 *   1. **No preset is selected by default.** A pre-selected tip means every customer who
 *      taps through without noticing leaves one. It is the most complained-about pattern
 *      in tipping UI and it does its damage exactly where the product is trying to earn
 *      trust.
 *   2. **Rand amounts, not percentages.** Percentage tipping is not the norm for South
 *      African home services, and scaling with the booking total charges nearly double
 *      the tip on a ten-hour clean as on a four-hour one for the same gesture.
 */

/**
 * Preset amounts, against typical booking totals of R250–R430 (master brief §4).
 *
 * Three, not four: a longer row pushes each target below a comfortable tap size on a
 * small phone, and the custom field covers everything else.
 */
export const TIP_PRESETS_CENTS = [2000, 3000, 5000] as const;

/**
 * Ceiling on a custom tip.
 *
 * Not a policy about generosity — a typo guard. Without it a mis-keyed "5000" in a
 * field meant for rands becomes R5,000 against an R300 clean, and the first the
 * customer knows is the statement.
 */
export const MAX_TIP_CENTS = 100_000;

/** Custom amounts are entered in whole rands; nobody tips R37.50. */
export const TIP_STEP_CENTS = 100;

// ---------------------------------------------------------------------------
// Claims — gated, because getting these wrong is a legal matter
// ---------------------------------------------------------------------------

/**
 * Xoot takes no cut of tips — confirmed by the founder 2026-07-30.
 *
 * This unlocks the "every rand goes to your Xooter" line, which is a representation
 * about price under the Consumer Protection Act rather than a marketing claim, and is
 * trivially checkable by the Xooters on the other side of it. It may only stay true
 * while the payout carries the full amount; if a fee is ever taken, this flips back
 * before the fee ships, not after.
 */
export const TIP_GOES_ENTIRELY_TO_XOOTER = true;

/**
 * When a Xooter may see that they were tipped — founder, 2026-07-30: not before the
 * customer relationship is closed out, because it colours the job and the rating.
 *
 * This is enforced in the database, not here, and it is why the tip lives in
 * `booking_tips` rather than on `bookings`. RLS is row-level: the existing "xooters view
 * assigned bookings" policy returns whole rows, so a tip column on `bookings` would be
 * readable by the assigned Xooter the moment it existed, and column-level GRANTs cannot
 * separate customers from Xooters because they share the `authenticated` role.
 *
 * The gate is `booking_tips.settled_at`. Tighten it to "settled AND the Xooter has
 * submitted their rating" once a Xooter-rates-customer flow exists; there is none today.
 */
export const TIP_VISIBLE_TO_XOOTER = "after_settlement" as const;

/**
 * How far tipping has actually got, as one value rather than several flags that can
 * disagree.
 *
 *   `schema_pending`  `bookings.tip_cents` does not exist yet — the migration
 *                     (`20260730090000_booking_tips.sql`) is written but unapplied,
 *                     gated on ZD-003 and ZD-005. Offering a tip here would fail on
 *                     every submit, so the card is not shown at all. A tip UI that
 *                     cannot work is worse than no tip UI: it reads as a broken
 *                     payment at the exact moment the product is asking to be trusted.
 *   `capture_only`    The amount is recorded against the booking, but nothing charges
 *                     it yet. The card may be shown; it must not imply a charge.
 *   `settled`         `payment_records` carries the tip through to a payout.
 *
 * Advance this one step at a time, and only behind the thing it claims.
 */
export type TipReadiness = "schema_pending" | "capture_only" | "settled";
export const TIP_READINESS: TipReadiness = "schema_pending";

/** Whether the tip UI may be offered at all. */
export const canOfferTip = () => TIP_READINESS !== "schema_pending";

/**
 * The line under the tip row.
 *
 * Deliberately makes no claim about distribution or timing that is not yet true. The
 * stronger line is unlocked by the flags above, and `tipping.test.ts` asserts it cannot
 * appear while they are unset.
 */
export function tipAssurance(): string {
  if (TIP_READINESS === "settled" && TIP_GOES_ENTIRELY_TO_XOOTER) {
    return "Optional. Every rand goes to your Xooter.";
  }
  if (TIP_READINESS === "settled") {
    return "Optional. Added to this booking.";
  }
  // Capture only: the amount is recorded but nothing has charged it, so the copy may
  // not imply otherwise however confident the other flags are.
  return "Optional. We will confirm the amount with you before anything is charged.";
}

// ---------------------------------------------------------------------------
// Amounts
// ---------------------------------------------------------------------------

/**
 * Parse a typed custom amount into cents.
 *
 * Returns `null` for anything that is not a tip — empty, zero, junk — so the caller has
 * one "no tip" value rather than having to treat 0 and null alike and eventually
 * forgetting to.
 */
export function parseCustomTipCents(input: string): number | null {
  // Strip only what does not change the value — a currency symbol, spaces, thousands
  // separators. Stripping *every* non-digit instead would turn "-20" into a R20 tip by
  // deleting the sign, and "1.5" into R15. Anything left that is not a digit means the
  // customer typed something this field cannot honestly interpret, so it is refused
  // rather than guessed at.
  const cleaned = input.replace(/[\sR,]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;

  const rands = Number(cleaned);
  if (!Number.isFinite(rands) || rands <= 0) return null;

  return Math.min(rands * TIP_STEP_CENTS, MAX_TIP_CENTS);
}

/** What a custom field should display back, so the cap is visible rather than silent. */
export function formatCustomTipInput(cents: number | null): string {
  return cents === null ? "" : String(Math.round(cents / TIP_STEP_CENTS));
}

/**
 * Whether an amount may be written.
 *
 * `null` is valid and means no tip. The guard exists because the value reaches the
 * database, and a fractional or out-of-range amount there is far more expensive to
 * unpick than one rejected here.
 */
export function isWritableTip(cents: number | null): cents is number | null {
  if (cents === null) return true;
  return (
    Number.isInteger(cents) &&
    cents > 0 &&
    cents <= MAX_TIP_CENTS &&
    cents % TIP_STEP_CENTS === 0
  );
}

/** Total the customer has committed to for this booking, tip included. */
export function totalWithTip(bookingCents: number, tipCents: number | null): number {
  return bookingCents + (tipCents ?? 0);
}

/** The row written to `booking_tips`. One per booking, enforced by its primary key. */
export type BookingTipInsert = {
  booking_id: string;
  user_id: string;
  xooter_id: string | null;
  amount_cents: number;
};

/**
 * Build the row, or null if there is nothing to write.
 *
 * `settled_at` is deliberately absent: a client session cannot set it — the database
 * trigger reverts any attempt — because that column is what hides the tip from the
 * Xooter, and a customer able to set it could reveal their own tip early.
 */
export function buildTipRow(input: {
  bookingId: string;
  userId: string;
  xooterId: string | null;
  cents: number | null;
}): BookingTipInsert | null {
  if (input.cents === null || !isWritableTip(input.cents)) return null;
  return {
    booking_id: input.bookingId,
    user_id: input.userId,
    xooter_id: input.xooterId,
    amount_cents: input.cents,
  };
}
