/**
 * Matches what someone types in the app search bar to somewhere they can go.
 *
 * Pure and synchronous on purpose. The omnibox runs this on every keystroke, so it must never
 * touch the network — an Edge Function call per character would be both slow and a way to leak a
 * half-typed question to the server before the person decided to ask it.
 *
 * Anything this cannot match is a question, and the omnibox hands it to the Concierge. So the job
 * here is not to answer; it is to be **confidently right or silent**. A wrong navigation is worse
 * than no navigation, because it moves someone away from what they were doing.
 */

export type OmniboxTarget = {
  /** Stable key for React lists and tests. */
  id: string;
  label: string;
  /** Route to navigate to, including any query string. */
  to: string;
  /** Short line under the label explaining where this goes. */
  hint: string;
  /** Higher wins. Only relative order matters. */
  score: number;
};

type Destination = {
  id: string;
  label: string;
  to: string;
  hint: string;
  /** Words that should find this. The label is added automatically. */
  keywords: string[];
};

/**
 * Destinations, with the words people actually use rather than only the nav label.
 *
 * "My Xooters" is the label, but nobody searches for that phrase when they mean "the cleaner I
 * liked" — so `favourite`, `cleaner` and both spellings of favourite are keywords. British and
 * American spellings both appear because the app is South African and both are in daily use.
 */
const DESTINATIONS: Destination[] = [
  { id: "book", label: "Book a clean", to: "/app", hint: "Start a new booking", keywords: ["book", "new", "clean", "cleaning", "order", "schedule"] },
  { id: "bookings", label: "Bookings", to: "/app/bookings", hint: "Your upcoming and past cleans", keywords: ["booking", "upcoming", "history", "past", "appointment"] },
  { id: "plans", label: "Care+", to: "/app/plans", hint: "Membership and plans", keywords: ["care", "care+", "careplus", "membership", "plan", "subscription"] },
  { id: "properties", label: "Properties", to: "/app/properties", hint: "Airbnb, offices and managed properties", keywords: ["property", "properties", "airbnb", "office", "landlord", "manager", "estate"] },
  { id: "favorites", label: "My Xooters", to: "/app/favorites", hint: "Your saved Xooters", keywords: ["xooter", "zooter", "favourite", "favorite", "cleaner", "helper", "saved"] },
  { id: "loyalty", label: "Rewards", to: "/app/loyalty", hint: "XootCred and loyalty", keywords: ["reward", "loyalty", "points", "xootcred", "zootcred", "credit", "cred"] },
  { id: "gifts", label: "Gift a clean", to: "/app/gifts", hint: "Buy a clean for someone else", keywords: ["gift", "present", "voucher", "someone"] },
  { id: "profile", label: "Profile", to: "/app/profile", hint: "Your details and addresses", keywords: ["profile", "account", "address", "details", "settings", "me"] },
  { id: "support", label: "Support", to: "/app/support", hint: "Talk to a human", keywords: ["support", "help", "contact", "human", "problem", "complaint", "refund"] },
  { id: "insurance", label: "Trust Policy", to: "/app/insurance", hint: "Cover and guarantees", keywords: ["insurance", "cover", "trust", "policy", "guarantee", "damage", "claim"] },
  { id: "training", label: "Training", to: "/app/training", hint: "Xoot training modules", keywords: ["training", "course", "learn", "module"] },
];

/**
 * Service words that should land on the booking page with the service preselected.
 *
 * Kept as literals rather than derived from `SERVICE_ALIASES` because that map is keyed by
 * internal ids and several of them collide — `deep`, `premium` and `residential` all resolve to
 * `regular`, so deriving from it would offer three identical rows. What matters to a person
 * typing is the words they use, which is a different list from the pricing engine's.
 */
const SERVICE_WORDS: { id: string; label: string; service: string; keywords: string[] }[] = [
  { id: "svc-regular", label: "Regular clean", service: "regular", keywords: ["regular", "standard", "normal", "deep", "premium", "residential", "house", "home", "flat", "apartment"] },
  { id: "svc-express", label: "Express clean", service: "express", keywords: ["express", "quick", "fast", "short"] },
  { id: "svc-airbnb", label: "Airbnb turnover", service: "airbnb", keywords: ["airbnb", "turnover", "guest", "bnb", "short-let", "shortlet"] },
  { id: "svc-office", label: "Office clean", service: "office", keywords: ["office", "workplace", "commercial", "business"] },
];

