import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * RECOVERED FROM PRODUCTION 2026-08-02. This function was running live with no source in
 * the repository — see blocker.md. Committed verbatim so it can be reviewed, diffed and
 * redeployed; the defects noted below are deliberately left in place rather than fixed in
 * the same change, so the committed copy provably matches what is deployed.
 *
 * KNOWN DEFECTS, in severity order:
 *
 * 1. `ENCRYPTION_KEY` falls back to `SUPABASE_SERVICE_ROLE_KEY`. If the variable is unset,
 *    gate codes and alarm codes are encrypted under a key derived from the service role key.
 *    That means anyone holding the service key can decrypt them, and rotating the service
 *    key — which blocker.md already requires, because one was pasted into chat — makes every
 *    stored access credential permanently undecryptable. A fallback that silently changes
 *    the encryption key is worse than a startup failure.
 * 2. `Access-Control-Allow-Origin` falls back to `*` when `APP_BASE_URL` is unset. Every
 *    other function in this repo resolves origins through `_shared/action-utils.ts` against
 *    an allow-list.
 * 3. The client is built with the service role key while passing the caller's Authorization
 *    header, so which identity PostgREST sees depends on supabase-js header precedence
 *    rather than on anything stated here.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_BASE_URL") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const fromBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const encryptionKey = async () => {
  const secret = Deno.env.get("ENCRYPTION_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("ENCRYPTION_KEY is not configured");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["decrypt"]);
};

const decryptJson = async ({ ciphertext, iv }: { ciphertext: string; iv: string }) => {
  const key = await encryptionKey();
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(ciphertext));
  return JSON.parse(decoder.decode(decrypted)) as Record<string, string>;
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

    const { bookingId, requestedFields = [] } = await req.json();
    if (!bookingId) return jsonResponse({ error: "bookingId required" }, 400);

    const { data: allowed, error: decisionError } = await supabase.rpc("can_access_sensitive_data", {
      p_booking_id: bookingId,
      p_actor_id: user.id,
    });
    if (decisionError) return jsonResponse({ error: decisionError.message }, 500);
    if (!allowed) return jsonResponse({ error: "Sensitive access is outside the booking window" }, 403);

    const { data: vault, error } = await supabase
      .from("sensitive_booking_access")
      .select("ciphertext,iv")
      .eq("booking_id", bookingId)
      .maybeSingle();
    if (error) return jsonResponse({ error: error.message }, 500);
    if (!vault) return jsonResponse({ fields: {} });

    const fields = await decryptJson(vault);
    const allowedFields = Array.isArray(requestedFields) && requestedFields.length > 0
      ? Object.fromEntries(Object.entries(fields).filter(([key]) => requestedFields.includes(key)))
      : fields;

    return jsonResponse({ fields: allowedFields });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
