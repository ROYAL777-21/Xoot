import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * RECOVERED FROM PRODUCTION 2026-08-02. Ran live with no source in the repository — see
 * blocker.md. Committed verbatim so it can be reviewed, diffed and redeployed; the defects
 * below are left in place so the committed copy provably matches what is deployed.
 *
 * Shares defects 1–3 with `sensitive-access-read` (ENCRYPTION_KEY falling back to the
 * service role key, `*` CORS fallback, ambiguous identity). Both must be fixed together:
 * they are the two halves of one envelope, and changing the key derivation on one side
 * without the other makes every stored gate code undecryptable.
 *
 * One further defect of its own:
 *
 * 4. `sensitiveKeyPattern` decides what to encrypt by matching the *field name*. A field
 *    the customer calls "how to get in" or "notes for the cleaner" does not match, so it is
 *    silently dropped — `saved: false, reason: "no_sensitive_fields"` — and the customer is
 *    told nothing useful. Worse, the same free-text is likely to end up in an unencrypted
 *    column instead. Deciding sensitivity by key name is guesswork; the caller should
 *    declare it, or everything on this endpoint should be encrypted.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_BASE_URL") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sensitiveKeyPattern = /(gate|alarm|lockbox|access|combination|entry|key|address|code)/i;
const encoder = new TextEncoder();

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const toBase64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));

const encryptionKey = async () => {
  const secret = Deno.env.get("ENCRYPTION_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("ENCRYPTION_KEY is not configured");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt"]);
};

const encryptJson = async (payload: Record<string, string>) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey();
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(payload)));
  return { ciphertext: toBase64(new Uint8Array(encrypted)), iv: toBase64(iv) };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return jsonResponse({ error: "Authentication required" }, 401);

    const { bookingId, fields } = await req.json();
    if (!bookingId || !fields || typeof fields !== "object") return jsonResponse({ error: "bookingId and fields required" }, 400);

    const { data: booking } = await supabase.from("bookings").select("id,user_id").eq("id", bookingId).maybeSingle();
    if (!booking || booking.user_id !== user.id) return jsonResponse({ error: "Only the booking owner can save sensitive access details" }, 403);

    const filtered = Object.fromEntries(
      Object.entries(fields as Record<string, unknown>)
        .filter(([key, value]) => sensitiveKeyPattern.test(key) && typeof value === "string" && value.trim().length > 0)
        .map(([key, value]) => [key, String(value).trim()]),
    ) as Record<string, string>;

    if (Object.keys(filtered).length === 0) return jsonResponse({ saved: false, reason: "no_sensitive_fields" });

    const encrypted = await encryptJson(filtered);
    const { error } = await supabase.from("sensitive_booking_access").upsert({
      booking_id: bookingId,
      owner_user_id: user.id,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      updated_at: new Date().toISOString(),
    });
    if (error) return jsonResponse({ error: error.message }, 500);

    await supabase.from("sensitive_access_logs").insert({
      actor_id: user.id,
      booking_id: bookingId,
      access_granted: true,
      reason: "encrypted_save",
      requested_fields: Object.keys(filtered),
    });

    return jsonResponse({ saved: true, fields: Object.keys(filtered) });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
