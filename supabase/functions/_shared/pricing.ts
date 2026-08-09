/**
 * Server-authoritative booking prices, per `ZD-020` and master brief §4.
 *
 * This is the authority. `src/lib/xoot-pricing.ts` mirrors these ladders for display
 * only; if the two ever disagree, this file wins and the client is wrong.
 *
 * ⚠️ KEEP IN SYNC with `src/lib/xoot-pricing.ts`. Edge functions run on Deno and cannot
 * import from `src/`, so the tables are duplicated deliberately rather than shared
 * through a build step. Change one, change the other. `pricing-parity.test.ts` in the
 * web suite fails if they drift.
 *
 * ── What changed and why ────────────────────────────────────────────────────────
 * The previous model priced as `homeSize.price × serviceLength.priceFactor ×
 * serviceMultiplier`, which double-counted duration: a home size carried both an hour
 * count and a price, and the service length then scaled that price by hours again.
 * ZD-020 replaced it with a single fact — price is a function of booked hours, and
 * home size only sets the default number of hours.
 *
 * The old R270 / R315 / R390 figures were themselves never approved; the locked
 * commercial facts said R280 / R325 / R400, and those were add-on inclusive.
 */

export type ServiceId = "regular" | "office" | "express" | "airbnb" | "moving";

/** Rand → cents. Everything downstream is integer cents. */
const r = (rands: number) => rands * 100;

type Ladder = Record<string, number>;

const REGULAR: Ladder = {
  "3.5": r(236), "4": r(250), "4.5": r(266), "5": r(280), "5.5": r(296),
  "6": r(310), "6.5": r(326), "7": r(340), "7.5": r(356), "8": r(370),
  "8.5": r(386), "9": r(400), "9.5": r(416), "10": r(430),
};

const OFFICE: Ladder = {
  "2": r(324), "2.5": r(324), "3": r(324), "3.5": r(374), "4": r(424),
  "4.5": r(442), "5": r(452), "5.5": r(476), "6": r(504), "6.5": r(518),
  "7": r(540), "7.5": r(558), "8": r(592), "8.5": r(618), "9": r(638),
  "9.5": r(646), "10": r(660),
};

const EXPRESS: Ladder = { "1": r(220), "1.5": r(220), "2": r(220), "2.5": r(220), "3": r(220) };

const AIRBNB: Ladder = {
  "3": r(304), "3.5": r(304), "4": r(304), "4.5": r(318), "5": r(324),
  "5.5": r(342), "6": r(362), "6.5": r(362), "7": r(372), "7.5": r(400), "8": r(426),
};

/** ⚠️ Reconstructed from a degraded transcript — see ZD-020. Unconfirmed. */
const MOVING: Ladder = {
  "4.5": r(320), "5": r(330), "5.5": r(344), "6": r(364), "6.5": r(376),
  "7": r(390), "7.5": r(404), "8": r(430), "8.5": r(448), "9": r(462),
  "9.5": r(468), "10": r(478),
};

export const LADDERS: Record<ServiceId, { ladder: Ladder; min: number; max: number }> = {
  regular: { ladder: REGULAR, min: 3.5, max: 10 },
  office: { ladder: OFFICE, min: 2, max: 10 },
  express: { ladder: EXPRESS, min: 1, max: 3 },
  airbnb: { ladder: AIRBNB, min: 3, max: 8 },
  moving: { ladder: MOVING, min: 4.5, max: 10 },
};

export const ADD_ON_CENTS = r(30);
export const LINEN_ON_SITE_CENTS = r(20);
/** R21 → R22 per ZD-020. The provider is also changing; terms are pinned. */
export const BOOKING_COVER_CENTS = r(22);
export const ONE_TIME_SERVICE_FEE_CENTS = r(39);

/** Legacy request vocabulary → the five priced services. */
export const SERVICE_ALIASES: Record<string, ServiceId> = {
  residential: "regular",
  regular: "regular",
  deep: "regular",
  premium: "regular",
  express: "express",
  airbnb: "airbnb",
  office: "office",
  moving: "moving",
};

