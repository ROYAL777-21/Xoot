import { getServiceClient } from "../_shared/action-utils.ts";
import { consumeRateLimit, isOperationalControlEnabled } from "../_shared/governance-utils.ts";
import { activeVoiceWindow, boundVoiceCaller, registerVoiceJoin } from "../_shared/in-app-voice.ts";
import { signedVoiceForm } from "../_shared/in-app-voice-webhook.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const denied = () => new Response("Calling is unavailable", { status: 403, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
  try {
  const form = await signedVoiceForm(req, Deno.env.get("TWILIO_WEBHOOK_TWIML_URL") ?? req.url);
  if (!form) {
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
  const callbackBase = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "") ?? "";
  if (!callbackBase.startsWith("https://")) return denied();
  const join = await registerVoiceJoin(db, caller, window);
  if (!join) return denied();
  const room = `xoot-inapp-${join.roomId}`;
  const statusCallback = `${callbackBase}/functions/v1/twilio-in-app-voice-status?room=${join.roomId}`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeLimit="${join.seconds}">
    <Conference record="do-not-record" maxParticipants="2" participantLabel="${window.role}" startConferenceOnEnter="true" endConferenceOnExit="true" statusCallback="${escapeXml(statusCallback)}" statusCallbackEvent="start end join leave">${escapeXml(room)}</Conference>
  </Dial>
</Response>`;

  return new Response(xml, {
    headers: { ...corsHeaders, "Content-Type": "text/xml", "Cache-Control": "no-store" },
  });
  } catch { return denied(); }
});
