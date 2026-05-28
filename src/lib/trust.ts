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

export type ZooterTrustProfile = {
  verified?: boolean | null;
  background_checked?: boolean | null;
  background_check_status?: string | null;
  airbnb_specialist?: boolean | null;
  premium_care_plus?: boolean | null;
  repeat_client_count?: number | null;
  rating?: number | null;
  jobs_completed?: number | null;
  reliability_score?: number | null;
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

export const shouldDeprioritizeZooter = (score?: number | null) => typeof score === "number" && score < 75;

export const shouldFlagZooterForReview = (score?: number | null) => typeof score === "number" && score < 50;

export const deriveZooterBadges = (zooter: ZooterTrustProfile): TrustBadgeKind[] => {
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

export const sortZootersForMarketplace = <T extends ZooterTrustProfile>(zooters: T[]) => {
  return [...zooters].sort((a, b) => {
    const aScore = a.reliability_score ?? 100;
    const bScore = b.reliability_score ?? 100;
    const aPenalty = shouldDeprioritizeZooter(aScore) ? 1 : 0;
    const bPenalty = shouldDeprioritizeZooter(bScore) ? 1 : 0;

    if (aPenalty !== bPenalty) return aPenalty - bPenalty;
    if (bScore !== aScore) return bScore - aScore;
    if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
    return (b.jobs_completed ?? 0) - (a.jobs_completed ?? 0);
  });
};

export const requiresCompletionPhotos = (serviceType?: string | null) => {
  return photoRequiredServiceTypes.includes(serviceType as (typeof photoRequiredServiceTypes)[number]);
};

export const getSmartRecurringSuggestion = (history: BookingHistoryItem[]) => {
  if (history.length < 2) return "Book a recurring slot to keep your preferred Zooter available.";

  const ordered = [...history]
    .map((item) => new Date(item.scheduled_at))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (ordered.length < 2) return "Book a recurring slot to keep your preferred Zooter available.";

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