/** Default hours implied by the legacy home-size vocabulary (§4.1). */
export const HOME_SIZE_HOURS: Record<string, number> = { small: 4, medium: 5.5, large: 8 };

/** Default hours implied by the legacy service-length vocabulary. */
export const SERVICE_LENGTH_HOURS: Record<string, number> = {
  refresh: 3.5,
  standard: 4.5,
  extended: 6,
  full_day: 8,
};

/* ── Commission ──────────────────────────────────────────────────────────────────
 * What Xoot keeps, and what the Xooter is paid.
 *
 * Commission starts at 35% for a new Xooter and falls as they rank higher on
 * `zooters.reliability_score` — ratings, punctuality, quality of work. The score decides
 * which band; `minCompletedJobs` decides whether the band has been earned.
 *
 * ⚠️ KEEP IN SYNC with `src/lib/xooter-commission.ts`, which carries the full reasoning
 * (including why a freshly approved Xooter scoring a perfect 100 must NOT get the floor).
 * `pricing-parity.test.ts` fails if the two tables drift.
 */

export type CommissionBand = {
  rank: string;
  minScore: number;
  minCompletedJobs: number;
  rateBps: number;
};

export const COMMISSION_BANDS: CommissionBand[] = [
  { rank: "new", minScore: 0, minCompletedJobs: 0, rateBps: 3500 },
  { rank: "bronze", minScore: 80, minCompletedJobs: 10, rateBps: 3250 },
  { rank: "silver", minScore: 88, minCompletedJobs: 25, rateBps: 3000 },
  { rank: "gold", minScore: 93, minCompletedJobs: 75, rateBps: 2500 },
  { rank: "platinum", minScore: 97, minCompletedJobs: 200, rateBps: 2000 },
];

export const STARTING_RATE_BPS = 3500;
export const HYSTERESIS_POINTS = 3;
/** Same 75 as `shouldDeprioritizeXooter` — one threshold, one meaning. */
export const IN_TROUBLE_SCORE = 75;

/**
 * Resolve a Xooter's commission rate in basis points.
 *
 * Returns the starting rate on missing or non-numeric data rather than guessing: a Xooter on
 * an unexpected 35% reports it the same day, whereas silently granting the 20% floor is a
 * revenue leak nobody notices.
 */
export function commissionRateBps(input: {
  reliabilityScore?: number | null;
  completedJobs?: number | null;
  currentRateBps?: number | null;
}): number {
  const { reliabilityScore, completedJobs, currentRateBps } = input;
  if (typeof reliabilityScore !== "number" || !Number.isFinite(reliabilityScore)) {
    return STARTING_RATE_BPS;
  }
  const score = Math.max(0, Math.min(100, reliabilityScore));
  const jobs =
    typeof completedJobs === "number" && Number.isFinite(completedJobs)
      ? Math.max(0, Math.floor(completedJobs))
      : 0;

  if (score < IN_TROUBLE_SCORE) return STARTING_RATE_BPS;

  let earned = COMMISSION_BANDS[0];
  for (const band of COMMISSION_BANDS) {
    if (jobs >= band.minCompletedJobs && score >= band.minScore) earned = band;
  }

  const held = COMMISSION_BANDS.find((b) => b.rateBps === currentRateBps) ?? null;
  if (
    held &&
    held.rateBps < earned.rateBps &&
    jobs >= held.minCompletedJobs &&
    score >= held.minScore - HYSTERESIS_POINTS
  ) {
    return held.rateBps;
  }
  return earned.rateBps;
}

/**
 * The 14-day earnings boost: a Xooter keeps 5% more of every job.
 *
 * ⚠️ KEEP IN SYNC with `src/lib/xooter-commission.ts`. Clamped at the floor — 20% is the confirmed
 * absolute floor on Xoot's take, so a Platinum Xooter's boost is worth nothing and the grant path
 * says so rather than issuing it silently.
 */
export const BOOST_BPS = 500;
export const FLOOR_RATE_BPS = 2000;

export const applyBoost = (rateBps: number, boostBps: number = BOOST_BPS): number =>
  Math.max(FLOOR_RATE_BPS, rateBps - Math.max(0, boostBps));

