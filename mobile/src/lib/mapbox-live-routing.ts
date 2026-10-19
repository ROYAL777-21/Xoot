// Exact native mirror of src/lib/mapbox-live-routing.ts; parity enforced by mapbox-live-routing.test.ts.
import {
  mapboxDirectionsUrl, mapboxRoutingDestinationUrl, parseMapboxRoadEstimate,
  readTemporaryDestination, validMapboxCoordinate, type MapboxCoordinate,
} from "./mapbox-directions";

/** Optional, request-time road estimate. Neither the destination nor the route is stored. */
export type LiveRoadEstimate = {
  minutes: number;
  kilometres: number;
  calculatedAt: string;
  fixRecordedAt: string;
};

/** Parse only a current, authenticated server ETA; never accept a client estimate. */
export function readPrivateRoadEstimate(payload: unknown, now = Date.now()): LiveRoadEstimate | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const envelope = payload as { success?: unknown; data?: unknown };
  if (envelope.success !== true || !envelope.data || typeof envelope.data !== "object" ||
      Array.isArray(envelope.data)) return null;
  const result = envelope.data as Record<string, unknown>;
  if (result.state !== "current" || !Number.isInteger(result.minutes) ||
      (result.minutes as number) < 1 || (result.minutes as number) > 1440 ||
      typeof result.kilometres !== "number" || !Number.isFinite(result.kilometres) ||
      result.kilometres < 0 || result.kilometres > 1000 ||
      typeof result.calculatedAt !== "string" || typeof result.fixRecordedAt !== "string") return null;
  const calculated = Date.parse(result.calculatedAt), captured = Date.parse(result.fixRecordedAt);
  if (!Number.isFinite(calculated) || !Number.isFinite(captured) ||
      calculated > now + 30_000 || now - calculated >= 60_000 ||
      captured > now + 30_000 || now - captured >= 60_000) return null;
  return {
    minutes: result.minutes as number, kilometres: result.kilometres,
    calculatedAt: result.calculatedAt, fixRecordedAt: result.fixRecordedAt,
  };
}

/** Customer consent must be explicitly collected by the caller before invoking this. */
/** A shareable estimate contains no address, coordinates, customer identity or tracking URL.
 * It expires after a minute; historic route results must never be presented as live.
 */
export function buildSafeTravelUpdate(estimate: LiveRoadEstimate, now = Date.now()): string | null {
  const calculated = Date.parse(estimate.calculatedAt);
  const fixTime = Date.parse(estimate.fixRecordedAt);
  if (!Number.isFinite(calculated) || !Number.isFinite(fixTime) ||
      calculated > now + 30_000 || now - calculated >= 60_000 ||
      fixTime > now + 30_000 || now - fixTime >= 60_000 ||
      !Number.isInteger(estimate.minutes) || estimate.minutes < 1 || estimate.minutes > 1440 ||
      !Number.isFinite(estimate.kilometres) || estimate.kilometres < 0 ||
      estimate.kilometres > 1000) return null;
  const time = new Date(calculated).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
  return `Xoot travel update: estimated driving time about ${estimate.minutes} minutes (${estimate.kilometres} km), calculated at ${time}. Traffic and arrival can change. Booking participants can see the latest status in Xoot.`;
}

export async function requestLiveRoadEstimate(
  origin: MapboxCoordinate,
  destinationAddress: string,
  publicToken: string,
  fixRecordedAt: string,
  signal: AbortSignal,
  now = Date.now(),
): Promise<LiveRoadEstimate | null> {
  const recorded = Date.parse(fixRecordedAt);
  if (!validMapboxCoordinate(origin) || !Number.isFinite(recorded) ||
      now - recorded > 60_000 || recorded > now + 30_000 ||
      signal.aborted) return null;

  const lookup = mapboxRoutingDestinationUrl(destinationAddress, publicToken);
  if (!lookup) return null;
  try {
    const response = await fetch(lookup, { signal, cache: "no-store" });
    if (!response.ok || signal.aborted) return null;
    const destination = readTemporaryDestination(await response.json());
    if (!destination || signal.aborted) return null;
    const route = mapboxDirectionsUrl(origin, destination, publicToken);
    if (!route) return null;
    const roadResponse = await fetch(route, { signal, cache: "no-store" });
    if (!roadResponse.ok || signal.aborted) return null;
    const estimate = parseMapboxRoadEstimate(await roadResponse.json());
    if (!estimate || signal.aborted) return null;
    return { ...estimate, calculatedAt: new Date(now).toISOString(), fixRecordedAt };
  } catch {
    // Provider/network errors are private, fail closed and do not fake timings.
    return null;
  }
}
