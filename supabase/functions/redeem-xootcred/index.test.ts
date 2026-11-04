import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({
  handle: null as ((r: Request) => Promise<Response>) | null,
  actor: "11111111-1111-4111-8111-111111111111",
  booking: "22222222-2222-4222-8222-222222222222",
  payment: "33333333-3333-4333-8333-333333333333",
  key: "44444444-4444-4444-8444-444444444444",
  ledger: "55555555-5555-4555-8555-555555555555", rpc: vi.fn(), from: vi.fn(),
}));
vi.mock("../_shared/action-utils.ts", () => ({
  handlePreflight: () => null,
  requireAuth: async () => ({ user: { id: h.actor }, supa: { rpc: h.rpc, from: h.from } }),
  readJson: (req: Request) => req.json(), cleanId: (v: unknown) => String(v ?? ""),
  toNumber: (v: unknown, fallback: number) => Number(v) || fallback,
  assertBookingParticipant: async () => ({ role: "client" }), writeAuditLog: vi.fn(),
  fail: (error: string, _origin: unknown, status = 400) => new Response(JSON.stringify({ error }), { status }),
  ok: (data: unknown) => new Response(JSON.stringify(data)),
}));
beforeAll(async () => {
  vi.stubGlobal("Deno", { serve: (handler: typeof h.handle) => { h.handle = handler; } });
  await import("./index");
});
beforeEach(() => {
  h.rpc.mockReset();
  // The old endpoint ignored this failed debit and still returned a discounted due.
  h.from.mockReset().mockImplementation((table: string) => {
    const data = table === "bookings" ? { id: h.booking, user_id: h.actor, status: "draft" }
      : table === "payment_records" ? { id: h.payment, amount: 200, status: "pending", meta: {} }
      : [{ amount: 100, direction: "credit", status: "available" }];
    const q = { select: () => q, eq: () => q, order: () => q, limit: () => q,
      maybeSingle: async () => ({ data, error: null }),
      insert: () => Promise.resolve({ data: null, error: { code: "23514" } }),
      update: () => q,
      then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve) };
    return q;
  });
});
const receipt = (patch = {}) => ({
  booking_id: h.booking, payment_record_id: h.payment, request_key: h.key,
  ledger_entry_id: h.ledger, redeemed: 70, previous_amount_due: 200,
  amount_due: 130, updated_balance: 30, idempotent: false, ...patch,
});
const request = (patch: Record<string, unknown> = {}) => new Request("https://example.test/redeem", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ booking_id: h.booking, payment_record_id: h.payment, request_key: h.key,
    expected_amount_cents: 20000, amount: 70, ...patch }),
});
describe("atomic redemption route", () => {
  it("never acknowledges a rejected financial transaction", async () => {
    h.rpc.mockResolvedValue({ data: null, error: { code: "23514", message: "private detail" } });
    const response = await h.handle!(request());
    expect(response.status).toBe(409);
    expect(await response.text()).not.toContain("private detail");
    expect(h.from).not.toHaveBeenCalled();
  });
  it("binds the verified owner, exact cents, payment and replay key in one RPC", async () => {
    h.rpc.mockResolvedValue({ data: receipt(), error: null });
    expect((await h.handle!(request({ actor_id: "another" }))).status).toBe(200);
    expect(h.rpc).toHaveBeenCalledExactlyOnceWith("redeem_booking_xootcred", {
      p_actor_id: h.actor, p_booking_id: h.booking, p_payment_record_id: h.payment,
      p_request_key: h.key, p_expected_amount_cents: 20000, p_redemption_cents: 7000,
    });
    expect(h.from).not.toHaveBeenCalled();
  });
  it.each([{ payment_record_id: null }, { request_key: null }, { expected_amount_cents: 1.2 },
    { amount: 1.001 }, { amount: -1 }, { amount: "70" }])("rejects unsafe/missing consent %j before writing", async patch => {
    expect((await h.handle!(request(patch))).status).toBe(400);
    expect(h.rpc).not.toHaveBeenCalled(); expect(h.from).not.toHaveBeenCalled();
  });
  it("requires a complete matching committed receipt", async () => {
    for (const data of [null, receipt({ redeemed: 60 }), receipt({ payment_record_id: h.booking }),
      receipt({ previous_amount_due: 201 }), receipt({ amount_due: 129 }), receipt({ updated_balance: -1 })]) {
      h.rpc.mockResolvedValue({ data, error: null });
      expect((await h.handle!(request())).status).toBe(500);
    }
  });
  it("retries only the complete transaction with the same key", async () => {
    h.rpc.mockResolvedValueOnce({ data: null, error: { code: "40001" } })
      .mockResolvedValueOnce({ data: null, error: { code: "40P01" } })
      .mockResolvedValueOnce({ data: receipt({ idempotent: true }), error: null });
    expect((await h.handle!(request())).status).toBe(200);
    expect(h.rpc).toHaveBeenCalledTimes(3);
    expect(h.rpc.mock.calls.map(call => call[1].p_request_key)).toEqual([h.key, h.key, h.key]);
  });
  it("refuses GET and bounds serialization retries", async () => {
    expect((await h.handle!(new Request("https://example.test/redeem"))).status).toBe(405);
    h.rpc.mockResolvedValue({ data: null, error: { code: "40001" } });
    expect((await h.handle!(request())).status).toBe(503);
    expect(h.rpc).toHaveBeenCalledTimes(3);
  });
});
