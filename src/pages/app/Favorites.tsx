import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { XooterCard, Xooter } from "@/components/zoot/XooterCard";
import { Heart, Loader2, Repeat, Star, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

/**
 * `favorite_type` and `repeat_count` are the live column names. This page previously
 * queried `favorite_kind`, `repeat_bookings_count` and `last_booked_at`, which come from
 * `20260508225000_trust_safety_retention.sql` — a migration that was never applied. Only
 * `zooter_id` of the four columns existed, so PostgREST rejected every select and this
 * page showed "No favorites yet" to everyone, including users who had saved Xooters.
 *
 * The failure was invisible because `load()` destructured `data` and dropped `error`.
 * It is checked now.
 *
 * `favorite_type` is free text live — no check constraint — so these three values are
 * stored as-is.
 */
type FavoriteType = "favorite" | "preferred_team" | "recurring_favorite";

type FavoriteRow = {
  zooter_id: string;
  favorite_type?: FavoriteType;
  repeat_count?: number;
  zooters: Xooter | null;
};

const Favorites = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("favorites")
      .select("zooter_id, favorite_type, repeat_count")
      .eq("user_id", user.id);

    if (error) {
      // Surfaced rather than swallowed: an empty list and a failed query look identical
      // on screen, and that is what hid this for as long as it did.
      toast.error("Your saved Xooters could not be loaded.");
      setLoading(false);
      return;
    }

    const favorites = (data ?? []) as Array<Omit<FavoriteRow, "zooters">>;
    const zooterIds = favorites.map((row) => row.zooter_id).filter(Boolean);
    const { data: zooters } = zooterIds.length
      ? await supabase.from("zooters_public").select("*").in("id", zooterIds)
      : { data: [] };
    const zootersById = new Map(((zooters ?? []) as Xooter[]).map((zooter) => [zooter.id, zooter]));

    setList(
      favorites
        .map((row) => ({ ...row, zooters: zootersById.get(row.zooter_id) ?? null }))
        .filter((row) => row.zooters) as FavoriteRow[],
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const markKind = async (zooterId: string, favoriteType: FavoriteType) => {
    if (!user) return;
    const { error } = await supabase
      .from("favorites")
      .update({ favorite_type: favoriteType })
      .eq("user_id", user.id)
      .eq("zooter_id", zooterId);
    if (error) return toast.error(error.message);
    toast.success(favoriteType === "preferred_team" ? "Added to your preferred team" : "Marked as recurring favourite");
    load();
  };

  const bookAgain = (zooter: Xooter) => {
    navigate(`/app?zooter=${zooter.id}`);
  };

  const preferredCount = list.filter((row) => row.favorite_type === "preferred_team").length;
  const recurringCount = list.filter((row) => row.favorite_type === "recurring_favorite").length;
  const repeatCount = list.reduce((sum, row) => sum + (row.repeat_count ?? row.zooters?.repeat_client_count ?? 0), 0);

  return (
    <div className="container py-8 lg:py-12 max-w-7xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-3">
          <Heart className="h-3 w-3 fill-primary text-primary" />
          <span className="text-xs font-medium text-primary">Your trusted team</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold">My Xooters</h1>
        <p className="text-muted-foreground mt-2">Re-book the people you trust. Same Xooter, preferred team, and recurring favourites in one place.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <Card className="rounded-2xl p-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <div><p className="text-xs text-muted-foreground">Preferred team</p><p className="font-display text-2xl font-bold">{preferredCount}</p></div>
        </Card>
        <Card className="rounded-2xl p-4 flex items-center gap-3">
          <Repeat className="h-5 w-5 text-sage-deep" />
          <div><p className="text-xs text-muted-foreground">Recurring favourites</p><p className="font-display text-2xl font-bold">{recurringCount}</p></div>
        </Card>
        <Card className="rounded-2xl p-4 flex items-center gap-3">
          <Star className="h-5 w-5 text-primary" />
          <div><p className="text-xs text-muted-foreground">Repeat bookings</p><p className="font-display text-2xl font-bold">{repeatCount}</p></div>
        </Card>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border p-12 text-center">
          <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display text-xl font-bold mb-2">No favorites yet</h3>
          <p className="text-muted-foreground mb-4">Tap the heart on any Xooter to save them here.</p>
          <Button onClick={() => navigate("/app")} className="rounded-full">Browse Xooters</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {list.map((row) => {
            const z = row.zooters!;
            const firstName = z.name.split(" ")[0];
            return (
              <div key={z.id} className="space-y-2">
                <XooterCard z={{ ...z, repeat_client_count: z.repeat_client_count ?? row.repeat_count }} onBook={() => bookAgain(z)} actionLabel={`Book ${firstName} Again`} />
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => bookAgain(z)}>Book {firstName} Again</Button>
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => markKind(z.id, "preferred_team")}>Preferred Team</Button>
                  <Button variant="ghost" size="sm" className="rounded-xl col-span-2" onClick={() => markKind(z.id, "recurring_favorite")}>Recurring Favourite</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Favorites;
