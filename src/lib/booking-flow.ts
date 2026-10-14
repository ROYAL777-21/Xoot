import { BOOKING_ADD_ONS, BOOKING_REGULAR_HOME_HOURS, bookingVisitDurationHours, type BookingAddOn, type BookingHomeSize, type BookingQuoteInput, type BookingService, type ReviewedBookingQuote } from "./booking-contract";

/** Presentation/defaults only. A displayed price always comes from get-booking-quote. */
export const BOOKING_SERVICE_DETAILS = {
  regular: { title: "Regular cleaning", detail: "A fresh start for your home", min: 3.5, max: 10, defaultHours: 4 },
  airbnb: { title: "Airbnb cleaning", detail: "Ready for the next guest", min: 3, max: 8, defaultHours: 4 },
  express: { title: "Express cleaning", detail: "A focused, lighter reset", min: 1, max: 3, defaultHours: 1 },
  office: { title: "Office cleaning", detail: "Care for your workspace", min: 2, max: 10, defaultHours: 5 },
  moving: { title: "Moving clean", detail: "For a move in or a move out", min: 4.5, max: 10, defaultHours: 8 },
} as const;

export const BOOKING_PROPERTY_LABELS = { flat: "Flat / apartment", house: "House", townhouse: "Townhouse", airbnb: "Airbnb", office: "Office", empty: "Empty / moving" } as const;
export const BOOKING_FREQUENCY_LABELS = { weekly: "Once a week", fortnightly: "Every two weeks", once: "Just once" } as const;
export const BOOKING_LINEN_LABELS = { none: "Do not change the bedding", replace: "Replace linen, do not wash", wash_hang: "Wash linen and hang dry", wash_dry_repack: "Wash, dry and repack on-site" } as const;
export const BOOKING_REFERRAL_MESSAGES = {
  not_requested: "Add a friend’s code if you have one.", eligible: "Your referral discount is included below.",
  unknown_code: "We do not recognise that code. Check the spelling or remove it.",
  own_code: "That is your own referral code. Share it with someone else.",
  already_used: "A referral code has already been used on this account.",
  not_a_first_booking: "Referral codes apply to a first booking only.",
} as const;

export function bookingServiceFromParam(value: unknown): BookingService {
  if (typeof value !== "string") return "regular";
  if (["residential", "deep", "premium"].includes(value)) return "regular";
  return Object.prototype.hasOwnProperty.call(BOOKING_SERVICE_DETAILS, value) ? value as BookingService : "regular";
}
export const bookingDateInSast = (now = Date.now(), days = 0) => new Date(now + 2 * 3_600_000 + days * 86_400_000).toISOString().slice(0, 10);
export const bookingWeekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
export const bookingHomeSize = (bedrooms: number, bathrooms = 1): BookingHomeSize => bedrooms >= 4 || bathrooms >= 3 ? "large" : bedrooms >= 2 || bathrooms >= 2 ? "medium" : "small";

