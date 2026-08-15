import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Payment can be confirmed two ways, and both must leave the booking in the same place.
 *
 * ── The defect this was written from ────────────────────────────────────────────
 * `confirm-payment` handles the verified PayFast ITN and advanced the booking to
 * `payment_confirmed`. `admin-confirm-payment` handles a human confirming money that arrived
 * another way — an EFT, the fallback while PayFast onboarding completes — and it **did not touch
 * the booking at all**. It moved the payment record to `admin_confirmed` and stopped.
 *
 * So a customer paid by EFT, an admin confirmed it against the bank statement, and the booking
 * stayed `draft` forever: never assigned, no job created, nothing scheduled. The money was in the
 * account and the product behaved as though it had never arrived. Nothing failed, nothing logged
 * an error, and the only symptom was a booking that quietly never happened.
 *
 * ── And the same defect one layer deeper ────────────────────────────────────────
 * ⚠️ The first fix moved the booking update and the status event into the shared helper — and
 * left the **job offer, the notification and the assignment outbox event** inline in the webhook.
 * So the admin path would have advanced the booking and still never offered the job to the Xooter:
 * a quieter version of the same bug, wearing the fix as a disguise.
 *
 * That is why the assertions below ban each inline form individually rather than just checking the
 * helper is called. The failure mode here has never been a missing helper — it is a step left
 * behind next to one.
 *
 * These assertions are on the source rather than behavioural because Edge Functions are Deno and
 * cannot be imported here — the same constraint `pricing-parity.test.ts` works under.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const WEBHOOK = "supabase/functions/confirm-payment/index.ts";
const ADMIN = "supabase/functions/admin-confirm-payment/index.ts";
const SHARED = "supabase/functions/_shared/payment-confirmation.ts";

describe("payment confirmation parity", () => {
  it("both confirmation paths advance the booking through the same helper", () => {
    for (const path of [WEBHOOK, ADMIN]) {
      const src = read(path);
      expect(src, `${path} must import the shared confirmation helper`).toContain(
        "../_shared/payment-confirmation.ts",
      );
      expect(src, `${path} must apply the confirmation`).toMatch(/applyBookingPaymentConfirmed\(/);
      expect(src, `${path} must assert the transition first`).toMatch(
        /assertBookingCanConfirmPayment\(/,
      );
    }
  });

  it("neither path writes the booking transition by hand", () => {
    for (const path of [WEBHOOK, ADMIN]) {
      const src = read(path);
      expect(src, `${path} must not set the booking status inline`).not.toMatch(
        /\.from\("bookings"\)[\s\S]{0,200}status:\s*"payment_confirmed"/,
      );
    }
  });

  it("neither path offers the job by hand", () => {
    // The step that was nearly left behind. A second inline `xooter_jobs` write beside the helper
    // would offer the same job twice; no inline write at all means an EFT-paid booking is never
    // offered to anyone.
    for (const path of [WEBHOOK, ADMIN]) {
      expect(read(path), `${path} must not touch xooter_jobs inline`).not.toMatch(/xooter_jobs/);
    }
    expect(read(SHARED), "the shared helper must offer the job").toMatch(/xooter_jobs/);
  });

  it("neither path notifies or queues assignment by hand", () => {
    for (const path of [WEBHOOK, ADMIN]) {
      const src = read(path);
      expect(src, `${path} must not send the payment notification inline`).not.toMatch(
        /insertNotification\(/,
      );
      expect(src, `${path} must not queue the assignment search inline`).not.toMatch(
        /payment_confirmed_assignment_search/,
      );
    }
    const shared = read(SHARED);
    expect(shared).toMatch(/insertNotification\(/);
    expect(shared).toMatch(/payment_confirmed_assignment_search/);
  });

  it("the shared helper refuses transitions the state machine forbids", () => {
    const shared = read(SHARED);
    // A manual confirmation must not be able to resurrect a cancelled booking, and the state
    // machine is the only thing that knows which moves are legal.
    expect(shared).toContain('from "./booking-state-machine.ts"');
    expect(shared).toMatch(/assertTransition\(currentStatus, "payment_confirmed"\)/);
    expect(shared).toMatch(/payment_status: "paid"/);
    expect(shared).toMatch(/payment_confirmed_at/);
  });

  it("records how the payment was confirmed, not just that it was", () => {
    /*
     * Both paths write a `booking_status_events` row, with different labels. If a manual EFT and
     * a signed provider event were indistinguishable afterwards, a disputed payment would have no
     * evidence trail — and a manual confirmation is exactly the kind that gets disputed, because
     * its only proof is a bank statement someone read.
     */
    expect(read(WEBHOOK)).toContain('label: "Payment received"');
    expect(read(ADMIN)).toContain('label: "Payment confirmed by admin"');
    expect(read(SHARED)).toMatch(/booking_status_events/);
  });

  it("the admin path records the money as an EFT rather than leaving it pending", () => {
    // `manual_pending` means "no route chosen". Leaving it there after a human confirmed a bank
    // transfer would make reconciliation unable to tell an EFT from a payment that never happened.
    const admin = read(ADMIN);
    expect(admin).toMatch(/manual_eft/);
    expect(admin, "a record already routed to PayFast must not be relabelled").toMatch(
      /payment\.provider === "manual_pending"/,
    );
  });

  it("the admin path still demands a reason and writes the strict audit log", () => {
    // Manual confirmation moves money without a provider event to point at, so the reason and the
    // admin audit row are the only record of why anyone believed it was paid.
    const admin = read(ADMIN);
    expect(admin).toMatch(/requireAdminReason\(/);
    expect(admin).toMatch(/writeStrictAdminAuditLog\(/);
    expect(admin).toMatch(/only pending payment records can be admin-confirmed/);
  });

  it("the webhook still verifies the ITN before any of this runs", () => {
    /*
     * Guarding the other session's four checks, because this change edits the function that holds
     * them. Converging the confirmation steps must not quietly loosen what proves a payment real.
     */
    const webhook = read(WEBHOOK);
    expect(webhook).toMatch(/verifySignature\(/);
    expect(webhook).toMatch(/validateWithPayFast\(/);
    expect(webhook).toMatch(/sourceAllowed\(/);
    expect(webhook, "the amount must still be compared against the record").toMatch(
      /payment\.amount[\s\S]{0,80}amount/,
    );
  });
});
