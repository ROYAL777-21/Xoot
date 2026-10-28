import { describe, expect, it, vi } from "vitest";
import { applyBookingPaymentConfirmed } from "./payment-confirmation";

const input = { paymentRecordId: "synthetic-payment", source: "payfast" as const, amountCents: 12501, providerReference: "synthetic-reference", providerEventId: "synthetic-event", payloadHash: "a".repeat(64), providerTransactionId: "synthetic-transaction" };
const receipt = { payment_record_id: input.paymentRecordId, booking_id: "synthetic-booking", status: "paid", idempotent: false };
describe("settlement receipt adapter", () => {
  it("retries the whole transaction on a deadlock or serialization failure", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: null, error: { code: "40P01" } })
      .mockResolvedValueOnce({ data: null, error: { code: "40001" } })
      .mockResolvedValueOnce({ data: receipt, error: null });
    await expect(applyBookingPaymentConfirmed({ rpc }, input)).resolves.toEqual(receipt);
    expect(rpc).toHaveBeenCalledTimes(3);
    expect(rpc.mock.calls.every(call => call[0] === "settle_booking_payment")).toBe(true);
  });
  it("stops after three whole-transaction attempts without acknowledging success", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "40001" } });
    await expect(applyBookingPaymentConfirmed({ rpc }, input)).rejects.toThrow("40001");
    expect(rpc).toHaveBeenCalledTimes(3);
  });
  it.each([NaN, Infinity, 0, -1, 12.5, Number.MAX_SAFE_INTEGER + 1])("never calls the financial writer with invalid cents %s", async amountCents => {
    const rpc = vi.fn();
    await expect(applyBookingPaymentConfirmed({ rpc }, { ...input, amountCents })).rejects.toThrow("amount is invalid");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("passes the independently verified event binding to a single transaction", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: receipt, error: null });
    await expect(applyBookingPaymentConfirmed({ rpc }, input)).resolves.toEqual(receipt);
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("settle_booking_payment", {
      p_payment_id: input.paymentRecordId, p_source: "payfast", p_amount_cents: 12501, p_reference: input.providerReference,
      p_provider_event_id: input.providerEventId, p_payload_hash: input.payloadHash, p_provider_transaction_id: input.providerTransactionId,
      p_admin_id: null, p_reason: null, p_admin_session_id: null,
    });
  });
  it("propagates database failure without acknowledging payment or exposing database detail", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "P0001", message: "sensitive database detail" } });
    await expect(applyBookingPaymentConfirmed({ rpc }, input)).rejects.toThrow(/^atomic payment settlement failed: P0001$/);
  });
  it.each([null, {}, { ...receipt, payment_record_id: "someone-else" }, { ...receipt, idempotent: undefined }])("refuses an absent, different or malformed receipt", async data => {
    await expect(applyBookingPaymentConfirmed({ rpc: vi.fn().mockResolvedValue({ data, error: null }) }, input)).rejects.toThrow("receipt could not be confirmed");
  });
  it("acknowledges a receipt after refund without requesting a second write", async () => {
    const data = { ...receipt, status: "refunded", idempotent: true };
    const rpc = vi.fn().mockResolvedValue({ data, error: null });
    await expect(applyBookingPaymentConfirmed({ rpc }, input)).resolves.toEqual(data);
    expect(rpc).toHaveBeenCalledOnce();
  });
});
