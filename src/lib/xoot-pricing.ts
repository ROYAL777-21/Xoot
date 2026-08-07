/**
 * Client-side price quoting, per master brief §4 and `ZD-020`.
 *
 * ⚠️ THIS IS A DISPLAY QUOTE, NOT AN AUTHORITY.
 * `supabase/functions/create-booking/index.ts` still runs the old R270/R315/R390 model
 * with unapproved multipliers. Until that migration is written and signed off, this
 * module and the server disagree, and the server wins on anything that charges money.
 * Never take a number from here as a committed price.
 *
 * ⚠️ NO PRICE IS SHOWN UNTIL THE END OF THE BOOKING FLOW, on every service. Calling
 * `quote()` early is fine; rendering the result early is not.
 *
 * Price is a function of booked hours only. Home size sets the *default* hours — it
 * never changes what an hour costs. That is why one ladder serves all three sizes:
 * the ZD-007 prices of R280/R325/R400 land on it exactly once the preselected R30
 * add-on they included is removed.
 */

export type ServiceId = "regular" | "office" | "express" | "airbnb" | "moving" | "laundry";

/** R30 for everything except the Airbnb on-site linen option, which is R20. */
export const ADD_ON_CENTS = 3000;
export const LINEN_ON_SITE_CENTS = 2000;
export const BOOKING_COVER_CENTS = 2200;

/**
 * Multi-Xooter booking.
 *
 * **This mirrors `supabase/functions/create-booking/index.ts`. The server is the authority
 * on anything that charges money; this module only has to agree with it.**
 *
 * The model is per-Xooter, not a split: each Xooter works the full booked duration and is
 * charged for, with a 10% discount once three or more are on the job. Three Xooters on a
 * 6-hour office clean is 18 labour hours, priced as 3 x R504 less 10%.
 *
 * That is a real product for the services it is enabled on — an office or a moving clean
 * genuinely needs several people for the whole visit, not one person for three times as
 * long. It is NOT enabled for regular home cleaning, which stays single-Xooter.
 *
 * Corrected 2026-08-07. This module first shipped the opposite model (same price, work
 * split, job finishes sooner) chosen on the reasoning that it left the approved ladder
 * untouched. That was wrong: `create-booking` already implemented per-Xooter pricing and
 * had done all along, so the "undecided" question had in fact been answered in the server.
 * `pricing-parity.test.ts` did not catch the divergence because it compared ladder rungs
 * only, and multi-Xooter is a dimension it did not cover. It covers it now.
 */
const MULTI_XOOTER_DISCOUNT_THRESHOLD = 3;
const MULTI_XOOTER_DISCOUNT_RATE = 0.1;

/** Server caps at 5 (`Math.min(..., 5)` in create-booking). */
export const MAX_XOOTERS = 5;

/**
 * Only these take more than one Xooter, matching `multiWorkerServices` in the server.
 * The server set also lists "deep" and "premium", which are not client `ServiceId`s.
 */
export const MULTI_XOOTER_SERVICES: ReadonlySet<ServiceId> = new Set(["airbnb", "office", "moving"]);

/** The discount rate applied at a given Xooter count. 0 below the threshold. */
export const multiXooterDiscountRate = (xooterCount: number) =>
  xooterCount >= MULTI_XOOTER_DISCOUNT_THRESHOLD ? MULTI_XOOTER_DISCOUNT_RATE : 0;

type Ladder = Record<string, number>;

/** Rand → cents, so no float ever touches a money value. */
const r = (rands: number) => rands * 100;

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

/** Flat across the whole 1–3h range. */
const EXPRESS: Ladder = { "1": r(220), "1.5": r(220), "2": r(220), "2.5": r(220), "3": r(220) };

const AIRBNB: Ladder = {
  "3": r(304), "3.5": r(304), "4": r(304), "4.5": r(318), "5": r(324),
  "5.5": r(342), "6": r(362), "6.5": r(362), "7": r(372), "7.5": r(400), "8": r(426),
};

