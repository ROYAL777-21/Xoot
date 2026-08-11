import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Encrypts and stores the access credentials for a booking.
 *
 * Recovered from production on 2026-08-02, where it had been running with no source in this
 * repository, then fixed. Committed verbatim first so the fix could be read as a diff.
 *
 * FIXED ON RECOVERY: the same three defects as `sensitive-access-read` — the `ENCRYPTION_KEY`
 * fallback, the `*` CORS fallback, and the ambiguous identity. The two must always be changed
 * together: they are the two halves of one envelope, and a key derivation that differs between
 * them makes existing ciphertext unreadable.
 *
 * STILL OPEN — `sensitiveKeyPattern` decides what to encrypt by matching the *field name*. A
 * field a customer calls "how to get in" does not match, is silently dropped, and is reported
 * as `no_sensitive_fields` while the same text probably lands somewhere unencrypted. Fixing it
 * means changing the caller's contract — the client should declare sensitivity, or everything
 * on this endpoint should be encrypted — so it is left as a deliberate follow-up rather than
 * bundled into a security fix.
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

const sensitiveKeyPattern = /(gate|alarm|lockbox|access|combination|entry|key|address|code)/i;
const encoder = new TextEncoder();

const jsonResponse = (body: Record<string, unknown>, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } });

const toBase64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));

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

const encryptJson = async (payload: Record<string, string>) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey("encrypt");
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(payload)));
  return { ciphertext: toBase64(new Uint8Array(encrypted)), iv: toBase64(iv) };
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

    const { bookingId, fields } = await req.json();
    if (!bookingId || !fields || typeof fields !== "object") return jsonResponse({ error: "bookingId and fields required" }, 400, origin);

    const { data: booking } = await supabase.from("bookings").select("id,user_id").eq("id", bookingId).maybeSingle();
    if (!booking || booking.user_id !== user.id) return jsonResponse({ error: "Only the booking owner can save sensitive access details" }, 403, origin);

    const filtered = Object.fromEntries(
      Object.entries(fields as Record<string, unknown>)
        .filter(([key, value]) => sensitiveKeyPattern.test(key) && typeof value === "string" && value.trim().length > 0)
        .map(([key, value]) => [key, String(value).trim()]),
    ) as Record<string, string>;

    if (Object.keys(filtered).length === 0) return jsonResponse({ saved: false, reason: "no_sensitive_fields" }, 200, origin);

    const encrypted = await encryptJson(filtered);
    const { error } = await supabase.from("sensitive_booking_access").upsert({
      booking_id: bookingId,
      owner_user_id: user.id,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      updated_at: new Date().toISOString(),
    });
    if (error) return jsonResponse({ error: error.message }, 500, origin);

    await supabase.from("sensitive_access_logs").insert({
      actor_id: user.id,
      booking_id: bookingId,
      access_granted: true,
      reason: "encrypted_save",
      requested_fields: Object.keys(filtered),
    });

    return jsonResponse({ saved: true, fields: Object.keys(filtered) }, 200, origin);
  } catch (err) {
    // Logged, not returned. With the key fallback gone, `String(err)` would tell any caller
    // whether ENCRYPTION_KEY is configured — a free probe of the server's state on the one
    // endpoint where that matters most.
    console.error("sensitive-access failure", err);
    return jsonResponse({ error: "Request failed" }, 500, origin);
  }
});
