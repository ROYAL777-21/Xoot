import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ZooterCard, Zooter } from "@/components/zoot/ZooterCard";
import { Heart, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Favorites = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<Zooter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("favorites").select("zooter_id, zooters(*)").eq("user_id", user.id)
      .then(({ data }) => {
        setList(((data ?? []).map((r: any) => r.zooters).filter(Boolean)) as Zooter[]);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="container py-8 lg:py-12 max-w-7xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-3">
          <Heart className="h-3 w-3 fill-primary text-primary" />
          <span className="text-xs font-medium text-primary">Your trusted team</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold">My Zooters</h1>
        <p className="text-muted-foreground mt-2">Re-book the people you trust. Same Zooter, every time.</p>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border p-12 text-center">
          <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display text-xl font-bold mb-2">No favorites yet</h3>
          <p className="text-muted-foreground mb-4">Tap the heart on any Zooter to save them here.</p>
          <Button onClick={() => navigate("/app")} className="rounded-full">Browse Zooters</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {list.map((z) => <ZooterCard key={z.id} z={z} onBook={() => navigate("/app")} />)}
        </div>
      )}
    </div>
  );
};

export default Favorites;