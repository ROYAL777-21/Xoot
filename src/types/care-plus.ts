export type CarePlusStatus = "active" | "trial" | "paused" | "cancelled";

export interface CarePlusMembership {
  id: string;
  userId: string;
  planId: string;
  status: CarePlusStatus;
  priceZar: number;
  billingCadence: "monthly";
  startedAt: string;
  renewsAt: string;
  addOnCreditZar: number;
  addOnCreditExpiresAt: string;
  xootCredMultiplier: number;
  homeReadinessScore: number;
  favouriteXooterId?: string;
}

export interface HomeMemoryProfile {
  id: string;
  propertyProfileId: string;
  petNotes: string[];
  accessInstructions: string;
  parkingNotes: string;
  roomPriorities: string[];
  fragileAreas: string[];
  productPreferences: string[];
  allergyNotes: string[];
  favouriteAddOns: string[];
  updatedAt: string;
}

export interface FavouriteXooter {
  id: string;
  name: string;
  rating: number;
  specialties: string[];
  lastBookedAt: string;
  nextAvailableAt: string;
  preferredFor: string;
}

export interface XootCredBalance {
  userId: string;
  availableZar: number;
  pendingZar: number;
  multiplier: number;
  projectedNextBookingZar: number;
  /** The one-time R30 credit granted when membership starts. Not a recurring grant. */
  welcomeAddOnCreditZar: number;
  welcomeAddOnCreditExpiresAt: string;
}

export interface PropertyProfile {
  id: string;
  name: string;
  type: "primary_home" | "airbnb" | "landlord" | "small_office";
  suburb: string;
  defaultService: string;
  readinessScore: number;
  turnoverInstructions?: string;
  cleaningHistoryCount: number;
  nextRecommendedBooking?: string;
}

export interface SmartReminder {
  id: string;
  message: string;
  intent: "rebook" | "slot" | "turnover" | "default_addon" | "support";
  cta: string;
  priority: "low" | "normal" | "high";
}

export interface CarePlusBenefit {
  id: string;
  title: string;
  summary: string;
  customerValue: "medium" | "high" | "very_high";
  xootCost: "low" | "medium" | "operational" | "controlled";
  memberProof: string;
}

export interface CarePlusPlan {
  id: string;
  name: string;
  audience: string;
  priceZar: number;
  billingCadence: "monthly";
  benefits: string[];
  futureTierReady: boolean;
}
