import { fail, ok } from "../_shared/action-utils.ts";
import {
  getAdminActionContext,
  getRequiredId,
  requireAdminReason,
  writeStrictAdminAuditLog,
} from "../_shared/admin-action-utils.ts";

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

    await writeStrictAdminAuditLog(supa, {
      adminId: user.id,
      action: "admin_confirm_payment",
      targetTable: "payment_records",
      targetId: payment.id,
      changes: {
        from: { status: payment.status },
        to: { status: "admin_confirmed" },
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
      .update({ status: "admin_confirmed", updated_at: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("status", "pending")
      .select("id,status")
      .single();
    if (error || !data?.id) return fail("payment update failed", origin, 400);

    return ok({ payment_id: data.id, status: data.status }, origin);
  } catch (error) {
    console.error("admin-confirm-payment failed", error);
    return fail("admin payment confirmation failed", origin, 500);
  }
});

