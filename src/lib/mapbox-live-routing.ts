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

/** Customer consent must be explicitly collected by the caller before invoking this. */
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
