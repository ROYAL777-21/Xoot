import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8");
const sql = read("supabase/migrations/20261027150000_atomic_booking_payment_settlement.sql");
const shared = read("supabase/functions/_shared/payment-confirmation.ts");
const routes = ["confirm-payment", "admin-confirm-payment"];

describe("atomic payment confirmation parity", () => {
  it.each(routes)("%s uses the common transaction without a financial or booking write beside it", route => {
    const code = read(`supabase/functions/${route}/index.ts`);
    expect(code).toContain('from "../_shared/payment-confirmation.ts"');
    expect(code).toContain("applyBookingPaymentConfirmed(");
    expect(code).toContain("assertBookingCanConfirmPayment(");
    expect(code).not.toMatch(/\.from\("(?:payment_records|bookings)"\)[\s\S]{0,80}\.update\(/);
    expect(code).not.toContain('from("xooter_jobs")');
    expect(code).not.toContain('from("notifications")');
  });
  it("moves all consequences and the receipt behind the same locked SQL transaction", () => {
    expect(shared).toContain('supa.rpc("settle_booking_payment"');
    expect(shared).not.toContain('.from("payment_records")');
    for (const table of ["payment_records", "bookings", "booking_status_events", "xooter_jobs", "notifications", "integration_outbox", "admin_audit_log"]) {
      expect(sql).toMatch(new RegExp(`(?:update|insert into) public\\.${table}\\b`));
    }
    expect(sql).toContain("where id = p_payment_id for update");
    expect(sql).toContain("where id = v_payment.booking_id for update");
    expect(sql).toContain("insert into private.booking_payment_settlements");
    expect(sql).toContain("payment_confirmed_assignment_search");
  });
  it("keeps the source, reason and manual EFT distinction inside the audit transaction", () => {
    const admin = read("supabase/functions/admin-confirm-payment/index.ts");
    expect(admin).toContain("getAdminActionContext(req)");
    expect(admin).toContain("requireAdminReason(body.reason");
    expect(admin).toContain('source: "admin"');
    expect(admin).toContain('mfaSessionFromVerifiedBearer(req.headers.get("Authorization"), user.id)');
    expect(sql).toContain("select from auth.sessions where id = p_admin_session_id and user_id = p_admin_id");
    expect(sql).toContain("aal::text = 'aal2'");
    expect(sql).toContain("public.has_role(p_admin_id, 'admin'::public.app_role)");
    expect(sql).toContain("v_payment.provider = 'manual_pending' then 'manual_eft' else v_payment.provider");
    expect(sql).toContain("Payment confirmed by admin");
    expect(sql).toContain("Payment received");
  });
  it("retains all provider verification before settlement and refuses unsupported checkout fulfilment", () => {
    const webhook = read("supabase/functions/confirm-payment/index.ts");
    for (const call of ["verifySignature(", "merchantMatches(", "sourceAllowed(", "validateWithPayFast(", "amountMatches(grossAmount, expectedCents)"]) expect(webhook).toContain(call);
    const checkout = read("supabase/functions/create-payment-session/index.ts");
    expect(checkout).toContain('payment.payment_kind !== "booking"');
    expect(checkout).toContain('supa.rpc("booking_payment_settlement_ready")');
    expect(checkout).toContain("booking.crew_size !== 1");
  });
});
