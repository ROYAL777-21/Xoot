import { beforeEach, describe, expect, it } from "vitest";
import {
  CADENCES,
  CUSTOMER_TYPES,
  HOME_SIZES,
  clearDraft,
  defaultHours,
  emptyAnswers,
  readDraft,
  stepsFor,
  writeDraft,
  type OnboardingAnswers,
} from "./onboarding";

describe("onboarding state", () => {
  beforeEach(() => clearDraft());

  it("gives each customer type its own step list", () => {
    // The whole point of §5.1b: types differ in questions, not just labels.
    expect(stepsFor("household")).toContain("Your home");
    expect(stepsFor("airbnb")).toContain("Your listings");
    expect(stepsFor("airbnb")).toContain("Linen");
    expect(stepsFor("office")).toContain("Billing");
    // An Airbnb host is never asked about "your home".
    expect(stepsFor("airbnb")).not.toContain("Your home");
    // An office is never asked to pick a home size.
    expect(stepsFor("office")).not.toContain("Your home");
  });

  it("derives default hours from the master-brief rules", () => {
    expect(defaultHours({ type: "household", size: "small" })).toBe(4);
    expect(defaultHours({ type: "household", size: "medium" })).toBe(5.5);
    expect(defaultHours({ type: "household", size: "large" })).toBe(8);
    // Office has no size selector; it defaults to 5h regardless (§4.4).
    expect(defaultHours({ type: "office" })).toBe(5);
    // Airbnb base is 4h, but wash/dry/repack raises the whole service to 5h (§4.6).
    expect(defaultHours({ type: "airbnb" })).toBe(4);
    expect(defaultHours({ type: "airbnb", linenHandling: "wash-dry-repack" })).toBe(5);
    expect(defaultHours({ type: "airbnb", linenHandling: "wash-hang-dry" })).toBe(4);
  });

  it("round-trips a draft", () => {
    const a: OnboardingAnswers = { type: "airbnb", listings: 3, cadence: "weekly" };
    writeDraft(a);
    expect(readDraft()).toEqual(a);
  });

  it("rejects a draft with no valid discriminant rather than returning a half-typed object", () => {
    // A screen that narrows on `type` would otherwise read fields its type never sets.
    window.localStorage.setItem("xoot.onboarding.draft", JSON.stringify({ size: "small" }));
    expect(readDraft()).toBeNull();
    window.localStorage.setItem("xoot.onboarding.draft", JSON.stringify({ type: "spaceship" }));
    expect(readDraft()).toBeNull();
    window.localStorage.setItem("xoot.onboarding.draft", "not json at all");
    expect(readDraft()).toBeNull();
  });

  it("starts empty answers carrying only the discriminant", () => {
    expect(emptyAnswers("office")).toEqual({ type: "office" });
  });

  it("keeps the option lists consistent with the pricing rules", () => {
    expect(CUSTOMER_TYPES.map((t) => t.id)).toEqual(["household", "airbnb", "office"]);
    // Cadence days back recurring_schedules.cadence_days; "once" has none.
    expect(CADENCES.find((c) => c.id === "weekly")?.days).toBe(7);
    expect(CADENCES.find((c) => c.id === "biweekly")?.days).toBe(14);
    expect(CADENCES.find((c) => c.id === "once")?.days).toBeNull();
    // Home size sets default hours only — never an hourly rate (ZD-020).
    expect(HOME_SIZES.map((s) => s.defaultHours)).toEqual([4, 5.5, 8]);
  });
});
