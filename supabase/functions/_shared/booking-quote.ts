import { ADD_ON_CENTS, BOOKING_COVER_CENTS, BOOKING_FEE_CENTS, LINEN_ON_SITE_CENTS, basePrice, crewCapFor, crewPriceCents } from "./pricing.ts";
import { checkReferral, referralCreditCents, type ReferralRecord } from "./referrals.ts";
import { BOOKING_ADD_ONS, BOOKING_FREQUENCIES, BOOKING_HOME_SIZES, BOOKING_LINEN_OPTIONS, BOOKING_PROPERTY_TYPES, BOOKING_SERVICES, bookingVisitDurationHours, type BookingAddOn, type BookingPropertyType, type BookingQuote, type BookingQuoteInput, type BookingService } from "./booking-contract.ts";

/** Bump whenever the charge or eligibility rules of this contract change. */
export const BOOKING_PRICING_VERSION = "booking-zd039-v1";

export class BookingQuoteValidationError extends Error {
  constructor(message: string, public readonly code: string, public readonly field?: string) {
    super(message);
    this.name = "BookingQuoteValidationError";
  }
}

const reject = (field: string, message: string, code = "invalid_input"): never => {
  throw new BookingQuoteValidationError(message, code, field);
};

const enumValue = <T extends string>(value: unknown, choices: readonly T[], field: string): T => {
  if (typeof value !== "string" || !choices.includes(value as T)) return reject(field, `Invalid ${field}`);
  return value as T;
};

const numberValue = (value: unknown, field: string, min: number, max: number, integer = false): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    return reject(field, `Invalid ${field}`);
  }
  return value;
};

