import {
  assertBookingParticipant,
  handlePreflight,
  json,
  readJson,
  requireAuth,
} from "../_shared/action-utils.ts";

/**
 * Creates (or re-uses) a Twilio Conversation for a booking's masked chat.
 *
 * Recovered from production on 2026-08-02, where it ran with no source in this repository, then
 * committed verbatim so this fix reads as a diff.
 *
 * FIXED — the participation check, which is the half of a chained hole that made the other half
 * matter. This function used to confirm the caller had a session, then create a conversation for
 * whatever `bookingId` it was handed and return the conversation SID. `twilio-token` would hand
 * the same caller a conversations grant for the service. Together that was read access to another
 * household's booking chat from an ordinary account, once Twilio was enabled — neither function
 * obviously exploitable alone, which is exactly why the pair was worth writing down. Both ends
 * now resolve the booking and require the caller to be a participant.
 *
 * ALSO FIXED: CORS resolves against the shared allow-list instead of `*`, and the catch logs
 * rather than returning `String(err)`.
 *
 * The unconfigured path is kept as written. It records a session, queues an approval-gated
 * outbox event and tells the caller to stay on in-app chat, which is the right behaviour — but
 * it now sits behind the participation check too, since it writes a row keyed to a booking and
 * would otherwise let any account queue support work against someone else's.
 *
 * Not currently reachable: the Twilio controls are disabled (blocker.md).
 */

const requiredSecrets = ["TWILIO_ACCOUNT_SID", "TWILIO_API_KEY_SID", "TWILIO_API_KEY_SECRET", "TWILIO_CONVERSATIONS_SERVICE_SID"] as const;

const authHeader = () => {
  const key = `${Deno.env.get("TWILIO_API_KEY_SID")}:${Deno.env.get("TWILIO_API_KEY_SECRET")}`;
  return `Basic ${btoa(key)}`;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  try {
    const { response: authFailure, user, supa } = await requireAuth(req, origin);
    if (authFailure || !user || !supa) return authFailure ?? json({ error: "Authentication required" }, 401, origin);

    const { bookingId } = await readJson(req);
    if (!bookingId) return json({ error: "bookingId required" }, 400, origin);

    // Same response for "no such booking" and "not yours", so this cannot be used to probe
    // which booking ids exist. Placed before the secrets branch deliberately: the unconfigured
    // path still writes rows keyed to the booking.
    const { data: booking } = await supa
      .from("bookings")
      .select("id,user_id,xooter_id")
      .eq("id", bookingId)
      .maybeSingle();
    const { participant } = booking
      ? await assertBookingParticipant(supa, booking, user.id)
      : { participant: false };
    if (!participant) return json({ error: "Booking not found" }, 404, origin);

    const missing = requiredSecrets.filter((key) => !Deno.env.get(key));
    if (missing.length > 0) {
      const { data: session } = await supa.from("masked_conversation_sessions").insert({
        booking_id: bookingId,
        requester_id: user.id,
        status: "setup_required",
        failure_reason: `Missing Twilio secrets: ${missing.join(", ")}`,
      }).select("id").single();

      await supa.from("integration_outbox").insert({
        source_table: "masked_conversation_sessions",
        source_id: session?.id,
        event_type: "masked_conversation_requested",
        channel: "twilio_conversations",
        owner: "Customer Support Agent",
        stack_tool: "Twilio Conversations queue",
        payload: { booking_id: bookingId, configured: false },
        status: "needs_approval",
        approval_required: true,
        failure_mode: "Keep communication in Supabase in-app chat until Twilio Conversations is configured.",
        created_by: user.id,
      });

      return json({ configured: false, status: "setup_required", missing, sessionId: session?.id }, 200, origin);
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const serviceSid = Deno.env.get("TWILIO_CONVERSATIONS_SERVICE_SID")!;
    const url = `https://conversations.twilio.com/v1/Services/${serviceSid}/Conversations`;
    const form = new URLSearchParams({
      FriendlyName: `Xoot booking ${bookingId}`,
      UniqueName: `xoot-booking-${bookingId}`,
    });
    const twilioRes = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const payload = await twilioRes.json();
    if (!twilioRes.ok && payload?.code !== 50353) {
      // Twilio's error body can carry account detail. Log it, tell the caller the provider
      // rejected the request, and let the outbox and logs carry the diagnosis.
      console.error("twilio-conversation provider error", payload);
      return json({ configured: true, error: "Conversation provider rejected the request" }, 502, origin);
    }

    const conversationSid = payload.sid;
    const { data: session } = await supa.from("masked_conversation_sessions").insert({
      booking_id: bookingId,
      requester_id: user.id,
      status: "active",
      provider_conversation_sid: conversationSid,
      client_identity: `xoot_client_${bookingId}`,
      contractor_identity: `xoot_contractor_${bookingId}`,
      started_at: new Date().toISOString(),
    }).select("id").single();

    return json({ configured: true, status: "active", conversationSid, accountSid, sessionId: session?.id }, 200, origin);
  } catch (err) {
    console.error("twilio-conversation failure", err);
    return json({ error: "Request failed" }, 500, origin);
  }
});
