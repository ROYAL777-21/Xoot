import { getServiceClient } from "../_shared/action-utils.ts";
import { consumeRateLimit, isOperationalControlEnabled } from "../_shared/governance-utils.ts";
import { activeVoiceWindow, boundVoiceCaller } from "../_shared/in-app-voice.ts";

/**
 * Returns the TwiML that joins a masked call into a conference.
 *
 * RECOVERED FROM PRODUCTION 2026-08-02, where it ran with no source in this repository.
 * Every join now requires both Twilio's signature and current Xoot booking authorisation.
 *
 * It runs with `verify_jwt: false`, which is correct: Twilio calls it, not a signed-in user.
 * What makes that safe is the HMAC-SHA1 signature check below, which is Twilio's documented
 * scheme and is implemented properly here — parameters sorted and concatenated, compared with
 * a timing-safe equality rather than `===`, and failing closed when the auth token is absent.
 *
 * Two things worth noting rather than silently changing:
 *
 * 1. `Access-Control-Allow-Origin: *` is fine on this endpoint, unlike on the sensitive-access
 *    pair. Twilio is not a browser and sends no Origin; the response is TwiML, not user data.
 * 2. `TWILIO_WEBHOOK_TWIML_URL` overrides the URL used for signature validation. That is
 *    necessary behind a proxy that rewrites the host, because Twilio signs the URL it dialled
 *    rather than the one the function sees — but it also means a wrong value silently breaks
 *    every signature check. Verify it against the URL configured in the Twilio console.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
};

const escapeXml = (value: string) => value.replace(/[<>&'"]/g, (char) => ({
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  "'": "&apos;",
  "\"": "&quot;",
}[char] ?? char));

const timingSafeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return diff === 0;
};

const signTwilioPayload = async (authToken: string, value: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
};

const validateTwilioWebhook = async (req: Request, form: FormData) => {
  // Either name for the one account Auth Token. See `_shared/twilio-webhook.ts` for why both
  // exist and what setting only one used to break. Not imported from there because this function
  // deliberately carries its own minimal signature check.
  const authToken = Deno.env.get("TWILIO_WEBHOOK_AUTH_TOKEN") ?? Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!authToken) return false;
  const received = req.headers.get("x-twilio-signature") ?? "";
  if (!received) return false;
  const validationUrl = Deno.env.get("TWILIO_WEBHOOK_TWIML_URL") ?? req.url;
  const params = req.method === "POST"
    ? [...new Set(form.keys())].sort()
      .map(key => [...new Set(form.getAll(key).map(String))].sort().map(value => key + value).join(""))
      .join("")
    : "";
  const expected = await signTwilioPayload(authToken, `${validationUrl}${params}`);
  return timingSafeEqual(expected, received);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const denied = () => new Response("Calling is unavailable", { status: 403, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
  try {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded") || !req.body) return denied();
  const reader = req.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > 16_384) { await reader.cancel(); return denied(); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const form = new FormData();
  for (const [key, value] of new URLSearchParams(new TextDecoder().decode(bytes))) form.append(key, value);
  const validTwilioRequest = await validateTwilioWebhook(req, form);
  if (!validTwilioRequest) {
    return new Response("Twilio webhook signature validation failed or is not configured.", {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  const caller = boundVoiceCaller(form, Deno.env.get("TWILIO_ACCOUNT_SID") ?? "");
  if (!caller) return denied();
  const db = getServiceClient();
  if (!await isOperationalControlEnabled(db, "twilio.in_app_voice")) return denied();
  const window = await activeVoiceWindow(db, caller.bookingId, caller.actorId);
  if (!window) return denied();
  const rate = await consumeRateLimit(db, { bucket: "twilio.voice_join", actor: `${caller.actorId}:${caller.bookingId}`, action: "join", limitCount: 8, windowSeconds: 600 });
  if (!rate.allowed) return denied();
  const room = `xoot-masked-${caller.bookingId}`;
  const callbackBase = Deno.env.get("SUPABASE_URL") ?? "";
  const statusCallback = callbackBase ? `${callbackBase}/functions/v1/twilio-voice-status` : "";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeLimit="${window.seconds}">
    <Conference record="do-not-record" maxParticipants="2" participantLabel="${window.role}" startConferenceOnEnter="true" endConferenceOnExit="true" statusCallback="${escapeXml(statusCallback)}" statusCallbackEvent="start end join leave">${escapeXml(room)}</Conference>
  </Dial>
</Response>`;

  return new Response(xml, {
    headers: { ...corsHeaders, "Content-Type": "text/xml", "Cache-Control": "no-store" },
  });
  } catch { return denied(); }
});
