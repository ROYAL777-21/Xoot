// GENERATED FILE — DO NOT EDIT.
// Copied from supabase/functions/_shared/booking-contract.ts by scripts/build/sync-shared-native.mjs.
// Edit the source and run `npm run shared:sync`.

/** Public, versioned vocabulary for a single booking visit. */
export const BOOKING_SERVICES = ["regular", "express", "airbnb", "office", "moving"] as const;
export type BookingService = typeof BOOKING_SERVICES[number];
export const BOOKING_PROPERTY_TYPES = ["flat", "house", "townhouse", "airbnb", "office", "empty"] as const;
export type BookingPropertyType = typeof BOOKING_PROPERTY_TYPES[number];
export const BOOKING_HOME_SIZES = ["small", "medium", "large"] as const;
export type BookingHomeSize = typeof BOOKING_HOME_SIZES[number];
export const BOOKING_FREQUENCIES = ["once", "weekly", "fortnightly"] as const;
export type BookingFrequency = typeof BOOKING_FREQUENCIES[number];
export const BOOKING_LINEN_OPTIONS = ["none", "replace", "wash_hang", "wash_dry_repack"] as const;
export type BookingLinen = typeof BOOKING_LINEN_OPTIONS[number];

export const BOOKING_ADD_ONS = {
  inside_fridge: { label: "Inside fridge", services: ["regular", "express"] },
  inside_oven: { label: "Inside oven", services: ["regular", "express"] },
  inside_cabinets: { label: "Inside cabinets", services: ["regular", "express"] },
  interior_windows: { label: "Interior windows", services: ["regular", "express"] },
  interior_walls: { label: "Interior walls", services: ["regular", "express"] },
  water_plants: { label: "Water plants", services: ["regular", "express"] },
  ironing: { label: "Ironing", services: ["regular", "express"] },
  laundry: { label: "Laundry", services: ["regular", "express"] },
  small_flatlet: { label: "Small flatlet", services: ["regular"] },
  balcony_patio: { label: "Balcony/patio", services: ["moving"] },
  clean_windows: { label: "Clean windows", services: ["moving"] },
  clean_appliances: { label: "Clean appliances", services: ["moving", "airbnb"] },
  wipe_furniture: { label: "Wipe furniture", services: ["moving"] },
  unpack_boxes: { label: "Unpack boxes", services: ["moving"] },
  pack_boxes: { label: "Pack boxes", services: ["moving"] },
  restock_supplies: { label: "Restock supplies", services: ["airbnb"] },
  restock_toiletries: { label: "Restock toiletries", services: ["airbnb"] },
} as const satisfies Record<string, { label: string; services: readonly BookingService[] }>;
export type BookingAddOn = keyof typeof BOOKING_ADD_ONS;

export type BookingQuoteInput = {
  contractVersion: 1;
  service: BookingService;
  propertyType: BookingPropertyType;
  homeSize: BookingHomeSize;
  hours: number;
  crewSize: number;
  addOns: BookingAddOn[];
  linen: BookingLinen | null;
  date: string;
  time: string;
  frequency: BookingFrequency;
  repeatDays: number[];
  referralCode: string;
  requestedCreditCents: number;
  coverRequested: boolean;
};

export type BookingQuote = {
  contractVersion: 1;
  pricingVersion: string;
  currency: "ZAR";
  input: BookingQuoteInput;
  requestedService: BookingService;
  service: BookingService;
  serviceCorrection: null | { from: BookingService; to: BookingService; reason: string };
  crewSize: number;
  soloHours: number;
  estimatedDurationHours: number;
  lines: { id: string; label: string; amountCents: number }[];
  baseCents: number;
  addOnsCents: number;
  highDemandCents: number;
  bookingFeeCents: number;
  coverCents: number;
  carePlusDiscountCents: number;
  referralDiscountCents: number;
  creditUsedCents: number;
  totalCents: number;
  referral: { code: string; status: "not_requested" | "eligible" | "unknown_code" | "own_code" | "already_used" | "not_a_first_booking" };
  carePlusMember: boolean;
  coverAvailable: boolean;
};

export type ReviewedBookingQuote = BookingQuote & { fingerprint: string };

/** A claimed acceptance of one visit. The server must reprice under locks before writing. */
export type BookingCreationDetails = {
  selectedXooterIds: string[];
  householdProfileId: string | null;
  propertyAccountId: string | null;
  address: string;
  instructions: string;
};

export type CreateReviewedBookingInput = {
  contractVersion: 1;
  requestKey: string;
  input: BookingQuoteInput;
  acceptedQuote: ReviewedBookingQuote;
  confirmedService: BookingService;
  booking: BookingCreationDetails;
};

export type CreateReviewedBookingOutcome =
  | { status: "created" | "replayed"; bookingId: string; paymentRecordId: string; bookingStatus: "draft"; acceptedQuote: ReviewedBookingQuote }
  | { status: "quote_changed"; quote: ReviewedBookingQuote }
  | { status: "request_key_reused" }
  | { status: "assignment_unavailable"; reason?: "worker_unavailable" | "reservation_policy_unavailable" }
  | { status: "booking_submission_unavailable" }
  | { status: "unsupported_booking_contract" };

/** Service RPC result before the verified Edge adapter fingerprints a revised quote. */
export type CreateReviewedBookingTransactionOutcome =
  | Exclude<CreateReviewedBookingOutcome, { status: "quote_changed" }>
  | { status: "quote_changed"; quote: BookingQuote };

export const BOOKING_REGULAR_HOME_HOURS = { small: 4, medium: 5.5, large: 8 } as const;

/** Scheduling only; prices and eligibility remain server-authoritative. */
export function bookingVisitDurationHours(input: Pick<BookingQuoteInput, "service" | "propertyType" | "hours" | "crewSize" | "addOns">): number {
  const corrected = input.propertyType === "office" ? "office" : input.propertyType === "airbnb" ? "airbnb" : input.propertyType === "empty" ? "moving" : input.service;
  const baseHours = corrected === input.service ? input.hours : ({ office: 5, airbnb: 4, moving: 8 } as Record<string, number>)[corrected];
  const soloHours = baseHours + input.addOns.length;
  if (input.crewSize === 1) return soloHours;
  // Same half-hour duration/floor as the approved pricing.crewHours; parity is tested.
  const overhead = [1, 1.15, 1.25, 1.4][input.crewSize - 1];
  return Math.max(1.5, Math.round(soloHours * overhead / input.crewSize * 2) / 2);
}
