import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getConciergeCapabilities } from "../_shared/concierge-controls.ts";

/**
 * Tells the client which Concierge capabilities are switched on.
 *
 * ── Why a function and not a table read ─────────────────────────────────────────
 * `operational_controls` grants SELECT to `authenticated`, but its only policy is
 * `operational_controls_admin_read`. So an ordinary signed-in user reads zero rows and a
 * signed-out visitor reads nothing at all. There is no client-side route to this answer, and
 * widening the policy to give one would expose every operational control in the product —
 * including the safety and payment switches — to read the moment someone opens a console.
 *
 * This endpoint returns only the `concierge.*` capability booleans, which is the minimum the UI
 * needs to avoid offering a feature that is switched off.
 *
 * ── Why it is public ────────────────────────────────────────────────────────────
 * `verify_jwt = false`, because the Concierge answers general questions to signed-out visitors
 * and the launcher renders before anyone signs in. The response carries no user data, no secret
 * and no control the caller could act on — only whether a UI affordance should be drawn.
 *
 * Read-only, so there is no rate limit: it is a `select` on a table of at most a few dozen rows,
 * and throttling it would break the launcher for a real person before it inconvenienced anyone
 * else. The write paths it gates — `support-respond`, `create-concierge-handoff` — carry their own
 * limits, and they re-check the controls server-side rather than trusting this response.
 */

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "https://staging.xoot.co.za",
  "https://preview.xoot.co.za",
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
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
};

const json = (body: Record<string, unknown>, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(origin),
      "Content-Type": "application/json",
      // A minute is short enough that a kill switch takes effect while someone is still angry
      // about whatever caused them to flip it, and long enough that a busy app is not asking on
      // every navigation.
      "Cache-Control": "public, max-age=60",
    },
  });

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(origin) });

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supa = serviceRoleKey
    ? createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey)
    : null;

  // `getConciergeCapabilities` already fails closed on a null client or a failed lookup, so an
  // unconfigured or broken deployment reports "off" rather than drawing a button that cannot work.
  const capabilities = await getConciergeCapabilities(supa);
  return json({ capabilities }, 200, origin);
});