const arrayValue = (value: unknown, field: string, max: number): unknown[] => {
  if (!Array.isArray(value) || value.length > max || Object.keys(value).length !== value.length ||
      Object.keys(value).some((key) => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) {
    return reject(field, `Invalid ${field}`);
  }
  return value;
};

const resolvedService = (service: BookingService, propertyType: BookingPropertyType): BookingService => {
  if (propertyType === "office") return "office";
  if (propertyType === "airbnb") return "airbnb";
  if (propertyType === "empty") return "moving";
  if (service !== "regular" && service !== "express") return reject("propertyType", "Select a compatible service for this property");
  return service;
};

const correctedHours: Partial<Record<BookingService, number>> = { office: 5, airbnb: 4, moving: 8 };

/** Strictly parse untrusted JSON before using any field in a price or lookup. */
export function parseBookingQuoteInput(value: unknown, nowMs: number): BookingQuoteInput {
  if (!Number.isFinite(nowMs)) return reject("date", "Invalid current time");
  if (value === null || typeof value !== "object" || Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    return reject("body", "Booking quote body must be an object");
  }
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => key === "__proto__" || key === "constructor" || key === "prototype")) {
    return reject("body", "Invalid booking quote property");
  }
  if (body.contractVersion !== 1) return reject("contractVersion", "Unsupported booking quote contract version", "unsupported_version");
  const service = enumValue(body.service, BOOKING_SERVICES, "service");
  const propertyType = enumValue(body.propertyType, BOOKING_PROPERTY_TYPES, "propertyType");
  const homeSize = enumValue(body.homeSize, BOOKING_HOME_SIZES, "homeSize");
  const actualService = resolvedService(service, propertyType);

  const suppliedHours = numberValue(body.hours, "hours", 1, 10);
  if (!Number.isInteger(suppliedHours * 2)) return reject("hours", "Hours must move in half-hour steps");
  const hours = service === actualService ? suppliedHours : correctedHours[actualService]!;
  const priced = basePrice(actualService, hours);
  if (priced.ok === false) return reject("hours", priced.reason);

  const crewSize = numberValue(body.crewSize, "crewSize", 1, 4, true);
  if (crewSize > crewCapFor(actualService, homeSize)) return reject("crewSize", `This ${actualService} booking allows at most ${crewCapFor(actualService, homeSize)} Xooters`);

  const addOnsRaw = arrayValue(body.addOns, "addOns", Object.keys(BOOKING_ADD_ONS).length);
  const addOns = addOnsRaw.map((raw) => {
    if (typeof raw !== "string" || !Object.prototype.hasOwnProperty.call(BOOKING_ADD_ONS, raw)) return reject("addOns", "Unknown booking extra");
    const key = raw as BookingAddOn;
    if (!(BOOKING_ADD_ONS[key].services as readonly string[]).includes(actualService)) {
      return reject("addOns", `${BOOKING_ADD_ONS[key].label} is not available for ${actualService}; clear or reselect extras`);
    }
    return key;
  });
  if (new Set(addOns).size !== addOns.length) return reject("addOns", "Duplicate booking extras");
  addOns.sort();

  let linen: BookingQuoteInput["linen"] = null;
  if (actualService === "airbnb") {
    linen = enumValue(body.linen, BOOKING_LINEN_OPTIONS, "linen");
    if (linen === "wash_dry_repack" && hours < 5) return reject("hours", "Wash, dry and repack linen requires at least 5 hours");
  } else if (body.linen !== null) {
    return reject("linen", "Linen handling is only available for Airbnb cleaning");
  }

  if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return reject("date", "Use a valid YYYY-MM-DD date");
  const [year, month, day] = body.date.split("-").map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (year < 2020 || year > 2100 || calendar.getUTCFullYear() !== year || calendar.getUTCMonth() + 1 !== month || calendar.getUTCDate() !== day) {
    return reject("date", "Use a valid calendar date");
  }
  if (typeof body.time !== "string" || !/^(0[7-9]|1[0-7]):(00|30)$/.test(body.time) || body.time === "17:30") {
    return reject("time", "Choose a half-hour start from 07:00 to 17:00");
  }
  if (actualService === "airbnb" && body.time > "14:00") return reject("time", "Airbnb starts must be between 07:00 and 14:00");
  const [hour, minute] = body.time.split(":").map(Number);
  const duration = bookingVisitDurationHours({ service, propertyType, hours, crewSize, addOns });
  if (hour * 60 + minute + duration * 60 > 17 * 60) return reject("time", "Choose a start time that lets this visit finish by 17:00");
  const startMs = Date.UTC(year, month - 1, day, hour - 2, minute);
  if (startMs <= nowMs) return reject("date", "Choose a future booking start in South African time");

  const frequency = enumValue(body.frequency, BOOKING_FREQUENCIES, "frequency");
  const repeatDays = arrayValue(body.repeatDays, "repeatDays", 7).map((dayValue) => numberValue(dayValue, "repeatDays", 0, 6, true));
  if (new Set(repeatDays).size !== repeatDays.length) return reject("repeatDays", "Duplicate repeat days");
  if (frequency === "once" && repeatDays.length !== 0) return reject("repeatDays", "A one-time booking cannot repeat");
  if (frequency !== "once" && (repeatDays.length === 0 || !repeatDays.includes(calendar.getUTCDay()))) {
    return reject("repeatDays", "Repeat days must include the first booking day");
  }
  repeatDays.sort((a, b) => a - b);

  if (typeof body.referralCode !== "string" || body.referralCode.length > 40) return reject("referralCode", "Invalid referral code");
  const referralCode = body.referralCode.trim().toUpperCase();
  if (referralCode && !/^[A-Z0-9_-]{4,32}$/.test(referralCode)) return reject("referralCode", "Invalid referral code");
  const requestedCreditCents = numberValue(body.requestedCreditCents, "requestedCreditCents", 0, 100_000_000, true);
  if (typeof body.coverRequested !== "boolean") return reject("coverRequested", "Invalid cover choice");

  return { contractVersion: 1, service, propertyType, homeSize, hours, crewSize, addOns, linen,
    date: body.date, time: body.time, frequency, repeatDays, referralCode, requestedCreditCents,
    coverRequested: body.coverRequested };
}

export type BookingQuoteFacts = {
  buyerId: string;
  carePlusMember: boolean;
  availableCreditCents: number;
  referralRecord: ReferralRecord | null;
  completedBookingCount: number;
  hasPriorRedemption: boolean;
  coverAvailable: boolean;
};

