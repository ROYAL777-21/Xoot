import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_TRAVEL_KM,
  distanceKmToCoverage,
  formatDistanceKm,
  haversineKm,
  resolveSuburb,
  type SuburbCentroid,
} from "./geo";

/**
 * The suburb list, parsed out of the migration rather than duplicated.
 *
 * A fixture typed by hand would let the coordinates drift from the ones the database actually
 * holds, and every distance below would then be asserting something no user experiences.
 */
const CENTROIDS: SuburbCentroid[] = (() => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260812090000_suburb_centroids.sql"), "utf8");
  return [...sql.matchAll(/\('([a-z ]+)',\s*'([a-z ]+)',\s*(-?[\d.]+),\s*(-?[\d.]+)\)/g)].map((m) => ({
    suburb: m[1],
    region: m[2],
    latitude: Number(m[3]),
    longitude: Number(m[4]),
  }));
})();

describe("the suburb list", () => {
  it("parses every seeded suburb out of the migration", () => {
    // Guards the parser. If the regex stopped matching, every assertion below would pass
    // vacuously against an empty list — the failure mode of a test that reads its own fixture.
    expect(CENTROIDS.length).toBeGreaterThanOrEqual(26);
    expect(CENTROIDS.map((c) => c.suburb)).toContain("sandton");
    expect(CENTROIDS.map((c) => c.suburb)).toContain("bedfordview");
  });

  it("covers all twelve approved launch regions", () => {
    // A launch region with no centroid is a region where matching silently falls back to
    // unranked — live, and invisible, because the fallback is by design.
    const approved = [
      "midrand", "sandton", "bryanston", "bedfordview", "rosebank", "parkhurst",
      "melville", "fourways", "waterfall", "dainfern", "hyde park", "braamfontein",
    ];
    const suburbs = new Set(CENTROIDS.map((c) => c.suburb));
    for (const region of approved) {
      expect(suburbs.has(region), `no centroid for launch region "${region}"`).toBe(true);
    }
  });

  it("puts every suburb in Johannesburg, not in the sea", () => {
    // A transposed sign or swapped lat/lng lands a suburb in the Atlantic and quietly makes every
    // distance from it enormous — which reads as "no Xooters nearby" rather than as an error.
    for (const c of CENTROIDS) {
      expect(c.latitude, `${c.suburb} latitude`).toBeGreaterThan(-27);
      expect(c.latitude, `${c.suburb} latitude`).toBeLessThan(-25);
      expect(c.longitude, `${c.suburb} longitude`).toBeGreaterThan(27);
      expect(c.longitude, `${c.suburb} longitude`).toBeLessThan(29);
    }
  });
});

describe("distance", () => {
  const at = (suburb: string) => CENTROIDS.find((c) => c.suburb === suburb)!;

  it("matches real-world distances between known suburbs", () => {
    // Sanity ranges, not exact figures: the point is that the arithmetic produces distances a
    // Johannesburg person would recognise, and would fail loudly if the formula were wrong.
    const sandtonToRosebank = haversineKm(at("sandton"), at("rosebank"));
    expect(sandtonToRosebank).toBeGreaterThan(3);
    expect(sandtonToRosebank).toBeLessThan(6);

    const sandtonToBedfordview = haversineKm(at("sandton"), at("bedfordview"));
    expect(sandtonToBedfordview).toBeGreaterThan(9);
    expect(sandtonToBedfordview).toBeLessThan(16);

    // Furthest realistic pair in the list, and it must still be inside the offer radius or the
    // launch area cannot serve itself.
    const dainfernToGermiston = haversineKm(at("dainfern"), at("germiston"));
    expect(dainfernToGermiston).toBeGreaterThan(25);
  });

  it("is zero to itself and symmetric", () => {
    expect(haversineKm(at("sandton"), at("sandton"))).toBe(0);
    expect(haversineKm(at("sandton"), at("melville"))).toBeCloseTo(
      haversineKm(at("melville"), at("sandton")),
      9,
    );
  });
});

