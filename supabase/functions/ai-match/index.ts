import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { service, user_id } = await req.json();
    if (!service) {
      return new Response(JSON.stringify({ error: "service required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: zooters } = await supa.from("zooters").select("*").eq("role", service).eq("active", true);
    if (!zooters || zooters.length === 0) {
      return new Response(JSON.stringify({ ranked: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let favIds: string[] = [];
    if (user_id) {
      const { data: favs } = await supa.from("favorites").select("zooter_id").eq("user_id", user_id);
      favIds = (favs ?? []).map((f) => f.zooter_id);
    }

    // Heuristic ranking: rating + jobs - distance + favorite bonus + ZOTM bonus
    const ranked = zooters.map((z) => {
      let score = Number(z.rating) * 20;
      score += Math.min(z.jobs_completed, 500) / 25;
      score -= Number(z.distance_mi) * 3;
      if (z.is_zotm) score += 8;
      if (favIds.includes(z.id)) score += 25;
      return { ...z, match_score: Math.round(score * 10) / 10 };
    }).sort((a, b) => b.match_score - a.match_score);

    return new Response(JSON.stringify({ ranked }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});