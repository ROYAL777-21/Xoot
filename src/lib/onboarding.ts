/**
 * Onboarding state, modelled per customer type.
 *
 * The shape here is the whole point of §5.1b in docs/xoot-master-brief.md. A household,
 * an Airbnb host and an office manager need *different questions*, not the same questions
 * with different labels — asking an Airbnb host "how many bedrooms?" tells them the
 * product was not built for them.
 *
 * So answers are a discriminated union rather than one flat object with optional fields.
 * That costs a little more now and means the Airbnb and office flows can be filled in
 * later without reshaping anything that already exists. A flat bag with `bedrooms?` and
 * `listingCount?` and `headcount?` would compile just as well and would be a trap: nothing
 * would stop a screen reading a field its type never sets.
 */

export type CustomerType = "household" | "airbnb" | "office";

export const CUSTOMER_TYPES: {
  id: CustomerType;
  label: string;
  blurb: string;
}[] = [
  { id: "household", label: "My home", blurb: "A house, flat or townhouse you live in" },
  { id: "airbnb", label: "A place I rent out", blurb: "Airbnb or short-stay turnovers" },
  { id: "office", label: "My workspace", blurb: "An office or business premises" },
];

/** How often a Xooter comes back. Values map to `recurring_schedules.cadence_days`. */
export type Cadence = "once" | "weekly" | "biweekly" | "monthly";

export const CADENCES: { id: Cadence; label: string; days: number | null; hint?: string }[] = [
  { id: "weekly", label: "Every week", days: 7, hint: "Most popular" },
  { id: "biweekly", label: "Every 2 weeks", days: 14 },
  { id: "monthly", label: "Once a month", days: 30 },
  { id: "once", label: "Just once for now", days: null },
];

/** Regular-cleaning home sizes. Bedroom bands set the default hours, not the hourly price. */
export type HomeSize = "small" | "medium" | "large";

export const HOME_SIZES: { id: HomeSize; label: string; beds: string; defaultHours: number }[] = [
  { id: "small", label: "Small", beds: "1–2 bedrooms", defaultHours: 4 },
  { id: "medium", label: "Medium", beds: "3–4 bedrooms", defaultHours: 5.5 },
  { id: "large", label: "Large", beds: "5+ bedrooms", defaultHours: 8 },
];

type Common = {
  cadence?: Cadence;
  suburb?: string;
  /** Whether the customer opted into notifications during onboarding. */
  notificationsPrimed?: boolean;
};

export type HouseholdAnswers = Common & {
  type: "household";
  size?: HomeSize;
  hasPets?: boolean;
};

export type AirbnbAnswers = Common & {
  type: "airbnb";
  /** Turnover volume, not bedrooms — a host thinks in listings. */
  listings?: number;
  /** Airbnb bookings are capped 07:00–14:00 (master brief §4.6). */
  preferredStart?: string;
  /** Required single-select at booking time; captured here so the first booking is one tap. */
  linenHandling?: "replace-no-wash" | "wash-hang-dry" | "wash-dry-repack" | "no-bedding";
};

export type OfficeAnswers = Common & {
  type: "office";
  /** Offices have no size selector at all (master brief §4.4) — headcount stands in. */
  headcount?: number;
  accessHours?: string;
  /** A business needs a VAT invoice; a household does not. */
  billingEmail?: string;
  vatNumber?: string;
};

export type OnboardingAnswers = HouseholdAnswers | AirbnbAnswers | OfficeAnswers;

/** Steps differ per type, so progress is derived rather than a hardcoded count. */
export function stepsFor(type: CustomerType): string[] {
  const tail = ["How often", "Stay in the loop"];
  switch (type) {
    case "household":
      return ["About you", "Your home", ...tail];
    case "airbnb":
      return ["About you", "Your listings", "Linen", ...tail];
    case "office":
      return ["About you", "Your workspace", "Billing", ...tail];
  }
}

export function emptyAnswers(type: CustomerType): OnboardingAnswers {
  return { type } as OnboardingAnswers;
}

const KEY = "xoot.onboarding.draft";

/**
 * Draft persistence.
 *
 * Deliberately localStorage, not the database. `household_profiles` in production has no
 * `customer_type`, `property_type`, `bedrooms`, `listings` or `headcount` column, so there
 * is nowhere to put most of these answers yet — and adding them is a migration, which is
 * gated on ZD-005 (schema source of truth unresolved). Keeping the draft local means
 * onboarding is fully buildable and testable now, and the persistence swap later touches
 * only this file.
 */
export function readDraft(): OnboardingAnswers | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingAnswers>;
    // A draft without a valid discriminant cannot be narrowed, so treat it as absent
    // rather than handing a half-typed object to the screens.
    if (!parsed?.type || !CUSTOMER_TYPES.some((t) => t.id === parsed.type)) return null;
    return parsed as OnboardingAnswers;
  } catch {
    return null;
  }
}

export function writeDraft(answers: OnboardingAnswers) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(answers));
  } catch {
    // Private browsing or a full quota. Losing a draft is recoverable; crashing is not.
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* see writeDraft */
  }
}

/** Default booked hours implied by the answers so far, per master brief §4. */
export function defaultHours(answers: OnboardingAnswers): number {
  switch (answers.type) {
    case "household":
      return HOME_SIZES.find((s) => s.id === answers.size)?.defaultHours ?? 5.5;
    case "airbnb":
      // Base default is 4h; wash/dry/repack on-site raises the whole service to 5h.
      return answers.linenHandling === "wash-dry-repack" ? 5 : 4;
    case "office":
      return 5;
  }
}
