import { normaliseBookingStatus } from "./booking-state-machine";

export const approvedLaunchRegions = [
  "midrand",
  "sandton",
  "bryanston",
  "bedfordview",
  "rosebank",
  "parkhurst",
  "melville",
  "fourways",
  "waterfall",
  "dainfern",
  "hyde park",
  "braamfontein",
];

export type BookingFrequency = "one_time" | "repeat";

export type BookingQuoteInput = {
  basePrice: number;
  addOnCount: number;
  frequency: BookingFrequency;
  time: string;
  bookingCoverOptIn: boolean;
};

export type BookingQuote = {
  basePrice: number;
  addOnsTotal: number;
  highDemandPremium: number;
  serviceFee: number;
  bookingCover: number;
  total: number;
  estimatedAddOnHours: number;
};

export type IntegrationChannel =
  | "in_app"
  | "brevo_email"
  | "whatsapp_urgent"
  | "twilio_voice"
  | "payment_provider"
  | "mie_screening"
  | "airtable_ops";

export type VerificationStatus = "pending" | "approved" | "rejected";

export type ActivationInput = {
  verification: {
    id: VerificationStatus;
    selfie: VerificationStatus;
    address: VerificationStatus;
    banking: VerificationStatus;
    reference: VerificationStatus;
    background: VerificationStatus;
    thirdParty: VerificationStatus;
  };
  requiredTrainingPassed: boolean;
  backgroundCheckConsent: boolean;
};

export type LedgerEntry = {
  amount: number;
  direction: "credit" | "debit";
};

export type HomeCleaningSize = "small" | "medium" | "large";
export type MovingCleanSize = "tiny" | "small" | "medium" | "large" | "extra_large";
export type LinenOption = "do_not_replace" | "replace_only" | "replace_and_wash";

export type PriceRule = {
  id: string;
  label: string;
  estimatedHours: number;
  priceZar: number;
  note?: string;
};

export const HOME_CLEANING_PRICES: Record<HomeCleaningSize, PriceRule> = {
  small: { id: "small", label: "Small home", estimatedHours: 4, priceZar: 280, note: "1-2 bedrooms" },
  medium: { id: "medium", label: "Medium home", estimatedHours: 5.5, priceZar: 325, note: "3-4 bedrooms" },
  large: { id: "large", label: "Large home", estimatedHours: 8, priceZar: 400, note: "5+ bedrooms" },
};

export const OFFICE_CLEANING_PRICES: PriceRule[] = [
  { id: "office-2-3h", label: "Office clean", estimatedHours: 3, priceZar: 411, note: "R39 service fee applies" },
  { id: "office-3-5h", label: "Office clean", estimatedHours: 3.5, priceZar: 480, note: "R39 service fee applies" },
  { id: "office-4h", label: "Office clean", estimatedHours: 4, priceZar: 500, note: "R39 service fee applies" },
];

export const MOVING_CLEANING_PRICES: Record<MovingCleanSize, PriceRule> = {
  tiny: { id: "tiny", label: "Tiny home under 50m2", estimatedHours: 4.5, priceZar: 350, note: "Moving add-ons included" },
  small: { id: "small", label: "Small home", estimatedHours: 6, priceZar: 350, note: "Moving add-ons included" },
  medium: { id: "medium", label: "Medium home", estimatedHours: 8, priceZar: 350, note: "Moving add-ons included" },
  large: { id: "large", label: "Large home", estimatedHours: 10, priceZar: 350, note: "Moving add-ons included" },
  extra_large: { id: "extra_large", label: "Extra-large home", estimatedHours: 10, priceZar: 350, note: "Moving add-ons included" },
};

