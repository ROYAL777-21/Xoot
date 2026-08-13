import { fail, ok } from "../_shared/action-utils.ts";
import {
  getAdminActionContext,
  getRequiredId,
  requireAdminReason,
  writeStrictAdminAuditLog,
} from "../_shared/admin-action-utils.ts";
import {
  applyBookingPaymentConfirmed,
  assertBookingCanConfirmPayment,
} from "../_shared/payment-confirmation.ts";

Deno.serve(async (req) => {
  const context = await getAdminActionContext(req);
  if (context.response) return context.response;

  const { body, origin, supa, user } = context;
  const idResult = getRequiredId(body.payment_id ?? body.paymentId, origin, "payment_id");
  if (idResult.response) return idResult.response;

  const reasonResult = requireAdminReason(body.reason, origin);
  if (reasonResult.response) return reasonResult.response;

  try {
    const { data: payment, error: paymentError } = await supa
      .from("payment_records")
      .select("id,status,user_id,booking_id,amount,currency,provider,payment_kind")
      .eq("id", idResult.id)
      .maybeSingle();
    if (paymentError || !payment?.id) return fail("payment record not found", origin, 404);
    if (payment.status !== "pending") return fail("only pending payment records can be admin-confirmed", origin, 409);

    /*
     * Check the booking can move BEFORE writing anything.
     *
     * Until 2026-08-13 this function confirmed the payment record and stopped, so a booking paid
     * by EFT and confirmed by an admin stayed `draft` forever — no assignment, no job, while the
     * money sat in the bank. The transition is asserted first so a booking that cannot legally
     * advance (already cancelled, already confirmed) is refused before the audit log claims it
     * happened.
     */
    let bookingToAdvance: Record<string, any> | null = null;
    if (payment.booking_id) {
      const check = await assertBookingCanConfirmPayment(supa, payment.booking_id);
      if (!check.ok) return fail(check.reason, origin, 409);
      bookingToAdvance = check.booking;
    }

    /*
     * Record HOW the money arrived, not just that it did.
     *
     * A record still on `manual_pending` was never routed to a payment provider, so an admin
     * confirming it is confirming a bank transfer — `manual_eft` says so, and reconciliation can
     * later tell an EFT from a PayFast payment without reading the audit log. A record already on
     * `payfast` is left alone: an admin confirming that one saw it in PayFast's dashboard, and
     * relabelling it would lose that.
     *
     * Resolved before the audit log so the log states the value that is actually written.
     */
    const confirmedProvider = payment.provider === "manual_pending" ? "manual_eft" : payment.provider;

    await writeStrictAdminAuditLog(supa, {
      adminId: user.id,
      action: "admin_confirm_payment",
      targetTable: "payment_records",
      targetId: payment.id,
      changes: {
        from: { status: payment.status },
        to: { status: "admin_confirmed", provider: confirmedProvider },
        payment_kind: payment.payment_kind,
        provider: payment.provider,
        amount: payment.amount,
        currency: payment.currency,
      },
      reason: reasonResult.reason!,
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    const { data, error } = await supa
      .from("payment_records")
      .update({
        status: "admin_confirmed",
        provider: confirmedProvider,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .eq("status", "pending")
      .select("id,status")
      .single();
    if (error || !data?.id) return fail("payment update failed", origin, 400);

    /*
     * The booking follows the money. Same helper the provider webhook uses, so a booking paid by
     * EFT reaches exactly the state a card payment would — anything reading `bookings.status`
     * afterwards cannot tell, and should not have to.
     *
     * The label does differ, deliberately: `booking_status_events` records that a human confirmed
     * this rather than a signed provider event, which is the distinction that matters if the
     * payment is ever disputed.
     */
    if (payment.booking_id && bookingToAdvance) {
      await applyBookingPaymentConfirmed(supa, {
        bookingId: payment.booking_id,
        actorId: payment.user_id,
        paymentRecordId: payment.id,
        label: "Payment confirmed by admin",
        booking: bookingToAdvance,
      });
    }

    return ok(
      { payment_id: data.id, status: data.status, booking_id: payment.booking_id ?? null },
      origin,
    );
  } catch (error) {
    console.error("admin-confirm-payment failed", error);
    return fail("admin payment confirmation failed", origin, 500);
  }
});

