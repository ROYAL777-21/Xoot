import { assertBookingParticipant, handlePreflight, json as actionJson, readJson, requireAuth } from "../_shared/action-utils.ts";
import { consumeRateLimit, isOperationalControlEnabled } from "../_shared/governance-utils.ts";
import { activeVoiceWindow, isVoiceId, voiceIdentity } from "../_shared/in-app-voice.ts";

/** No phone-number rental is needed for this conference path. Twilio usage is still billable. */
const CAPABILITY_SECRETS = {
  voice: [
    ["TWILIO_ACCOUNT_SID"],
    ["TWILIO_API_KEY_SID"],
    ["TWILIO_API_KEY_SECRET"],
    ["TWILIO_VOICE_APP_SID"],
    ["TWILIO_WEBHOOK_AUTH_TOKEN", "TWILIO_AUTH_TOKEN"],
  ],
  // Reserved setup contract; no Conversations token is issued before transport acceptance.
  conversations: [
    ["TWILIO_ACCOUNT_SID"],
    ["TWILIO_API_KEY_SID"],
    ["TWILIO_API_KEY_SECRET"],
    ["TWILIO_CONVERSATIONS_SERVICE_SID"],
    ["TWILIO_WEBHOOK_AUTH_TOKEN", "TWILIO_AUTH_TOKEN"],
  ],
} as const satisfies Record<string, readonly (readonly string[])[]>;
const json = (body: Record<string, unknown>, status: number, origin: string | null) => {
  const response = actionJson(body, status, origin); response.headers.set("Cache-Control", "no-store"); return response;
};
const base64Url = (value: string | Uint8Array) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};
async function signJwt(payload: Record<string, unknown>, secret: string) {
  const input = `${base64Url(JSON.stringify({ typ: "JWT", alg: "HS256", cty: "twilio-fpa;v=1" }))}.${base64Url(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return `${input}.${base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input))))}`;
}

Deno.serve(async req => {
  const origin = req.headers.get("Origin"); const preflight = handlePreflight(req, origin); if (preflight) return preflight;
  try {
    const { response: authFailure, user, supa } = await requireAuth(req, origin);
    if (authFailure || !user || !supa) return authFailure ?? json({ error: "Authentication required" }, 401, origin);
    const { bookingId, capability } = await readJson(req, 4096);
    if (!isVoiceId(bookingId) || !["voice", "conversations"].includes(capability)) return json({ error: "bookingId and valid capability required" }, 400, origin);
    const { data: booking } = await supa.from("bookings").select("id,user_id,xooter_id").eq("id", bookingId).maybeSingle();
    const { participant } = booking ? await assertBookingParticipant(supa, booking, user.id) : { participant: false };
    if (!participant) return json({ error: "Booking not found" }, 404, origin);
    // Existing E2EE in-app chat remains available. No broad service grant is safe while provider
    // membership, restrictive roles and encrypted native delivery are unaccepted.
    if (capability === "conversations") return json({ configured: false, ttlSeconds: 0, reason: "transport_not_accepted" }, 200, origin);
    if (!await isOperationalControlEnabled(supa, "twilio.in_app_voice")) return json({ configured: false, ttlSeconds: 0, reason: "feature_disabled" }, 200, origin);
    const window = await activeVoiceWindow(supa, bookingId, user.id);
    if (!window) return json({ error: "Calling is unavailable for this booking" }, 409, origin);
    const rate = await consumeRateLimit(supa, { bucket: "twilio.token", actor: `twilio-token:${user.id}:${bookingId}`, action: capability, limitCount: 8, windowSeconds: 600 });
    if (!rate.allowed) return json({ error: "Too many call setup attempts. Please wait a moment." }, 429, origin);
    const missing = CAPABILITY_SECRETS[capability as keyof typeof CAPABILITY_SECRETS].filter(names => !names.some(name => Deno.env.get(name))).map(names => names[0]);
    if (missing.length) return json({ configured: false, ttlSeconds: 0, missing }, 200, origin);
    const apiKeySid = Deno.env.get("TWILIO_API_KEY_SID")!; const now = Math.floor(Date.now() / 1000);
    const identity = voiceIdentity(user.id, bookingId); const ttlSeconds = window.seconds;
    const token = await signJwt({ jti: `${apiKeySid}-${crypto.randomUUID()}`, iss: apiKeySid, sub: Deno.env.get("TWILIO_ACCOUNT_SID")!, iat: now, nbf: now, exp: now + ttlSeconds,
      grants: { identity, voice: { outgoing: { application_sid: Deno.env.get("TWILIO_VOICE_APP_SID")! }, incoming: { allow: false } } },
    }, Deno.env.get("TWILIO_API_KEY_SECRET")!);
    return json({ configured: true, token, identity, ttlSeconds }, 200, origin);
  } catch (error) { console.error("twilio-token failure", error); return json({ error: "Request failed" }, 503, origin); }
});