export const AIRBNB_CLEANING_STARTING_PRICE = 260;
export const AIRBNB_CLEANING_HOUR_RANGE = { min: 3, max: 8 } as const;
export const EXPRESS_CLEANING_PRICE = 250;
export const EXPRESS_CLEANING_HOUR_RANGE = { min: 1, max: 3 } as const;
export const LAUNDRY_IRONING_PRICES: PriceRule[] = [
  { id: "wash-0-6", label: "Machine washing, 0-6 loads", estimatedHours: 3.5, priceZar: 296 },
  { id: "wash-7-8", label: "Machine washing, 7-8 loads", estimatedHours: 4.5, priceZar: 348 },
  { id: "ironing-1", label: "Ironing, 1 load", estimatedHours: 3.5, priceZar: 296 },
];

export const BOOKING_COVER_PRICE_ZAR = 21;
export const ONE_TIME_SERVICE_FEE_ZAR = 39;
export const ADD_ON_PRICE_ZAR = 30;
export const HIGH_DEMAND_SLOT_RATE = 0.15;
export const SURGE_SLOT_RATE_RANGE = { min: 0.1, max: 0.15 } as const;

const ADD_ON_PRICE = ADD_ON_PRICE_ZAR;
const BOOKING_COVER = BOOKING_COVER_PRICE_ZAR;
const ONE_TIME_SERVICE_FEE = ONE_TIME_SERVICE_FEE_ZAR;
const HIGH_DEMAND_RATE = HIGH_DEMAND_SLOT_RATE;

export const isApprovedLaunchRegion = (input: string) => {
  const value = input.toLowerCase();
  return approvedLaunchRegions.some((region) => value.includes(region));
};

export const isHighDemandSlot = (time: string) => {
  const hour = Number(time.split(":")[0] ?? 0);
  return hour >= 16;
};

export const calculateBookingQuote = ({
  basePrice,
  addOnCount,
  frequency,
  time,
  bookingCoverOptIn,
}: BookingQuoteInput): BookingQuote => {
  const addOnsTotal = addOnCount * ADD_ON_PRICE;
  const subtotal = basePrice + addOnsTotal;
  const highDemandPremium = isHighDemandSlot(time) ? Math.round(subtotal * HIGH_DEMAND_RATE) : 0;
  const serviceFee = frequency === "one_time" ? ONE_TIME_SERVICE_FEE : 0;
  const bookingCover = bookingCoverOptIn ? BOOKING_COVER : 0;

  return {
    basePrice,
    addOnsTotal,
    highDemandPremium,
    serviceFee,
    bookingCover,
    total: subtotal + highDemandPremium + serviceFee + bookingCover,
    estimatedAddOnHours: addOnCount,
  };
};

export const routeNotificationChannel = (event: string): IntegrationChannel[] => {
  const urgentWhatsApp = new Set([
    "contractor_on_the_way",
    "contractor_arrived",
    "same_day_cancellation_replacement",
    "contractor_no_show",
    "critical_trust_safety_alert",
    "urgent_replacement_confirmation",
  ]);
  const emailEvents = new Set([
    "booking_confirmed",
    "invoice_created",
    "payment_receipt",
    "support_resolved",
    "homecare_summary",
    "onboarding_completed",
    "reactivation_campaign",
    "trust_verification_update",
  ]);
  const inAppOnly = new Set([
    "contractor_assigned",
    "job_completed",
    "support_opened",
    "onboarding_progress",
    "rebooking_prompt",
    "zootcred_update",
    "badge_unlocked",
  ]);

  if (urgentWhatsApp.has(event)) return ["in_app", "whatsapp_urgent"];
  if (event === "payment_receipt" || event === "invoice_created") return ["brevo_email"];
  if (emailEvents.has(event)) return ["in_app", "brevo_email"];
  if (inAppOnly.has(event)) return ["in_app"];
  return ["in_app"];
};

