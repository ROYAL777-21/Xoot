import type {
  CarePlusBenefit,
  CarePlusMembership,
  CarePlusPlan,
  FavouriteZooter,
  HomeMemoryProfile,
  PropertyProfile,
  SmartReminder,
  ZootCredBalance,
} from "@/types/care-plus";

export const carePlusPlan: CarePlusPlan = {
  id: "zoot-care-plus",
  name: "Zoot Care+",
  audience: "For busy households and professionals.",
  priceZar: 99,
  billingCadence: "monthly",
  futureTierReady: true,
  benefits: [
    "Home Memory",
    "Favourite Zooter priority",
    "Priority booking windows",
    "Priority replacement support",
    "One-tap rebook",
    "1.5x ZootCred",
    "R30 monthly add-on credit",
    "Smart home reminders",
    "Property profiles",
    "Priority support",
  ],
};

export const isCarePlusPreviewDataAllowed = () => import.meta.env.VITE_APP_ENV !== "production";

// Public marketing preview data only. Authenticated production pages must query Supabase instead of importing these mock objects.
export const mockCarePlusMembership: CarePlusMembership = {
  id: "care-plus-demo",
  userId: "demo-user",
  planId: carePlusPlan.id,
  status: "active",
  priceZar: 99,
  billingCadence: "monthly",
  startedAt: "2026-05-01T08:00:00.000Z",
  renewsAt: "2026-06-01T08:00:00.000Z",
  addOnCreditZar: 30,
  addOnCreditExpiresAt: "2026-05-31T21:59:59.000Z",
  zootCredMultiplier: 1.5,
  homeReadinessScore: 86,
  favouriteZooterId: "nomsa-demo",
};

export const mockFavouriteZooter: FavouriteZooter = {
  id: "nomsa-demo",
  name: "Nomsa",
  rating: 4.96,
  specialties: ["Airbnb turnovers", "Premium home reset", "Ironing"],
  lastBookedAt: "2026-05-15T09:00:00.000Z",
  nextAvailableAt: "2026-05-29T08:30:00.000Z",
  preferredFor: "Kitchen detail, pet notes, linen reset",
};

export const mockZootCredBalance: ZootCredBalance = {
  userId: "demo-user",
  availableZar: 185,
  pendingZar: 45,
  multiplier: 1.5,
  projectedNextBookingZar: 38,
  monthlyAddOnCreditZar: 30,
  monthlyAddOnCreditExpiresAt: "2026-05-31T21:59:59.000Z",
};

export const mockPropertyProfiles: PropertyProfile[] = [
  {
    id: "hyde-park-home",
    name: "Hyde Park family home",
    type: "primary_home",
    suburb: "Hyde Park",
    defaultService: "Premium home clean",
    readinessScore: 86,
    cleaningHistoryCount: 12,
    nextRecommendedBooking: "Thursday morning slot available",
  },
  {
    id: "rosebank-loft",
    name: "Rosebank guest loft",
    type: "airbnb",
    suburb: "Rosebank",
    defaultService: "Airbnb turnover clean",
    readinessScore: 92,
    turnoverInstructions: "Lockbox, linen reset, fridge check, before/after photo proof",
    cleaningHistoryCount: 18,
    nextRecommendedBooking: "Guest arriving soon",
  },
  {
    id: "sandton-office",
    name: "Sandton studio office",
    type: "small_office",
    suburb: "Sandton",
    defaultService: "Small office clean",
    readinessScore: 81,
    turnoverInstructions: "Reception, boardroom glass, kitchen bins, allergy-safe products",
    cleaningHistoryCount: 9,
    nextRecommendedBooking: "Usual Tuesday slot available",
  },
];

export const mockHomeMemoryProfile: HomeMemoryProfile = {
  id: "home-memory-demo",
  propertyProfileId: "hyde-park-home",
  petNotes: ["Two calm dogs", "Keep back gate closed"],
  accessInstructions: "Use the intercom, access notes stay inside the authenticated app.",
  parkingNotes: "Visitor bay near reception, avoid blocking driveway.",
  roomPriorities: ["Kitchen counters", "Main bedroom", "Guest bathroom"],
  fragileAreas: ["Dining-room glassware", "Framed hallway art"],
  productPreferences: ["Low-scent surface spray", "Client-provided marble cleaner"],
  allergyNotes: ["Avoid strong lavender scents", "Use glove-safe products"],
  favouriteAddOns: ["Ironing", "Fridge clean"],
  updatedAt: "2026-05-27T12:18:00.000Z",
};

