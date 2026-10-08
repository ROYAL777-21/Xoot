import { bookingVisitDurationHours, type BookingQuoteInput, type BookingService, type CreateReviewedBookingInput, type ReviewedBookingQuote } from "./booking-contract.ts";
import { BookingQuoteValidationError, parseBookingQuoteInput } from "./booking-quote.ts";

// Static validation admits old committed attempts. The writer checks the real clock only
// after its committed-attempt lookup; the public quote endpoint keeps its live clock.
const STATIC_REPLAY_CLOCK = Date.UTC(2019, 0, 1);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_FINGERPRINT = /^[0-9a-f]{64}$/i;
const PRICING_VERSION = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const INPUT_KEYS = ["contractVersion", "service", "propertyType", "homeSize", "hours", "crewSize", "addOns", "linen", "date", "time", "frequency", "repeatDays", "referralCode", "requestedCreditCents", "coverRequested"];
const QUOTE_KEYS = ["contractVersion", "pricingVersion", "currency", "input", "requestedService", "service", "serviceCorrection", "crewSize", "soloHours", "estimatedDurationHours", "lines", "baseCents", "addOnsCents", "highDemandCents", "bookingFeeCents", "coverCents", "carePlusDiscountCents", "referralDiscountCents", "creditUsedCents", "totalCents", "referral", "carePlusMember", "coverAvailable", "fingerprint"];

const fail = (field: string): never => { throw new BookingQuoteValidationError(`Invalid ${field}`, "invalid_input", field); };

function record(value: unknown, field: string, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) return fail(field);
  const props = Reflect.ownKeys(value);
  if (props.length !== keys.length || props.some((key) => typeof key !== "string" || !keys.includes(key))) return fail(field);
  if (props.some((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return !descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value");
  })) return fail(field);
  return value as Record<string, unknown>;
}

function list(value: unknown, field: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max || Reflect.ownKeys(value).length !== value.length + 1 ||
      Object.keys(value).some((key) => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) return fail(field);
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, "value")) return fail(field);
  }
  return value;
}

function uuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID.test(value)) return fail(field);
  return value.toLowerCase();
}

function optionalUuid(value: unknown, field: string): string | null {
  return value === null ? null : uuid(value, field);
}

function text(value: unknown, field: string, max: number, required = false): string {
  if (typeof value !== "string" || value.length > max || [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 && code !== 9 && code !== 10 && code !== 13 || code === 127;
  })) return fail(field);
  const cleaned = field === "address" ? value.replace(/\s+/g, " ").trim() : value.replace(/\r\n?/g, "\n").trim();
  if (cleaned.length > max || (required && !cleaned)) return fail(field);
  return cleaned;
}

function cents(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 100_000_000) return fail(field);
  return value === 0 ? 0 : value;
}

function normalizedInput(value: unknown, field: string): BookingQuoteInput {
  record(value, field, INPUT_KEYS);
  const parsed = parseBookingQuoteInput(value, STATIC_REPLAY_CLOCK);
  return { ...parsed, requestedCreditCents: parsed.requestedCreditCents === 0 ? 0 : parsed.requestedCreditCents,
    repeatDays: parsed.repeatDays.map((day) => day === 0 ? 0 : day) };
}

