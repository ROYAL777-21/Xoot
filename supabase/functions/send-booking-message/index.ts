import {
  cleanArray,
  cleanId,
  fail,
  handlePreflight,
  ok,
  readJson,
  requireAuth,
} from "../_shared/action-utils.ts";
import { consumeRateLimit, isOperationalControlEnabled } from "../_shared/governance-utils.ts";

const E2EE_CHAT_PREFIX = "zoot:e2ee:v1:";
const terminalStatuses = new Set(["cancelled", "rated"]);

const cleanEncryptedBody = (value: unknown) => (typeof value === "string" ? value.trim() : "");

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth as { user: { id: string }; supa: any };

  try {
    const body = await readJson(req);
    const bookingId = cleanId(body.bookingId ?? body.booking_id);
    const encryptedBody = cleanEncryptedBody(body.encryptedBody ?? body.encrypted_body ?? body.body);
    const clientSafetyFlags = cleanArray(body.clientSafetyFlags ?? body.client_safety_flags, 8, 48);

    if (!bookingId) return fail("booking_id required", origin, 400);
    if (!encryptedBody.startsWith(E2EE_CHAT_PREFIX)) return fail("encrypted booking chat envelope required", origin, 400);
    if (encryptedBody.length > 12000) return fail("message envelope too large", origin, 413);

    const chatEnabled = await isOperationalControlEnabled(supa, "booking.chat_send");
    if (!chatEnabled) return fail("booking chat is temporarily unavailable", origin, 503);

    const rateLimit = await consumeRateLimit(supa, {
      bucket: "booking_chat",
      actor: user.id,
      action: "send_message",
      limitCount: 30,
      windowSeconds: 60,
    });
    if (!rateLimit.allowed) return fail("too many chat messages", origin, 429);

    const { data: booking, error: bookingError } = await supa
      .from("bookings")
      .select("id,user_id,zooter_id,status")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking?.id) return fail("booking not found", origin, 404);
    if (terminalStatuses.has(String(booking.status))) return fail("booking chat is closed", origin, 409);

    let senderType: "user" | "zooter" | null = null;
    if (booking.user_id === user.id) {
      senderType = "user";
    } else if (booking.zooter_id) {
      const { data: zooter, error: zooterError } = await supa
        .from("zooters")
        .select("id,user_id")
        .eq("id", booking.zooter_id)
        .maybeSingle();

      if (zooterError) return fail("zooter lookup failed", origin, 500);
      if (zooter?.user_id === user.id) senderType = "zooter";
    }

    if (!senderType) return fail("booking access denied", origin, 403);

    const { data: message, error: insertError } = await supa
      .from("messages")
      .insert({
        booking_id: booking.id,
        sender_type: senderType,
        sender_user_id: user.id,
        body: encryptedBody,
        envelope_version: 1,
        client_safety_flags: clientSafetyFlags,
        moderation_state: clientSafetyFlags.length > 0 ? "flagged_client" : "clear",
      })
      .select("id,booking_id,sender_type,sender_user_id,body,created_at,envelope_version,client_safety_flags,moderation_state")
      .single();

    if (insertError) return fail("message could not be sent", origin, 500);

    return ok({ message }, origin, 201);
  } catch (error) {
    console.error("send-booking-message failed", error);
    return fail("message could not be sent", origin, 500);
  }
});
