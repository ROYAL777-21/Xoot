import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Reads the encrypted access credentials for a booking — gate codes, alarm codes, entry notes.
 *
 * Recovered from production on 2026-08-02, where it had been running with no source in this
 * repository, then fixed. It was committed verbatim first so the repo copy provably matched
 * what was deployed and the fix could be read as a diff.
 *
 * FIXED ON RECOVERY:
 * 1. `ENCRYPTION_KEY` no longer falls back to `SUPABASE_SERVICE_ROLE_KEY`. See the note on
 *    `encryptionKey` — this was the one with an irreversible failure mode.
 * 2. CORS resolves against an allow-list instead of falling back to `*`.
 * 3. The service client no longer forwards the caller's Authorization header, so the effective
 *    identity is stated by the code rather than decided by supabase-js header precedence.
 *
 * Access is gated by `can_access_sensitive_data`, which enforces the booking window. This
 * function does not widen that — it decrypts only after the RPC says yes.
 */

/**
 * Allowed origins, matching `_shared/action-utils.ts` rather than falling back to `*`.
 * A wildcard on an endpoint that returns gate codes is not a default worth having.
 */
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? Deno.env.get("APP_BASE_URL") ?? "https://xoot.co.za")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Vary": "Origin",
});

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const jsonResponse = (body: Record<string, unknown>, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });

const fromBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const encryptionKey = async (usage: "encrypt" | "decrypt") => {
  // No fallback. This used to read `ENCRYPTION_KEY ?? SUPABASE_SERVICE_ROLE_KEY`, which meant
  // an unset variable silently derived the key from the service role key — so anyone holding
  // that key could decrypt gate codes, and rotating it (which blocker.md requires, because one
  // was pasted into chat) would have made every stored credential permanently unreadable.
  //
  // Failing closed is safe to introduce now and would not have been later:
  // `sensitive_booking_access` held 0 rows when this was changed on 2026-08-02, so there is no
  // ciphertext under the old derivation to migrate. Once real gate codes exist, changing this
  // becomes a data migration rather than an edit.
  const secret = Deno.env.get("ENCRYPTION_KEY");
  if (!secret) throw new Error("ENCRYPTION_KEY is not configured");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [usage]);
};

const decryptJson = async ({ ciphertext, iv }: { ciphertext: string; iv: string }) => {
  const key = await encryptionKey("decrypt");
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(ciphertext));
  return JSON.parse(decoder.decode(decrypted)) as Record<string, string>;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, origin);

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    // Service role, used deliberately: `can_access_sensitive_data` and the vault table are not
    // reachable by a client role, and every ownership check below is made explicitly against
    // `user.id`. Previously this passed the caller's Authorization header alongside the service
    // key, which left the effective identity dependent on supabase-js header precedence rather
    // than on anything the code stated.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return jsonResponse({ error: "Authentication required" }, 401, origin);

    const { bookingId, requestedFields = [] } = await req.json();
    if (!bookingId) return jsonResponse({ error: "bookingId required" }, 400, origin);

    /*
     * `can_access_sensitive_data` takes a **`xooters.id`**, not an auth user id.
     * `bookings.xooter_id` is a foreign key to `xooters.id` — read from the live schema, not
     * assumed — and the function compares the two directly.
     *
     * ⚠️ This previously passed `p_actor_id: user.id`, which was wrong twice over: no such
     * parameter exists (PostgREST resolves an RPC by name **and** argument names, so the call
     * never resolved), and an auth user id would not have matched `bookings.xooter_id` even if it
     * had. The call therefore returned an error and this endpoint answered 500 to every request.
     *
     * It failed CLOSED, so no gate code was ever wrongly released — but no Xooter could read one
     * either. `revoke-sensitive-access` gets this right and is the shape copied here.
     * `src/lib/rpc-names-exist.test.ts` now fails on an argument name the schema does not declare.
     */
    const { data: xooterRow } = await supabase
      .from("xooters")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!xooterRow?.id) {
      return jsonResponse({ error: "Sensitive access is limited to the assigned Xooter" }, 403, origin);
    }

    const { data: allowed, error: decisionError } = await supabase.rpc("can_access_sensitive_data", {
      p_xooter_id: xooterRow.id,
      p_booking_id: bookingId,
    });
    if (decisionError) return jsonResponse({ error: decisionError.message }, 500, origin);
    if (!allowed) return jsonResponse({ error: "Sensitive access is outside the booking window" }, 403, origin);

    const { data: vault, error } = await supabase
      .from("sensitive_booking_access")
      .select("ciphertext,iv")
      .eq("booking_id", bookingId)
      .maybeSingle();
    if (error) return jsonResponse({ error: error.message }, 500, origin);
    if (!vault) return jsonResponse({ fields: {} }, 200, origin);

    const fields = await decryptJson(vault);
    const allowedFields = Array.isArray(requestedFields) && requestedFields.length > 0
      ? Object.fromEntries(Object.entries(fields).filter(([key]) => requestedFields.includes(key)))
      : fields;

    return jsonResponse({ fields: allowedFields }, 200, origin);
  } catch (err) {
    // Logged, not returned. With the key fallback gone, `String(err)` would tell any caller
    // whether ENCRYPTION_KEY is configured — a free probe of the server's state on the one
    // endpoint where that matters most.
    console.error("sensitive-access failure", err);
    return jsonResponse({ error: "Request failed" }, 500, origin);
  }
});
