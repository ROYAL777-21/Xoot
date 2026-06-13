import {
  assertBookingParticipant,
  cleanId,
  cleanText,
  fail,
  handlePreflight,
  insertNotification,
  insertReviewQueue,
  ok,
  requireAuth,
  writeAuditLog,
} from "../_shared/action-utils.ts";

const cancellableStatuses = new Set([
  "draft",
  "pending",
  "pending_payment",
  "payment_confirmed",
  "awaiting_assignment",
  "assigned",
  "confirmed",
  "reassigned",
]);

const calculateRefund = (booking: any, payment: any) => {
  if (!payment || payment.status !== "paid") return { eligible: false, amount: 0, reason: "not_paid" };
  const scheduledAt = new Date(booking.scheduled_at).getTime();
  const hoursUntilBooking = (scheduledAt - Date.now()) / 36e5;
  const paidAmount = Number(payment.amount ?? 0);
  if (hoursUntilBooking >= 12) return { eligible: true, amount: paidAmount, reason: "full_refund_12h_window" };
  if (hoursUntilBooking >= 2) return { eligible: true, amount: Math.round(paidAmount * 0.5 * 100) / 100, reason: "partial_refund_2h_window" };
  return { eligible: false, amount: 0, reason: "late_cancellation_no_auto_refund" };
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth as { user: any; supa: any };

  try {
    const body = await req.json();
    const bookingId = cleanId(body.bookingId ?? body.booking_id);
    const reason = cleanText(body.reason, 500) || "Client cancellation request";
    if (!bookingId) return fail("booking_id required", origin, 400);

    const { data: booking, error } = await supa
      .from("bookings")
      .select("id,user_id,zooter_id,scheduled_at,status,payment_status,cancelled_at")
      .eq("id", bookingId)
      .maybeSingle();
    if (error || !booking?.id) return fail("booking not found", origin, 404);

    const participant = await assertBookingParticipant(supa, booking, user.id);
    if (!participant.participant) return fail("booking access denied", origin, 403);
    if (booking.status === "completed" || booking.status === "cancelled" || booking.cancelled_at) {
      return fail("booking cannot be cancelled in its current state", origin, 409);
    }
    if (booking.status === "in_progress" && participant.role !== "admin") {
      return fail("in-progress bookings require admin cancellation", origin, 403);
    }
    if (!cancellableStatuses.has(String(booking.status)) && participant.role !== "admin") {
      return fail("booking cannot be cancelled in its current state", origin, 409);
    }

    const { data: payment } = await supa
      .from("payment_records")
      .select("id,amount,currency,status")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const refund = calculateRefund(booking, payment);
    await supa
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        payment_status: payment?.status === "paid" ? "paid" : "cancelled",
        sensitive_data_revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    await supa.from("zooter_jobs").update({ state: "expired" }).eq("booking_id", booking.id).in("state", ["offered", "accepted"]);

    let refundRequestId: string | null = null;
    if (refund.eligible && refund.amount > 0 && payment?.id) {
      const { data: refundRequest } = await supa.from("refund_requests").insert({
        booking_id: booking.id,
        payment_record_id: payment.id,
        user_id: booking.user_id,
        amount: refund.amount,
        currency: payment.currency ?? "ZAR",
        reason: refund.reason,
        requested_by: user.id,
      }).select("id").single();
      refundRequestId = refundRequest?.id ?? null;
      await insertReviewQueue(supa, {
        queueType: "payment",
        subjectTable: "refund_requests",
        subjectId: refundRequestId,
        userId: booking.user_id,
        zooterId: booking.zooter_id,
        bookingId: booking.id,
        priority: "normal",
        summary: `Refund review queued for cancelled booking (${refund.reason})`,
      });
    }

    await insertNotification(supa, {
      userId: booking.user_id,
      kind: "booking_cancelled",
      title: "Booking cancelled",
      body: refund.eligible ? "Your booking was cancelled and a refund review has been queued." : "Your booking was cancelled. Support will review any follow-up if needed.",
      link: `/app/bookings/${booking.id}`,
    });

    if (booking.zooter_id) {
      const { data: zooter } = await supa.from("zooters").select("user_id").eq("id", booking.zooter_id).maybeSingle();
      if (zooter?.user_id) {
        await insertNotification(supa, {
          userId: zooter.user_id,
          kind: "booking_cancelled",
          title: "Booking cancelled",
          body: "A booking assigned to you has been cancelled and removed from your active jobs.",
          link: `/zooter/jobs`,
        });
      }
    }

    await writeAuditLog(supa, {
      actorId: user.id,
      action: "cancel_booking",
      targetTable: "bookings",
      targetId: booking.id,
      changes: { status: "cancelled", refund, refund_request_id: refundRequestId },
      reason,
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    return ok({ booking_id: booking.id, status: "cancelled", refund, refund_request_id: refundRequestId }, origin);
  } catch (error) {
    console.error("cancel-booking failed", error);
    return fail("booking cancellation failed", origin, 500);
  }
});
