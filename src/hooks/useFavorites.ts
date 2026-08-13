import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useFavorites = () => {
  const { user } = useAuth();
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!user) return setFavIds(new Set());
    const { data } = await supabase.from("favorites").select("xooter_id").eq("user_id", user.id);
    setFavIds(new Set((data ?? []).map((r) => r.xooter_id)));
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleFavorite = async (xooterId: string) => {
    if (!user) { toast.error("Sign in to save Xooters"); return; }
    const isFav = favIds.has(xooterId);
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("xooter_id", xooterId);
      const next = new Set(favIds); next.delete(xooterId); setFavIds(next);
      toast("Removed from My Xooters");
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, xooter_id: xooterId });
      setFavIds(new Set(favIds).add(xooterId));
      toast.success("Added to My Xooters");
    }
  };

  return { favIds, isFavorite: (id: string) => favIds.has(id), toggleFavorite, refresh };
};