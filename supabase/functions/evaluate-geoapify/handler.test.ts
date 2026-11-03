import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { createEvaluationHandler } from "./handler";
import { EVALUATION_POLICY, evaluateResponse, STAGING_ORIGIN } from "./adapter";
import { stagingEvaluationFetch } from "./store-transport";

beforeAll(() => vi.stubGlobal("crypto", webcrypto));
afterAll(() => vi.unstubAllGlobals());

const attemptId = "11111111-1111-4111-8111-111111111111", ownerKey = "synthetic-presented-service-fixture";
const report = evaluateResponse({ results: [] }, "gcis_head_office")!;
const input = (body: unknown = { fixture: "gcis_head_office" }, headers: Record<string,string> = {}) => new Request(`${STAGING_ORIGIN}/functions/v1/evaluate-geoapify`, {
  method: "POST", headers: { "Content-Type": "application/json", apikey: ownerKey, Authorization: `Bearer ${ownerKey}`, ...headers }, body: JSON.stringify(body),
});
// Explicit mock RPC authority, not a claim that a real JWT/device/hosted trial was tested.
function fixture(overrides: Record<string,unknown> = {}) {
  let nonce = "";
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === "geoapify_evaluation_worker_authorized") return { data: true, error: null };
    if (name === "claim_geoapify_evaluation") { nonce = String(args.p_nonce); return { data: {
      state: "claimed", cached: false, attemptId, fixtureId: "gcis_head_office", policyVersion: EVALUATION_POLICY, ...overrides }, error: null }; }
    if (name === "authorize_geoapify_evaluation") return { data: { authorized: true, attemptId, nonce, fixtureId: "gcis_head_office", policyVersion: EVALUATION_POLICY }, error: null };
    return { data: { state: args.p_state, reason: args.p_reason, report: args.p_report, attemptId, policyVersion: EVALUATION_POLICY }, error: null };
  });
  const storeForCredential = vi.fn(() => ({ rpc }));
  const request = vi.fn(async () => new Response(JSON.stringify({ results: [] }), { headers: { "Content-Type": "application/json" } }));
  return { rpc, storeForCredential, request, handler: createEvaluationHandler({ supabaseUrl: STAGING_ORIGIN, apiKey: "synthetic-provider-key" }, storeForCredential, request) };
}

