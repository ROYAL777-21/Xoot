import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { Xooter, XooterCard } from "@/components/xoot/XooterCard";
import { sortXootersForMarketplace, xooterDistanceKm } from "@/lib/trust";
import { useProximity } from "@/hooks/useProximity";

/**
 * The homepage's "Nearby Xooters".
 *
 * ── ⚠️ It did not rank by nearness until 2026-08-12 ─────────────────────────────
 * This section has been headed "Nearby Xooters" since it was written, and it sorted by rating.
 * The suburb-centroid work made real distance available and wired it into `ai-match`, but `ai-match`
 * is only reachable from the booking flow — so the one screen whose heading makes a proximity
 * claim was the one screen not honouring it.
 *
 * Now it ranks with `useProximity`, and the cards show the distance they were sorted by.
 *
 * ── What a signed-out visitor sees ──────────────────────────────────────────────
 * The same list, ordered by quality. They have no saved address, so distance is unknown — and
 * unknown means "fall back", never "far" and never "empty". The alternative is a geolocation
 * prompt on the homepage, which is a permission request for precise location data in exchange for
 * a sort order, and that trade is not worth making.
 */
export const NearbyWorkers = () => {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Xooter[]>([]);
  const [loading, setLoading] = useState(true);
  const proximity = useProximity();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setWorkers([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase
      .from("xooters_public")
      // Deliberately unfiltered by suburb. A candidate is never excluded here — this is a shop
      // window, not a dispatch decision, and `ai-match` is where the 25 km cut-off belongs.
      .select("*")
      .order("rating", { ascending: false })
      // Fetched wider than shown so proximity has something to reorder. Taking the top 4 by rating
      // and then sorting those by distance would rank a set that distance had no say in choosing —
      // the nearest Xooter in the city could be 5th by rating and never appear.
      .limit(24)
      .then(({ data }) => {
        if (!mounted) return;
        setWorkers((data ?? []) as Xooter[]);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Ranked here rather than at fetch time, so the list reorders when the address arrives instead
   * of freezing in whatever order it loaded in. The two are independent requests and either can
   * win the race.
   */
  const ranked = useMemo(
    () => sortXootersForMarketplace(workers, proximity).slice(0, 4),
    [workers, proximity],
  );

  return (
    <section id="workers" className="py-20 md:py-28 bg-secondary/40 border-y border-border">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-brand uppercase tracking-wider mb-3">Nearby Xooters</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">
              Approved Xooters appear here when they are live in your launch area.
            </h2>
          </div>
          <Button asChild variant="outline" className="rounded-full self-start md:self-auto">
            <Link to="/app">View all Xooters</Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : ranked.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ranked.map((worker) => (
              <XooterCard
                key={worker.id}
                z={worker}
                // The number the card shows is the number the list was sorted by. A list ordered on
                // one distance and labelled with another is worse than an unordered one.
                distanceKm={xooterDistanceKm(worker, proximity)}
                onBook={() => navigate("/auth", { state: { from: { pathname: "/app" } } })}
              />
            ))}
          </div>
        ) : (
          <Card className="rounded-3xl p-8 text-center max-w-2xl mx-auto">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft">
              <ShieldCheck className="h-6 w-6 text-accent-ink" />
            </div>
            {/*
              One empty state, not two. This used to branch on whether Supabase was configured
              and tell the visitor which piece of infrastructure was missing — "Live Xooter
              roster needs Supabase", "running without live backend config". That is a note to
              a developer printed on a marketing page.

              What a visitor needs to know is the same either way: nobody is listed yet, and
              why the list is short. The configuration state is ours to worry about.
            */}
            <h3 className="font-display text-2xl font-bold mb-2">Xooter profiles are being verified</h3>
            <p className="text-sm text-muted-foreground">
              Profiles appear here only after ID checks, screening, required training and admin
              activation. We would rather show none than show one we have not checked.
            </p>
          </Card>
        )}
      </div>
    </section>
  );
};
