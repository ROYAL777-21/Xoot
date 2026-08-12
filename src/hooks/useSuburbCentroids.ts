import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import type { SuburbCentroid } from "@/lib/geo";

/**
 * The suburb centroid table, fetched once per page load.
 *
 * ── Why the client may read this directly ───────────────────────────────────────
 * `20260812090000_suburb_centroids.sql` grants `select` to `anon` and `authenticated` on purpose.
 * A suburb centroid is a public fact about a place — "Rosebank is at -26.14, 28.04" is true
 * whoever lives there — so there is nothing here to protect, and making the client ask an Edge
 * Function for a list of 26 fixed coordinates would add a round trip to every screen that wants to
 * rank by nearness.
 *
 * That is the whole reason proximity can work outside `ai-match`. The homepage's "Nearby Xooters"
 * section renders for signed-out visitors and cannot invoke an authenticated function; with the
 * centroids readable it can rank locally, using the same `distanceKmToCoverage` the matcher uses.
 *
 * ── What is NOT here, and must not be ───────────────────────────────────────────
 * Any address. The centroids are one coordinate per suburb, never per home. The address side of
 * the calculation stays on the device that already has it — this hook supplies the map, not the
 * pin.
 *
 * ── Module-level cache, same shape as `useConciergeConfig` ──────────────────────
 * Several components want this and they mount independently. One promise, shared: the table is
 * fixed reference data, so refetching it per component would be pure waste.
 */

/** One in-flight or settled fetch, shared by every consumer. */
let cached: Promise<SuburbCentroid[]> | null = null;

const load = (): Promise<SuburbCentroid[]> => {
  if (cached) return cached;
  cached = (async () => {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from("suburb_centroids")
        .select("suburb,region,latitude,longitude");
      if (error) throw error;
      return (data ?? []).map((row) => ({
        suburb: String(row.suburb),
        region: String(row.region),
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
      }));
    } catch (err) {
      /*
       * An empty list, warned about rather than swallowed.
       *
       * Empty is the correct degraded value: every consumer treats "no centroids" the same way it
       * treats "address unknown" — fall back to quality ordering. Nobody is shown a wrong distance
       * and nobody is excluded from a list.
       *
       * But it must be visible. A distance-ranking feature that silently stops ranking looks
       * exactly like one that is working, which is how the fake `distance_mi` survived as long as
       * it did.
       */
      console.warn("suburb centroids unavailable; ranking by quality only", err);
      return [];
    }
  })();
  return cached;
};

/** Test seam. Not for production code — resets the module-level cache. */
export const __resetSuburbCentroidsCache = () => {
  cached = null;
};

export const useSuburbCentroids = () => {
  const [centroids, setCentroids] = useState<SuburbCentroid[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    load().then((value) => {
      if (!active) return;
      setCentroids(value);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return { centroids, loaded };
};
