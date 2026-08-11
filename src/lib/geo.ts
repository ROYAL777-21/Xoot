/**
 * How far a Xooter has to travel to a job, at suburb resolution.
 *
 * ── Why suburbs and not addresses ───────────────────────────────────────────────
 * A booking address is where someone lives. Geocoding it to exact coordinates and storing them
 * would give slightly better ordering and a much worse privacy position: under POPIA that is
 * precise location data about a person's home, held for the convenience of a sort order.
 *
 * A suburb centroid is a public fact about a place, not a fact about a person. "Sandton is 6 km
 * from Rosebank" is true whoever lives there, and it is enough to answer the only question this
 * needs to answer — is this Xooter close enough that the trip is worth their time.
 *
 * ── What this replaces ─────────────────────────────────────────────────────────
 * `zooters.distance_mi` is a **static seeded column**. `ai-match` scored on it, so a Xooter was
 * "3 km away" from every customer in the country, and `XooterCard` rendered that number to people
 * as if it meant something. Nothing computed a distance from anywhere to anywhere.
 *
 * Mirrored in `supabase/functions/_shared/geo.ts` and pinned by `geo-parity.test.ts`. This decides
 * which Xooter is offered a job, so it earns the same protection as the pricing code.
 */

export type SuburbCentroid = {
  suburb: string;
  region: string;
  latitude: number;
  longitude: number;
};

/** Mean Earth radius in kilometres. */
const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Great-circle distance between two points, in kilometres.
 *
 * Haversine rather than a flat-earth approximation. Over Johannesburg the difference is under a
 * hundred metres and either would do — but the formula that is correct everywhere costs the same
 * to write and does not need revisiting when Xoot opens in Cape Town.
 */
export function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

const normalise = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Find which known suburb an address is in.
 *
 * Substring matching against the centroid list, longest name first — so "hyde park" wins over
 * "park" and an address in "Parkhurst" is not read as "Park". Ordering by length is the whole
 * defence against that class of mistake, and it is cheap.
 *
 * Returns null when nothing matches. **A null here must mean "fall back to the old ordering", never
 * "no Xooters available"** — a customer in an unlisted suburb still needs to be able to book.
 */
export function resolveSuburb(address: string, centroids: readonly SuburbCentroid[]): SuburbCentroid | null {
  if (!address) return null;
  const haystack = normalise(address);
  const byLongestName = [...centroids].sort((a, b) => b.suburb.length - a.suburb.length);
  return byLongestName.find((centroid) => haystack.includes(normalise(centroid.suburb))) ?? null;
}

/**
 * How far a Xooter covering these suburbs is from this address, in km.
 *
 * The **nearest** covered suburb wins, not the first or an average: a Xooter who covers both
 * Sandton and Midrand is, for a Sandton job, a Sandton Xooter. Averaging would penalise someone
 * for covering more ground, which is exactly backwards — wider coverage is worth more to the
 * marketplace, not less.
 *
 * Returns null when either side cannot be resolved, which callers must treat as "unknown", not
 * "far".
 */
export function distanceKmToCoverage(
  address: string,
  coverage: readonly string[] | null | undefined,
  centroids: readonly SuburbCentroid[],
): number | null {
  const origin = resolveSuburb(address, centroids);
  if (!origin || !coverage?.length) return null;

  const distances = coverage
    .map((name) => centroids.find((centroid) => normalise(centroid.suburb) === normalise(name)))
    .filter((centroid): centroid is SuburbCentroid => Boolean(centroid))
    .map((centroid) => haversineKm(origin, centroid));

  return distances.length ? Math.min(...distances) : null;
}

/**
 * Beyond this, a job is not worth offering.
 *
 * 25 km across Johannesburg is roughly a 35–45 minute drive in traffic. A Xooter earning R192 on a
 * standard clean will not take that trip twice a day, so ranking them last is a slower way of
 * saying no — the candidate is excluded instead, and the customer is shown people who will
 * actually come.
 */
export const MAX_TRAVEL_KM = 25;

/** Distance for a person to read: `6.2` → `"6 km"`, `0.8` → `"under 1 km"`. */
export const formatDistanceKm = (km: number | null): string | null => {
  if (km === null || !Number.isFinite(km)) return null;
  if (km < 1) return "under 1 km";
  return `${Math.round(km)} km`;
};