/** Price one visit using facts independently verified by the caller. */
export function quoteBooking(input: BookingQuoteInput, facts: BookingQuoteFacts): BookingQuote {
  if (!facts.buyerId || typeof facts.buyerId !== "string") return reject("buyerId", "Buyer is required");
  if (!Number.isSafeInteger(facts.availableCreditCents) || facts.availableCreditCents < 0) return reject("availableCreditCents", "Invalid available credit");
  if (!Number.isSafeInteger(facts.completedBookingCount) || facts.completedBookingCount < 0) return reject("completedBookingCount", "Invalid booking count");
  if (typeof facts.carePlusMember !== "boolean" || typeof facts.hasPriorRedemption !== "boolean" || typeof facts.coverAvailable !== "boolean") {
    return reject("facts", "Invalid verified booking facts");
  }
  const service = resolvedService(input.service, input.propertyType);
  const correction = service === input.service ? null : {
    from: input.service, to: service,
    reason: `${input.propertyType} properties use ${service} cleaning; hours were reset to the ${service} default`,
  };
  const priced = basePrice(service, input.hours);
  if (priced.ok === false) return reject("hours", priced.reason);
  if (input.coverRequested && !facts.coverAvailable) return reject("coverRequested", "Booking cover is unavailable", "cover_unavailable");

  const baseCents = crewPriceCents(priced.baseCents, input.crewSize);
  const linenCents = input.linen === "wash_dry_repack" ? LINEN_ON_SITE_CENTS : 0;
  const addOnsCents = input.addOns.length * ADD_ON_CENTS + linenCents;
  const workCents = baseCents + addOnsCents;
  const highDemandCents = input.time >= "16:00" ? Math.round((workCents / 100) * 0.15) * 100 : 0;
  const bookingFeeCents = facts.carePlusMember ? 0 : BOOKING_FEE_CENTS;
  const coverCents = input.coverRequested ? BOOKING_COVER_CENTS : 0;
  const carePlusDiscountCents = facts.carePlusMember ? Math.round((workCents / 100) * 0.1) * 100 : 0;

  let referralStatus: BookingQuote["referral"]["status"] = "not_requested";
  let referralDiscountCents = 0;
  if (input.referralCode) {
    const verdict = checkReferral({ record: facts.referralRecord?.code === input.referralCode ? facts.referralRecord : null,
      buyerId: facts.buyerId, buyerCompletedBookings: facts.completedBookingCount, buyerHasRedeemed: facts.hasPriorRedemption });
    referralStatus = verdict.ok === true ? "eligible" : verdict.reason;
    referralDiscountCents = referralCreditCents({ verdict, baseCents, addOnsCents });
  }

  const beforeCreditCents = workCents + highDemandCents + bookingFeeCents + coverCents - carePlusDiscountCents - referralDiscountCents;
  const creditUsedCents = Math.min(input.requestedCreditCents, facts.availableCreditCents, Math.max(0, beforeCreditCents - 5000));
  const lines: BookingQuote["lines"] = [
    { id: "base", label: `${service[0].toUpperCase()}${service.slice(1)} cleaning`, amountCents: baseCents },
    ...input.addOns.map((key) => ({ id: `add_on_${key}`, label: BOOKING_ADD_ONS[key].label, amountCents: ADD_ON_CENTS })),
    ...(linenCents ? [{ id: "linen", label: "Wash, dry and repack linen", amountCents: linenCents }] : []),
    { id: "high_demand", label: "High-demand start", amountCents: highDemandCents },
    { id: "booking_fee", label: "Booking fee", amountCents: bookingFeeCents },
    { id: "cover", label: "Booking cover", amountCents: coverCents },
    { id: "care_plus", label: "Care+ discount", amountCents: -carePlusDiscountCents },
    { id: "referral", label: "Referral discount", amountCents: -referralDiscountCents },
    { id: "credit", label: "Xoot credit", amountCents: -creditUsedCents },
  ];
  const totalCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
  const soloHours = input.hours + input.addOns.length;
  return { contractVersion: 1, pricingVersion: BOOKING_PRICING_VERSION, currency: "ZAR", input,
    requestedService: input.service, service, serviceCorrection: correction,
    crewSize: input.crewSize, soloHours, estimatedDurationHours: bookingVisitDurationHours(input),
    lines, baseCents, addOnsCents, highDemandCents, bookingFeeCents, coverCents,
    carePlusDiscountCents, referralDiscountCents, creditUsedCents, totalCents,
    referral: { code: input.referralCode, status: referralStatus },
    carePlusMember: facts.carePlusMember, coverAvailable: facts.coverAvailable };
}

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

/** Change detector only; creation must recalculate under database locks. */
export async function fingerprintBookingQuote(quote: BookingQuote, buyerId: string): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson({ buyerId, quote }));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
