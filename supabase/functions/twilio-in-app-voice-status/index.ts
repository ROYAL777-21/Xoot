import { getServiceClient } from "../_shared/action-utils.ts";
import { isVoiceId } from "../_shared/in-app-voice.ts";
import { signedVoiceForm } from "../_shared/in-app-voice-webhook.ts";

const sid = (value: unknown, prefix: string): value is string => typeof value === "string" && new RegExp(`^${prefix}[0-9a-fA-F]{32}$`).test(value);
const unavailable = () => new Response("Callback unavailable", { status: 403, headers: { "Cache-Control": "no-store" } });

/** Signed allowlisted metadata only. The service-only RPC orders every event under a room lock. */
Deno.serve(async req => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const url = new URL(req.url); const room = url.searchParams.get("room");
    if (!isVoiceId(room) || [...url.searchParams.keys()].length !== 1) return unavailable();
    const base = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "") ?? "";
    if (!base.startsWith("https://")) return unavailable();
    const form = await signedVoiceForm(req, `${base}/functions/v1/twilio-in-app-voice-status${url.search}`);
    if (!form || !["AccountSid", "ConferenceSid", "FriendlyName", "SequenceNumber", "StatusCallbackEvent"].every(key => form.getAll(key).length === 1)) return unavailable();
    const account = form.get("AccountSid"); const conference = form.get("ConferenceSid");
    const sequenceText = String(form.get("SequenceNumber")); const sequence = Number(sequenceText);
    const event = String(form.get("StatusCallbackEvent"));
    if (!sid(account, "AC") || account !== Deno.env.get("TWILIO_ACCOUNT_SID") || !sid(conference, "CF") ||
      form.get("FriendlyName") !== `xoot-inapp-${room}` || !/^\d{1,10}$/.test(sequenceText) || sequence > 2_147_483_647 ||
      !["conference-start", "conference-end", "participant-join", "participant-leave"].includes(event)) return unavailable();
    const participantEvent = event.startsWith("participant-"); const callSid = form.get("CallSid");
    if (participantEvent && (form.getAll("CallSid").length !== 1 || !sid(callSid, "CA"))) return unavailable();
    const { error } = await getServiceClient().rpc("xoot_apply_in_app_voice_event", {
      p_room_id: room, p_account_sid: account, p_conference_sid: conference,
      p_sequence: sequence, p_event: event, p_call_sid: participantEvent ? callSid : null,
    });
    if (error) return new Response("Retry callback", { status: 503, headers: { "Cache-Control": "no-store" } });
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch { return unavailable(); }
});
