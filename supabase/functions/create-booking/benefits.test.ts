import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  handle: null as ((r: Request) => Promise<Response>) | null,
  from: vi.fn(), coverage: vi.fn(),
}));
vi.mock("../_shared/action-utils.ts", () => ({
  handlePreflight: () => null,
  requireAuth: async () => ({ user: { id: "owner" }, supa: { from: h.from } }),
  readJson: (req: Request) => req.json(),
  cleanText: (v: unknown) => typeof v === "string" ? v.trim() : "",
  cleanArray: (v: unknown) => Array.isArray(v) ? v : [],
  toNumber: (v: unknown, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback,
  isApprovedLaunchRegion: () => true, resolveLaunchRegion: () => "Johannesburg",
  addDays: () => "2030-01-02", insertOutbox: vi.fn(), insertReviewQueue: vi.fn(), writeAuditLog: vi.fn(),
  fail: (error: string, _origin: unknown, status = 400) => new Response(JSON.stringify({ error }), { status }),
  ok: (data: unknown) => new Response(JSON.stringify(data)),
}));
vi.mock("../_shared/verified-coverage.ts", () => ({ assessVerifiedCoverage: h.coverage }));
beforeAll(async () => {
  vi.stubGlobal("Deno", { serve: (handler: typeof h.handle) => { h.handle = handler; }, env: { get: () => "true" } });
  await import("./index");
});
beforeEach(() => {
  h.from.mockReset().mockImplementation(() => { throw new Error("database touched before containment"); });
  h.coverage.mockReset().mockImplementation(() => { throw new Error("coverage touched before containment"); });
});
const request = (patch: Record<string, unknown>) => new Request("https://example.test/book", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ serviceType: "residential", date: "2030-01-01", time: "08:00", address: "Public fixture", ...patch }),
});
describe("legacy booking benefit containment", () => {
  it.each([
    { xootcredRedemption: 20 }, { xootcred_redemption: 20 },
    { xootcredRedemption: 0, xootcred_redemption: 20 },
    { referralCode: "FRIEND" }, { referral_code: "FRIEND" },
    { referralCode: "", referral_code: "FRIEND" },
    { requestedCreditCents: 2000 }, { input: { referralCode: "FRIEND" } },
    { xootcredRedemption: -20 }, { xootcredRedemption: "not-a-number" },
  ])("refuses %j before any coverage or database operation", async patch => {
    const response = await h.handle!(request(patch));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/atomic/i);
    expect(h.coverage).not.toHaveBeenCalled();
    expect(h.from).not.toHaveBeenCalled();
  });
});
