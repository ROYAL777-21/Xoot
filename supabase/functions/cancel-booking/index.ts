import {
  assertBookingParticipant,
  cleanId,
  cleanText,
  fail,
  handlePreflight,
  insertNotification,
  insertReviewQueue,
  ok,
  readJson,
  requireAuth,
  writeAuditLog,
} from "../_shared/action-utils.ts";
import { canTransition, normaliseBookingStatus } from "../_shared/booking-state-machine.ts";
import { consumeRateLimit } from "../_shared/governance-utils.ts";

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
    const body = await readJson(req);
    const bookingId = cleanId(body.bookingId ?? body.booking_id);
    const reason = cleanText(body.reason, 500) || "Client cancellation request";
    if (!bookingId) return fail("booking_id required", origin, 400);

    const { data: booking, error } = await supa
      .from("bookings")
      .select("id,user_id,xooter_id,scheduled_at,status,payment_status,cancelled_at")
      .eq("id", bookingId)
      .maybeSingle();
    if (error || !booking?.id) return fail("booking not found", origin, 404);

    const participant = await assertBookingParticipant(supa, booking, user.id);
    if (!participant.participant) return fail("booking access denied", origin, 403);
    /*
     * ⚠️ CONTRACTORS CANNOT CANCEL THROUGH THE CLIENT PATH.
     *
     * `assertBookingParticipant` grants the assigned contractor the same "participant" status
     * as the client, so before this check the contractor could cancel a PAID booking at any
     * point in the window — killing the job and firing the client's refund workflow without any
     * admin involvement. A contractor who cannot make a job goes through
     * `request-replacement` (which finds cover and compensates the client); cancellation with
     * refunds is the client's (or an admin's) decision, not the contractor's.
     */
    if (participant.role === "contractor") {
      return fail("a booking cannot be cancelled by its Xooter — request a replacement instead", origin, 403);
    }
    const currentStatus = normaliseBookingStatus(booking.status);
    if (!currentStatus) return fail("booking status is unsupported", origin, 409);
    if (currentStatus === "cancelled" || booking.cancelled_at) {
      return fail("booking cannot be cancelled in its current state", origin, 409);
    }
    const adminCancellationOverride =
      participant.role === "admin" && (currentStatus === "completed" || currentStatus === "in_progress");
    if (!canTransition(currentStatus, "cancelled") && !adminCancellationOverride) {
      return fail("booking cannot be cancelled in its current state", origin, participant.role === "admin" ? 409 : 403);
    }

    // Rate limit, then claim the cancellation optimistically so two concurrent cancels cannot
    // both insert a refund request for the same payment.
    const limit = await consumeRateLimit(supa, {
      bucket: "cancellations",
      actor: user.id,
      action: "cancel_booking",
      limitCount: 5,
      windowSeconds: 300,
    });
    if (!limit.allowed) return fail("too many cancellation attempts, please wait a moment", origin, 429);

    const { data: payment } = await supa
      .from("payment_records")
      .select("id,amount,currency,status")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const refund = calculateRefund(booking, payment);
    /*
     * Status-guarded cancellation claim (the pattern `respond-xooter-job` uses): the update
     * lands only if the status is STILL the one we read, so two concurrent cancels cannot both
     * proceed and mint two `refund_requests` rows for one payment.
     */
    const { data: cancelClaim } = await supa
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        payment_status: payment?.status === "paid" ? "paid" : "cancelled",
        sensitive_data_revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id)
      .eq("status", booking.status)
      .select("id")
      .maybeSingle();
    if (!cancelClaim?.id) {
      return fail("booking changed while cancelling — please retry", origin, 409);
    }

    await supa.from("booking_status_events").insert({
      booking_id: booking.id,
      actor_id: user.id,
      status: "cancelled",
      label: "Booking cancelled",
      meta: { previous_status: currentStatus, refund },
    });

    await supa.from("xooter_jobs").update({ state: "expired" }).eq("booking_id", booking.id).in("state", ["offered", "accepted"]);

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
        xooterId: booking.xooter_id,
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

    if (booking.xooter_id) {
      const { data: xooter } = await supa.from("xooters").select("user_id").eq("id", booking.xooter_id).maybeSingle();
      if (xooter?.user_id) {
        await insertNotification(supa, {
          userId: xooter.user_id,
          kind: "booking_cancelled",
          title: "Booking cancelled",
          body: "A booking assigned to you has been cancelled and removed from your active jobs.",
          link: `/xooter/jobs`,
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
