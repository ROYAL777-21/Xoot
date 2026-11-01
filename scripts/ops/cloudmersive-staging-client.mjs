export const STAGING_SCANNER_PROJECT = "fxmxyabdjqviqbcxmvlp";
export const STAGING_SCANNER_URL = "https://fxmxyabdjqviqbcxmvlp.supabase.co/functions/v1/scan-xooter-document";
/** Transport-shape check only; the hosted worker still verifies the actual configured key. */
export function hasExpectedServiceTransportShape(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) return false;
  try {
    const claims = JSON.parse(Buffer.from(value.split(".")[1], "base64url").toString("utf8"));
    return claims.role === "service_role" && claims.ref === STAGING_SCANNER_PROJECT;
  } catch { return false; }
}

/** Official read-only Management API avoids Go/TypeScript CLI reveal-flag differences. */
export async function readStagingServiceTransport(accessToken, request = fetch) {
  if (typeof accessToken !== "string" || !accessToken.startsWith("sbp_")) throw new Error("credential_transport_token_missing");
  let response;
  try {
    response = await request("https://api.supabase.com/v1/projects/fxmxyabdjqviqbcxmvlp/api-keys?reveal=true", {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(15000),
    });
  } catch { throw new Error("credential_transport_unavailable"); }
  if (response.status !== 200) {
    await response.body?.cancel();
    throw new Error(response.status === 401 || response.status === 403 ? "credential_transport_access_denied" : "credential_transport_unavailable");
  }
  let keys;
  try { keys = await response.json(); } catch { throw new Error("credential_transport_invalid_response"); }
  const candidates = Array.isArray(keys) ? keys.filter(item => item && item.name === "service_role" && item.disabled !== true) : [];
  const key = candidates.length === 1 ? candidates[0].api_key : null;
  if (!hasExpectedServiceTransportShape(key)) throw new Error("credential_transport_invalid_response");
  return key;
}
const states = new Set(["claimed", "held", "clean", "blocked", "error"]);
const reasons = new Set([
  "method_not_allowed", "unauthorized", "server_worker_required", "evaluation_staging_only", "scanner_not_configured",
  "invalid_scan_request", "scan_claim_unavailable", "invalid_scan_claim", "document_unavailable",
  "provider_dispatch_unavailable", "scan_receipt_unavailable", "key_unavailable", "scan_size_limit", "unsupported_type",
  "invalid_response", "provider_rejected", "incomplete_response", "threat_detected", "unsupported_format", "provider_limit",
  "provider_unavailable", "response_too_large", "provider_clean", "dispatch_window_expired", "scan_budget_unavailable",
  "processing_review_pending", "quarantine_receipt_unavailable", "object_changed", "scan_budget_exhausted", "scanner_busy",
  "scan_lease_expired", "provider_dispatch_required",
]);
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function projectStagingScanResult(value, fixture, http) {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const reason = record.reason ?? record.error;
  return { fixture, http, state: typeof record.state === "string" && states.has(record.state) ? record.state : null,
    reason: typeof reason === "string" && reasons.has(reason) ? reason : null,
    attemptId: typeof record.attemptId === "string" && uuid.test(record.attemptId) ? record.attemptId : null,
    cached: record.cached === true, malwareDetected: record.malwareDetected === true };
}

export function isExpectedStagingResult(result) {
  if (result.http !== 200 || typeof result.attemptId !== "string" || !uuid.test(result.attemptId)) return false;
  if (result.fixture === "clean_pdf") return result.state === "clean" && result.reason === "provider_clean";
  return result.fixture === "eicar" && result.state === "blocked" && result.malwareDetected === true &&
    ["provider_rejected", "threat_detected"].includes(result.reason);
}

/** Fixed staging target/fixtures only; no redirect can carry the privileged apikey header away. */
export async function invokeFixedStagingFixture(serviceKey, fixture, request = fetch) {
  if (!["clean_pdf", "eicar"].includes(fixture)) throw new Error("Invalid fixed staging fixture");
  const response = await request(STAGING_SCANNER_URL, { method: "POST", headers: { Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey, "Content-Type": "application/json" }, body: JSON.stringify({ fixture }),
    redirect: "error", signal: AbortSignal.timeout(35000) });
  return projectStagingScanResult(await response.json(), fixture, response.status);
}
