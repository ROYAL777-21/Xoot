import { describe, expect, it } from "vitest";
import { OMNIBOX_DESTINATION_IDS, matchOmnibox } from "./omnibox-match";

describe("omnibox matching", () => {
  it("finds the obvious pages by their own names", () => {
    expect(matchOmnibox("bookings")[0].to).toBe("/app/bookings");
    expect(matchOmnibox("care+")[0].to).toBe("/app/plans");
    expect(matchOmnibox("support")[0].to).toBe("/app/support");
    expect(matchOmnibox("rewards")[0].to).toBe("/app/loyalty");
  });

  it("finds pages by the words people actually use", () => {
    // "My Xooters" is the label, but nobody types that when they mean the cleaner they liked.
    expect(matchOmnibox("favourite cleaner")[0].to).toBe("/app/favorites");
    expect(matchOmnibox("favorite")[0].to).toBe("/app/favorites");
    // XootCred lives under Rewards, and both spellings are in the wild after the rename.
    expect(matchOmnibox("xootcred")[0].to).toBe("/app/loyalty");
    expect(matchOmnibox("zootcred")[0].to).toBe("/app/loyalty");
    // Someone whose clean went wrong types the symptom, not the page name.
    expect(matchOmnibox("refund")[0].to).toBe("/app/support");
    expect(matchOmnibox("damage claim")[0].to).toBe("/app/insurance");
  });

  it("routes service words to the booking page with the service preselected", () => {
    expect(matchOmnibox("airbnb").some((r) => r.to === "/app?service=airbnb")).toBe(true);
    expect(matchOmnibox("express clean").some((r) => r.to === "/app?service=express")).toBe(true);
    // Deep and premium both price as `regular`; the person still gets sent somewhere sensible.
    expect(matchOmnibox("deep clean").some((r) => r.to === "/app?service=regular")).toBe(true);
  });

  it("stays silent rather than guessing", () => {
    // The whole design: anything it cannot place is a question for the Concierge, and a wrong
    // navigation is worse than none because it moves someone away from what they were doing.
    expect(matchOmnibox("")).toEqual([]);
    expect(matchOmnibox("a")).toEqual([]);
    // Both of these contain real keywords — "clean", "house" — and keyword scoring alone offered
    // navigation for them. That is the exact failure the question detector was added for.
    expect(matchOmnibox("how much does a five hour clean cost")).toEqual([]);
    expect(matchOmnibox("can I trust the person who comes to my house")).toEqual([]);
    // A question mark is enough on its own, whatever the query opens with.
    expect(matchOmnibox("care+ worth it?")).toEqual([]);
    // Prose with no question word: one keyword out of seven is a complaint, not a search.
    expect(matchOmnibox("the cleaner did not show up yesterday")).toEqual([]);
  });

  it("still matches short queries where most words do nothing", () => {
    // The ratio rule must not swallow ordinary two- and three-word searches.
    expect(matchOmnibox("gift for mum").map((r) => r.to)).toContain("/app/gifts");
    expect(matchOmnibox("my bookings").map((r) => r.to)).toContain("/app/bookings");
  });

  it("does not match a substring buried inside an unrelated word", () => {
    // "at" inside "operations" is not a signal. Matching it is exactly how an omnibox starts
    // offering confident nonsense.
    for (const result of matchOmnibox("operations")) {
      expect(result.label).not.toBe("Profile");
    }
    expect(matchOmnibox("xx")).toEqual([]);
  });

  it("ranks deterministically, so rows do not flip between renders", () => {
    const first = matchOmnibox("office");
    const second = matchOmnibox("office");
    expect(first.map((r) => r.id)).toEqual(second.map((r) => r.id));
    // "office" legitimately means both Properties and the Office clean; both should appear, and
    // the page should lead.
    expect(first.map((r) => r.to)).toContain("/app/properties");
    expect(first.map((r) => r.to)).toContain("/app?service=office");
    expect(first[0].to).toBe("/app/properties");
  });

  it("respects the limit", () => {
    expect(matchOmnibox("clean", 2)).toHaveLength(2);
    expect(matchOmnibox("clean", 10).length).toBeLessThanOrEqual(10);
  });

  it("every destination is reachable by typing its own label", () => {
    // Stops a destination being added with keywords that never fire — a row nobody can reach is
    // the search-bar version of a control nobody reads.
    const reachable = new Set<string>();
    for (const id of OMNIBOX_DESTINATION_IDS) reachable.add(id);
    for (const id of OMNIBOX_DESTINATION_IDS) {
      const label = { book: "book a clean", bookings: "bookings", plans: "care+", properties: "properties",
        favorites: "my xooters", loyalty: "rewards", gifts: "gift a clean", profile: "profile",
        support: "support", insurance: "trust policy", training: "training" }[id];
      expect(label, `no label fixture for destination "${id}"`).toBeTruthy();
      expect(matchOmnibox(label!, 11).map((r) => r.id), `"${label}" does not reach ${id}`).toContain(id);
    }
  });
});