/**
 * ⚠️ RECONSTRUCTION, NOT A TRANSCRIPTION. The source recited five separate ladders for
 * moving cleaning; three matched this exactly and two had a contiguous run reading R100
 * low before re-converging at both ends — the signature of speech-to-text dropping a
 * leading syllable, not of real pricing. Marked unconfirmed until the founder confirms.
 */
const MOVING: Ladder = {
  "4.5": r(320), "5": r(330), "5.5": r(344), "6": r(364), "6.5": r(376),
  "7": r(390), "7.5": r(404), "8": r(430), "8.5": r(448), "9": r(462),
  "9.5": r(468), "10": r(478),
};

type ServiceSpec = {
  ladder: Ladder;
  min: number;
  max: number;
  /** False where the numbers are reconstructed or contain a known contradiction. */
  confirmed: boolean;
  /** Why it is unconfirmed, surfaced so callers do not have to guess. */
  caveat?: string;
};

const SERVICES: Record<ServiceId, ServiceSpec> = {
  regular: { ladder: REGULAR, min: 3.5, max: 10, confirmed: true },
  office: { ladder: OFFICE, min: 2, max: 10, confirmed: true },
  express: { ladder: EXPRESS, min: 1, max: 3, confirmed: true },
  airbnb: {
    ladder: AIRBNB,
    min: 3,
    max: 8,
    confirmed: false,
    caveat: "The 7-hour price was given twice, as R372 and as a value decoding closer to R388.",
  },
  moving: {
    ladder: MOVING,
    min: 4.5,
    max: 10,
    confirmed: false,
    caveat: "Reconstructed from a degraded transcript; the five size ladders did not agree.",
  },
  laundry: {
    ladder: {},
    min: 3.5,
    max: 10,
    confirmed: false,
    caveat: "Load bands are inferred — the source gave '46+' and '61 to 57', which cannot both be literal.",
  },
};

export type QuoteInput = {
  service: ServiceId;
  /** Booked duration. Every Xooter works all of it. */
  hours: number;
  /** How many Xooters attend. Defaults to 1. Multiplies the base price. */
  xooterCount?: number;
  addOns?: number;
  /** Airbnb wash/dry/repack on-site. R20, the one add-on that is not R30. */
  linenOnSite?: boolean;
  /** Preselected; deselecting requires a confirmation banner (§4.1). */
  bookingCover?: boolean;
};

export type PricedQuote = {
  ok: true;
  confirmed: boolean;
  caveat?: string;
  /** Echoed back so callers never re-derive what was actually priced. */
  xooterCount: number;
  /** 0, or the multi-Xooter discount rate once the threshold is reached. */
  discountRate: number;
  baseCents: number;
  addOnsCents: number;
  linenCents: number;
  coverCents: number;
  totalCents: number;
};

export type UnavailableQuote = { ok: false; reason: string };

export type Quote = PricedQuote | UnavailableQuote;

/**
 * Explicit guard rather than relying on `if (q.ok)` to narrow.
 *
 * The root tsconfig sets `strictNullChecks: false`, and without it TypeScript will not
 * narrow a union on a boolean-literal discriminant — every `q.reason` after an `q.ok`
 * check errors. A type predicate narrows regardless, so call sites stay readable.
 */
export const isPriced = (q: Quote): q is PricedQuote => q.ok;

/**
 * Why a Xooter count is not bookable, or null when it is fine. Mirrors the server's
 * `multiWorkerServices` gate and its cap of 5.
 */
const xooterCountReason = (service: ServiceId, xooterCount: number): string | null => {
  if (!Number.isInteger(xooterCount) || xooterCount < 1) {
    return "Number of Xooters must be a whole number, 1 or more.";
  }
  if (xooterCount === 1) return null;
  if (!MULTI_XOOTER_SERVICES.has(service)) {
    return `${service} is booked with one Xooter.`;
  }
  if (xooterCount > MAX_XOOTERS) {
    return `Up to ${MAX_XOOTERS} Xooters can work one job.`;
  }
  return null;
};

export function xooterOptionsFor(service: ServiceId, hours: number): number[] {
  const options: number[] = [];
  for (let count = 1; count <= MAX_XOOTERS; count += 1) {
    if (isPriced(quote({ service, hours, xooterCount: count }))) options.push(count);
  }
  return options;
}

