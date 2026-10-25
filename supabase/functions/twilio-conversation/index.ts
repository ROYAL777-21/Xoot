import { assertBookingParticipant, handlePreflight, json, readJson, requireAuth } from "../_shared/action-utils.ts";
import { isVoiceId } from "../_shared/in-app-voice.ts";

/**
 * Twilio Conversations has no accepted membership/role/native-encryption integration yet.
 * Preserve an honest unavailable endpoint without credentials, provider calls, session rows or
 * outbox work. Website in-app messages continue through the existing E2EE path.
 */
Deno.serve(async req => {
  const origin = req.headers.get("Origin"); const preflight = handlePreflight(req, origin); if (preflight) return preflight;
  try {
    const { response: authFailure, user, supa } = await requireAuth(req, origin);
    if (authFailure || !user || !supa) return authFailure ?? json({ error: "Authentication required" }, 401, origin);
    const { bookingId } = await readJson(req, 4096);
    if (!isVoiceId(bookingId)) return json({ error: "bookingId required" }, 400, origin);
    const { data: booking } = await supa.from("bookings").select("id,user_id,xooter_id").eq("id", bookingId).maybeSingle();
    const { participant } = booking ? await assertBookingParticipant(supa, booking, user.id) : { participant: false };
    if (!participant) return json({ error: "Booking not found" }, 404, origin);
    return json({ configured: false, status: "unavailable", reason: "transport_not_accepted" }, 200, origin);
  } catch (error) { console.error("twilio-conversation failure", error); return json({ error: "Request failed" }, 503, origin); }
});
