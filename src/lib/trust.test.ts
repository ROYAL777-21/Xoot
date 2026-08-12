import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  calculateReliabilityScore,
  deriveXooterBadges,
  getSmartRecurringSuggestion,
  requiresCompletionPhotos,
  shouldDeprioritizeXooter,
  sortXootersForMarketplace,
  xooterDistanceKm,
} from "./trust";

describe("trust helpers", () => {
  it("calculates reliability score with weighted penalties and positive boosts", () => {
    expect(calculateReliabilityScore({ lateArrivals: 2, cancellations: 1, complaints: 1, escalations: 1, qualityAverage: 4.5, repeatBookings: 4 })).toBe(68);
    expect(shouldDeprioritizeXooter(68)).toBe(true);
  });

  it("sorts low reliability contractors below stronger marketplace options", () => {
    const ranked = sortXootersForMarketplace([
      { name: "Low", reliability_score: 60, rating: 5, jobs_completed: 300 },
      { name: "Strong", reliability_score: 92, rating: 4.7, jobs_completed: 80 },
      { name: "Best", reliability_score: 98, rating: 4.8, jobs_completed: 30 },
    ]);

    expect(ranked.map((z) => z.name)).toEqual(["Best", "Strong", "Low"]);
  });

  it("derives all visible trust badges from contractor signals", () => {
    expect(deriveXooterBadges({
      verified: true,
      background_check_status: "approved",
      rating: 4.91,
      jobs_completed: 42,
      airbnb_specialist: true,
      premium_care_plus: true,
      repeat_client_count: 4,
    })).toEqual(["verified", "background_checked", "top_rated", "airbnb_specialist", "premium_care_plus", "repeat_client_favourite"]);
  });

  it("requires photo verification for dispute-prone service types", () => {
    expect(requiresCompletionPhotos("airbnb")).toBe(true);
    expect(requiresCompletionPhotos("deep")).toBe(true);
    expect(requiresCompletionPhotos("premium")).toBe(true);
    expect(requiresCompletionPhotos("moving")).toBe(true);
    expect(requiresCompletionPhotos("residential")).toBe(false);
  });

  it("suggests a recurring cadence from booking history", () => {
    const suggestion = getSmartRecurringSuggestion([
      { scheduled_at: "2026-01-01T08:00:00.000Z" },
      { scheduled_at: "2026-01-13T08:00:00.000Z" },
      { scheduled_at: "2026-01-25T08:00:00.000Z" },
    ]);

    expect(suggestion).toContain("every 12 days");
  });
});

/**
 * Proximity ranking outside `ai-match`.
 *
 * ── Why this is a separate block ────────────────────────────────────────────────
 * `ai-match` has ranked on real suburb-centroid distance since that work landed, but nothing else
 * did — including `NearbyWorkers`, the homepage section headed **"Nearby Xooters"**, which sorted
 * by rating alone. A heading naming a property the list is not ordered by is a claim, and it was
 * not a true one.
 *
 * The two properties that matter most here are the *negative* ones: no caller breaks, and nobody
 * is excluded. Distance changes the order and never the membership.
 */
