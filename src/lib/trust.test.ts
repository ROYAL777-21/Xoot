import { describe, expect, it } from "vitest";
import {
  calculateReliabilityScore,
  deriveZooterBadges,
  getSmartRecurringSuggestion,
  requiresCompletionPhotos,
  shouldDeprioritizeZooter,
  sortZootersForMarketplace,
} from "./trust";

describe("trust helpers", () => {
  it("calculates reliability score with weighted penalties and positive boosts", () => {
    expect(calculateReliabilityScore({ lateArrivals: 2, cancellations: 1, complaints: 1, escalations: 1, qualityAverage: 4.5, repeatBookings: 4 })).toBe(68);
    expect(shouldDeprioritizeZooter(68)).toBe(true);
  });

  it("sorts low reliability contractors below stronger marketplace options", () => {
    const ranked = sortZootersForMarketplace([
      { name: "Low", reliability_score: 60, rating: 5, jobs_completed: 300 },
      { name: "Strong", reliability_score: 92, rating: 4.7, jobs_completed: 80 },
      { name: "Best", reliability_score: 98, rating: 4.8, jobs_completed: 30 },
    ]);

    expect(ranked.map((z) => z.name)).toEqual(["Best", "Strong", "Low"]);
  });

  it("derives all visible trust badges from contractor signals", () => {
    expect(deriveZooterBadges({
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
