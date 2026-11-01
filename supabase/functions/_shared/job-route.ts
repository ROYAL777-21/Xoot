/** Stateless routing contract for an authenticated, actively shared Xoot job.
 * Caller must verify the booking/JWT/approved Xooter BEFORE using these helpers.
 * Service-zone geometry is intentionally not involved: an accepted journey
 * must continue when either participant crosses the booking coverage boundary.
 */
export type JobRouteCoordinate = { latitude: number; longitude: number };
export type FreshStoredJobFix = JobRouteCoordinate & { recordedAt: string };

export function validJobRouteCoordinate(point: JobRouteCoordinate): boolean {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
}

export function readFreshStoredJobFix(
  value: unknown, assignedXooterId: string, now = Date.now(),
): FreshStoredJobFix | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const latitude = Number(row.latitude), longitude = Number(row.longitude);
  const accuracy = Number(row.accuracy_m);
  const captured = typeof row.recorded_at === "string" ? Date.parse(row.recorded_at) : NaN;
  const expires = typeof row.expires_at === "string" ? Date.parse(row.expires_at) : NaN;
  if (row.xooter_id !== assignedXooterId || !validJobRouteCoordinate({ latitude, longitude }) ||
      !Number.isFinite(accuracy) || accuracy <= 0 || accuracy > 200 ||
      !Number.isFinite(captured) || !Number.isFinite(expires) ||
      captured > now + 30_000 || now - captured > 60_000 ||
      expires <= now || expires > captured + 90_000) return null;
  return { latitude, longitude, recordedAt: row.recorded_at as string };
}

const validToken = (value: string) => /^(?:pk|sk)\.[A-Za-z0-9._-]+$/.test(value);
export function permanentFreeGeocodeUrl(address: unknown, token: string): string | null {
  if (typeof address !== "string" || !validToken(token)) return null;
  const q = address.trim().replace(/\s+/g, " ");
  if (q.length < 4 || q.length > 256 || q.split(" ").length > 20 || /[;\n\r]/.test(q)) return null;
  const search = new URLSearchParams({
    q, country: "za", language: "en", types: "address", autocomplete: "false", permanent: "false",
    limit: "1", access_token: token,
  });
  return "https://api.mapbox.com/search/geocode/v6/forward?" + search.toString();
}

export function parseSouthAfricanDestination(data: unknown): JobRouteCoordinate | null {
  if (!data || typeof data !== "object" || !("features" in data) ||
      !Array.isArray(data.features)) return null;
  const feature = data.features[0] as Record<string, unknown> | undefined;
  const properties = feature?.properties as Record<string, unknown> | undefined;
  const context = properties?.context as { country?: { country_code?: unknown } } | undefined;
  const coords = (feature?.geometry as { coordinates?: unknown } | undefined)?.coordinates;
  if (context?.country?.country_code?.toString().toUpperCase() !== "ZA" ||
      properties?.feature_type !== "address" ||
      !Array.isArray(coords) || coords.length !== 2 ||
      typeof coords[0] !== "number" || typeof coords[1] !== "number") return null;
  const point = { longitude: coords[0], latitude: coords[1] };
  return validJobRouteCoordinate(point) ? point : null;
}

export function serverDirectionsUrl(
  origin: JobRouteCoordinate, destination: JobRouteCoordinate, token: string,
): string | null {
  if (!validToken(token) || !validJobRouteCoordinate(origin) ||
      !validJobRouteCoordinate(destination)) return null;
  const pairs = [origin, destination].map(
    p => `${p.longitude.toFixed(6)},${p.latitude.toFixed(6)}`,
  ).join(";");
  const search = new URLSearchParams({
    geometries: "geojson", overview: "false", steps: "false", access_token: token,
  });
  return `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${pairs}?${search}`;
}

export function parseServerRoute(data: unknown): { minutes: number; kilometres: number } | null {
  if (!data || typeof data !== "object" || !("code" in data) ||
      data.code !== "Ok" || !("routes" in data) || !Array.isArray(data.routes)) return null;
  const route = data.routes[0] as { duration?: unknown; distance?: unknown } | undefined;
  if (typeof route?.duration !== "number" || typeof route.distance !== "number" ||
      !Number.isFinite(route.duration) || !Number.isFinite(route.distance) ||
      route.duration < 0 || route.duration > 86400 || route.distance < 0 || route.distance > 1_000_000)
    return null;
  return {
    minutes: Math.max(1, Math.ceil(route.duration / 60)),
    kilometres: Math.round(route.distance / 100) / 10,
  };
}
