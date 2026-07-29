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
