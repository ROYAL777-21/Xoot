/**
 * What Xoot keeps from a booking, and what the Xooter is paid.
 *
 * ── The founder's rule ───────────────────────────────────────────────────────────
 * Commission starts at 30–35% for a new Xooter and **falls as the Xooter ranks higher** —
 * on ratings, quality of work, punctuality. Doing well is compensated by keeping more of
 * the job, not by a bonus paid out of somewhere else.
 *
 * ── The rank already exists; this file only attaches money to it ─────────────────
 * `calculateReliabilityScore` in `trust.ts` takes exactly those inputs — `lateArrivals`
 * (punctuality), `qualityAverage` (ratings), `complaints`, `escalations`, `cancellations`,
 * `repeatBookings` — and returns 0–100. It is persisted as `zooters.reliability_score`,
 * shown on `XooterCard`, ranked on by `sortXootersForMarketplace`, and reported in the Ops
 * quality view. So the ladder below reads that score rather than inventing a second notion
 * of "doing well". Two competing definitions of a good Xooter is how a marketplace ends up
 * paying for one thing and promoting another.
 *
 * ── The trap this file exists to avoid ───────────────────────────────────────────
 * `calculateReliabilityScore` **starts at 100 and subtracts**, and `approve-zooter` writes
 * `reliability_score: 100` on approval. A Xooter who has never cleaned a home therefore
 * scores a perfect 100. A naive "high score → low commission" mapping hands them the 20%
 * floor on day one, permanently, for having done nothing.
 *
 * `minCompletedJobs` is what prevents that: the score decides *which* band, the job count
 * decides whether the band has been **earned**. `xooter-commission.test.ts` asserts the
 * exact row `approve-zooter` writes resolves to 35%.
 *
 * ── The floor is confirmed ───────────────────────────────────────────────────────
 * **20%, founder decision 2026-08-09.** This is the number that sets long-run marketplace
 * margin: at maturity most Care+ bookings will be served by ranked Xooters and will pay it,
 * which is why `docs/care-plus-unit-economics.md` solves the membership at both ends of the
 * ladder rather than at an average.
 *
 * The 35% start and the 20% floor are both stated. The three bands between them are a schedule
 * — sized so the founder's 35–30% range covers a Xooter's unproven period — and a schedule is
 * meant to be tuned. Changing one is five characters here plus the same in
 * `_shared/pricing.ts`; `pricing-parity.test.ts` fails if only one moves.
 */

/** Basis points, not a float. This decides what a person is paid; 0.325 is not exact. */
export type Bps = number;

export type Rank = "new" | "bronze" | "silver" | "gold" | "platinum";

export type CommissionBand = {
  rank: Rank;
  /** Shown to Xooters. The rank is a status they can see and aim at, not a hidden grade. */
  label: string;
  /** Minimum `reliability_score` to enter this band. */
  minScore: number;
  /** Minimum completed jobs before the band can be earned at all. */
  minCompletedJobs: number;
  rateBps: Bps;
};

/**
 * Ordered easiest → hardest. `commissionBandFor` walks the whole list and keeps the last
 * one satisfied, so inserting a band is a one-line change with no other edits.
 *
 * The founder's stated 35–30% range is the first three rows: that is where a Xooter lives
 * until they have proven something. Everything below 30% is earned.
 */
export const COMMISSION_BANDS: readonly CommissionBand[] = [
  { rank: "new", label: "New", minScore: 0, minCompletedJobs: 0, rateBps: 3500 },
  { rank: "bronze", label: "Bronze", minScore: 80, minCompletedJobs: 10, rateBps: 3250 },
  { rank: "silver", label: "Silver", minScore: 88, minCompletedJobs: 25, rateBps: 3000 },
  { rank: "gold", label: "Gold", minScore: 93, minCompletedJobs: 75, rateBps: 2500 },
  { rank: "platinum", label: "Platinum", minScore: 97, minCompletedJobs: 200, rateBps: 2000 },
];

export const STARTING_BAND = COMMISSION_BANDS[0];
export const STARTING_RATE_BPS = STARTING_BAND.rateBps;
/** The long-run marketplace take rate. Unconfirmed — see the header. */
export const FLOOR_RATE_BPS = COMMISSION_BANDS[COMMISSION_BANDS.length - 1].rateBps;

/**
 * How far below a band's entry threshold a Xooter may slip before losing it.
 *
 * Without this, someone hovering around 88 changes rate every week as one late arrival lands
 * and ages out. A pay rate that oscillates is experienced as arbitrary even when every
 * individual move is correct, and "I don't know what I earn" is how good people leave.
 */
