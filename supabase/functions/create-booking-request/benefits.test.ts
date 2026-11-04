import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({
  handle: null as ((r: Request) => Promise<Response>) | null, from: vi.fn(), client: vi.fn(),
}));
vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({ createClient: h.client }));
vi.mock("../_shared/action-utils.ts", () => ({
  readJson: (req: Request) => req.json(), isApprovedLaunchRegion: () => true, resolveLaunchRegion: () => "Johannesburg",
}));
beforeAll(async () => {
  vi.stubGlobal("Deno", { serve: (handler: typeof h.handle) => { h.handle = handler; },
    env: { get: () => "synthetic" } });
  await import("./index");
});
beforeEach(() => {
  h.from.mockReset().mockImplementation(() => { throw new Error("database touched"); });
  h.client.mockReset().mockImplementation(() => ({
    auth: { getUser: async () => ({ data: { user: { id: "owner" } }, error: null }) }, from: h.from,
  }));
});
describe("duplicate legacy request writer", () => {
  it.each([{ referralCode: "FRIEND" }, { xootcred_redemption: 20 },
    { referralCode: "", referral_code: "FRIEND" }, { xootcredRedemption: 0, xootcred_redemption: 20 }])(
    "refuses %j before constructing its privileged writer", async patch => {
      const response = await h.handle!(new Request("https://example.test/book", { method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer synthetic" },
        body: JSON.stringify({ serviceType: "residential", ...patch }) }));
      expect(response.status).toBe(409);
      expect((await response.json()).error).toMatch(/atomic/i);
      expect(h.client).toHaveBeenCalledTimes(1); // Auth only, no service writer.
      expect(h.from).not.toHaveBeenCalled();
    });
});
