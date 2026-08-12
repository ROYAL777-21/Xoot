import { distanceKmToCoverage, type SuburbCentroid } from "./geo";

export type TrustBadgeKind =
  | "verified"
  | "background_checked"
  | "top_rated"
  | "airbnb_specialist"
  | "premium_care_plus"
  | "repeat_client_favourite";

export type ReliabilityInputs = {
  lateArrivals?: number;
  cancellations?: number;
  qualityAverage?: number;
  repeatBookings?: number;
  complaints?: number;
  escalations?: number;
};

export type XooterTrustProfile = {
  verified?: boolean | null;
  background_checked?: boolean | null;
  background_check_status?: string | null;
  airbnb_specialist?: boolean | null;
  premium_care_plus?: boolean | null;
  repeat_client_count?: number | null;
  rating?: number | null;
  jobs_completed?: number | null;
  reliability_score?: number | null;
  /** Suburbs this Xooter works. The only location fact the marketplace ranks on. */
  suburb_coverage?: string[] | null;
};

export type BookingHistoryItem = {
  scheduled_at: string;
};

export const photoRequiredServiceTypes = ["airbnb", "deep", "premium", "moving"] as const;

export const trustBadgeLabels: Record<TrustBadgeKind, string> = {
  verified: "Verified",
  background_checked: "Background Checked",
  top_rated: "Top Rated",
  airbnb_specialist: "Airbnb Specialist",
  premium_care_plus: "Premium Care+",
  repeat_client_favourite: "Repeat Client Favourite",
};

export const clampScore = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

export const calculateReliabilityScore = ({
  lateArrivals = 0,
  cancellations = 0,
  qualityAverage = 5,
  repeatBookings = 0,
  complaints = 0,
  escalations = 0,
}: ReliabilityInputs) => {
  const qualityBoost = Math.max(0, qualityAverage - 4) * 4;
  const repeatBoost = Math.min(6, repeatBookings * 0.5);
  const penalty = lateArrivals * 3 + cancellations * 8 + complaints * 10 + escalations * 12;

  return clampScore(100 - penalty + qualityBoost + repeatBoost);
};

export const shouldDeprioritizeXooter = (score?: number | null) => typeof score === "number" && score < 75;

export const shouldFlagXooterForReview = (score?: number | null) => typeof score === "number" && score < 50;

export const deriveXooterBadges = (zooter: XooterTrustProfile): TrustBadgeKind[] => {
  const badges: TrustBadgeKind[] = [];
  const backgroundChecked = zooter.background_checked || zooter.background_check_status === "approved";

  if (zooter.verified) badges.push("verified");
  if (backgroundChecked) badges.push("background_checked");
  if ((zooter.rating ?? 0) >= 4.8 && (zooter.jobs_completed ?? 0) >= 20) badges.push("top_rated");
  if (zooter.airbnb_specialist) badges.push("airbnb_specialist");
  if (zooter.premium_care_plus) badges.push("premium_care_plus");
  if ((zooter.repeat_client_count ?? 0) >= 3) badges.push("repeat_client_favourite");

  return badges;
};

/**
 * Optional proximity context for marketplace ordering.
 *
 * ── Why this is optional and not required ───────────────────────────────────────
 * Every existing caller passes nothing and must keep working unchanged. More importantly, a
 * missing address or an unlisted suburb has to mean "rank the way we always did" — never "no
 * Xooters available". A customer in a suburb the centroid table does not know still needs to be
 * able to book.
 */
export type ProximityContext = {
  /** The customer's address. Never stored by this module; used and discarded. */
  address?: string | null;
  centroids?: readonly SuburbCentroid[] | null;
};

/**
 * How far a Xooter is from an address, or null when it cannot be worked out.
 *
 * Exported because the cards want to *show* the number they were sorted by. A list ordered on one
 * distance and labelled with another is worse than an unordered list.
 */
