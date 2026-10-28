import { fail, getServiceClient, handlePreflight, ok } from "../_shared/action-utils.ts";
import { claimProviderEvent } from "../_shared/governance-utils.ts";
import { applyBookingPaymentConfirmed, assertBookingCanConfirmPayment } from "../_shared/payment-confirmation.ts";
import {
  PAYFAST_VALIDATE_URL_LIVE, PAYFAST_VALIDATE_URL_SANDBOX, normaliseStatus,
  amountMatches, merchantMatches, recordAmountCents, sourceAllowed, validateWithPayFast, verifySignature,
} from "../_shared/payfast.ts";
import { resolveMode } from "../_shared/payfast-checkout.ts";

/** Public PayFast ITN only. A customer return URL or JWT never proves payment. */
Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;
  if (req.method !== "POST") return fail("method not allowed", origin, 405);
  const rawBody = await req.text();
  if (rawBody.length > 65_536) return fail("notification too large", origin, 413);
  // Keep original field order for PayFast's PHP-urlencoded MD5 signature.
  const params = new URLSearchParams(rawBody);
  const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") ?? "";
  if (!passphrase.trim()) {
    console.warn("payfast_callback_rejected: verification_configuration");
    return fail("payment verification is not configured", origin, 503);
  }
  for (const field of ["merchant_id", "m_payment_id", "pf_payment_id", "amount_gross", "payment_status", "signature"]) {
    if (params.getAll(field).length !== 1) {
      // Only fixed field names/counts and a content-type boolean, never ITN values.
      console.warn("payfast_callback_rejected: critical_fields", {
        field,
        count: params.getAll(field).length,
        formEncoded: (req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/x-www-form-urlencoded"),
        multipartEncoded: (req.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data"),
        jsonEncoded: (req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json"),
        emptyBody: rawBody.length === 0,
      });
      return fail("duplicate or missing PayFast field", origin, 400);
    }
  }
  const signatureResult = verifySignature(params, passphrase);
  if (!signatureResult.ok) {
    console.warn("payfast_callback_rejected: signature");
    return fail(signatureResult.reason, origin, 401);
  }
  if (!merchantMatches(params.get("merchant_id"), Deno.env.get("PAYFAST_MERCHANT_ID"))) {
    console.warn("payfast_callback_rejected: merchant_identity");
    return fail("PayFast merchant account mismatch or not configured", origin, 401);
  }
  const source = sourceAllowed(req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"), Deno.env.get("PAYFAST_ALLOWED_IPS") ?? "");
  if (!source.ok) {
    console.warn("payfast_callback_rejected: source");
    return fail(source.reason ?? "source not allowed", origin, 401);
  }
  if (source.skipped) console.warn("payfast: PAYFAST_ALLOWED_IPS unset — source check skipped");
  const validation = await validateWithPayFast(rawBody, Deno.env.get("PAYFAST_VALIDATE_URL") ??
    (resolveMode(Deno.env.get("PAYFAST_MODE")) === "live" ? PAYFAST_VALIDATE_URL_LIVE : PAYFAST_VALIDATE_URL_SANDBOX));
  if (!validation.ok) {
    console.warn("payfast_callback_rejected: server_postback");
    return fail(validation.reason, origin, 401);
  }

  let providerEventId: string | null = null;
  let supa: ReturnType<typeof getServiceClient> | null = null;
  try {
    const providerReference = String(params.get("m_payment_id") ?? "").trim();
    const providerTransactionId = String(params.get("pf_payment_id") ?? "").trim();
    const status = String(params.get("payment_status") ?? "").trim();
    const grossAmount = params.get("amount_gross");
    if (!providerReference || !providerTransactionId || providerTransactionId.length > 120) return fail("payment reference required", origin, 400);
    if (normaliseStatus(status) !== "COMPLETE") return fail("payment webhook status is not paid", origin, 400);
    if (!grossAmount || !Number.isSafeInteger(recordAmountCents(grossAmount))) return fail("invalid PayFast gross amount", origin, 400);
    supa = getServiceClient();
    const { data: payment, error: paymentError } = await supa.from("payment_records")
      .select("id,user_id,booking_id,amount,currency,status,provider,provider_reference,payment_kind")
      .eq("provider_reference", providerReference).maybeSingle();
    if (paymentError || !payment?.id) return fail("payment record not found", origin, 404);
    if (payment.currency !== "ZAR") return fail("payment currency mismatch", origin, 409);
    const expectedCents = recordAmountCents(payment.amount);
    if (expectedCents === null || !amountMatches(grossAmount, expectedCents).ok) return fail("payment amount mismatch", origin, 409);
    if (payment.provider !== "payfast") return fail("payment provider mismatch", origin, 409);
    if (payment.payment_kind !== "booking" || !payment.booking_id) return fail("payment fulfilment needs reconciliation", origin, 409);
    if (payment.status === "pending") {
      const check = await assertBookingCanConfirmPayment(supa, payment.booking_id);
      if (!check.ok) return fail(check.reason, origin, 409);
    }
    const providerEvent = await claimProviderEvent(supa, {
      provider: "payfast", eventId: `payfast:${providerTransactionId}`, eventType: "payment_confirmed", rawPayload: rawBody,
      subjectTable: "payment_records", subjectId: payment.id,
      metadata: { provider_reference: providerReference, booking_id: payment.booking_id, currency: "ZAR", amount_cents: expectedCents, status, pf_payment_id: providerTransactionId },
    });
    providerEventId = providerEvent.providerEventId;
    // Already claimed is safe to retry: the locked SQL transaction verifies the event binding
    // and receipt, and does not repeat jobs/notifications or regress a later booking status.
    const result = await applyBookingPaymentConfirmed(supa, {
      paymentRecordId: payment.id, source: "payfast", amountCents: expectedCents, providerReference,
      providerEventId, payloadHash: providerEvent.payloadHash, providerTransactionId,
    });
    return ok(result, origin);
  } catch (error) {
    console.error("confirm-payment settlement failed", error instanceof Error ? error.message : "unknown error");
    if (supa && providerEventId) {
      // A response may be lost after commit. Never overwrite an atomically processed event.
      const { error: markError } = await supa.from("provider_events").update({ status: "failed", error_message: "Settlement failed or response unconfirmed; retry or reconcile", processed_at: new Date().toISOString() })
        .eq("id", providerEventId).neq("status", "processed");
      if (markError) console.error("confirm-payment failure status could not be saved");
    }
    return fail("payment confirmation needs retry or reconciliation", origin, 500);
  }
});
