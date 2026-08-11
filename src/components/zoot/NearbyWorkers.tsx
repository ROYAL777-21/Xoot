import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { Xooter, XooterCard } from "@/components/zoot/XooterCard";
import { sortXootersForMarketplace } from "@/lib/trust";

export const NearbyWorkers = () => {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<Xooter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setWorkers([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase
      .from("zooters_public")
      .select("*")
      .order("rating", { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (!mounted) return;
        setWorkers(sortXootersForMarketplace((data ?? []) as Xooter[]));
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section id="workers" className="py-20 md:py-28 bg-secondary/40 border-y border-border">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-sage-deep uppercase tracking-wider mb-3">Nearby Xooters</p>
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
        ) : workers.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {workers.map((worker) => (
              <XooterCard key={worker.id} z={worker} onBook={() => navigate("/auth", { state: { from: { pathname: "/app" } } })} />
            ))}
          </div>
        ) : (
          <Card className="rounded-3xl p-8 text-center max-w-2xl mx-auto">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft">
              <ShieldCheck className="h-6 w-6 text-sage-deep" />
            </div>
            <h3 className="font-display text-2xl font-bold mb-2">{isSupabaseConfigured ? "No live Xooters yet" : "Live Xooter roster needs Supabase"}</h3>
            <p className="text-sm text-muted-foreground">
              {isSupabaseConfigured
                ? "Contractor profiles will appear only after admin-reviewed verification, training, and activation."
                : "Public preview is running without live backend config, so verified Xooter profiles are intentionally not shown here."}
            </p>
          </Card>
        )}
      </div>
    </section>
  );
};
