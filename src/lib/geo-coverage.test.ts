import { describe, expect, it } from "vitest";
import {
  checkApprovedCoverage, parseCoverageGeometry,
  pointInsideCoverageGeometry, validLngLat,
} from "../../supabase/functions/_shared/geo-coverage";

const outsideRing = [
  [28.0, -26.2], [28.2, -26.2], [28.2, -26.0], [28.0, -26.0], [28.0, -26.2],
];
const insideHole = [
  [28.07, -26.13], [28.12, -26.13], [28.12, -26.08], [28.07, -26.08], [28.07, -26.13],
];
const zone = (geometry: unknown, overrides = {}) => ({
  id: "synthetic-reviewed-zone", name: "Synthetic test zone",
  geometry, active: true, approved_at: "2026-10-01T00:00:00Z",
  service_types: ["regular", "airbnb"],
  ...overrides,
});

describe("privacy-safe verified Mapbox service coverage geometry", () => {
  it("accepts only genuine longitude/latitude positions", () => {
    expect(validLngLat([28.08, -26.12])).toBe(true);
    expect(validLngLat([-26.12, 28.08])).toBe(true); // Both geometrically valid; caller must label coordinate order.
    for (const point of [
      [180.1, 0], [0, -90.01], [NaN, 1], ["28.08", -26.12],
      [28.08], [], null, [28, -26, 99], [Infinity, 0],
    ]) expect(validLngLat(point)).toBe(false);
  });

  it("does not trust malformed or unclosed polygon geometry", () => {
    for (const geometry of [
      null, {}, { type: "Feature", geometry: { type: "Polygon", coordinates: [outsideRing] } },
      { type: "Polygon", coordinates: [[...outsideRing.slice(0, 4)]] },
      { type: "Polygon", coordinates: [[...outsideRing.slice(0, 3), outsideRing[0]]] },
      { type: "Polygon", coordinates: [[[1, 1], [2, 2], [3, 3], [1, 1]]] },
      { type: "Polygon", coordinates: [] },
      { type: "MultiPolygon", coordinates: [] },
    ]) expect(parseCoverageGeometry(geometry)).toBeNull();
  });

  it("uses a closed outer boundary and excludes an interior hole", () => {
    const polygon = parseCoverageGeometry({ type: "Polygon", coordinates: [outsideRing, insideHole] });
    expect(polygon).not.toBeNull();
    expect(pointInsideCoverageGeometry([28.04, -26.10], polygon!)).toBe(true);
    expect(pointInsideCoverageGeometry([28.09, -26.11], polygon!)).toBe(false);
    expect(pointInsideCoverageGeometry([28.07, -26.11], polygon!)).toBe(false);
    expect(pointInsideCoverageGeometry([28.3, -26.11], polygon!)).toBe(false);
    expect(pointInsideCoverageGeometry([28.0, -26.11], polygon!)).toBe(true);
  });

  it("supports disjoint approved MultiPolygon areas", () => {
    const second = [
      [28.3, -26.3], [28.4, -26.3], [28.4, -26.2], [28.3, -26.2], [28.3, -26.3],
    ];
    const geometry = parseCoverageGeometry({ type: "MultiPolygon", coordinates: [[outsideRing], [second]] });
    expect(geometry).not.toBeNull();
    expect(pointInsideCoverageGeometry([28.05, -26.1], geometry!)).toBe(true);
    expect(pointInsideCoverageGeometry([28.35, -26.25], geometry!)).toBe(true);
    expect(pointInsideCoverageGeometry([28.25, -26.25], geometry!)).toBe(false);
  });

  it("will not claim service availability from bare suburb names, missing polygons or unapproved zones", () => {
    const shape = { type: "Polygon", coordinates: [outsideRing] };
    expect(checkApprovedCoverage([28.1, -26.1], "regular", [])).toEqual({
      state: "review", reason: "no_approved_zone",
    });
    expect(checkApprovedCoverage([28.1, -26.1], "regular", [zone(shape, { active: false })])).toEqual({
      state: "review", reason: "no_approved_zone",
    });
    expect(checkApprovedCoverage([28.1, -26.1], "regular", [zone(shape, { approved_at: null })])).toEqual({
      state: "review", reason: "no_approved_zone",
    });
    expect(checkApprovedCoverage([28.1, -26.1], "moving", [zone(shape)])).toEqual({
      state: "review", reason: "no_approved_zone",
    });
    expect(checkApprovedCoverage([28.4, -26.1], "regular", [zone(shape)])).toEqual({
      state: "review", reason: "outside_approved_zones",
    });
    expect(checkApprovedCoverage([28.1, -26.1], "regular", [zone(shape, { geometry: {} })])).toEqual({
      state: "review", reason: "invalid_zone",
    });
  });

  it("marks a point available ONLY within an active, approved, service-matching zone", () => {
    const outcome = checkApprovedCoverage([28.05, -26.1], "regular",
      [zone({ type: "Polygon", coordinates: [outsideRing] })]);
    expect(outcome).toEqual({
      state: "available", zoneId: "synthetic-reviewed-zone", zoneName: "Synthetic test zone",
    });
  });
});
