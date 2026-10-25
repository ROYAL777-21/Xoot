import { getServiceClient } from "../_shared/action-utils.ts";
import { VOICE_SESSIONS, isVoiceId } from "../_shared/in-app-voice.ts";
import { signedVoiceForm } from "../_shared/in-app-voice-webhook.ts";

const sid = (value: unknown, prefix: string): value is string => typeof value === "string" && new RegExp(`^${prefix}[0-9a-fA-F]{32}$`).test(value);
const unavailable = () => new Response("Callback unavailable", { status: 403, headers: { "Cache-Control": "no-store" } });

/** Separate from legacy PSTN callbacks. Only allowlisted metadata reaches the ephemeral ledger. */
Deno.serve(async req => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const url = new URL(req.url); const anchor = url.searchParams.get("anchor");
    if (!sid(anchor, "CA") || [...url.searchParams.keys()].length !== 1) return unavailable();
    const base = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "") ?? "";
    if (!base.startsWith("https://")) return unavailable();
    const form = await signedVoiceForm(req, `${base}/functions/v1/twilio-in-app-voice-status${url.search}`);
    if (!form || !["AccountSid", "ConferenceSid", "FriendlyName", "SequenceNumber", "StatusCallbackEvent"].every(key => form.getAll(key).length === 1)) return unavailable();
    const account = form.get("AccountSid"); const conference = form.get("ConferenceSid");
    const room = /^xoot-masked-(.+)$/.exec(String(form.get("FriendlyName")));
    const sequenceText = String(form.get("SequenceNumber")); const sequence = Number(sequenceText);
    const event = String(form.get("StatusCallbackEvent"));
    if (!sid(account, "AC") || account !== Deno.env.get("TWILIO_ACCOUNT_SID") || !sid(conference, "CF") ||
      !room || !isVoiceId(room[1]) || !/^\d{1,10}$/.test(sequenceText) || sequence > 2_147_483_647 ||
      !["conference-start", "conference-end", "participant-join", "participant-leave"].includes(event)) return unavailable();
    const participantEvent = event.startsWith("participant-"); const callSid = form.get("CallSid");
    if (participantEvent && (form.getAll("CallSid").length !== 1 || !sid(callSid, "CA"))) return unavailable();
    const db = getServiceClient(); const now = new Date().toISOString();
    // The signed callback URL identifies the original join. Old conference callbacks cannot
    // bind a later room's participants just because it reuses the same booking-friendly name.
    const { data: root, error: rootError } = await db.from(VOICE_SESSIONS).select("booking_id,conference_sid")
      .eq("call_sid", anchor).eq("account_sid", account).eq("booking_id", room[1]).gt("expires_at", now).maybeSingle();
    if (rootError) return new Response("Retry callback", { status: 503 });
    if (!root || (root.conference_sid && root.conference_sid !== conference)) return new Response(null, { status: 204 });
    const bind = await db.from(VOICE_SESSIONS).update({ conference_sid: conference })
      .eq("call_sid", anchor).eq("account_sid", account).gt("expires_at", now)
      .or(`conference_sid.is.null,conference_sid.eq.${conference}`).select("call_sid");
    if (bind.error) return new Response("Retry callback", { status: 503 });
    if (!bind.data?.length) return new Response(null, { status: 204 });
    const ending = event === "conference-end" || event === "participant-leave";
    let update = db.from(VOICE_SESSIONS).update({ conference_sid: conference, sequence_number: sequence,
      status: ending ? "completed" : "active", ...(ending ? { finished_at: now } : {}) })
      .eq("account_sid", account).eq("booking_id", room[1]).gt("expires_at", now)
      .lt("sequence_number", sequence).neq("status", "completed");
    update = event === "conference-end" ? update.eq("conference_sid", conference) : update
      .eq("call_sid", participantEvent ? callSid : anchor).or(`conference_sid.is.null,conference_sid.eq.${conference}`);
    const result = await update;
    if (result.error) return new Response("Retry callback", { status: 503 });
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch { return unavailable(); }
});
