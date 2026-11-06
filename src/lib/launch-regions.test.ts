import { describe, expect, it } from "vitest";

import { APPROVED_LAUNCH_REGIONS, approvedLaunchRegionLabels, isApprovedLaunchRegion } from "./launch-regions";

describe("launch regions", () => {
  it("matches the Edge Function's approved launch region list", () => {
    // Mirror of `approvedLaunchRegions` in supabase/functions/_shared/action-utils.ts.
    // If this test fails after an edit on either side, the two lists have drifted — update both
    // or applicants will be told a suburb is fine that the server will reject at submit.
    const serverList = [
      "midrand",
      "sandton",
      "bryanston",
      "bedfordview",
      "rosebank",
      "parkhurst",
      "melville",
      "fourways",
      "waterfall",
      "dainfern",
      "hyde park",
      "braamfontein",
    ];
    expect([...APPROVED_LAUNCH_REGIONS]).toEqual(serverList);
  });

  it("uses the same containment rule as the server", () => {
    expect(isApprovedLaunchRegion("Sandton")).toBe(true);
    expect(isApprovedLaunchRegion("Waterfall City, Midrand")).toBe(true);
    expect(isApprovedLaunchRegion("kempton park")).toBe(false);
    expect(isApprovedLaunchRegion("")).toBe(false);
  });

  it("requires the region to be its own word, not a substring (security round 2)", () => {
    // The old `includes` rule matched these as launch regions.
    expect(isApprovedLaunchRegion("notmidrand")).toBe(false);
    expect(isApprovedLaunchRegion("sandtonville")).toBe(false);
    expect(isApprovedLaunchRegion("fourwaysx")).toBe(false);
    // A region still counts with punctuation and street-number context around it.
    expect(isApprovedLaunchRegion("12 Hyde Park Blvd, Hyde Park")).toBe(true);
    expect(isApprovedLaunchRegion("Sandton, Johannesburg")).toBe(true);
    expect(isApprovedLaunchRegion("BRAAMFONTEIN PRECINCT")).toBe(true);
  });

  it("labels are title-cased for display", () => {
    const labels = approvedLaunchRegionLabels();
    expect(labels).toContain("Hyde Park");
    expect(labels).toContain("Midrand");
  });
});
