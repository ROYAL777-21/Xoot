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
  hours: number;
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

  const baseCents = spec.ladder[String(input.hours)];
  if (baseCents === undefined) {
    return { ok: false, reason: `${input.hours} hours is not on the ${input.service} ladder. Hours move in half-hour steps.` };
  }

  const addOnsCents = Math.max(0, input.addOns ?? 0) * ADD_ON_CENTS;
  const linenCents = input.linenOnSite ? LINEN_ON_SITE_CENTS : 0;
  const coverCents = input.bookingCover === false ? 0 : BOOKING_COVER_CENTS;

  return {
    ok: true,
    confirmed: spec.confirmed,
    caveat: spec.caveat,
    baseCents,
    addOnsCents,
    linenCents,
    coverCents,
    totalCents: baseCents + addOnsCents + linenCents + coverCents,
  };
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
