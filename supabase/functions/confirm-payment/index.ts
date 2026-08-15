import {
  fail,
  getServiceClient,
  handlePreflight,
  ok,
  writeAuditLog,
} from "../_shared/action-utils.ts";
import { claimProviderEvent, markProviderEventProcessed } from "../_shared/governance-utils.ts";
import {
  applyBookingPaymentConfirmed,
  assertBookingCanConfirmPayment,
} from "../_shared/payment-confirmation.ts";
import {
  PAYFAST_VALIDATE_URL_LIVE,
  PAYFAST_VALIDATE_URL_SANDBOX,
  normaliseStatus,
  sourceAllowed,
  validateWithPayFast,
  verifySignature,
} from "../_shared/payfast.ts";
import { resolveMode } from "../_shared/payfast-checkout.ts";

/**
 * ⚠️ REWRITTEN 2026-08-13 for PayFast. Read this before "simplifying" it back.
 *
 * The previous providers signed a JSON body with an HMAC in a REQUEST HEADER, so one check —
 * recompute the HMAC, compare — was the whole verification. PayFast does none of that:
 *
 *   - the body is `application/x-www-form-urlencoded`, not JSON
 *   - the signature is a FIELD IN THE BODY, and there is no signature header at all
 *   - the hash is MD5 over the fields IN THE ORDER SENT, with the passphrase appended
 *
 * Keeping the old shape and renaming the provider would have produced an endpoint that reads
 * `req.headers.get("x-payfast-signature")`, finds nothing, and — depending on how the null flowed —
 * either rejects every real payment or accepts anything. Both are worse than no integration,
 * because the code looks finished.
 *
 * Four checks now, in `_shared/payfast.ts`, each independently able to reject:
 *   1. signature   — the sender holds the passphrase
 *   2. amount      — the notification matches the order we created  (below, against payment_records)
 *   3. validate    — PayFast confirms it sent this, server to server
 *   4. source IP   — optional, additive; see the module for why it skips rather than fails closed
 *
 * The record matching, currency check and idempotency below are unchanged and provider-agnostic —
 * that part was good and is the reason a replay cannot double-credit.
 */
const isPaidStatus = (status: string) => normaliseStatus(status) === "COMPLETE";

/**
 * `payfast` is the only payment provider. The rest are non-payment event sources that share this
 * function's provider-event ledger.
 */
const allowedProviderEvents = new Set(["payfast", "twilio", "brevo", "openai", "mapbox", "expo", "cloudflare", "hostinger", "airtable", "internal"]);