export function createBookingInput(service: BookingService = "regular", now = Date.now()): BookingQuoteInput {
  return {
    contractVersion: 1, service, propertyType: service === "office" ? "office" : service === "airbnb" ? "airbnb" : service === "moving" ? "empty" : "house",
    homeSize: "small", hours: BOOKING_SERVICE_DETAILS[service].defaultHours, crewSize: 1,
    addOns: [], linen: service === "airbnb" ? "none" : null, date: bookingDateInSast(now, 1), time: "08:00",
    // The first booked weekday is the sole preselected repeat day for EVERY
    // available service. Customers can explicitly choose fortnightly or one-off.
    frequency: "weekly", repeatDays: [bookingWeekday(bookingDateInSast(now, 1))],
    referralCode: "", requestedCreditCents: 0, coverRequested: false,
  };
}
export function bookingExtrasFor(service: BookingService): BookingAddOn[] {
  return (Object.keys(BOOKING_ADD_ONS) as BookingAddOn[]).filter(key => (BOOKING_ADD_ONS[key].services as readonly string[]).includes(service));
}
/** Presentation only: the server independently resolves and prices the actual service. */
export function bookingServiceForProperty(input: Pick<BookingQuoteInput, "service" | "propertyType">): BookingService {
  return input.propertyType === "office" ? "office" : input.propertyType === "airbnb" ? "airbnb" : input.propertyType === "empty" ? "moving" : input.service;
}
export function bookingCrewCap(service: BookingService, size: BookingHomeSize): number {
  const bySize = { small: 2, medium: 3, large: 4 }[size];
  return Math.max(bySize, ({ regular: 0, express: 3, airbnb: 3, office: 4, moving: 4 } as const)[service]);
}
export function bookingStartSlots(input: BookingQuoteInput, now = Date.now()): string[] {
  const duration = bookingVisitDurationHours(input);
  return Array.from({ length: bookingServiceForProperty(input) === "airbnb" ? 15 : 21 }, (_, i) => `${String(7 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`)
    .filter(time => Date.parse(`${input.date}T${time}:00+02:00`) > now && Number(time.slice(0, 2)) + Number(time.slice(3)) / 60 + duration <= 17);
}
export function changeBookingService(input: BookingQuoteInput, service: BookingService): BookingQuoteInput {
  const next = createBookingInput(service);
  return { ...input, service, propertyType: next.propertyType, hours: service === "regular" ? BOOKING_REGULAR_HOME_HOURS[input.homeSize] : next.hours, linen: next.linen,
    crewSize: Math.min(input.crewSize, bookingCrewCap(service, input.homeSize)), addOns: [],
    time: service === "airbnb" && input.time > "14:00" ? "08:00" : input.time };
}

export type BookingQuoteResponse = { quote: ReviewedBookingQuote; bookingSubmissionAvailable: boolean };

/** Check the response boundary so an outage or old endpoint cannot look like a free booking. */
export function readBookingQuoteResponse(value: unknown): BookingQuoteResponse {
  if (!value || typeof value !== "object") throw new Error("Your quote could not be verified. Please try again.");
  const data = value as Partial<BookingQuoteResponse>;
  const q = data.quote;
  if (!q || q.contractVersion !== 1 || q.currency !== "ZAR" || typeof q.fingerprint !== "string" ||
      !/^[a-f0-9]{64}$/.test(q.fingerprint) || typeof q.pricingVersion !== "string" ||
      !Number.isSafeInteger(q.totalCents) || q.totalCents < 0 || !Array.isArray(q.lines) || !q.lines.length ||
      !q.lines.every(line => line && typeof line.id === "string" && typeof line.label === "string" && Number.isSafeInteger(line.amountCents)) ||
      q.lines.reduce((total, line) => total + line.amountCents, 0) !== q.totalCents ||
      typeof data.bookingSubmissionAvailable !== "boolean" || !q.input ||
      !Object.prototype.hasOwnProperty.call(BOOKING_SERVICE_DETAILS, q.service) ||
      !Object.prototype.hasOwnProperty.call(BOOKING_SERVICE_DETAILS, q.requestedService) ||
      !Number.isInteger(q.crewSize) || q.crewSize < 1 || q.crewSize > 4 ||
      !Number.isFinite(q.estimatedDurationHours) || q.estimatedDurationHours <= 0 ||
      !q.referral || !Object.prototype.hasOwnProperty.call(BOOKING_REFERRAL_MESSAGES, q.referral.status) ||
      (q.serviceCorrection !== null && (!q.serviceCorrection || q.serviceCorrection.from !== q.requestedService || q.serviceCorrection.to !== q.service))) {
    throw new Error("Your quote could not be verified. Please try again.");
  }
  return data as BookingQuoteResponse;
}

export const formatBookingMoney = (cents: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(cents / 100);