function reviewedQuote(value: unknown, input: BookingQuoteInput): ReviewedBookingQuote {
  const quote = record(value, "acceptedQuote", QUOTE_KEYS);
  const claimedInput = normalizedInput(quote.input, "acceptedQuote.input");
  if (JSON.stringify(claimedInput) !== JSON.stringify(input)) return fail("acceptedQuote.input");
  if (quote.contractVersion !== 1 || quote.currency !== "ZAR" || typeof quote.pricingVersion !== "string" ||
      !PRICING_VERSION.test(quote.pricingVersion) || typeof quote.fingerprint !== "string" || !HEX_FINGERPRINT.test(quote.fingerprint)) return fail("acceptedQuote");
  const resolved = input.propertyType === "office" ? "office" : input.propertyType === "airbnb" ? "airbnb" : input.propertyType === "empty" ? "moving" : input.service;
  if (quote.requestedService !== input.service || quote.service !== resolved || quote.crewSize !== input.crewSize ||
      quote.soloHours !== input.hours + input.addOns.length || quote.estimatedDurationHours !== bookingVisitDurationHours(input)) return fail("acceptedQuote");

  let correction: ReviewedBookingQuote["serviceCorrection"] = null;
  if (resolved === input.service) {
    if (quote.serviceCorrection !== null) return fail("acceptedQuote.serviceCorrection");
  } else {
    const corrected = record(quote.serviceCorrection, "acceptedQuote.serviceCorrection", ["from", "to", "reason"]);
    if (corrected.from !== input.service || corrected.to !== resolved) return fail("acceptedQuote.serviceCorrection");
    correction = { from: corrected.from as BookingService, to: corrected.to as BookingService,
      reason: text(corrected.reason, "acceptedQuote.serviceCorrection.reason", 240, true) };
  }

  const referral = record(quote.referral, "acceptedQuote.referral", ["code", "status"]);
  const statuses = ["not_requested", "eligible", "unknown_code", "own_code", "already_used", "not_a_first_booking"];
  if (referral.code !== input.referralCode || !statuses.includes(referral.status as string) ||
      (input.referralCode === "") !== (referral.status === "not_requested")) return fail("acceptedQuote.referral");
  if (typeof quote.carePlusMember !== "boolean" || typeof quote.coverAvailable !== "boolean" ||
      (input.coverRequested && !quote.coverAvailable)) return fail("acceptedQuote");

  const amounts = ["baseCents", "addOnsCents", "highDemandCents", "bookingFeeCents", "coverCents", "carePlusDiscountCents", "referralDiscountCents", "creditUsedCents", "totalCents"] as const;
  const money = Object.fromEntries(amounts.map((key) => [key, cents(quote[key], `acceptedQuote.${key}`)])) as Record<typeof amounts[number], number>;
  if (money.baseCents + money.addOnsCents + money.highDemandCents + money.bookingFeeCents + money.coverCents -
      money.carePlusDiscountCents - money.referralDiscountCents - money.creditUsedCents !== money.totalCents) return fail("acceptedQuote.totalCents");
  if ((!input.coverRequested && money.coverCents !== 0) || (referral.status !== "eligible" && money.referralDiscountCents !== 0) ||
      (!quote.carePlusMember && money.carePlusDiscountCents !== 0) || money.creditUsedCents > input.requestedCreditCents) return fail("acceptedQuote");

  const rawLines = list(quote.lines, "acceptedQuote.lines", 32);
  const expectedIds = ["base", ...input.addOns.map((key) => `add_on_${key}`), ...(input.linen === "wash_dry_repack" ? ["linen"] : []),
    "high_demand", "booking_fee", "cover", "care_plus", "referral", "credit"];
  if (rawLines.length !== expectedIds.length) return fail("acceptedQuote.lines");
  const lines = rawLines.map((raw, index) => {
    const line = record(raw, "acceptedQuote.lines", ["id", "label", "amountCents"]);
    if (line.id !== expectedIds[index]) return fail("acceptedQuote.lines");
    const amount = line.amountCents;
    if (typeof amount !== "number" || !Number.isSafeInteger(amount) || Math.abs(amount) > 100_000_000) return fail("acceptedQuote.lines");
    return { id: line.id as string, label: text(line.label, "acceptedQuote.lines.label", 120, true), amountCents: amount === 0 ? 0 : amount };
  });
  const lineAmount = (id: string) => lines.find((line) => line.id === id)!.amountCents;
  if (lineAmount("base") !== money.baseCents || lineAmount("high_demand") !== money.highDemandCents ||
      lineAmount("booking_fee") !== money.bookingFeeCents || lineAmount("cover") !== money.coverCents ||
      lineAmount("care_plus") !== -money.carePlusDiscountCents || lineAmount("referral") !== -money.referralDiscountCents ||
      lineAmount("credit") !== -money.creditUsedCents ||
      lines.filter((line) => line.id.startsWith("add_on_") || line.id === "linen").reduce((sum, line) => sum + line.amountCents, 0) !== money.addOnsCents ||
      lines.reduce((sum, line) => sum + line.amountCents, 0) !== money.totalCents) return fail("acceptedQuote.lines");
  if (lines.some((line) => (line.id.startsWith("add_on_") || line.id === "linen") && line.amountCents < 0)) return fail("acceptedQuote.lines");

  return { contractVersion: 1, pricingVersion: quote.pricingVersion, currency: "ZAR", input: claimedInput,
    requestedService: input.service, service: resolved, serviceCorrection: correction, crewSize: input.crewSize,
    soloHours: quote.soloHours as number, estimatedDurationHours: quote.estimatedDurationHours as number, lines,
    ...money, referral: { code: input.referralCode, status: referral.status as ReviewedBookingQuote["referral"]["status"] },
    carePlusMember: quote.carePlusMember, coverAvailable: quote.coverAvailable, fingerprint: quote.fingerprint.toLowerCase() };
}

/** Parse a claimed acceptance into a stable, plain definition for later locked comparison. */
export function parseCreateReviewedBookingInput(value: unknown): CreateReviewedBookingInput {
  const body = record(value, "body", ["contractVersion", "requestKey", "input", "acceptedQuote", "confirmedService", "booking"]);
  if (body.contractVersion !== 1) throw new BookingQuoteValidationError("Unsupported booking contract", "unsupported_version", "contractVersion");
  const requestKey = uuid(body.requestKey, "requestKey");
  const input = normalizedInput(body.input, "input");
  const acceptedQuote = reviewedQuote(body.acceptedQuote, input);
  if (body.confirmedService !== acceptedQuote.service) return fail("confirmedService");
  const booking = record(body.booking, "booking", ["selectedXooterIds", "householdProfileId", "propertyAccountId", "address", "instructions"]);
  const selectedXooterIds = list(booking.selectedXooterIds, "booking.selectedXooterIds", input.crewSize)
    .map((id) => uuid(id, "booking.selectedXooterIds")).sort();
  if (new Set(selectedXooterIds).size !== selectedXooterIds.length) return fail("booking.selectedXooterIds");
  return { contractVersion: 1, requestKey, input, acceptedQuote, confirmedService: acceptedQuote.service,
    booking: { selectedXooterIds, householdProfileId: optionalUuid(booking.householdProfileId, "booking.householdProfileId"),
      propertyAccountId: optionalUuid(booking.propertyAccountId, "booking.propertyAccountId"),
      address: text(booking.address, "address", 240, true), instructions: text(booking.instructions, "instructions", 1200) } };
}
