import { getServiceClient, getCorsHeaders, handlePreflight, json } from "../_shared/action-utils.ts";
import { DIRECTORY_COLUMNS, publicDirectoryProfile } from "../_shared/public-directory.ts";

/** Anonymous marketplace read: explicit row gates and an explicit public projection. */
Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;
  if (req.method !== "GET" && req.method !== "POST") {
    return json({error: "Method not allowed."}, 405, origin);
  }
  try {
    const { data, count, error } = await getServiceClient().from("xooters")
      .select(DIRECTORY_COLUMNS, {count: "exact"})
      .eq("active", true)
      .eq("background_check_status", "approved")
      .eq("reliability_flagged", false)
      .order("jobs_completed", {ascending: false})
      .order("rating", {ascending: false, nullsFirst: false})
      .order("id")
      .limit(24);
    if (error) throw error;
    return new Response(JSON.stringify({
      xooters: (data ?? []).map(row => publicDirectoryProfile(row as unknown as Record<string, unknown>)),
      total: count ?? 0,
    }), {status:200, headers:{...getCorsHeaders(origin),"Content-Type":"application/json","Cache-Control":"public, max-age=30"}});
  } catch {
    return json({error:"The Xooter directory is temporarily unavailable."}, 503, origin);
  }
});