const normalise = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Score one candidate against the query's words.
 *
 * Exact word match beats prefix match, which beats nothing. Substring-anywhere is deliberately
 * **not** matched: "at" appearing inside "operations" is not a signal, and matching it produces
 * exactly the confident-but-wrong row this module exists to avoid.
 */
const scoreCandidate = (queryWords: string[], haystack: string[]): { score: number; matched: number } => {
  let score = 0;
  let matched = 0;
  for (const word of queryWords) {
    if (word.length < 2) continue;
    for (const term of haystack) {
      if (term === word) {
        score += 10;
        matched += 1;
        break;
      }
      if (term.startsWith(word) && word.length >= 3) {
        score += 5;
        matched += 1;
        break;
      }
    }
  }
  return { score, matched };
};

/**
 * Words that start a question. A query beginning with one is for the Concierge, not the router.
 *
 * ── The bug this prevents, found by its own test ────────────────────────────────
 * "how much does a five hour clean cost" contains "clean", so keyword scoring alone offered
 * "Regular clean" and "Book a clean" as navigation. That is the confidently-wrong result this
 * module is supposed to be incapable of: someone asking about price gets moved to a booking form
 * instead of an answer, and the thing they typed disappears.
 *
 * Keyword overlap cannot distinguish a question about cleaning from an instruction to go to
 * cleaning. Sentence shape can, cheaply and without a model.
 */
const QUESTION_OPENERS = new Set([
  "how", "what", "why", "when", "where", "who", "which", "whose",
  "can", "could", "should", "would", "will", "do", "does", "did",
  "is", "are", "am", "was", "were", "may", "might", "must", "shall",
]);

/**
 * Is this prose rather than a destination?
 *
 * Two independent signals, because either alone misses cases:
 * - It opens with a question word, or ends in a question mark.
 * - It is a long query in which most words matched nothing — "the cleaner did not show up
 *   yesterday" hits one keyword out of seven, which is a complaint, not a search.
 *
 * The threshold only applies from four words up. Below that, a low ratio is normal and useful:
 * "gift for mum" should still find Gift a clean.
 */
const looksLikeAQuestion = (raw: string, words: string[]): boolean => {
  if (raw.trim().endsWith("?")) return true;
  return words.length > 0 && QUESTION_OPENERS.has(words[0]);
};

/**
 * Rank destinations for a query. Empty for a query too short or too vague to be sure about.
 *
 * @param limit maximum rows to return.
 */
export function matchOmnibox(rawQuery: string, limit = 5): OmniboxTarget[] {
  const query = normalise(rawQuery);
  // One character is never enough evidence — "a" would match half the list.
  if (query.length < 2) return [];
  const words = query.split(" ").filter(Boolean);

  if (looksLikeAQuestion(rawQuery, words)) return [];

  const results: OmniboxTarget[] = [];
  // From four words up, most of the query has to be doing work. Below that a low ratio is normal
  // and useful — "gift for mum" should still find Gift a clean.
  const minMatchRatio = words.length >= 4 ? 0.5 : 0;

  for (const destination of DESTINATIONS) {
    const haystack = [...destination.keywords, ...normalise(destination.label).split(" ")];
    const { score, matched } = scoreCandidate(words, haystack);
    if (score > 0 && matched / words.length >= minMatchRatio) {
      results.push({ id: destination.id, label: destination.label, to: destination.to, hint: destination.hint, score });
    }
  }

  for (const service of SERVICE_WORDS) {
    const haystack = [...service.keywords, ...normalise(service.label).split(" ")];
    const { score, matched } = scoreCandidate(words, haystack);
    if (score > 0 && matched / words.length >= minMatchRatio) {
      results.push({
        id: service.id,
        label: service.label,
        to: `/app?service=${encodeURIComponent(service.service)}`,
        hint: "Book this service",
        // Half a point below an equal-scoring page, so "office" offers the Properties page and the
        // Office clean in a stable order rather than flipping between renders.
        score: score - 0.5,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label)).slice(0, limit);
}

/** Exported for the test, so the fixture cannot drift from the real list. */
export const OMNIBOX_DESTINATION_IDS = DESTINATIONS.map((d) => d.id);
