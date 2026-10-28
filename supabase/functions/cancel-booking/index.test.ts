import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  handle: null as null | ((req: Request) => Promise<Response>),
  userId: "11111111-1111-4111-8111-111111111111",
  bookingId: "22222222-2222-4222-8222-222222222222",
  rpc: vi.fn(),
  from: vi.fn(),
}));

// Only the remote Auth/PostgREST boundary is replaced; the registered route executes for real.
vi.mock("../_shared/action-utils.ts", () => ({
  cleanId: (v: unknown) => typeof v === "string" ? v : "",
  cleanText: (v: unknown) => typeof v === "string" ? v.trim() : "",
  handlePreflight: () => null,
  requireAuth: async () => ({ user: { id: h.userId }, supa: { from: h.from, rpc: h.rpc } }),
  assertBookingParticipant: async () => ({ participant: true, role: "client" }),
  insertNotification: async () => {}, insertReviewQueue: async () => {}, writeAuditLog: async () => {},
  readJson: (req: Request) => req.json(),
  fail: (message: string, _origin: unknown, status = 400) => new Response(JSON.stringify({ error: message }), { status }),
  ok: (data: unknown) => new Response(JSON.stringify(data), { status: 200 }),
}));

beforeAll(async () => {
  vi.stubGlobal("Deno", { serve: (handler: typeof h.handle) => { h.handle = handler; } });
  await import("./index");
});

beforeEach(() => {
  h.rpc.mockReset(); h.from.mockReset();
  // Reproduce the old route's unchecked failed booking write, without touching a database.
  h.from.mockImplementation((table: string) => {
    const result = { data: table === "bookings" ? { id: h.bookingId, user_id: h.userId, status: "pending_payment", payment_status: "pending", xooter_id: null, scheduled_at: "2030-01-01T10:00:00Z" } : { id: "payment", status: "pending" }, error: null };
    const q = { select: () => q, eq: () => q, order: () => q, limit: () => q, in: () => q,
      maybeSingle: async () => result, insert: () => q, update: () => q,
      then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: null, error: { code: "XX000", message: "private database detail" } }).then(resolve) };
    return q;
  });
});

const request = (extra: Record<string, unknown> = {}) => new Request("https://example.test/cancel", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ booking_id: h.bookingId, reason: "Plans changed", ...extra }),
});

describe("booking cancellation route", () => {
  it("does not acknowledge cancellation when the financial transaction fails", async () => {
    h.rpc.mockResolvedValue({ data: null, error: { code: "XX000", message: "private database detail" } });
    const response = await h.handle!(request());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private database detail");
  });

  it("uses the verified actor and returns the original committed refund review on retry", async () => {
    h.rpc.mockImplementation(async (_name: string, input: Record<string, unknown>) => {
      if (input.p_actor_id !== h.userId || "p_amount" in input) return { data: null, error: { code: "42501" } };
      return { data: { booking_id: h.bookingId, status: "cancelled", idempotent: true, refund: { eligible: true, amount: 62.51, reason: "partial_refund_2h_window" }, refund_request_id: "33333333-3333-4333-8333-333333333333" }, error: null };
    });
    const response = await h.handle!(request({ user_id: "another-user", amount: 0 }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ idempotent: true, refund: { eligible: true, amount: 62.51 }, refund_request_id: "33333333-3333-4333-8333-333333333333" });
  });

  it("does not accept a missing database receipt as cancellation success", async () => {
    h.rpc.mockResolvedValue({ data: null, error: null });
    expect((await h.handle!(request())).status).toBe(500);
  });

  it("refuses mutation through GET", async () => {
    expect((await h.handle!(new Request("https://example.test/cancel"))).status).toBe(405);
  });
});
