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

/* ── The earnings boost ───────────────────────────────────────────────────────────
 * "You keep 5% more of every job for the next 14 days." A reward for doing well, awarded to
 * selected Xooters rather than computed for everyone.
 *
 * ON THE COPY, because the number matters. The founder's phrasing was "revenue boosted by 5%",
 * which *understates* it. Going 35% → 30% moves a Xooter's share of a R296 clean from R192.40 to
 * R207.20: five percentage points more of the job, which is a **7.7%** rise in what they earn.
 * "You keep 5% more of every job" is exactly true and is the sentence a Xooter can check against
 * their own payout. `xooter-commission.test.ts` pins both figures so the copy cannot drift from
 * the arithmetic.
 *
 * The boost lives in `xooter_commission_boosts`, time-boxed so it expires itself — a reward
 * switched on and forgotten would become a permanent rate change nobody remembers making.
 */

/** The standard award. Five percentage points, for fourteen days. */
export const BOOST_BPS = 500;
export const BOOST_DAYS = 14;

/**
 * Apply a boost to a resolved rate, clamped at the floor.
 *
 * **The clamp is the founder decision (2026-08-09): 20% is an absolute floor on what Xoot keeps.**
 * A Platinum Xooter already at 20% therefore gains nothing here, and that is deliberate rather
 * than an oversight — `boostIsWorthGranting` exists so the grant path can say so out loud instead
 * of issuing a reward worth zero.
 */
export const applyBoost = (rateBps: Bps, boostBps: Bps = BOOST_BPS): Bps =>
  Math.max(FLOOR_RATE_BPS, rateBps - Math.max(0, boostBps));

/**
 * Whether a boost would actually change this Xooter's rate.
 *
 * Ops needs to be told "this Xooter is already at the floor" rather than granting something that
 * does nothing — a reward the recipient cannot detect is worse than no reward, because they were
 * told they had one.
 */
export const boostIsWorthGranting = (rateBps: Bps, boostBps: Bps = BOOST_BPS): boolean =>
  applyBoost(rateBps, boostBps) < rateBps;

/** Is a boost window open at this moment? Half-open: starts inclusive, ends exclusive. */
export const boostIsActive = (
  boost: { startsAt: string | Date; endsAt: string | Date } | null | undefined,
  now: Date = new Date(),
): boolean => {
  if (!boost) return false;
  const start = new Date(boost.startsAt).getTime();
  const end = new Date(boost.endsAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  const at = now.getTime();
  return at >= start && at < end;
};

/**
 * What a boost is worth to the Xooter on a given job, for the surface that announces it.
 *
 * Returns both the percentage-point difference (5) and the actual earnings increase (7.7%), so a
 * screen can quote whichever it means and neither can be invented at the call site.
 */
export function boostValueFor(subtotalCents: number, rateBps: Bps, boostBps: Bps = BOOST_BPS) {
  const before = xooterPayoutFor(subtotalCents, rateBps).xooterPayCents;
  const after = xooterPayoutFor(subtotalCents, applyBoost(rateBps, boostBps)).xooterPayCents;
  const extraCents = after - before;
  return {
    extraCents,
    /** Percentage points of the job kept, e.g. 5. */
    pointsOfJob: (rateBps - applyBoost(rateBps, boostBps)) / 100,
    /** The real rise in earnings, e.g. 7.7. Always ≥ pointsOfJob. */
    earningsPercent: before > 0 ? Number(((extraCents / before) * 100).toFixed(1)) : 0,
  };
}

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
