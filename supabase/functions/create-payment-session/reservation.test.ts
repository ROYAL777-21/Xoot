import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({
  handle: null as ((r: Request) => Promise<Response>) | null, from: vi.fn(),
  row: {} as Record<string, unknown>, changeAtSignature: {} as Record<string, unknown>, audit: vi.fn(),
}));
vi.mock("../_shared/action-utils.ts", () => ({
  cleanText: (v: unknown) => String(v), handlePreflight: () => null, getServiceClient: vi.fn(),
  getAllowedOrigins: () => ["https://example.test"],
  requireAuth: async () => ({ user: { id: "owner" }, supa: { from: h.from, rpc: async () => ({ data: 1, error: null }) } }),
  readJson: (req: Request) => req.json(), writeAuditLog: h.audit,
  fail: (error: string, _origin: unknown, status = 400) => new Response(JSON.stringify({ error }), { status }),
  ok: (data: unknown) => new Response(JSON.stringify(data)),
}));
vi.mock("../_shared/governance-utils.ts", () => ({
  consumeRateLimit: async () => ({ allowed: true }), getEdgeEnvironment: () => "staging",
  isOperationalControlEnabled: async () => true,
}));
vi.mock("../_shared/payment-provider-gate.ts", () => ({
  CAPABILITY_COLUMNS: "provider", hostedCheckoutBlockReason: () => null, hostedCheckoutControlKey: () => "test",
}));
vi.mock("../_shared/payfast-checkout.ts", () => ({
  resolveMode: () => "sandbox",
  buildPayfastCheckout: () => {
    // A legitimate atomic redemption/identity change commits after the HTTP
    // read but before routing. A stale signature must never reach the customer.
    Object.assign(h.row, h.changeAtSignature);
    return { url: "https://example.test/sandbox", fields: { amount: "200.00" } };
  },
}));
beforeAll(async () => {
  vi.stubGlobal("Deno", { serve: (handler: typeof h.handle) => { h.handle = handler; },
    env: { get: (key: string) => key === "SUPABASE_URL" ? "https://example.test" : "synthetic" } });
  await import("./index");
});
beforeEach(() => {
  h.row = { id: "payment", user_id: "owner", booking_id: "booking", amount: 200, currency: "ZAR",
    status: "pending", provider: "manual_pending", provider_reference: "fixed_reference", payment_kind: "booking" };
  h.changeAtSignature = {}; h.audit.mockReset();
  h.from.mockImplementation((table: string) => {
    const filters: [string, unknown][] = []; let update: Record<string, unknown> | null = null;
    const q = { select: () => q, eq: (key: string, value: unknown) => { filters.push([key, value]); return q; },
      update: (value: Record<string, unknown>) => { update = value; return q; },
      maybeSingle: async () => {
        if (table === "bookings") return { data: { id: "booking", user_id: "owner", status: "draft", payment_status: "pending", crew_size: 1 }, error: null };
        if (table !== "payment_records") return { data: {}, error: null };
        if (!update) return { data: { ...h.row }, error: null };
        if (!filters.every(([key, value]) => h.row[key] === value)) return { data: null, error: null };
        Object.assign(h.row, update); return { data: { id: h.row.id }, error: null };
      } };
    return q;
  });
});
const request = () => new Request("https://example.test/session", { method: "POST",
  headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payment_record_id: "payment" }) });
describe("checkout snapshot reservation", () => {
  it.each([{ amount: 130 }, { provider_reference: "changed" }, { currency: "USD" },
    { booking_id: "different" }, { provider: "manual_eft" }, { payment_kind: "gift_clean" }])(
    "does not return a stale signed checkout after %j", async change => {
      h.changeAtSignature = change;
      const response = await h.handle!(request());
      expect(response.status).toBe(409);
      expect(await response.text()).not.toContain("fields");
      expect(h.audit).not.toHaveBeenCalled();
    });
  it("routes and returns the exact unchanged pending snapshot", async () => {
    const response = await h.handle!(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ amount_cents: 20000 });
    expect(h.row.provider).toBe("payfast");
  });
});
