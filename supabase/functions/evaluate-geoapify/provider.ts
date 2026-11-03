import { evaluateResponse, PUBLIC_FIXTURES, type EvaluationReport, type FixtureId } from "./adapter.ts";

export type ProviderResult = { reason: "provider_response"; report: EvaluationReport } |
  { reason: "dispatch_window_elapsed" | "provider_unavailable" | "provider_http_error" | "provider_invalid_response"; report: null };

async function boundedJson(response: Response): Promise<unknown> {
  if (!response.headers.get("content-type")?.toLowerCase().includes("application/json") || !response.body) return null;
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.length;
      if (length > 65_536) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; } finally { reader.releaseLock(); }
}

/** One bounded request. No retries, redirects, secondary provider or keyed-URL/error logging. */
export async function evaluatePublicFixture(id: FixtureId, apiKey: string, request: typeof fetch, canDispatch: () => boolean): Promise<ProviderResult> {
  const endpoint = new URL("https://api.geoapify.com/v1/geocode/search");
  endpoint.searchParams.set("text", PUBLIC_FIXTURES[id].query);
  endpoint.searchParams.set("filter", "countrycode:za");
  endpoint.searchParams.set("bias", "countrycode:none");
  endpoint.searchParams.set("format", "json"); endpoint.searchParams.set("limit", "3");
  endpoint.searchParams.set("lang", "en"); endpoint.searchParams.set("apiKey", apiKey);
  if (!canDispatch()) return { reason: "dispatch_window_elapsed", report: null };
  try {
    const response = await request(endpoint, { method: "GET", redirect: "error", credentials: "omit", referrerPolicy: "no-referrer",
      headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return { reason: "provider_http_error", report: null };
    const report = evaluateResponse(await boundedJson(response), id);
    return report ? { reason: "provider_response", report } : { reason: "provider_invalid_response", report: null };
  } catch { return { reason: "provider_unavailable", report: null }; }
}