export const HYSTERESIS_POINTS = 3;

/**
 * Below this, a Xooter is on the starting rate whatever they have earned before.
 *
 * Deliberately the same 75 as `shouldDeprioritizeXooter` in `trust.ts`, which already
 * de-prioritises these Xooters in matching. One threshold meaning one thing across matching
 * and pay is worth more than two independently-tuned numbers: when someone asks "what counts
 * as in trouble", there is a single answer.
 *
 * Hysteresis does not apply here — this is the floor of the whole ladder, not a band edge.
 */
export const IN_TROUBLE_SCORE = 75;

export type XooterRankInputs = {
  /** `zooters.reliability_score`. */
  reliabilityScore?: number | null;
  /** `zooters.jobs_completed`. */
  completedJobs?: number | null;
  /**
   * The rate this Xooter currently holds, for hysteresis. Omit and the band is resolved
   * from scratch, which is correct for a first resolution and for any read-only display.
   */
  currentRateBps?: Bps | null;
};

const bandByRate = (rateBps: Bps | null | undefined): CommissionBand | null =>
  COMMISSION_BANDS.find((band) => band.rateBps === rateBps) ?? null;

/**
 * Resolve a Xooter's band.
 *
 * On missing or non-numeric data this returns the **starting** band rather than guessing.
 * That is the loud failure: a Xooter who suddenly sees 35% reports it within a day, whereas
 * silently granting the floor is a revenue leak nobody ever notices. A missing score means a
 * caller failed to select the column — a bug to surface, not a state to interpret.
 */
export function commissionBandFor(inputs: XooterRankInputs): CommissionBand {
  const { reliabilityScore, completedJobs, currentRateBps } = inputs;

  if (typeof reliabilityScore !== "number" || !Number.isFinite(reliabilityScore)) {
    return STARTING_BAND;
  }
  const score = Math.max(0, Math.min(100, reliabilityScore));
  const jobs =
    typeof completedJobs === "number" && Number.isFinite(completedJobs)
      ? Math.max(0, Math.floor(completedJobs))
      : 0;

  if (score < IN_TROUBLE_SCORE) return STARTING_BAND;

  let earned = STARTING_BAND;
  for (const band of COMMISSION_BANDS) {
    if (jobs >= band.minCompletedJobs && score >= band.minScore) earned = band;
  }

  // A band already held is kept while the score stays within tolerance of its threshold.
  // Only ever protective: it cannot block a promotion, only soften a demotion.
  const held = bandByRate(currentRateBps);
  if (
    held &&
    held.rateBps < earned.rateBps &&
    jobs >= held.minCompletedJobs &&
    score >= held.minScore - HYSTERESIS_POINTS
  ) {
    return held;
  }

  return earned;
}

/** The rate alone, for callers that do not need the band. */
export const commissionRateBpsFor = (inputs: XooterRankInputs): Bps =>
  commissionBandFor(inputs).rateBps;

/** For copy and admin surfaces: `3250` → `"32.5%"`. */
export const formatRate = (rateBps: Bps): string => `${(rateBps / 100).toFixed(1).replace(/\.0$/, "")}%`;

export type Payout = {
  rateBps: Bps;
  /** What Xoot keeps. */
  commissionCents: number;
  /** What the Xooter earns, before any Care+ discount share (`splitDiscount`). */
  xooterPayCents: number;
};

/**
 * Split a booking between Xoot and the Xooter.
 *
 * **The base is the subtotal, not the total.** Booking cover is an insurance premium passed
 * through, and the R39 one-time service fee is Xoot's own charge for arranging the booking —
 * commissioning either would mean a Xooter's pay moving because a customer ticked a box that
 * has nothing to do with the work. This matches how the high-demand premium is charged on
 * `subtotalCents` in `create-booking`, and how `splitDiscount` reasons about pay.
 *
 * Composes with `splitDiscount` in `care-plus.ts`: this decides pay before any Care+ discount
 * share is taken, and `MIN_XOOTER_PAY_*` floors what that share may remove.
 */
export function xooterPayoutFor(subtotalCents: number, rateBps: Bps): Payout {
  const base = Math.max(0, Math.round(subtotalCents));
  const commissionCents = Math.round((base * rateBps) / 10000);
  return { rateBps, commissionCents, xooterPayCents: base - commissionCents };
}