describe("resolving an address to a suburb", () => {
  it("finds the suburb in a written address", () => {
    expect(resolveSuburb("12 Rivonia Road, Sandton, 2196", CENTROIDS)?.suburb).toBe("sandton");
    expect(resolveSuburb("4 Oxford Rd, Rosebank", CENTROIDS)?.suburb).toBe("rosebank");
  });

  it("prefers the longest matching name", () => {
    // "hyde park" contains "park"; "parkhurst" contains "park". Matching the shortest name first
    // would put a Hyde Park booking in Parkhurst — a real 3 km error from a substring.
    expect(resolveSuburb("1 Second Road, Hyde Park", CENTROIDS)?.suburb).toBe("hyde park");
    expect(resolveSuburb("9 Fourth Ave, Parkhurst", CENTROIDS)?.suburb).toBe("parkhurst");
    expect(resolveSuburb("Parktown North", CENTROIDS)?.suburb).toBe("parktown");
  });

  it("is not confused by case or spacing", () => {
    expect(resolveSuburb("  HYDE   PARK  ", CENTROIDS)?.suburb).toBe("hyde park");
  });

  it("returns null rather than guessing", () => {
    // Null must mean "rank them the old way", never "nobody is available". A customer in an
    // unlisted suburb still has to be able to book.
    expect(resolveSuburb("Cape Town", CENTROIDS)).toBeNull();
    expect(resolveSuburb("", CENTROIDS)).toBeNull();
  });
});

describe("distance to a Xooter's coverage", () => {
  it("uses the nearest covered suburb, not the first or an average", () => {
    // A Xooter covering Sandton and Midrand is, for a Sandton job, a Sandton Xooter. Averaging
    // would penalise them for covering more ground, which is backwards — wider coverage is worth
    // more to the marketplace, not less.
    const wide = distanceKmToCoverage("Sandton", ["midrand", "sandton"], CENTROIDS);
    const narrow = distanceKmToCoverage("Sandton", ["sandton"], CENTROIDS);
    expect(wide).toBe(narrow);
    expect(wide).toBe(0);

    // Order must not matter.
    expect(distanceKmToCoverage("Sandton", ["sandton", "midrand"], CENTROIDS)).toBe(wide);
  });

  it("returns null when either side is unknown", () => {
    // Callers must read null as "unknown", never as "far" — the difference decides whether an
    // unlisted suburb gets no Xooters or gets the old ordering.
    expect(distanceKmToCoverage("Cape Town", ["sandton"], CENTROIDS)).toBeNull();
    expect(distanceKmToCoverage("Sandton", [], CENTROIDS)).toBeNull();
    expect(distanceKmToCoverage("Sandton", null, CENTROIDS)).toBeNull();
    expect(distanceKmToCoverage("Sandton", ["atlantis"], CENTROIDS)).toBeNull();
  });

  it("gives a real distance for a genuinely nearby Xooter", () => {
    const km = distanceKmToCoverage("Rosebank", ["sandton"], CENTROIDS);
    expect(km).toBeGreaterThan(3);
    expect(km).toBeLessThan(6);
  });
});

describe("the offer radius", () => {
  it("is far enough to serve the launch area", () => {
    // If the radius were tighter than the area Xoot advertises, bookings in served suburbs would
    // find nobody — the feature would read as "no Xooters" rather than "radius too small".
    expect(MAX_TRAVEL_KM).toBeGreaterThanOrEqual(20);
    expect(MAX_TRAVEL_KM).toBeLessThanOrEqual(40);
  });
});

describe("formatting for a person", () => {
  it("rounds to whole kilometres and never says 0 km", () => {
    // "0 km away" reads as broken. "under 1 km" reads as very close, which is what it means.
    expect(formatDistanceKm(6.2)).toBe("6 km");
    expect(formatDistanceKm(0.8)).toBe("under 1 km");
    expect(formatDistanceKm(0)).toBe("under 1 km");
    expect(formatDistanceKm(null)).toBeNull();
    expect(formatDistanceKm(Number.NaN)).toBeNull();
  });
});
