import { fail, ok } from "../_shared/action-utils.ts";
import { getAdminActionContext, getRequiredId, requireAdminReason } from "../_shared/admin-action-utils.ts";
import { applyBookingPaymentConfirmed, assertBookingCanConfirmPayment } from "../_shared/payment-confirmation.ts";
import { recordAmountCents } from "../_shared/payfast.ts";

Deno.serve(async (req) => {
  // Revalidates an actual admin session and AAL2 before the service-only settlement call.
  const context = await getAdminActionContext(req);
  if (context.response) return context.response;
  const { body, origin, supa, user } = context;
  const idResult = getRequiredId(body.payment_id ?? body.paymentId, origin, "payment_id");
  if (idResult.response) return idResult.response;
  const reasonResult = requireAdminReason(body.reason, origin);
  if (reasonResult.response) return reasonResult.response;
  try {
    const { data: payment, error: paymentError } = await supa.from("payment_records")
      .select("id,status,user_id,booking_id,amount,currency,provider,provider_reference,payment_kind")
      .eq("id", idResult.id).maybeSingle();
    if (paymentError || !payment?.id) return fail("payment record not found", origin, 404);
    if (!["pending", "admin_confirmed"].includes(payment.status)) return fail("only pending payment records can be admin-confirmed", origin, 409);
    if (payment.payment_kind !== "booking" || !payment.booking_id) return fail("this payment needs its own fulfilment review", origin, 503);
    const amountCents = recordAmountCents(payment.amount);
    if (amountCents === null || payment.currency !== "ZAR" || !payment.provider_reference) return fail("payment identity or amount is invalid", origin, 409);
    if (payment.status === "pending") {
      const check = await assertBookingCanConfirmPayment(supa, payment.booking_id);
      if (!check.ok) return fail(check.reason, origin, 409);
    }
    // The strict admin audit is inside the same transaction as the financial and booking writes.
    const result = await applyBookingPaymentConfirmed(supa, {
      paymentRecordId: payment.id, source: "admin", amountCents, providerReference: payment.provider_reference,
      adminId: user.id, reason: reasonResult.reason,
    });
    return ok({ payment_id: result.payment_record_id, booking_id: result.booking_id, status: result.status, idempotent: result.idempotent }, origin);
  } catch {
    console.error("admin-confirm-payment settlement failed");
    return fail("admin payment confirmation needs retry or reconciliation", origin, 500);
  }
});
