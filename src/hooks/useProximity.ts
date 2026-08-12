import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSuburbCentroids } from "@/hooks/useSuburbCentroids";
import type { ProximityContext } from "@/lib/trust";

/**
 * Everything `sortXootersForMarketplace` needs to rank by nearness, in one call.
 *
 * ── Why a combined hook ─────────────────────────────────────────────────────────
 * Ranking needs two things that come from two places: the centroid table (public reference data)
 * and the customer's address (private, per-user). Every screen that wants proximity needs both, so
 * asking each one to assemble them means three chances to assemble them differently — and the one
 * that forgets an argument degrades silently to the old ordering, which looks identical.
 *
 * ── The address, and why it is the SAVED default ────────────────────────────────
 * `saved_addresses.is_default`, falling back to the most recently added. Not the browser's
 * geolocation: that is a permission prompt on page load, it is precise location data Xoot has no
 * reason to hold, and it answers a different question — where the person is standing, not where
 * the clean happens. Someone browsing Xooters from the office still wants Xooters near home.
 *
 * ── What "no address" means ─────────────────────────────────────────────────────
 * Signed-out visitors have none, and plenty of signed-in users have not saved one. Both get
 * `{ address: null }`, which `sortXootersForMarketplace` treats as "rank the way we always did".
 * Never as "no Xooters available" — a marketplace that empties itself because it does not know
 * where you live is worse than one that guesses at the order.
 */
export const useProximity = (): ProximityContext & { loaded: boolean } => {
  const { user } = useAuth();
  const { centroids, loaded: centroidsLoaded } = useSuburbCentroids();
  const [address, setAddress] = useState<string | null>(null);
  const [addressLoaded, setAddressLoaded] = useState(false);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setAddress(null);
      setAddressLoaded(true);
      return;
    }

    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("saved_addresses")
        .select("address,is_default,created_at")
        .eq("user_id", user.id)
        // Default first, then newest. Two orderings rather than one so a user with several
        // addresses and no default still gets a deterministic answer instead of whichever row
        // Postgres happened to return.
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);

      if (!active) return;
      if (error) {
        // Warned, not swallowed. Ranking silently reverting to quality-only is invisible on
        // screen, and an invisible degradation is how the fake `distance_mi` lived for months.
        console.warn("saved address unavailable; ranking by quality only", error);
      }
      setAddress((data?.[0]?.address as string | undefined) ?? null);
      setAddressLoaded(true);
    })();

    return () => {
      active = false;
    };
  }, [user]);

  return { address, centroids, loaded: centroidsLoaded && addressLoaded };
};