describe("private Geoapify staging worker boundary", () => {
  it("keeps the gateway JWT on and the scope independent of other providers/functions", () => {
    const config = readFileSync("supabase/config.toml", "utf8");
    expect(config).toMatch(/\[functions.evaluate-geoapify\]\s*verify_jwt = true/);
    const entry = readFileSync("supabase/functions/evaluate-geoapify/index.ts", "utf8");
    expect(entry).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|kyc_scan_worker_authorized|notification_worker_authorized/);
    expect(entry).toMatch(/https:\/\/esm\.sh\/@supabase\/supabase-js@\d+\.\d+\.\d+"/);
  });
  it("fails closed for production, a lookalike URL and browser Origins before any database/provider request", async () => {
    for (const origin of ["https://mvlrkelahhsyjrwgsxaf.supabase.co", `${STAGING_ORIGIN}/`, `${STAGING_ORIGIN}.attacker.invalid`]) {
      const f = fixture(), handler = createEvaluationHandler({ supabaseUrl: origin, apiKey: "synthetic-provider-key" }, f.storeForCredential, f.request);
      expect((await handler(input())).status).toBe(409); expect(f.rpc).not.toHaveBeenCalled(); expect(f.request).not.toHaveBeenCalled();
    }
    const f = fixture(); expect((await f.handler(input(undefined, { Origin: "https://xoot.co.za" }))).status).toBe(403); expect(f.rpc).not.toHaveBeenCalled();
  });
  it("rejects GET/OPTIONS and missing or mismatched service credentials", async () => {
    const f = fixture();
    for (const method of ["GET", "OPTIONS"]) expect((await f.handler(new Request(STAGING_ORIGIN, { method }))).status).toBe(405);
    for (const headers of [{ apikey: "" }, { Authorization: "" }, { Authorization: "Bearer other-identity" }]) expect((await f.handler(input(undefined, headers))).status).toBe(401);
    expect(f.rpc).not.toHaveBeenCalled(); expect(f.request).not.toHaveBeenCalled();
  });
  it("probes the exact presented credential and denies a failed real-role result", async () => {
    const f = fixture(); f.rpc.mockResolvedValueOnce({ data: false, error: null });
    expect((await f.handler(input())).status).toBe(401); expect(f.storeForCredential).toHaveBeenCalledWith(ownerKey); expect(f.rpc).toHaveBeenCalledTimes(1);
    expect(f.request).not.toHaveBeenCalled();
  });
  it("refuses missing provider configuration without consuming allowance", async () => {
    const f = fixture(), handler = createEvaluationHandler({ supabaseUrl: STAGING_ORIGIN, apiKey: "" }, f.storeForCredential, f.request);
    expect((await handler(input())).status).toBe(503); expect(f.rpc).toHaveBeenCalledTimes(1); expect(f.request).not.toHaveBeenCalled();
  });
  it("accepts only one fixed fixture ID, with no address, key, recipient, endpoint, or overlong body", async () => {
    for (const body of [{ fixture: "private-house" }, { fixture: "gcis_head_office", query: "a personal address" }, { fixture: "__proto__" },
      { fixture: "gcis_head_office", apiKey: "other" }, { fixture: "gcis_head_office", endpoint: "https://attacker.invalid" }, { fixture: "x".repeat(300) }, []]) {
      const f = fixture(); expect((await f.handler(input(body))).status).toBe(400); expect(f.rpc).toHaveBeenCalledTimes(1); expect(f.request).not.toHaveBeenCalled();
    }
  });
  it("does not dispatch for disabled, exhausted, cached or ambiguous prior claims", async () => {
    for (const claim of [{ state: "held", reason: "trial_disabled" }, { state: "held", reason: "budget_exhausted" },
      { state: "held", cached: true, reason: "prior_attempt_not_retried" }, { state: "error", cached: true, reason: "provider_unavailable" },
      { state: "complete", cached: true, reason: "provider_response", report }]) {
      const f = fixture(claim), response = await f.handler(input());
      expect(response.status).toBe(200); expect(f.request).not.toHaveBeenCalled(); expect(f.rpc).toHaveBeenCalledTimes(2);
    }
  });
  it("refuses arbitrary cached evidence or keyed errors instead of reflecting database strings", async () => {
    const f = fixture({ state: "complete", cached: true, reason: "provider_response", report: { ...report, apiKey: "synthetic-private-value" } });
    const response = await f.handler(input()); expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("synthetic-private-value"); expect(f.request).not.toHaveBeenCalled();
  });
  it("requires the authorization RPC to bind the attempt, nonce, fixture and policy", async () => {
    for (const changed of [{ authorized: false }, { nonce: "wrong" }, { attemptId: crypto.randomUUID() }, { fixtureId: "union_buildings" }, { policyVersion: "old-policy" }]) {
      const f = fixture(); const original = f.rpc.getMockImplementation()!;
      f.rpc.mockImplementation(async (name,args) => { const result = await original(name,args); return name === "authorize_geoapify_evaluation"
        ? { ...result, data: { ...result.data as object, ...changed } } : result; });
      await f.handler(input()); expect(f.request).not.toHaveBeenCalled();
    }
  });
  it("enforces the short dispatch window and never resends on an uncertain provider error", async () => {
    const f = fixture(); let calls = 0;
    const handler = createEvaluationHandler({ supabaseUrl: STAGING_ORIGIN, apiKey: "synthetic-provider-key" }, f.storeForCredential, f.request, () => calls++ ? 2_001 : 0);
    await handler(input()); expect(f.request).not.toHaveBeenCalled();
    const failed = fixture(); failed.request.mockRejectedValueOnce(new Error("keyed-URL-must-never-be-returned"));
    const body = await (await failed.handler(input())).text(); expect(failed.request).toHaveBeenCalledTimes(1);
    expect(body).toContain("provider_unavailable"); expect(body).not.toContain("keyed-URL");
  });
  it("finishes once with only normalized evidence and explicit unverified coverage/supply", async () => {
    const f = fixture(), response = await f.handler(input()), body = await response.json();
    expect(f.request).toHaveBeenCalledTimes(1); expect(f.rpc.mock.calls.map(call => call[0])).toEqual([
      "geoapify_evaluation_worker_authorized", "claim_geoapify_evaluation", "authorize_geoapify_evaluation", "finish_geoapify_evaluation"]);
    expect(body.report.outcome).toBe("no_results"); expect(body.verifiedAddress).toBe(false);
    expect(body.serviceCoverageVerified).toBe(false); expect(body.xooterAvailabilityVerified).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/synthetic-provider-key|synthetic-presented-service-fixture/);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store"); expect(response.headers.has("Access-Control-Allow-Origin")).toBe(false);
  });
  it("will not forward a service credential outside exact staging or follow a redirect", async () => {
    const request = vi.fn(async () => new Response("{}")), transport = stagingEvaluationFetch(request);
    for (const origin of ["https://mvlrkelahhsyjrwgsxaf.supabase.co", "https://attacker.invalid", "https://user:password@fxmxyabdjqviqbcxmvlp.supabase.co"])
      await expect(transport(`${origin}/rest/v1/rpc/probe`)).rejects.toThrow("evaluation_database_target_refused");
    expect(request).not.toHaveBeenCalled(); await transport(`${STAGING_ORIGIN}/rest/v1/rpc/probe`);
    expect((request.mock.calls[0] as unknown as [unknown,RequestInit])[1].redirect).toBe("error");
  });
});
