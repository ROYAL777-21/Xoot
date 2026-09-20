import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MAX_TRAVEL_KM, distanceKmToCoverage, type SuburbCentroid } from "../_shared/geo.ts";
import { DIRECTORY_COLUMNS, publicDirectoryProfile } from "../_shared/public-directory.ts";

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

    const body = await req.json();
    /*
     * `service` is optional as of 2026-08-12, and that is a deliberate widening.
     *
     * It used to be required, and the function filtered `role = service`. Meanwhile the booking
     * page — `Book.tsx` — queried `xooters_public` directly with no role filter at all, and never
     * called this function. Wiring the page to a version that required a role would have silently
     * shown **fewer** Xooters than before, or none, if any role string failed to line up. Ranking
     * more people is recoverable; showing a customer an empty list is not.
     *
     * Absent means "rank everyone active", which is exactly what the page does today.
     */
    const safeService = sanitiseService(body?.service);
    // Where the job is. Optional, because a customer browsing before they have typed an address
    // still deserves a ranked list — it just cannot be ranked on travel.
    const address = typeof body?.address === "string" ? body.address.slice(0, 400) : "";

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const query = supa.from("xooters").select(DIRECTORY_COLUMNS)
      .eq("active", true)
      .eq("background_check_status", "approved")
      .eq("reliability_flagged", false);
    const { data: xooters, error: rosterError } = await (safeService ? query.eq("role", safeService) : query);
    if (rosterError) throw rosterError;
    if (!xooters || xooters.length === 0) {
      return json({ ranked: [] }, 200, origin);
    }

    const { data: favs } = await supa.from("favorites").select("xooter_id").eq("user_id", authData.user.id);
    const favIds = (favs ?? []).map((f) => f.xooter_id);

    const { data: centroids } = await supa
      .from("suburb_centroids")
      .select("suburb,region,latitude,longitude")
      .eq("active", true);
    const suburbs = (centroids ?? []) as SuburbCentroid[];

    /*
     * Travel distance, computed from the booking address to the Xooter's nearest covered suburb.
     *
     * ── What this replaced ──────────────────────────────────────────────────────
     * `score -= Number(z.distance_mi) * 3`. `distance_mi` is a **static seeded column** — the same
     * number for every customer in the country — so the "distance" term ranked nobody by distance.
     * It looked like proximity matching and was decoration.
     *
     * ── Why distance is weighted the way it is ──────────────────────────────────
     * 1.6 points per km, against 20 points per rating star. So a Xooter 5 km closer beats one half
     * a star better, and a Xooter a full star better wins back about 12 km. That is the trade the
     * marketplace wants: convenience matters, quality matters more, and neither erases the other.
     *
     * A favourite is worth 25 points — deliberately more than 15 km of travel — because a
     * household asking for the same person again is a stronger signal than either.
     */
    const distanceFor = (z: Record<string, unknown>): number | null =>
      address ? distanceKmToCoverage(address, z.suburb_coverage as string[] | null, suburbs) : null;

    const withDistance = xooters.map((z) => ({ xooter: z, distanceKm: distanceFor(z) }));

    /*
     * Beyond the radius, exclude rather than rank last.
     *
     * Ranking a 40 km Xooter bottom is a slower way of saying no: they appear available, a customer
     * picks them, and the job is declined or driven resentfully. Excluding them shows the customer
     * people who will actually come.
     *
     * `distanceKm === null` is **unknown, not far** — an unlisted suburb, or a Xooter whose
     * coverage is unset. Those stay in the list and rank on quality alone, so an address outside
     * the seeded suburbs degrades to the old behaviour instead of returning nobody.
     */
    const inRange = withDistance.filter(({ distanceKm }) => distanceKm === null || distanceKm <= MAX_TRAVEL_KM);
    // If the radius excluded everyone, fall back to the unfiltered list. An empty result reads to
    // a customer as "Xoot has no cleaners", which is a worse answer than "here is someone further
    // away" — and the distance is returned, so the UI can be honest about the trip.
    const candidates = inRange.length > 0 ? inRange : withDistance;

    const ranked = candidates
      .map(({ xooter: z, distanceKm }) => {
        let score = Number(z.rating) * 20;
        score += Math.min(z.jobs_completed, 500) / 25;
        if (distanceKm !== null) score -= distanceKm * 1.6;
        if (z.is_zotm) score += 8;
        if (favIds.includes(z.id)) score += 25;
        return {
          ...publicDirectoryProfile(z),
          // Returned so the UI can show a real distance instead of the seeded one.
          distance_km: distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
          match_score: Math.round(score * 10) / 10,
        };
      })
      .sort((a, b) => b.match_score - a.match_score);

    return json({ ranked }, 200, origin);
  } catch {
    return json({ error: "matching failed" }, 500, origin);
  }
});