export const xooterDistanceKm = (
  zooter: XooterTrustProfile,
  proximity?: ProximityContext,
): number | null => {
  if (!proximity?.address || !proximity.centroids?.length) return null;
  return distanceKmToCoverage(proximity.address, zooter.suburb_coverage ?? null, proximity.centroids);
};

/**
 * Order Xooters for a customer-facing list.
 *
 * ── The ordering, and the one thing that changed ────────────────────────────────
 * Reliability first (a Xooter in trouble goes last), then score, rating, jobs completed. That is
 * unchanged and still the tie-break.
 *
 * **Added 2026-08-12: distance, when it is known.** `ai-match` had been distance-ranked since the
 * suburb-centroid work landed, but nothing else was — including `NearbyWorkers`, the homepage
 * section literally headed "Nearby Xooters", which sorted by rating and did nothing about
 * nearness. A heading that names a property the list is not ordered by is a claim, and it was not
 * true.
 *
 * ── Why distance is banded rather than compared exactly ─────────────────────────
 * Sorting on raw kilometres would put a 4.1★ Xooter 3 km away above a 4.9★ Xooter 4 km away, and
 * nobody wants that: at suburb resolution a one-kilometre difference is inside the error of the
 * measurement, since the centroid is not where anybody actually lives.
 *
 * So distance is bucketed into 5 km bands and quality decides within a band. That gives "prefer
 * someone genuinely local, then prefer the best of them", which is the real preference. A Xooter
 * with no resolvable distance sorts as if they were in the last band rather than being dropped —
 * unknown is not far, and it is certainly not "unavailable".
 */
const DISTANCE_BAND_KM = 5;

export const sortXootersForMarketplace = <T extends XooterTrustProfile>(
  zooters: T[],
  proximity?: ProximityContext,
) => {
  const bandOf = (zooter: T): number => {
    const km = xooterDistanceKm(zooter, proximity);
    // `Infinity` for unknown: it sorts last among Xooters that DO have a distance, and — because
    // every band is Infinity when nobody has one — collapses to the pre-existing ordering when
    // there is no address or no centroid table. That collapse is the compatibility guarantee.
    if (km === null) return Number.POSITIVE_INFINITY;
    return Math.floor(km / DISTANCE_BAND_KM);
  };

  return [...zooters].sort((a, b) => {
    const aScore = a.reliability_score ?? 100;
    const bScore = b.reliability_score ?? 100;
    const aPenalty = shouldDeprioritizeXooter(aScore) ? 1 : 0;
    const bPenalty = shouldDeprioritizeXooter(bScore) ? 1 : 0;

    // Reliability still outranks distance. Someone under review being nearby is not a reason to
    // put them in front of a customer.
    if (aPenalty !== bPenalty) return aPenalty - bPenalty;

    const aBand = bandOf(a);
    const bBand = bandOf(b);
    if (aBand !== bBand) return aBand - bBand;

    if (bScore !== aScore) return bScore - aScore;
    if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
    return (b.jobs_completed ?? 0) - (a.jobs_completed ?? 0);
  });
};

export const requiresCompletionPhotos = (serviceType?: string | null) => {
  return photoRequiredServiceTypes.includes(serviceType as (typeof photoRequiredServiceTypes)[number]);
};

export const getSmartRecurringSuggestion = (history: BookingHistoryItem[]) => {
  if (history.length < 2) return "Book a recurring slot to keep your preferred Xooter available.";

  const ordered = [...history]
    .map((item) => new Date(item.scheduled_at))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (ordered.length < 2) return "Book a recurring slot to keep your preferred Xooter available.";

  const gaps = ordered.slice(1).map((date, index) => {
    const previous = ordered[index];
    return Math.max(1, Math.round((date.getTime() - previous.getTime()) / 86400000));
  });
  const averageGap = Math.max(1, Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length));
  const last = ordered[ordered.length - 1];
  const next = new Date(last);
  next.setDate(last.getDate() + averageGap);

  const weekday = next.toLocaleDateString("en-ZA", { weekday: "long" });
  const time = next.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

  return `You usually book every ${averageGap} days. Your next clean should be ${weekday} around ${time}.`;
};
