import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://xoot.co.za",
  "https://www.xoot.co.za",
];

const getAllowedOrigins = () =>
  (Deno.env.get("ALLOWED_ORIGINS")?.split(",") ?? defaultAllowedOrigins)
    .map((origin) => origin.trim())
    .filter(Boolean);

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

const isAllowedOrigin = (origin: string | null) => !origin || getAllowedOrigins().includes(origin);

const json = (body: Record<string, unknown>, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });

const sanitiseService = (value: unknown) =>
  typeof value === "string" ? value.replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 40) : "";

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
  if (!isAllowedOrigin(origin)) return json({ error: "origin not allowed" }, 403, origin);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "authentication required" }, 401, origin);

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "authentication required" }, 401, origin);

    const { service } = await req.json();
    const safeService = sanitiseService(service);
    if (!safeService) return json({ error: "service required" }, 400, origin);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: zooters } = await supa.from("zooters").select("*").eq("role", safeService).eq("active", true);
    if (!zooters || zooters.length === 0) {
      return json({ ranked: [] }, 200, origin);
    }

    const { data: favs } = await supa.from("favorites").select("zooter_id").eq("user_id", authData.user.id);
    const favIds = (favs ?? []).map((f) => f.zooter_id);

    const ranked = zooters.map((z) => {
      let score = Number(z.rating) * 20;
      score += Math.min(z.jobs_completed, 500) / 25;
      score -= Number(z.distance_mi) * 3;
      if (z.is_zotm) score += 8;
      if (favIds.includes(z.id)) score += 25;
      return { ...z, match_score: Math.round(score * 10) / 10 };
    }).sort((a, b) => b.match_score - a.match_score);

    return json({ ranked }, 200, origin);
  } catch {
    return json({ error: "matching failed" }, 500, origin);
  }
});