const resolvePaymentEventId = (payload: Record<string, unknown>, providerReference: string, status: string) =>
  String(
    payload.event_id ??
      payload.webhook_id ??
      payload.id ??
      payload.transaction_id ??
      payload.payment_id ??
      `${providerReference}:${status.toLowerCase()}`,
  ).trim();

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const rawBody = await req.text();

  /*
   * PayFast ITN verification, in the order that rejects soonest and cheapest.
   *
   * `params` is built from the RAW body, not from an object: PayFast signs the fields in the order
   * it sent them, and any `Object.keys()` round trip is liable to reorder them into a hash that is
   * valid-looking and never matches.
   */
  const params = new URLSearchParams(rawBody);
  const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") ?? "";

  const signatureResult = verifySignature(params, passphrase);
  if (!signatureResult.ok) return fail(signatureResult.reason, origin, 401);

  // Additive layer. Skips loudly when unconfigured rather than failing closed on a list that could
  // not be read from PayFast's own documentation — see `_shared/payfast.ts`.
  const source = sourceAllowed(
    req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
    Deno.env.get("PAYFAST_ALLOWED_IPS") ?? "",
  );
  if (!source.ok) return fail(source.reason ?? "source not allowed", origin, 401);
  if (source.skipped) console.warn("payfast: PAYFAST_ALLOWED_IPS unset — source check skipped");

  /*
   * The authoritative check, and deliberately last: it costs a network round trip, so it runs only
   * after the free checks have passed. A forged notification never reaches it.
   */
  const validation = await validateWithPayFast(
    rawBody,
    /*
     * ⚠️ The validate host MUST match the host the checkout sent the customer to.
     *
     * This defaulted to the LIVE validate URL while `create-payment-session` defaults to the
     * SANDBOX process URL. A sandbox test payment would then be posted back to the live endpoint,
     * which has never heard of it, return INVALID, and the booking would never confirm — with the
     * signature and amount checks both passing, so the log would say "postback did not validate"
     * and point at nothing.
     *
     * That is precisely the founder's first smoke test, so it would have failed on the one run
     * that matters. Both sides now read `PAYFAST_MODE`, and an explicit `PAYFAST_VALIDATE_URL`
     * still overrides.
     */
    Deno.env.get("PAYFAST_VALIDATE_URL") ??
      (resolveMode(Deno.env.get("PAYFAST_MODE")) === "live"
        ? PAYFAST_VALIDATE_URL_LIVE
        : PAYFAST_VALIDATE_URL_SANDBOX),
  );
  if (!validation.ok) return fail(validation.reason, origin, 401);

  let providerEventId: string | null = null;
  let supa: ReturnType<typeof getServiceClient> | null = null;

  try {
    /*
     * Form fields, not JSON. `m_payment_id` is the reference WE generated when creating the order,
     * which is what `payment_records.provider_reference` holds; `pf_payment_id` is PayFast's own id
     * and is kept for reconciliation but never used to look the record up.
     *
     * PayFast sends no currency field — it is a ZAR-only gateway — so the comparison below runs
     * against the record's own currency rather than against something the sender controls.
     */
    const payload = Object.fromEntries(params.entries()) as Record<string, unknown>;
    const providerReference = String(params.get("m_payment_id") ?? "").trim();
    const status = String(params.get("payment_status") ?? "").trim();
    const amount = Number(params.get("amount_gross"));
    const currency = "ZAR";
    if (!providerReference) return fail("payment reference required", origin, 400);
    if (!isPaidStatus(status)) return fail("payment webhook status is not paid", origin, 400);
    if (!Number.isFinite(amount) || amount < 0) return fail("payment amount required", origin, 400);

    supa = getServiceClient();
    const { data: payment, error: paymentError } = await supa
      .from("payment_records")
      .select("id,user_id,booking_id,amount,currency,status,provider,provider_reference,meta")
      .eq("provider_reference", providerReference)
      .maybeSingle();

    if (paymentError || !payment?.id) return fail("payment record not found", origin, 404);
    if (String(payment.currency ?? "ZAR").toUpperCase() !== currency) return fail("payment currency mismatch", origin, 409);
    if (Math.round(Number(payment.amount) * 100) !== Math.round(amount * 100)) return fail("payment amount mismatch", origin, 409);
    /*
     * `admin_confirmed` counts as already handled, not just `paid`.
     *
     * An admin can confirm a record that was already routed to PayFast — they saw the money in the
     * dashboard, or the customer sent proof. That leaves `status = 'admin_confirmed'` and the
     * booking at `payment_confirmed`. Without this branch a later genuine ITN for the same payment
     * would miss the idempotency return, then fail `assertBookingCanConfirmPayment` because the
     * booking has already advanced, and return 409 — so PayFast would retry that notification on a
     * schedule forever against a payment that is, in fact, settled.
     */
    if (payment.status === "paid" || payment.status === "admin_confirmed") {
      return ok(
        { payment_record_id: payment.id, booking_id: payment.booking_id, idempotent: true, prior_status: payment.status },
        origin,
      );
    }

    /*
     * Asserted BEFORE the provider event is claimed. Claiming is what makes this webhook
     * idempotent, and a claim followed by a refused transition would burn the event id and turn
     * PayFast's retry into a silent no-op.
     */
    let bookingForPayment: Record<string, any> | null = null;
    if (payment.booking_id) {
      const check = await assertBookingCanConfirmPayment(supa, payment.booking_id);
      if (!check.ok) return fail(check.reason, origin, 409);
      bookingForPayment = check.booking;
    }

    // The only route into this function is a verified PayFast ITN, so the provider is not
    // inferred from attacker-controlled fields any more — it is known.
    const provider = "payfast";
    const providerEvent = await claimProviderEvent(supa, {
      provider,
      eventId: resolvePaymentEventId(payload, providerReference, status),
      eventType: "payment_confirmed",
      rawPayload: rawBody,
      subjectTable: "payment_records",
      subjectId: payment.id,
      metadata: {
        provider_reference: providerReference,
        booking_id: payment.booking_id,
        currency,
        status,
      },
    });
    providerEventId = providerEvent.providerEventId;
    if (providerEvent.alreadySeen) {
      return ok({ payment_record_id: payment.id, booking_id: payment.booking_id, idempotent: true }, origin);
    }

    await supa
      .from("payment_records")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        meta: {
          ...(payment.meta ?? {}),
          webhook_confirmed_at: new Date().toISOString(),
          webhook_status: status,
        },
      })
      .eq("id", payment.id);

    /*
     * Everything that follows the money — booking row, status event, job offer, notification and
     * the assignment outbox event — is in `_shared/payment-confirmation.ts`, which
     * `admin-confirm-payment` also calls.
     *
     * It was inline here until 2026-08-13, and the admin path did none of it: an EFT confirmed
     * against a bank statement left the booking `draft` forever. Sharing it is what stops the two
     * routes to `payment_confirmed` from reaching different states.
     */
    if (payment.booking_id && bookingForPayment) {
      await applyBookingPaymentConfirmed(supa, {
        bookingId: payment.booking_id,
        actorId: payment.user_id,
        paymentRecordId: payment.id,
        label: "Payment received",
        booking: bookingForPayment,
      });
    }

    await writeAuditLog(supa, {
      actorId: payment.user_id,
      action: "confirm_payment_webhook",
      targetTable: "payment_records",
      targetId: payment.id,
      changes: { status: "paid", provider_reference: providerReference, amount },
      reason: "Payment provider webhook verified by signature",
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    await markProviderEventProcessed(supa, providerEventId, "processed");

    return ok({ payment_record_id: payment.id, booking_id: payment.booking_id, status: "paid" }, origin);
  } catch (error) {
    console.error("confirm-payment failed", error);
    if (supa && providerEventId) {
      await markProviderEventProcessed(supa, providerEventId, "failed", error instanceof Error ? error.message : "payment confirmation failed")
        .catch((markError) => console.error("confirm-payment provider event mark failed", markError));
    }
    return fail("payment confirmation failed", origin, 500);
  }
});