/**
 * Price a booking.
 *
 * Returns a failure rather than a number when the hours are off-ladder or the service
 * has no agreed ladder. Interpolating or rounding to the nearest rung would produce a
 * plausible price that nobody approved, and a wrong price that looks right is worse
 * than a visible gap.
 */
export function quote(input: QuoteInput): Quote {
  const spec = SERVICES[input.service];
  if (!spec) return { ok: false, reason: `Unknown service: ${input.service}` };

  if (Object.keys(spec.ladder).length === 0) {
    return { ok: false, reason: `No agreed price ladder for ${input.service} yet. ${spec.caveat ?? ""}`.trim() };
  }

  if (input.hours < spec.min || input.hours > spec.max) {
    return { ok: false, reason: `${input.service} is booked between ${spec.min} and ${spec.max} hours.` };
  }

  const ladderCents = spec.ladder[String(input.hours)];
  if (ladderCents === undefined) {
    return { ok: false, reason: `${input.hours} hours is not on the ${input.service} ladder. Hours move in half-hour steps.` };
  }

  // Checked after the ladder lookup so an off-ladder hour count reports the ladder problem
  // rather than a confusing split problem derived from it.
  const xooterCount = input.xooterCount ?? 1;
  const countFailure = xooterCountReason(input.service, xooterCount);
  if (countFailure) return { ok: false, reason: countFailure };

  // Rounded BEFORE multiplying, exactly as create-booking does, so the cents agree.
  const discountRate = multiXooterDiscountRate(xooterCount);
  const baseCents = Math.round(ladderCents * (1 - discountRate)) * xooterCount;

  const addOnsCents = Math.max(0, input.addOns ?? 0) * ADD_ON_CENTS;
  const linenCents = input.linenOnSite ? LINEN_ON_SITE_CENTS : 0;
  const coverCents = input.bookingCover === false ? 0 : BOOKING_COVER_CENTS;

  return {
    ok: true,
    confirmed: spec.confirmed,
    caveat: spec.caveat,
    xooterCount,
    discountRate,
    baseCents,
    addOnsCents,
    linenCents,
    coverCents,
    totalCents: baseCents + addOnsCents + linenCents + coverCents,
  };
}

/**
 * The legacy booking vocabulary, mirrored from `supabase/functions/_shared/pricing.ts`.
 *
 * The booking flow still speaks in service *types* (`residential`, `deep`, `premium`) and in
 * home sizes and service lengths. The ladder speaks in five priced services and a number of
 * hours. The server translates between the two; the client has to translate identically or it
 * quotes one thing and gets charged another.
 *
 * Duplicated rather than imported because Edge Functions run on Deno and cannot import from
 * `src/`. `pricing-parity.test.ts` reads the server file as text and fails if these drift.
 *
 * Note `deep` and `premium` both price as `regular`: they are presentation, not a price tier.
 */
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

/** Default hours implied by the home-size vocabulary. */
export const HOME_SIZE_HOURS: Record<string, number> = { small: 4, medium: 5.5, large: 8 };

/** Default hours implied by the service-length vocabulary. */
export const SERVICE_LENGTH_HOURS: Record<string, number> = {
  refresh: 3.5,
  standard: 4.5,
  extended: 6,
  full_day: 8,
};

/**
 * Which hours a booking is priced on, in the server's precedence order.
 *
 * Explicit hours win, then service length, then home size. Home size is last on purpose: it
 * sets a *default* duration and never a price of its own, which is the whole point of ZD-020.
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

/** Selectable hours for a service, in the half-hour steps the ladder is defined on. */
export function hoursFor(service: ServiceId): number[] {
  const spec = SERVICES[service];
  if (!spec) return [];
  return Object.keys(spec.ladder)
    .map(Number)
    .sort((a, b) => a - b);
}

export function serviceBounds(service: ServiceId) {
  const spec = SERVICES[service];
  return spec ? { min: spec.min, max: spec.max, confirmed: spec.confirmed, caveat: spec.caveat } : null;
}

export function formatRand(cents: number) {
  return `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
