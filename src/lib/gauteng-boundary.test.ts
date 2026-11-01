import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkApprovedCoverage, parseCoverageGeometry, pointInsideCoverageGeometry } from "../../supabase/functions/_shared/geo-coverage";

const raw = readFileSync("data/service-zones/gauteng/gauteng.geojson");
const manifest = JSON.parse(readFileSync("data/service-zones/gauteng/provenance.json", "utf8"));
const feature = JSON.parse(raw.toString()).features[0];
const zone = { id: "test-only", name: "Gauteng", geometry: feature.geometry,
  active: true, approved_at: "2026-10-19T00:00:00Z", service_types: ["regular"] };

describe("pinned full-resolution MDB/OCHA Gauteng boundary", () => {
  it("retains the reviewed source checksum, CRS84 identity and every vertex", () => {
    expect(createHash("sha256").update(raw).digest("hex")).toBe(manifest.geojsonSha256);
    expect(feature.properties.adm1_pcode).toBe("ZA7");
    expect(feature.properties.adm1_name).toBe("Gauteng");
    expect(manifest.license).toBe("CC BY 3.0 IGO");
    expect(feature.geometry.coordinates[0]).toHaveLength(5690);
    expect(parseCoverageGeometry(feature.geometry)).not.toBeNull();
  });

  it("covers Johannesburg, Pretoria, Soweto, Vereeniging and the published boundary", () => {
    const geometry = parseCoverageGeometry(feature.geometry)!;
    for (const point of [[28.0473, -26.2041], [28.2293, -25.7479], [27.8585, -26.2485], [27.9319, -26.6731]] as const) {
      expect(pointInsideCoverageGeometry(point, geometry)).toBe(true);
    }
    expect(pointInsideCoverageGeometry(feature.geometry.coordinates[0][0], geometry)).toBe(true);
  });

  it("rejects neighbouring provinces, reversed axes and bounding-box corners", () => {
    const geometry = parseCoverageGeometry(feature.geometry)!;
    for (const point of [[27.2423, -25.6676], [29.2332, -25.8728], [27.4584, -26.7145],
      [31.0218, -29.8587], [18.4241, -33.9249], [-26.2041, 28.0473], [27.16, -25.12]] as const) {
      expect(pointInsideCoverageGeometry(point, geometry)).toBe(false);
    }
  });

  it("keeps geography inactive until actual approval and never asserts worker availability", () => {
    expect(checkApprovedCoverage([28.0473, -26.2041], "regular", [{ ...zone, active: false, approved_at: null }])).toEqual({ state: "review", reason: "no_approved_zone" });
    expect(checkApprovedCoverage([28.0473, -26.2041], "moving", [zone])).toEqual({ state: "review", reason: "no_approved_zone" });
    const result = checkApprovedCoverage([28.0473, -26.2041], "regular", [zone]);
    expect(result.state).toBe("available");
    expect(result).not.toHaveProperty("workerAvailable");
    expect(result).not.toHaveProperty("slotAvailable");
  });

  it("fails closed for excessive total geometry work and corrupted later polygons", () => {
    expect(checkApprovedCoverage([28.0473, -26.2041], "regular", Array(36).fill(zone))).toEqual({ state: "review", reason: "invalid_zone" });
    expect(checkApprovedCoverage([28.0473, -26.2041], "regular", [zone, { ...zone, geometry: {} }])).toEqual({ state: "review", reason: "invalid_zone" });
    const tooLarge = { type: "Polygon", coordinates: [Array(10001).fill([28, -26])] };
    expect(parseCoverageGeometry(tooLarge)).toBeNull();
  });
});