describe("marketplace proximity ranking", () => {
  /** Two real Johannesburg suburbs, ~4.5 km apart, from `suburb_centroids`. */
  const CENTROIDS = [
    { suburb: "Sandton", region: "Gauteng", latitude: -26.1076, longitude: 28.0567 },
    { suburb: "Rosebank", region: "Gauteng", latitude: -26.1438, longitude: 28.0406 },
    { suburb: "Soweto", region: "Gauteng", latitude: -26.2678, longitude: 27.8585 },
  ];

  const NEAR = { name: "Near", reliability_score: 90, rating: 4.5, jobs_completed: 40, suburb_coverage: ["Sandton"] };
  const FAR = { name: "Far", reliability_score: 99, rating: 5, jobs_completed: 400, suburb_coverage: ["Soweto"] };
  const UNKNOWN = { name: "Unknown", reliability_score: 95, rating: 4.9, jobs_completed: 100, suburb_coverage: null };

  it("prefers a nearer Xooter over a better-rated distant one", () => {
    // The whole point. `Far` wins on every quality signal — higher score, perfect rating, ten times
    // the jobs — and still ranks below `Near` for a Sandton address, because a Xooter who will not
    // make the trip is not a better option however good they are.
    const ranked = sortXootersForMarketplace([FAR, NEAR], {
      address: "12 Rivonia Road, Sandton",
      centroids: CENTROIDS,
    });
    expect(ranked.map((z) => z.name)).toEqual(["Near", "Far"]);
  });

  it("lets quality decide inside a distance band", () => {
    // Sandton and Rosebank are ~4.5 km apart, so both land in the first 5 km band for a Sandton
    // address. Within a band, quality is the only thing that should move anyone — a 1 km edge at
    // suburb resolution is inside the error of the measurement, since a centroid is not where
    // anybody actually lives.
    const sandton = { ...NEAR, name: "Sandton", rating: 4.2 };
    const rosebank = { ...NEAR, name: "Rosebank", rating: 4.9, suburb_coverage: ["Rosebank"] };
    const ranked = sortXootersForMarketplace([sandton, rosebank], {
      address: "12 Rivonia Road, Sandton",
      centroids: CENTROIDS,
    });
    expect(ranked.map((z) => z.name)).toEqual(["Rosebank", "Sandton"]);
  });

  it("treats an unresolvable distance as unknown, not as far, and never drops it", () => {
    // A Xooter with no coverage list still appears. Unknown must never become "unavailable": a
    // marketplace that empties itself because it cannot geocode something is worse than one that
    // guesses at the order.
    const ranked = sortXootersForMarketplace([UNKNOWN, NEAR, FAR], {
      address: "12 Rivonia Road, Sandton",
      centroids: CENTROIDS,
    });
    expect(ranked).toHaveLength(3);
    expect(ranked.map((z) => z.name)).toContain("Unknown");
    // It sorts last among those that DO have a distance, rather than being ranked as if nearby.
    expect(ranked.at(-1)?.name).toBe("Unknown");
  });

  it("keeps reliability above distance", () => {
    // Someone under review being nearby is not a reason to put them in front of a customer.
    const troubled = { ...NEAR, name: "Troubled", reliability_score: 60 };
    const ranked = sortXootersForMarketplace([troubled, FAR], {
      address: "12 Rivonia Road, Sandton",
      centroids: CENTROIDS,
    });
    expect(ranked.map((z) => z.name)).toEqual(["Far", "Troubled"]);
  });

  it("collapses to the previous ordering with no address or no centroids", () => {
    // The compatibility guarantee. Every existing caller passes nothing, and a customer in a
    // suburb the centroid table does not know still gets a sensibly ordered list.
    const input = [FAR, NEAR, UNKNOWN];
    const baseline = sortXootersForMarketplace(input).map((z) => z.name);
    expect(sortXootersForMarketplace(input, {}).map((z) => z.name)).toEqual(baseline);
    expect(sortXootersForMarketplace(input, { address: "12 Rivonia Road, Sandton", centroids: [] }).map((z) => z.name))
      .toEqual(baseline);
    expect(sortXootersForMarketplace(input, { address: null, centroids: CENTROIDS }).map((z) => z.name))
      .toEqual(baseline);
    // And it is still quality order, not input order.
    expect(baseline).toEqual(["Far", "Unknown", "Near"]);
  });

  it("reports the distance the sort used, so a card can show the number it was ranked by", () => {
    const proximity = { address: "12 Rivonia Road, Sandton", centroids: CENTROIDS };
    expect(xooterDistanceKm(NEAR, proximity)).toBeCloseTo(0, 5);
    expect(xooterDistanceKm(FAR, proximity)).toBeGreaterThan(20);
    expect(xooterDistanceKm(UNKNOWN, proximity)).toBeNull();
    expect(xooterDistanceKm(NEAR, { address: null, centroids: CENTROIDS })).toBeNull();
  });
});

describe("the fake distance is gone", () => {
  it("is written by nothing", () => {
    // `approve-zooter` stamped `distance_mi: 1` onto every Xooter it activated until 2026-08-12 —
    // the last live trace of a static seeded column that made everyone "1 away" from everyone.
    //
    // Nothing reading it was never a reason to keep writing it. A column nobody reads but
    // something keeps filling is how a dead value comes back: the next person to see it populated
    // reasonably assumes it means something.
    const roots = ["src", "supabase/functions", "mobile/src"];
    const offenders: string[] = [];
    for (const root of roots) {
      const dir = join(process.cwd(), root);
      if (!existsSync(dir)) continue;
      const walk = (path: string) => {
        for (const entry of readdirSync(path, { withFileTypes: true })) {
          const full = join(path, entry.name);
          if (entry.isDirectory()) {
            if (entry.name === "node_modules") continue;
            walk(full);
            continue;
          }
          if (!/\.(ts|tsx)$/.test(entry.name)) continue;
          if (full.endsWith("trust.test.ts")) continue;
          const source = readFileSync(full, "utf8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/^\s*\/\/.*$/gm, "");
          // A write, not a mention: `distance_mi:` as an object key is the shape that repopulates
          // the column. `types.ts` still declares it, and that is correct — it is generated from a
          // schema where the column still exists.
          if (/\bdistance_mi\s*:/.test(source) && !full.includes("integrations/supabase/types.ts")) {
            offenders.push(full.replace(process.cwd() + "/", ""));
          }
        }
      };
      walk(dir);
    }
    expect(offenders).toEqual([]);
  });
});
