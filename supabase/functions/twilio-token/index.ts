import {
  assertBookingParticipant,
  handlePreflight,
  json,
  readJson,
  requireAuth,
} from "../_shared/action-utils.ts";
import { consumeRateLimit } from "../_shared/governance-utils.ts";

/**
 * Mints a short-lived Twilio access token for in-app voice or chat.
 *
 * Recovered from production on 2026-08-02, where it ran with no source in this repository. It
 * was committed verbatim first, defects intact, so the repo copy provably matched what was
 * deployed and this fix reads as a diff rather than a rewrite of unknown code.
 *
 * FIXED:
 * 1. Authorisation. The handler used to confirm only that the caller had a session, then mint
 *    a token — `bookingId` was never checked and never used, so it was decorative. Any signed-in
 *    Xoot account could obtain a voice grant carrying `outgoing.application_sid` and originate
 *    calls billed to the Twilio account, or a conversations grant for the whole chat service.
 *    It now resolves the booking and requires the caller to be a participant.
 * 2. CORS resolves against the shared allow-list instead of `*`. This endpoint returns a
 *    credential; a wildcard is not a default worth having on one.
 * 3. The catch logs instead of returning `String(err)`, which echoed configuration detail —
 *    including which secrets are set — to any caller.
 * 4. The service client no longer forwards the caller's Authorization header. `requireAuth`
 *    verifies the JWT with the anon key and hands back a clean service client, so the effective
 *    identity is stated by the code rather than decided by supabase-js header precedence.
 *
 * ON ADMINS: `assertBookingParticipant` counts an admin as a participant, and that is correct
 * here. The Twilio identity is derived from the caller's own user id, not from the booking, so
 * an admin receives an identity that is distinguishably theirs — this endpoint cannot be used
 * to impersonate a household. Support joining a call is a real workflow; impersonating a party
 * is what would not be.
 *
 * Still gated: `twilio.masked_voice` and the other Twilio controls are disabled (blocker.md).
 * This function is now safe to enable, but enabling it is a separate decision.
 */

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
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  try {
    const { response: authFailure, user, supa } = await requireAuth(req, origin);
    if (authFailure || !user || !supa) return authFailure ?? json({ error: "Authentication required" }, 401, origin);

    const { bookingId, capability } = await readJson(req);
    if (!bookingId || !["voice", "conversations"].includes(capability)) {
      return json({ error: "bookingId and valid capability required" }, 400, origin);
    }

    // The check this endpoint never had. One response for "no such booking" and for "not
    // yours", so the endpoint cannot be used to test which booking ids exist.
    const { data: booking } = await supa
      .from("bookings")
      .select("id,user_id,zooter_id")
      .eq("id", bookingId)
      .maybeSingle();
    const { participant } = booking
      ? await assertBookingParticipant(supa, booking, user.id)
      : { participant: false };
    if (!participant) return json({ error: "Booking not found" }, 404, origin);

    /*
     * This endpoint had no rate limit at all, which mattered more once the in-app call button
     * shipped: every tap mints a credential carrying `outgoing.application_sid`, and a signed-in
     * participant could previously ask for them without bound.
     *
     * Placed after the participant check on purpose. Rate-limiting before authorisation would let
     * anyone with a session burn a stranger's budget by guessing booking ids, turning a limiter
     * into a denial-of-service tool against the person it protects.
     *
     * Deliberately generous — 30 per 10 minutes, per user per booking. A token lasts an hour, so
     * ordinary use needs one; this only stops a loop. It is not the call limit, which lives in
     * `create-masked-call`: this is the credential-minting limit, and being throttled out of a
     * *token* is a worse failure than being throttled out of a call, because the UI cannot
     * distinguish it from the feature being broken.
     */
    const rateLimit = await consumeRateLimit(supa, {
      bucket: "twilio.token",
      actor: `twilio-token:${user.id}:${bookingId}`,
      action: capability,
      limitCount: 30,
      windowSeconds: 600,
    });
    if (!rateLimit.allowed) {
      return json({ error: "Too many call setup attempts. Please wait a moment." }, 429, origin);
    }

    const missing = requiredSecrets.filter((key) => !Deno.env.get(key));
    if (missing.length > 0) {
      return json({ configured: false, ttlSeconds: 0, missing }, 200, origin);
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

    return json({ configured: true, token, identity, ttlSeconds }, 200, origin);
  } catch (err) {
    // Logged, not returned. `String(err)` here told the caller which Twilio secrets were
    // configured — a free read of the server's state on the endpoint that mints credentials.
    console.error("twilio-token failure", err);
    return json({ error: "Request failed" }, 500, origin);
  }
});
