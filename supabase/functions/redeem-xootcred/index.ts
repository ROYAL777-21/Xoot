import {
  assertBookingParticipant,
  cleanId,
  fail,
  handlePreflight,
  ok,
  readJson,
  requireAuth,
  toNumber,
  writeAuditLog,
} from "../_shared/action-utils.ts";
import { consumeRateLimit } from "../_shared/governance-utils.ts";
import { normaliseBookingStatus } from "../_shared/booking-state-machine.ts";

const getAvailableBalance = async (supa: any, userId: string) => {
  const { data } = await supa
    .from("xootcred_ledger")
    .select("amount,direction,status,expires_at,meta,reason")
    .eq("user_id", userId);

  return (data ?? []).reduce((balance: number, row: any) => {
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return balance;
    const amount = Number(row.amount ?? 0);
    if (row.direction === "credit" && row.status === "available") return balance + amount;
    if (row.direction === "debit" && ["available", "redeemed"].includes(row.status)) return balance - amount;
    return balance;
  }, 0);
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
    const requestedAmount = Math.max(0, toNumber(body.amount, 0));
    if (!bookingId) return fail("booking_id required", origin, 400);
    if (requestedAmount <= 0) return fail("redemption amount required", origin, 400);

    const { data: booking } = await supa
      .from("bookings")
      .select("id,user_id,xooter_id,status")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking?.id) return fail("booking not found", origin, 404);

    const participant = await assertBookingParticipant(supa, booking, user.id);
    if (participant.role !== "client" && participant.role !== "admin") return fail("booking access denied", origin, 403);
    const currentStatus = normaliseBookingStatus(booking.status);
    if (!currentStatus || !["draft", "pending_payment"].includes(currentStatus)) {
      return fail("XootCred can only be redeemed before payment confirmation", origin, 409);
    }

    const { data: payment } = await supa
      .from("payment_records")
      .select("id,amount,status,meta")
      .eq("booking_id", booking.id)
      .eq("user_id", booking.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!payment?.id) return fail("payment record not found", origin, 404);
    if (payment.status !== "pending") return fail("payment already processed", origin, 409);

    const currentAmountDue = Number(payment.amount ?? 0);
    const balance = await getAvailableBalance(supa, booking.user_id);
    const redeemable = Math.min(requestedAmount, balance, Math.max(0, currentAmountDue - 50));
    if (redeemable <= 0) return fail("XootCred cannot reduce booking below R50", origin, 409);

    /*
     * ⚠️ DOUBLE-SPEND GUARD. The balance above is a sum over ledger rows read BEFORE this write;
     * two concurrent redemptions both saw the same balance and both inserted debits, spending
     * credits twice (and the DB has no constraint to stop it). Two locks now make that
     * practically impossible without a migration:
     *
     *   1. A per-user rate limit of ONE redemption per 15s — a concurrent attempt from the same
     *      user is refused before it can race. (The first debit is committed well within 15s.)
     *   2. An optimistic lock on the payment record: the update only lands if the amount is
     *      STILL what we read, so two racing writers cannot both apply their reduction.
     *
     * The durable fix is a SECURITY DEFINER RPC that recomputes the balance inside the
     * transaction (same shape as `claim_provider_event`); recorded in the security notes.
     */
    const limit = await consumeRateLimit(supa, {
      bucket: "xootcred",
      actor: booking.user_id,
      action: "redeem_xootcred",
      limitCount: 1,
      windowSeconds: 15,
    });
    if (!limit.allowed) return fail("XootCred redemption is being processed — please retry in a moment", origin, 429);

    await supa.from("xootcred_ledger").insert({
      user_id: booking.user_id,
      booking_id: booking.id,
      amount: redeemable,
      direction: "debit",
      reason: "redemption",
      status: "redeemed",
      meta: { reason: "booking_redemption", payment_record_id: payment.id },
    });

    const newAmountDue = Math.max(50, Math.round((currentAmountDue - redeemable) * 100) / 100);
    const { data: amountClaim } = await supa.from("payment_records").update({
      amount: newAmountDue,
      meta: { ...(payment.meta ?? {}), xootcred_redemption: redeemable },
      updated_at: new Date().toISOString(),
    }).eq("id", payment.id).eq("status", "pending").eq("amount", currentAmountDue).select("id").maybeSingle();
    if (!amountClaim?.id) {
      /*
       * Zero affected rows means another redemption (or a webhook) moved the amount between our
       * read and this write. The debit above is orphaned, so reverse it rather than leave the
       * user's balance wrong — this path should be unreachable thanks to the rate limit, but a
       * guard that leaves the books unbalanced when it trips is worse than no guard.
       */
      await supa.from("xootcred_ledger").insert({
        user_id: booking.user_id,
        booking_id: booking.id,
        amount: redeemable,
        direction: "credit",
        reason: "redemption_reversal",
        status: "available",
        meta: { reason: "concurrent_redemption_reversed", payment_record_id: payment.id },
      });
      return fail("XootCred redemption is being processed — please retry in a moment", origin, 409);
    }

    await writeAuditLog(supa, {
      actorId: user.id,
      action: "redeem_xootcred",
      targetTable: "xootcred_ledger",
      targetId: booking.id,
      changes: { redeemed: redeemable, previous_amount_due: currentAmountDue, amount_due: newAmountDue },
      reason: "Client redeemed available XootCred against pending booking payment",
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    return ok({ booking_id: booking.id, redeemed: redeemable, updated_balance: balance - redeemable, amount_due: newAmountDue }, origin);
  } catch (error) {
    console.error("redeem-xootcred failed", error);
    return fail("XootCred redemption failed", origin, 500);
  }
});