export const carePlusBenefits: CarePlusBenefit[] = [
  {
    id: "home-memory",
    title: "Home Memory",
    summary: "Save pet notes, access instructions, parking, room priorities, fragile areas, product preferences, allergy notes, and favourite add-ons.",
    customerValue: "very_high",
    zootCost: "low",
    memberProof: "Your home stays remembered across bookings.",
  },
  {
    id: "favourite-zooter",
    title: "Favourite Zooter",
    summary: "Save and rebook your preferred Zooter with a personal CTA like Book Nomsa again.",
    customerValue: "very_high",
    zootCost: "medium",
    memberProof: "Continuity makes repeat bookings feel safer and calmer.",
  },
  {
    id: "priority-booking",
    title: "Priority Booking",
    summary: "Care+ members get earlier access to high-demand slots and recurring schedules.",
    customerValue: "high",
    zootCost: "low",
    memberProof: "Peak windows feel easier to secure without discounting the service.",
  },
  {
    id: "priority-replacement",
    title: "Priority Replacement Support",
    summary: "If a Zooter cancels or becomes unavailable, Care+ members are prioritised for replacement matching.",
    customerValue: "very_high",
    zootCost: "operational",
    memberProof: "Reduces the anxiety of disrupted home-care plans.",
  },
  {
    id: "one-tap-rebook",
    title: "One-Tap Rebook",
    summary: "Repeat previous bookings quickly using saved preferences and default add-ons.",
    customerValue: "high",
    zootCost: "low",
    memberProof: "A full booking can feel like one calm tap.",
  },
  {
    id: "zootcred-boost",
    title: "ZootCred Boost",
    summary: "Earn 1.5x ZootCred on completed bookings.",
    customerValue: "high",
    zootCost: "controlled",
    memberProof: "Repeat bookings quietly build loyalty value.",
  },
  {
    id: "monthly-credit",
    title: "R30 Monthly Add-On Credit",
    summary: "A booking-only add-on credit that expires monthly and cannot be withdrawn.",
    customerValue: "high",
    zootCost: "controlled",
    memberProof: "Makes the R99/month membership easier to justify.",
  },
  {
    id: "smart-reminders",
    title: "Smart Home Reminders",
    summary: "Prompts surface the right next action, from rebooking to saving ironing as a default.",
    customerValue: "high",
    zootCost: "low",
    memberProof: "The app feels intelligent without being gimmicky.",
  },
];

export const carePlusMoatBenefits: CarePlusBenefit[] = [
  {
    id: "home-readiness-score",
    title: "Home Readiness Score",
    summary: "Encourages members to complete notes, defaults, add-ons and property profiles.",
    customerValue: "medium",
    zootCost: "low",
    memberProof: "Your home profile becomes more complete over time.",
  },
  {
    id: "seasonal-reset",
    title: "Seasonal Home Reset Perks",
    summary: "Member-only prompts for deep cleans, guest prep and end-of-season resets.",
    customerValue: "high",
    zootCost: "controlled",
    memberProof: "Membership stays fresh without cheap-feeling discounts.",
  },
  {
    id: "photo-proof",
    title: "Before/After Photo Proof",
    summary: "Useful for deep cleans, Airbnb turnovers and move-out cleans when proof matters.",
    customerValue: "high",
    zootCost: "operational",
    memberProof: "Remote owners get more confidence after completion.",
  },
  {
    id: "guest-ready-mode",
    title: "Guest-Ready Mode",
    summary: "Turnover instructions, cleaning history and guest timing for Airbnb hosts and landlords.",
    customerValue: "high",
    zootCost: "medium",
    memberProof: "Properties stay ready when guests are on the way.",
  },
];

export const smartReminders: SmartReminder[] = [
  {
    id: "cleaned-12-days",
    message: "Your home still has that after-clean calm. Nomsa has a nearby slot before the week gets busy.",
    intent: "rebook",
    cta: "Keep the rhythm",
    priority: "high",
  },
  {
    id: "thursday-slot",
    message: "Your usual Thursday window is open, so you can protect the routine before peak slots fill.",
    intent: "slot",
    cta: "Reserve Thursday",
    priority: "normal",
  },
  {
    id: "guest-arriving",
    message: "Guests arriving soon? Turnover notes, linen reset and photo-proof expectations are ready to reuse.",
    intent: "turnover",
    cta: "Prep guest-ready",
    priority: "high",
  },
  {
    id: "ironing-default",
    message: "You add ironing often. Save it once so the next booking feels less like admin.",
    intent: "default_addon",
    cta: "Save default",
    priority: "normal",
  },
];

export const comparisonRows = [
  { feature: "Home preferences", standard: "Per-booking notes", carePlus: "Saved Home Memory" },
  { feature: "Favourite Zooter", standard: "Book from available Zooters", carePlus: "Save and rebook a preferred Zooter" },
  { feature: "High-demand slots", standard: "Standard availability", carePlus: "Earlier access to peak windows" },
  { feature: "Replacement support", standard: "Normal matching queue", carePlus: "Prioritised replacement matching" },
  { feature: "Rewards", standard: "Base ZootCred", carePlus: "1.5x ZootCred on completed bookings" },
  { feature: "Add-ons", standard: "Pay as needed", carePlus: "R30 monthly add-on credit" },
  { feature: "Support", standard: "Standard support handling", carePlus: "Priority support for booking issues" },
];
