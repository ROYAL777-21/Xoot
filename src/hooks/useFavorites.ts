import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useFavorites = () => {
  const { user } = useAuth();
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!user) return setFavIds(new Set());
    const { data } = await supabase.from("favorites").select("zooter_id").eq("user_id", user.id);
    setFavIds(new Set((data ?? []).map((r) => r.zooter_id)));
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleFavorite = async (zooterId: string) => {
    if (!user) { toast.error("Sign in to save Zooters"); return; }
    const isFav = favIds.has(zooterId);
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("zooter_id", zooterId);
      const next = new Set(favIds); next.delete(zooterId); setFavIds(next);
      toast("Removed from My Zooters");
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, zooter_id: zooterId });
      setFavIds(new Set(favIds).add(zooterId));
      toast.success("Added to My Zooters");
    }
  };

  return { favIds, isFavorite: (id: string) => favIds.has(id), toggleFavorite, refresh };
};