import {
  assertBookingParticipant,
  cleanId,
  cleanText,
  fail,
  getPriority,
  handlePreflight,
  insertReviewQueue,
  ok,
  readJson,
  requireAuth,
} from "../_shared/action-utils.ts";
import { consumeRateLimit } from "../_shared/governance-utils.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth as { user: { id: string }; supa: any };

    /*
     * Rate limit (security round 2): this endpoint mints money-adjacent / queue rows per
     * call and previously had no bound, so a scripted caller could flood bookings, queues
     * or the email outbox through it.
     */
    const rateLimit = await consumeRateLimit(supa, {
      bucket: "moderation",
      actor: user.id,
      action: "report_booking_message",
      limitCount: 10,
      windowSeconds: 300,
    });
    if (!rateLimit.allowed) return fail("too many requests, please wait a moment", origin, 429);

  try {
    const body = await readJson(req);
    const messageId = cleanId(body.messageId ?? body.message_id);
    const reason = cleanText(body.reason, 120) || "User reported this booking chat message";
    const details = cleanText(body.details, 500);

    if (!messageId) return fail("message_id required", origin, 400);

    const { data: message, error: messageError } = await supa
      .from("messages")
      .select("id,booking_id,sender_type,created_at")
      .eq("id", messageId)
      .maybeSingle();

    if (messageError || !message?.id) return fail("message not found", origin, 404);

    const { data: booking, error: bookingError } = await supa
      .from("bookings")
      .select("id,user_id,xooter_id,status")
      .eq("id", message.booking_id)
      .maybeSingle();

    if (bookingError || !booking?.id) return fail("booking not found", origin, 404);

    const participant = await assertBookingParticipant(supa, booking, user.id);
    if (!participant.participant || participant.role === "admin") return fail("booking access denied", origin, 403);

    const { data: report, error: reportError } = await supa
      .from("booking_message_reports")
      .insert({
        message_id: message.id,
        booking_id: booking.id,
        reporter_id: user.id,
        reason,
        details: details || null,
      })
      .select("id,message_id,booking_id,reason,status,created_at")
      .single();

    if (reportError) return fail("message report could not be created", origin, 500);

    await supa
      .from("messages")
      .update({ moderation_state: "reported", reported_at: new Date().toISOString() })
      .eq("id", message.id);

    await insertReviewQueue(supa, {
      queueType: "booking_chat_report",
      subjectTable: "messages",
      subjectId: message.id,
      userId: user.id,
      bookingId: booking.id,
      priority: getPriority(`${reason} ${details}`),
      summary: `Booking chat message reported: ${reason}`,
    });

    return ok({ report, role: participant.role }, origin, 201);
  } catch (error) {
    console.error("report-booking-message failed", error);
    return fail("message report could not be created", origin, 500);
  }
});
