import { attributionFor, EVALUATION_POLICY, fixtureId, STAGING_ORIGIN, storedReport } from "./adapter.ts";
import { evaluatePublicFixture } from "./provider.ts";

type Store = { rpc(name: string, input: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };
type Config = { supabaseUrl: string; apiKey: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
});
async function requestBody(req: Request) {
  if (!req.body || !req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
  const reader = req.body.getReader(); let length = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.length; if (length > 256) { await reader.cancel(); return null; } chunks.push(value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return record(JSON.parse(new TextDecoder().decode(bytes)));
  } catch { return null; } finally { reader.releaseLock(); }
}
const responseReceipt = (receipt: Record<string, unknown>) => {
  const report = receipt.report ? storedReport(receipt.report) : null;
  if (!["held", "complete", "error"].includes(String(receipt.state)) ||
    !["budget_unavailable", "trial_disabled", "budget_exhausted", "worker_busy", "prior_attempt_not_retried", "receipt_refused", "receipt_not_current",
      "provider_response", "dispatch_denied", "dispatch_window_elapsed", "provider_unavailable", "provider_http_error", "provider_invalid_response"].includes(String(receipt.reason)) ||
    (receipt.attemptId !== undefined && (typeof receipt.attemptId !== "string" || !uuid.test(receipt.attemptId))) ||
    (receipt.report && !report) || (receipt.state === "complete" && !report)) return json({ error: "invalid_receipt" }, 503);
  return json({ state: receipt.state, reason: receipt.reason, attemptId: receipt.attemptId, cached: receipt.cached === true,
    policyVersion: EVALUATION_POLICY, ...(report ? { report, attribution: attributionFor(report) } : {}),
    verifiedAddress: false, serviceCoverageVerified: false, xooterAvailabilityVerified: false });
};

/** Private service worker only; not a public search or a production address writer. */
export function createEvaluationHandler(config: Config, storeForCredential: (key: string) => Store,
  request: typeof fetch = fetch, now = () => performance.now()) {
  return async (req: Request) => {
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (req.headers.has("Origin")) return json({ error: "server_worker_required" }, 403);
    if (config.supabaseUrl !== STAGING_ORIGIN) return json({ error: "evaluation_staging_only" }, 409);
    if (new URL(req.url).search) return json({ error: "query_parameters_refused" }, 400);
    const key = req.headers.get("apikey") ?? "";
    if (!key || key.length > 4096 || req.headers.get("Authorization") !== `Bearer ${key}`) return json({ error: "unauthorized" }, 401);
    let store: Store;
    try {
      // PostgREST verifies this SAME presented credential and its actual service EXECUTE grant.
      // No token decoding, role supplied by caller, or pre-authorized runtime fallback client.
      store = storeForCredential(key);
      const authority = await store.rpc("geoapify_evaluation_worker_authorized", {});
      if (authority.error || authority.data !== true) return json({ error: "unauthorized" }, 401);
    } catch { return json({ error: "unauthorized" }, 401); }
    if (!/^[A-Za-z0-9_-]{16,200}$/.test(config.apiKey)) return json({ error: "provider_not_configured" }, 503);
    const body = await requestBody(req);
    if (!body || Object.keys(body).length !== 1 || !fixtureId(body.fixture)) return json({ error: "fixed_public_fixture_required" }, 400);
    const nonce = crypto.randomUUID(); let claim: Record<string, unknown> | null;
    try {
      const result = await store.rpc("claim_geoapify_evaluation", { p_fixture_id: body.fixture, p_nonce: nonce });
      claim = result.error ? null : record(result.data);
    } catch { claim = null; }
    if (!claim || claim.policyVersion !== EVALUATION_POLICY) return json({ error: "claim_unavailable" }, 503);
    if (claim.cached === true || claim.state !== "claimed") return responseReceipt(claim);
    if (typeof claim.attemptId !== "string" || !uuid.test(claim.attemptId) || claim.fixtureId !== body.fixture) return json({ error: "invalid_claim" }, 503);
    const dispatchStarted = now(); let admitted: Record<string, unknown> | null;
    try {
      const result = await store.rpc("authorize_geoapify_evaluation", { p_attempt_id: claim.attemptId, p_nonce: nonce });
      admitted = result.error ? null : record(result.data);
    } catch { admitted = null; }
    const authorized = admitted?.authorized === true && admitted.attemptId === claim.attemptId && admitted.nonce === nonce &&
      admitted.fixtureId === body.fixture && admitted.policyVersion === EVALUATION_POLICY;
    const result = authorized ? await evaluatePublicFixture(body.fixture, config.apiKey, request, () => now() - dispatchStarted <= 2_000)
      : { reason: "dispatch_denied", report: null };
    try {
      const finished = await store.rpc("finish_geoapify_evaluation", { p_attempt_id: claim.attemptId, p_nonce: nonce,
        p_state: result.report ? "complete" : "error", p_reason: result.reason, p_report: result.report });
      const receipt = finished.error ? null : record(finished.data);
      if (!receipt || receipt.policyVersion !== EVALUATION_POLICY) return json({ error: "receipt_unavailable" }, 503);
      return responseReceipt(receipt);
    } catch { return json({ error: "receipt_unavailable" }, 503); }
  };
}