/**
 * The boost rate active for a Xooter right now, or 0.
 *
 * Reads the row rather than trusting a flag, and filters on the window in SQL so an expired boost
 * cannot be applied by a caller that forgot to check. A boost applies to bookings struck inside
 * its window and never retroactively, because the rate is stamped once at assignment.
 */
export async function activeBoostBpsFor(supa: any, zooterId: string): Promise<number> {
  if (!zooterId) return 0;
  const nowIso = new Date().toISOString();
  const { data, error } = await supa
    .from("xooter_commission_boosts")
    .select("bps")
    .eq("zooter_id", zooterId)
    .lte("starts_at", nowIso)
    .gt("ends_at", nowIso)
    .order("bps", { ascending: false })
    .limit(1)
    .maybeSingle();

  /*
   * Degrade to "no boost", loudly.
   *
   * Returning 0 is the safe direction — a booking is struck at the earned rate rather than an
   * invented one, and booking creation never fails because a reward table is unreachable. But
   * silence is not safe. If this function is deployed before
   * `20260809210000_xooter_commission_boosts.sql` is applied, every lookup errors and every boost
   * quietly does nothing; a Xooter told they keep 5% more would not, and no one would find out.
   *
   * That is precisely how rate limiting stayed broken for the life of this project: the failure
   * was real, the fallback was reasonable, and nothing ever said so. So it says so.
   */
  if (error) {
    console.error("activeBoostBpsFor lookup failed; treating as no boost", {
      zooterId,
      message: error.message ?? String(error),
    });
    return 0;
  }
  return Number(data?.bps ?? 0);
}

/**
 * Split a booking's **subtotal** between Xoot and the Xooter.
 *
 * The base is the subtotal, never the total: booking cover is a passed-through premium and the
 * R39 service fee is Xoot's own charge for arranging the booking. Commissioning either would
 * move a Xooter's pay because a customer ticked a box unrelated to the work.
 */
export function xooterPayout(subtotalCents: number, rateBps: number): {
  commissionCents: number;
  xooterPayCents: number;
} {
  const base = Math.max(0, Math.round(subtotalCents));
  const commissionCents = Math.round((base * rateBps) / 10000);
  return { commissionCents, xooterPayCents: base - commissionCents };
}

export type PriceResult =
  | { ok: true; hours: number; baseCents: number }
  | { ok: false; reason: string };

/**
 * Base price for a booking.
 *
 * Refuses rather than interpolating. Rounding an off-ladder duration to the nearest rung
 * would charge a customer a number nobody approved, which is worse than rejecting the
 * request and making the client send a valid one.
 */
export function basePrice(serviceType: string, hours: number): PriceResult {
  const service = SERVICE_ALIASES[serviceType];
  if (!service) return { ok: false, reason: `unsupported service: ${serviceType}` };

  const spec = LADDERS[service];
  if (hours < spec.min || hours > spec.max) {
    return { ok: false, reason: `${service} is booked between ${spec.min} and ${spec.max} hours` };
  }

  const baseCents = spec.ladder[String(hours)];
  if (baseCents === undefined) {
    return { ok: false, reason: `${hours} hours is not on the ${service} ladder; hours move in half-hour steps` };
  }
  return { ok: true, hours, baseCents };
}

/**
 * Resolve booked hours from whichever vocabulary the client sent.
 *
 * Explicit hours win. Falling back to service length before home size is deliberate:
 * length is a duration the customer chose, home size only implies a default.
 */
export function resolveHours(input: {
  hours?: number;
  serviceLengthId?: string;
  homeSizeId?: string;
}): number | null {
  if (typeof input.hours === "number" && Number.isFinite(input.hours)) return input.hours;
  if (input.serviceLengthId && SERVICE_LENGTH_HOURS[input.serviceLengthId] !== undefined) {
    return SERVICE_LENGTH_HOURS[input.serviceLengthId];
  }
  if (input.homeSizeId && HOME_SIZE_HOURS[input.homeSizeId] !== undefined) {
    return HOME_SIZE_HOURS[input.homeSizeId];
  }
  return null;
}
