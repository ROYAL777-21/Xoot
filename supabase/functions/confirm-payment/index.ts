import {
  fail,
  getServiceClient,
  handlePreflight,
  insertNotification,
  insertOutbox,
  ok,
  writeAuditLog,
} from "../_shared/action-utils.ts";
import { assertTransition, normaliseBookingStatus } from "../_shared/booking-state-machine.ts";
import { claimProviderEvent, markProviderEventProcessed } from "../_shared/governance-utils.ts";
import { verifyPaymentWebhook } from "../_shared/payment-webhook-auth.ts";
import { readRequestTextWithLimit } from "../_shared/request-body.ts";

const isPaidStatus = (status: string) => ["paid", "success", "succeeded", "complete", "completed"].includes(status.toLowerCase());

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

  const requestBody = await readRequestTextWithLimit(req, {
    maxBytes: 64 * 1024,
    allowedContentTypes: ["application/json"],
  });
  if (!requestBody.ok) return fail(requestBody.error, origin, requestBody.status);

  const rawBody = requestBody.value;
  const signatureResult = await verifyPaymentWebhook(rawBody, req.headers, {
    stitch: Deno.env.get("STITCH_WEBHOOK_SECRET"),
    ozow: Deno.env.get("OZOW_WEBHOOK_SECRET"),
    internal: Deno.env.get("PAYMENT_WEBHOOK_SECRET"),
  });
  if (!signatureResult.ok) return fail(signatureResult.reason, origin, 401);

  let providerEventId: string | null = null;
  let supa: ReturnType<typeof getServiceClient> | null = null;

  try {
    const payload = JSON.parse(rawBody);
    const providerReference = String(payload.payment_reference ?? payload.provider_reference ?? payload.reference ?? "").trim();
    const status = String(payload.status ?? payload.payment_status ?? "").trim();
    const amount = Number(payload.amount ?? payload.amount_paid);
    const currency = String(payload.currency ?? "ZAR").trim().toUpperCase();
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
    if (payment.status === "paid") {
      return ok({ payment_record_id: payment.id, booking_id: payment.booking_id, idempotent: true }, origin);
    }

    let bookingForPayment: Record<string, any> | null = null;
    if (payment.booking_id) {
      const { data: booking } = await supa
        .from("bookings")
        .select("id,user_id,zooter_id,scheduled_at,service_type,status")
        .eq("id", payment.booking_id)
        .maybeSingle();

      const currentStatus = normaliseBookingStatus(booking?.status);
      if (!booking?.id || !currentStatus) return fail("booking status is unsupported", origin, 409);
      try {
        assertTransition(currentStatus, "payment_confirmed");
      } catch (error) {
        return fail(error instanceof Error ? error.message : "invalid booking transition", origin, 409);
      }
      bookingForPayment = booking;
    }

    const provider = signatureResult.provider;
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

    if (payment.booking_id && bookingForPayment) {
      await supa
        .from("bookings")
        .update({
          status: "payment_confirmed",
          payment_status: "paid",
          payment_confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.booking_id);

      await supa.from("booking_status_events").insert({
        booking_id: bookingForPayment.id,
        actor_id: payment.user_id,
        status: "payment_confirmed",
        label: "Payment received",
        meta: { payment_record_id: payment.id },
      });

      if (bookingForPayment.zooter_id) {
        const { data: existingJob } = await supa
          .from("zooter_jobs")
          .select("id")
          .eq("booking_id", bookingForPayment.id)
          .eq("zooter_id", bookingForPayment.zooter_id)
          .maybeSingle();
        if (existingJob?.id) {
          await supa.from("zooter_jobs").update({ state: "offered" }).eq("id", existingJob.id);
        } else {
          await supa.from("zooter_jobs").insert({ booking_id: bookingForPayment.id, zooter_id: bookingForPayment.zooter_id, state: "offered" });
        }
      }

      await insertNotification(supa, {
        userId: payment.user_id,
        kind: "payment_confirmed",
        title: "Payment confirmed",
        body: "Your Zoot payment is confirmed. We are now finalising the booking assignment.",
        link: `/app/bookings/${payment.booking_id}`,
      });

      await insertOutbox(supa, {
        source_table: "bookings",
        source_id: payment.booking_id,
        event_type: "payment_confirmed_assignment_search",
        channel: "in_app",
        owner: "Scheduling & Allocation Agent",
        stack_tool: "Zoot assignment queue",
        payload: { booking_id: payment.booking_id, payment_record_id: payment.id },
        status: "queued",
        approval_required: false,
        created_by: payment.user_id,
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
