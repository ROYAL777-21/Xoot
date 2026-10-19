/**
 * Server-side, fail-closed point-in-approved-zone checker.
 * Never trust a client-supplied coordinate or a substring-matched suburb as geofencing.
 * GeoJSON coordinates are [longitude,latitude]. Approved boundaries must be owner-signed.
 */
type Point = readonly [number, number];
type Ring = Point[];
type Polygon = Ring[];
type Geometry = { type: "Polygon"; coordinates: Polygon } |
  { type: "MultiPolygon"; coordinates: Polygon[] };

export type CoverageZone = {
  id: string;
  name: string;
  geometry: unknown;
  active: boolean;
  approved_at: string | null;
  service_types: string[];
};

export type CoverageResult = { state: "available"; zoneId: string; zoneName: string } |
  { state: "review"; reason: "no_approved_zone" | "outside_approved_zones" | "invalid_zone" | "invalid_position" };

export function validLngLat(value: unknown): value is Point {
  return Array.isArray(value) && value.length === 2 &&
    typeof value[0] === "number" && typeof value[1] === "number" &&
    Number.isFinite(value[0]) && Number.isFinite(value[1]) &&
    value[0] >= -180 && value[0] <= 180 && value[1] >= -90 && value[1] <= 90;
}

const EPS = 1e-10;
const equal = (a: Point, b: Point) => Math.abs(a[0] - b[0]) < EPS && Math.abs(a[1] - b[1]) < EPS;

function validRing(value: unknown): value is Ring {
  if (!Array.isArray(value) || value.length < 4 || value.length > 1000 ||
    !value.every(validLngLat) || !equal(value[0], value[value.length - 1])) return false;
  let signedDoubleArea = 0;
  for (let i = 0; i < value.length - 1; i++) {
    signedDoubleArea += value[i][0] * value[i + 1][1] - value[i + 1][0] * value[i][1];
  }
  return Number.isFinite(signedDoubleArea) && Math.abs(signedDoubleArea) > EPS;
}

function validPolygon(value: unknown): value is Polygon {
  return Array.isArray(value) && value.length > 0 && value.length <= 20 &&
    value.every(validRing) && value.reduce((n, ring) => n + ring.length, 0) <= 4000;
}

export function parseCoverageGeometry(value: unknown): Geometry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.type === "Polygon" && validPolygon(candidate.coordinates)) {
    return { type: "Polygon", coordinates: candidate.coordinates };
  }
  if (candidate.type === "MultiPolygon" && Array.isArray(candidate.coordinates) &&
    candidate.coordinates.length > 0 && candidate.coordinates.length <= 20 &&
    candidate.coordinates.every(validPolygon) &&
    candidate.coordinates.reduce((n, polygon) =>
      n + polygon.reduce((m, ring) => m + ring.length, 0), 0) <= 4000) {
    return { type: "MultiPolygon", coordinates: candidate.coordinates };
  }
  return null;
}

function onSegment(point: Point, a: Point, b: Point): boolean {
  const cross = (point[0] - a[0]) * (b[1] - a[1]) - (point[1] - a[1]) * (b[0] - a[0]);
  if (Math.abs(cross) > EPS) return false;
  return point[0] >= Math.min(a[0], b[0]) - EPS &&
    point[0] <= Math.max(a[0], b[0]) + EPS &&
    point[1] >= Math.min(a[1], b[1]) - EPS &&
    point[1] <= Math.max(a[1], b[1]) + EPS;
}

function pointInRing(point: Point, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length - 1; j = i++) {
    const a = ring[j], b = ring[i];
    if (onSegment(point, a, b)) return true;
    const crossing = (a[1] > point[1]) !== (b[1] > point[1]) &&
      point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0];
    if (crossing) inside = !inside;
  }
  return inside;
}

export function pointInsideCoverageGeometry(point: Point, geometry: Geometry): boolean {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(rings => pointInRing(point, rings[0]) &&
    !rings.slice(1).some(hole => pointInRing(point, hole)));
}

export function checkApprovedCoverage(point: unknown, service: string, zones: unknown): CoverageResult {
  if (!validLngLat(point)) return { state: "review", reason: "invalid_position" };
  if (!Array.isArray(zones) || zones.length > 100) return { state: "review", reason: "invalid_zone" };
  const matching = zones.filter(zone => zone && typeof zone === "object" &&
    zone.active === true && typeof zone.approved_at === "string" &&
    Number.isFinite(Date.parse(zone.approved_at)) && Date.parse(zone.approved_at) <= Date.now() &&
    Array.isArray(zone.service_types) && zone.service_types.includes(service));
  if (!matching.length) return { state: "review", reason: "no_approved_zone" };
  for (const record of matching) {
    if (typeof record.id !== "string" || typeof record.name !== "string" ||
      record.name.length > 80) return { state: "review", reason: "invalid_zone" };
    const shape = parseCoverageGeometry(record.geometry);
    if (!shape) return { state: "review", reason: "invalid_zone" };
    if (pointInsideCoverageGeometry(point, shape)) {
      return { state: "available", zoneId: record.id, zoneName: record.name };
    }
  }
  return { state: "review", reason: "outside_approved_zones" };
}
