/** One-off, opt-in Mapbox road travel estimate. No saved GPS or route geometry. */
export type MapboxCoordinate = { longitude: number; latitude: number };

export function validMapboxCoordinate(point: MapboxCoordinate): boolean {
  return Number.isFinite(point.longitude) && Number.isFinite(point.latitude) &&
    Math.abs(point.longitude) <= 180 && Math.abs(point.latitude) <= 90;
}

export function mapboxRoutingDestinationUrl(address: string, token: string): string | null {
  const q = address.trim().replace(/\s+/g, " ");
  if (!token.startsWith("pk.") || q.length < 4 || q.length > 256 || q.split(" ").length > 20 || /[;\n\r]/.test(q)) return null;
  const params = new URLSearchParams({ q, country: "za", language: "en", limit: "1",
    autocomplete: "false", permanent: "false", access_token: token });
  return "https://api.mapbox.com/search/geocode/v6/forward?" + params.toString();
}

export function readTemporaryDestination(body: unknown): MapboxCoordinate | null {
  if (!body || typeof body !== "object" || !("features" in body) || !Array.isArray(body.features)) return null;
  const first = body.features[0] as Record<string, unknown> | undefined;
  const props = first?.properties as Record<string, unknown> | undefined;
  const country = (props?.context as { country?: { country_code?: unknown } } | undefined)?.country?.country_code;
  const geometry = first?.geometry as { coordinates?: unknown } | undefined;
  const coordinates = geometry?.coordinates;
  if (typeof country !== "string" || country.toUpperCase() !== "ZA" ||
      props?.feature_type !== "address" || !Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const point = { longitude: coordinates[0], latitude: coordinates[1] };
  return validMapboxCoordinate(point) ? point : null;
}

export function mapboxDirectionsUrl(origin: MapboxCoordinate, destination: MapboxCoordinate, token: string): string | null {
  if (!token.startsWith("pk.") || !validMapboxCoordinate(origin) || !validMapboxCoordinate(destination)) return null;
  const params = new URLSearchParams({ geometries: "geojson", overview: "false",
    steps: "false", access_token: token });
  const route = [origin, destination].map(p => `${p.longitude.toFixed(6)},${p.latitude.toFixed(6)}`).join(";");
  return `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${route}?${params}`;
}

export function parseMapboxRoadEstimate(body: unknown): { minutes: number; kilometres: number } | null {
  if (!body || typeof body !== "object" || !("code" in body) || body.code !== "Ok" ||
      !("routes" in body) || !Array.isArray(body.routes)) return null;
  const first = body.routes[0] as Record<string, unknown> | undefined;
  if (!first || typeof first.duration !== "number" || typeof first.distance !== "number" ||
      !Number.isFinite(first.duration) || !Number.isFinite(first.distance) ||
      first.duration < 0 || first.distance < 0 || first.duration > 86400 || first.distance > 1000000) return null;
  return { minutes: Math.max(1, Math.ceil(first.duration / 60)),
    kilometres: Math.round(first.distance / 100) / 10 };
}
