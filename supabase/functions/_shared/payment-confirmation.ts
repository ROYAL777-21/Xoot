import { assertTransition, normaliseBookingStatus } from "./booking-state-machine.ts";

type SupabaseServiceClient = any;

/** Useful early feedback; the database repeats this check under the booking lock. */
export const assertBookingCanConfirmPayment = async (supa: SupabaseServiceClient, bookingId: string) => {
  const { data: booking, error } = await supa.from("bookings")
    .select("id,user_id,status").eq("id", bookingId).maybeSingle();
  const currentStatus = normaliseBookingStatus(booking?.status);
  if (error || !booking?.id || !currentStatus) return { ok: false as const, reason: "booking status is unsupported" };
  try { assertTransition(currentStatus, "payment_confirmed"); }
  catch { return { ok: false as const, reason: "booking cannot accept payment" }; }
  return { ok: true as const };
};

export type BookingPaymentSettlement = {
  payment_record_id: string;
  booking_id: string;
  status: "paid" | "admin_confirmed" | "refunded" | "cancelled";
  idempotent: boolean;
};

/**
 * Both verified routes use the same transaction. The database locks the payment and booking,
 * then commits the money, event, job offer, notification, assignment outbox and audit together.
 * A paid flag alone is never accepted as proof that those consequences completed.
 * Shared modules are frozen into each Edge deployment: redeploy both confirmation handlers.
 */
export const applyBookingPaymentConfirmed = async (supa: SupabaseServiceClient, input: {
  paymentRecordId: string;
  source: "payfast" | "admin";
  amountCents: number;
  providerReference: string;
  providerEventId?: string | null;
  payloadHash?: string | null;
  providerTransactionId?: string | null;
  adminId?: string | null;
  reason?: string | null;
}): Promise<BookingPaymentSettlement> => {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0 || !input.providerReference) {
    throw new Error("payment identity or amount is invalid");
  }
  const { data, error } = await supa.rpc("settle_booking_payment", {
    p_payment_id: input.paymentRecordId, p_source: input.source, p_amount_cents: input.amountCents,
    p_reference: input.providerReference, p_provider_event_id: input.providerEventId ?? null,
    p_payload_hash: input.payloadHash ?? null, p_provider_transaction_id: input.providerTransactionId ?? null,
    p_admin_id: input.adminId ?? null, p_reason: input.reason ?? null,
  });
  if (error) throw new Error(`atomic payment settlement failed: ${error.code ?? "database_error"}`);
  const row = data as Partial<BookingPaymentSettlement> | null;
  if (!row || row.payment_record_id !== input.paymentRecordId || typeof row.booking_id !== "string"
    || !row.booking_id || typeof row.idempotent !== "boolean"
    || !["paid", "admin_confirmed", "refunded", "cancelled"].includes(row.status ?? "")) {
    throw new Error("payment settlement receipt could not be confirmed");
  }
  return row as BookingPaymentSettlement;
};
