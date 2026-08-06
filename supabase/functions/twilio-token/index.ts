import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Mints a short-lived Twilio access token for in-app voice or chat.
 *
 * RECOVERED FROM PRODUCTION 2026-08-02, where it ran with no source in this repository.
 * Committed verbatim, defects intact, so the repo copy provably matches what is deployed and
 * the fix reads as a diff rather than a rewrite of unknown code.
 *
 * DEFECT 1 — no authorisation beyond "is signed in". This is the serious one.
 *
 * The handler takes a `bookingId`, confirms the caller has a session, and mints a token. It
 * never checks that the caller is a participant in that booking. `bookingId` is not even used
 * in the token — the identity is derived from the user id alone, so the parameter is
 * decorative. Any signed-in Xoot account can therefore obtain a voice grant carrying
 * `outgoing.application_sid` and originate calls billed to the Twilio account, or obtain a
 * conversations grant for the chat service.
 *
 * The fix is the pattern already in `respond-zooter-job`: look the booking up, confirm the
 * caller is the customer or the assigned Xooter, and return the same response either way when
 * they are not. Until then this endpoint is gated only by having an account.
 *
 * DEFECT 2 — the catch returns `String(err)`, echoing configuration detail to a caller.
 * DEFECT 3 — `Access-Control-Allow-Origin: *` on an endpoint that returns a credential.
 * DEFECT 4 — the service-role client forwards the caller's Authorization header, so the
 * effective identity depends on supabase-js header precedence rather than on the code.
 *
 * Not currently reachable through a live feature: `twilio.masked_voice` and the other Twilio
 * controls are disabled (blocker.md). Fix this before enabling any of them.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requiredSecrets = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_API_KEY_SID",
  "TWILIO_API_KEY_SECRET",
  "TWILIO_CONVERSATIONS_SERVICE_SID",
  "TWILIO_VOICE_APP_SID",
  "TWILIO_CALLER_ID",
  "TWILIO_WEBHOOK_AUTH_TOKEN",
] as const;

const base64Url = (input: Uint8Array | string) => {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const signJwt = async (payload: Record<string, unknown>, secret: string) => {
  const header = { typ: "JWT", alg: "HS256", cty: "twilio-fpa;v=1" };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { bookingId, capability } = await req.json();
    if (!bookingId || !["voice", "conversations"].includes(capability)) {
      return new Response(JSON.stringify({ error: "bookingId and valid capability required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const missing = requiredSecrets.filter((key) => !Deno.env.get(key));
    if (missing.length > 0) {
      return new Response(JSON.stringify({ configured: false, ttlSeconds: 0, missing }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const apiKeySid = Deno.env.get("TWILIO_API_KEY_SID")!;
    const apiKeySecret = Deno.env.get("TWILIO_API_KEY_SECRET")!;
    const identity = `zoot_${user.id.replace(/-/g, "")}_${capability}`;
    const now = Math.floor(Date.now() / 1000);
    const ttlSeconds = 3600;
    const grants: Record<string, unknown> = { identity };
    if (capability === "conversations") {
      grants.chat = { service_sid: Deno.env.get("TWILIO_CONVERSATIONS_SERVICE_SID")! };
    }
    if (capability === "voice") {
      grants.voice = {
        outgoing: { application_sid: Deno.env.get("TWILIO_VOICE_APP_SID")! },
        incoming: { allow: false },
      };
    }

    const token = await signJwt({
      jti: `${apiKeySid}-${now}`,
      iss: apiKeySid,
      sub: accountSid,
      nbf: now,
      exp: now + ttlSeconds,
      grants,
    }, apiKeySecret);

    return new Response(JSON.stringify({ configured: true, token, identity, ttlSeconds }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
