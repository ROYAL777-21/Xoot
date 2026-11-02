/** Server-only Cloudmersive adapter. No raw provider response, credential or filename is logged. */
export const CLOUDMERSIVE_SCAN_URL = "https://api.cloudmersive.com/virus/scan/file/advanced";
// Below the published Free evaluation limit of 3.5 MB; larger uploads stay quarantined.
export const MAX_SCAN_BYTES = 3_000_000;
export const SCAN_POLICY = "xoot-kyc-cloudmersive-v2";
const RESPONSE_LIMIT = 64 * 1024;
const threatFields = [
  "ContainsExecutable", "ContainsInvalidFile", "ContainsScript", "ContainsPasswordProtectedFile",
  "ContainsRestrictedFileFormat", "ContainsMacros", "ContainsXmlExternalEntities",
  "ContainsInsecureDeserialization", "ContainsHtml", "ContainsUnsafeArchive",
  "ContainsOleEmbeddedObject", "ContainsUnwantedAction",
] as const;
const safeFormats = new Set(["pdf", "png", "jpg", "jpeg", "webp"]);
type FieldKind = "true" | "false" | "missing" | "invalid";
export type ScanResponseProfile = { clean:FieldKind; virusList:"null"|"empty_array"|"nonempty_array"|"missing"|"invalid";
  verifiedFormat:"pdf"|"png"|"jpg"|"jpeg"|"webp"|"unverified"; threatFlags:Record<string,FieldKind> };
export type ScanVerdict = { verdict: "clean" | "blocked" | "error"; reason: string; responseSha256?: string; malwareDetected?: boolean; responseProfile?:ScanResponseProfile };
const fieldKind=(value:unknown):FieldKind=>value===true ? "true" : value===false ? "false" : value===undefined ? "missing" : "invalid";
/** Fixed categories only. Never project virus names, filenames, ContentInformation or raw strings. */
export function scanResponseProfile(value:unknown):ScanResponseProfile {
  const row=value && typeof value==="object" && !Array.isArray(value) ? value as Record<string,unknown> : {};
  const format=typeof row.VerifiedFileFormat==="string" ? row.VerifiedFileFormat.trim().toLowerCase().replace(/^\./,"") : "";
  return {clean:fieldKind(row.CleanResult),virusList:row.FoundViruses===null ? "null" : Array.isArray(row.FoundViruses)
    ? row.FoundViruses.length ? "nonempty_array" : "empty_array" : row.FoundViruses===undefined ? "missing" : "invalid",
  verifiedFormat:safeFormats.has(format) ? format as ScanResponseProfile["verifiedFormat"] : "unverified",
  threatFlags:Object.fromEntries(threatFields.map(field=>[field,fieldKind(row[field])]))};
}

export async function sha256(bytes: Uint8Array) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer)))
    .map(value => value.toString(16).padStart(2, "0")).join("");
}

/** Missing/contradictory fields can never become a clean verdict. */
export function parseScanVerdict(value: unknown): ScanVerdict {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { verdict: "error", reason: "invalid_response" };
  const result = value as Record<string, unknown>;
  if (result.CleanResult === false) return { verdict: "blocked", reason: "provider_rejected",
    malwareDetected: Array.isArray(result.FoundViruses) && result.FoundViruses.some(virus=>virus && typeof virus==="object"
      && typeof virus.VirusName==="string" && virus.VirusName.trim().length>0 && typeof virus.FileName==="string") };
  if (result.CleanResult !== true || threatFields.some(field => typeof result[field] !== "boolean") ||
      (result.FoundViruses!==null && !Array.isArray(result.FoundViruses)) || typeof result.VerifiedFileFormat !== "string") {
    return { verdict: "error", reason: "incomplete_response" };
  }
  // Cloudmersive's official Advanced Scan example explicitly handles a null virus list.
  // Missing/invalid lists or threat flags still fail above; null never overrides another signal.
  if ((Array.isArray(result.FoundViruses) && result.FoundViruses.length) || threatFields.some(field => result[field] === true)) {
    return { verdict: "blocked", reason: "threat_detected" };
  }
  const format = result.VerifiedFileFormat.trim().toLowerCase().replace(/^\./, "");
  return safeFormats.has(format) ? { verdict: "clean", reason: "provider_clean" }
    : { verdict: "blocked", reason: "unsupported_format" };
}

export async function scanDocument(
  bytes: Uint8Array, contentType: string, apiKey: string,
  request: typeof fetch = fetch,
  canDispatch: () => boolean = () => true,
): Promise<ScanVerdict> {
  if (!apiKey || apiKey.length > 1024 || /[\r\n]/.test(apiKey)) return { verdict: "error", reason: "key_unavailable" };
  if (!bytes.length || bytes.length > MAX_SCAN_BYTES) return { verdict: "error", reason: "scan_size_limit" };
  const extension = ({ "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
    "application/x-xoot-synthetic-eicar": "txt" } as Record<string, string>)[contentType];
  if (!extension) return { verdict: "error", reason: "unsupported_type" };
  const form = new FormData();
  form.append("inputFile", new Blob([new Uint8Array(bytes).buffer], { type: contentType }), `document.${extension}`);
  const headers = new Headers({ Apikey: apiKey, Accept: "application/json", fileName: `document.${extension}`,
    restrictFileTypes: ".pdf,.png,.jpg,.jpeg,.webp" });
  for (const name of ["allowExecutables", "allowInvalidFiles", "allowScripts", "allowPasswordProtectedFiles",
    "allowMacros", "allowXmlExternalEntities", "allowInsecureDeserialization", "allowHtml", "allowUnsafeArchives",
    "allowOleEmbeddedObject", "allowUnwantedAction"]) headers.set(name, "false");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    if (!canDispatch()) return { verdict: "error", reason: "dispatch_window_expired" };
    const response = await request(CLOUDMERSIVE_SCAN_URL, { method: "POST", headers, body: form,
      redirect: "error", signal: controller.signal });
    if (response.status !== 200 || !response.headers.get("content-type")?.toLowerCase().includes("application/json") ||
        Number(response.headers.get("content-length") ?? 0) > RESPONSE_LIMIT || !response.body) {
      await response.body?.cancel();
      return { verdict: "error", reason: response.status === 429 ? "provider_limit" : "provider_unavailable" };
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > RESPONSE_LIMIT) { await reader.cancel(); return { verdict: "error", reason: "response_too_large" }; }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const payload = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { payload.set(chunk, offset); offset += chunk.length; }
    const parsed=JSON.parse(new TextDecoder().decode(payload));
    return { ...parseScanVerdict(parsed), responseSha256: await sha256(payload),responseProfile:scanResponseProfile(parsed) };
  } catch { return { verdict: "error", reason: "provider_unavailable" }; }
  finally { clearTimeout(timer); }
}