export const canAccessSensitiveBookingData = ({
  scheduledAt,
  status,
  completedAt,
  cancelledAt,
  durationHours,
  now,
}: {
  scheduledAt: string;
  status: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
  durationHours?: number | string | null;
  now?: string;
}) => {
  if (status === "cancelled" || cancelledAt) return false;

  const current = now ? new Date(now).getTime() : Date.now();
  const start = new Date(scheduledAt).getTime();
  if (!Number.isFinite(start)) return false;

  const accessOpens = start - 45 * 60 * 1000;
  if (current < accessOpens) return false;

  if (status === "completed") {
    const complete = completedAt ? new Date(completedAt).getTime() : current;
    return current <= complete + 30 * 60 * 1000;
  }

  const normalizedStatus = normaliseBookingStatus(status);
  const activeStatus = Boolean(normalizedStatus && [
    "assigned",
    "contractor_accepted",
    "en_route",
    "in_progress",
    "replacement_offered",
    "reassigned",
  ].includes(normalizedStatus));

  if (!activeStatus) return false;

  const parsedDuration = Number(durationHours ?? 0);
  const durationMs = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration * 60 * 60 * 1000 : 0;
  const accessCloses = start + durationMs + 30 * 60 * 1000;
  return current <= accessCloses;
};

export type SensitiveAccessAvailability =
  | { state: "locked"; opensAt: string; minutesUntilOpen: number }
  | { state: "available"; opensAt: string; minutesUntilOpen: 0 }
  | { state: "closed"; opensAt: string | null; minutesUntilOpen: 0 };

export const getSensitiveAccessAvailability = ({
  scheduledAt,
  status,
  completedAt,
  cancelledAt,
  sensitiveDataRevokedAt,
  durationHours,
  now,
}: {
  scheduledAt: string;
  status: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
  sensitiveDataRevokedAt?: string | null;
  durationHours?: number | string | null;
  now?: string;
}): SensitiveAccessAvailability => {
  const start = new Date(scheduledAt).getTime();
  if (!Number.isFinite(start)) return { state: "closed", opensAt: null, minutesUntilOpen: 0 };

  const opensAtMs = start - 45 * 60 * 1000;
  const opensAt = new Date(opensAtMs).toISOString();
  const current = now ? new Date(now).getTime() : Date.now();
  if (!Number.isFinite(current)) return { state: "closed", opensAt, minutesUntilOpen: 0 };

  if (sensitiveDataRevokedAt || status === "cancelled" || status === "rated" || cancelledAt) {
    return { state: "closed", opensAt, minutesUntilOpen: 0 };
  }

  if (canAccessSensitiveBookingData({
    scheduledAt,
    status,
    completedAt,
    cancelledAt,
    durationHours,
    now: new Date(current).toISOString(),
  })) {
    return { state: "available", opensAt, minutesUntilOpen: 0 };
  }

  const normalizedStatus = normaliseBookingStatus(status);
  const canOpenLater = Boolean(normalizedStatus && [
    "assigned",
    "contractor_accepted",
    "replacement_offered",
    "reassigned",
  ].includes(normalizedStatus));

  if (canOpenLater && current < opensAtMs) {
    return {
      state: "locked",
      opensAt,
      minutesUntilOpen: Math.max(1, Math.ceil((opensAtMs - current) / 60000)),
    };
  }

  return { state: "closed", opensAt, minutesUntilOpen: 0 };
};

export const buildPendingPaymentRecord = ({
  bookingId,
  userId,
  amount,
  kind,
}: {
  bookingId?: string | null;
  userId: string;
  amount: number;
  kind: string;
}) => ({
  booking_id: bookingId ?? null,
  user_id: userId,
  amount,
  currency: "ZAR",
  status: "pending",
  provider: "manual_pending",
  payment_kind: kind,
});

export const applyZootCredLedger = (entries: LedgerEntry[]) => {
  return entries.reduce((balance, entry) => {
    return entry.direction === "credit" ? balance + entry.amount : balance - entry.amount;
  }, 0);
};

export const getActivationReadiness = ({
  verification,
  requiredTrainingPassed,
  backgroundCheckConsent,
}: ActivationInput) => {
  const missing = Object.entries(verification)
    .filter(([, status]) => status !== "approved")
    .map(([key]) => key);

  if (!requiredTrainingPassed) missing.push("required_training");
  if (!backgroundCheckConsent) missing.push("background_check_consent");

  return {
    activationReady: missing.length === 0,
    missing,
  };
};
