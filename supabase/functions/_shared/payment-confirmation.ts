import { insertNotification, insertOutbox } from "./action-utils.ts";
import { assertTransition, normaliseBookingStatus } from "./booking-state-machine.ts";

// Deno Edge Function shared module. Bundled into each consuming function at deploy time, so a
// change here reaches nothing until every consumer is redeployed.
type SupabaseServiceClient = any;

/**
 * Moving a booking to `payment_confirmed` — one implementation, two ways in.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────────
 * Payment can be confirmed two ways. `confirm-payment` handles the verified PayFast ITN.
 * `admin-confirm-payment` handles a human confirming money that arrived some other way — an EFT,
 * which is the fallback while PayFast onboarding completes.
 *
 * Until 2026-08-13 only the webhook advanced the booking. The admin path moved the *payment
 * record* to `admin_confirmed` and stopped there, so a booking paid by EFT and confirmed by an
 * admin stayed `draft` **forever**: no assignment, no job, nothing. The money was in the bank and
 * the product behaved as though it had never arrived.
 *
 * That is the shape this codebase keeps finding — two paths that are supposed to reach the same
 * state, where only one of them actually does. So the transition lives here and both call it,
 * rather than the admin path growing a second copy that can drift from the webhook's.
 *
 * ── The same bug, one layer deeper ──────────────────────────────────────────────
 * ⚠️ The first version of this helper did the booking update and the status event and **stopped**.
 * The webhook it was extracted from also offered the job to the Xooter and queued the assignment
 * search. So converging the admin path onto that helper would have fixed "booking never advances"
 * and left "Xooter is never offered the job" — a quieter version of the same defect, and one that
 * would have looked fixed.
 *
 * Everything that must follow the money now lives here: the booking row, the status event, the
 * job offer, the customer's notification and the assignment outbox event. If a third confirmation
 * route is ever added, it gets all five by calling one function.
 *
 * ── What it deliberately does not do ────────────────────────────────────────────
 * It does not decide *whether* payment happened. The webhook decides that from a signed, validated
 * PayFast ITN; the admin decides it from a bank statement and records a reason. This only applies
 * the consequence, so neither caller can invent a transition the state machine forbids.
 */

/**
 * Check the booking can legally move to `payment_confirmed`, before doing anything irreversible.
 *
 * Separate from `apply` because `confirm-payment` must assert **before** it claims the provider
 * event — claiming is what makes the webhook idempotent, and a claim followed by a refused
 * transition would burn the event id and make a retry a silent no-op.
 */
export const assertBookingCanConfirmPayment = async (
  supa: SupabaseServiceClient,
  bookingId: string,
): Promise<{ ok: true; booking: Record<string, any> } | { ok: false; reason: string }> => {
  const { data: booking } = await supa
    .from("bookings")
    .select("id,user_id,xooter_id,scheduled_at,service_type,status")
    .eq("id", bookingId)
    .maybeSingle();

  const currentStatus = normaliseBookingStatus(booking?.status);
  if (!booking?.id || !currentStatus) return { ok: false, reason: "booking status is unsupported" };

  try {
    assertTransition(currentStatus, "payment_confirmed");
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "invalid booking transition" };
  }
  return { ok: true, booking };
};

/**
 * Apply the confirmation: booking status, status event, job offer, notification, assignment queue.
 *
 * `label` differs by caller so the booking's own history says how the money was confirmed —
 * "Payment received" for a verified provider ITN, "Payment confirmed by admin" for an EFT. A
 * customer or a dispute reading `booking_status_events` can then tell the two apart, which matters
 * when the only evidence of a manual payment is a bank statement someone eyeballed.
 *
 * `booking` is passed in rather than re-read: both callers already hold it from
 * `assertBookingCanConfirmPayment`, and re-reading would open a window where the row changed
 * between the check and the write.
 */
export const applyBookingPaymentConfirmed = async (
  supa: SupabaseServiceClient,
  input: {
    bookingId: string;
    actorId: string | null;
    paymentRecordId: string;
    label: string;
    booking: Record<string, any>;
  },
) => {
  const now = new Date().toISOString();

  await supa
    .from("bookings")
    .update({
      status: "payment_confirmed",
      payment_status: "paid",
      payment_confirmed_at: now,
      updated_at: now,
    })
    .eq("id", input.bookingId);

  await supa.from("booking_status_events").insert({
    booking_id: input.bookingId,
    actor_id: input.actorId,
    status: "payment_confirmed",
    label: input.label,
    meta: { payment_record_id: input.paymentRecordId },
  });

  /*
   * Offer the job to the Xooter the customer picked.
   *
   * Upserted by hand rather than with `upsert()` because there is no unique index on
   * (booking_id, xooter_id) to conflict against — a blind insert would create a second offer row
   * on any retry, and a Xooter seeing the same job twice is how a double-booking starts.
   */
  if (input.booking.xooter_id) {
    const { data: existingJob } = await supa
      .from("xooter_jobs")
      .select("id")
      .eq("booking_id", input.bookingId)
      .eq("xooter_id", input.booking.xooter_id)
      .maybeSingle();

    if (existingJob?.id) {
      await supa.from("xooter_jobs").update({ state: "offered" }).eq("id", existingJob.id);
    } else {
      await supa.from("xooter_jobs").insert({
        booking_id: input.bookingId,
        xooter_id: input.booking.xooter_id,
        state: "offered",
      });
    }
  }

  // The customer is told the same thing either way. Whether a webhook or an admin confirmed the
  // money is an internal distinction; the booking is equally confirmed to the person who paid.
  if (input.actorId) {
    await insertNotification(supa, {
      userId: input.actorId,
      kind: "payment_confirmed",
      title: "Payment confirmed",
      body: "Your Xoot payment is confirmed. We are now finalising the booking assignment.",
      link: `/app/bookings/${input.bookingId}`,
    });
  }

  await insertOutbox(supa, {
    source_table: "bookings",
    source_id: input.bookingId,
    event_type: "payment_confirmed_assignment_search",
    channel: "in_app",
    owner: "Scheduling & Allocation Agent",
    stack_tool: "Xoot assignment queue",
    payload: { booking_id: input.bookingId, payment_record_id: input.paymentRecordId },
    status: "queued",
    approval_required: false,
    created_by: input.actorId,
  });
};
