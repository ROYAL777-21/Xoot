import {
  assertBookingParticipant,
  cleanArray,
  cleanId,
  fail,
  handlePreflight,
  ok,
  readJson,
  requireAuth,
} from "../_shared/action-utils.ts";

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
    const messageIds = cleanArray(body.messageIds ?? body.message_ids, 50, 80);

    if (!bookingId) return fail("booking_id required", origin, 400);
    if (messageIds.length === 0) return ok({ marked: 0 }, origin);

    const { data: booking, error: bookingError } = await supa
      .from("bookings")
      .select("id,user_id,zooter_id,status")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking?.id) return fail("booking not found", origin, 404);

    const participant = await assertBookingParticipant(supa, booking, user.id);
    if (!participant.participant || participant.role === "admin") return fail("booking access denied", origin, 403);

    const { data: messages, error: messagesError } = await supa
      .from("messages")
      .select("id,booking_id")
      .eq("booking_id", booking.id)
      .in("id", messageIds);

    if (messagesError) return fail("messages unavailable", origin, 500);

    const rows = (messages ?? []).map((message: { id: string }) => ({
      message_id: message.id,
      booking_id: booking.id,
      user_id: user.id,
      read_at: new Date().toISOString(),
    }));

    if (rows.length === 0) return ok({ marked: 0 }, origin);

    const { error: receiptError } = await supa
      .from("booking_message_read_receipts")
      .upsert(rows, { onConflict: "message_id,user_id" });

    if (receiptError) return fail("read receipts could not be updated", origin, 500);

    return ok({ marked: rows.length }, origin);
  } catch (error) {
    console.error("mark-booking-message-read failed", error);
    return fail("read receipts could not be updated", origin, 500);
  }
});
