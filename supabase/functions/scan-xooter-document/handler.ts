import { MAX_SCAN_BYTES, scanDocument, sha256 } from "../_shared/cloudmersive.ts";
import { inspectDocumentBytes } from "../submit-xooter-application/document-persistence.ts";

type Result = { data: unknown; error: unknown };
type Store = {
  rpc(name: string, input: Record<string, unknown>): PromiseLike<Result>;
  storage: { from(bucket: string): { download(path: string): PromiseLike<{ data: Blob | null; error: unknown }> } };
};
type Configuration = { supabaseUrl: string; serviceKey: string; apiKey: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
});
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

/** A valid, non-personal one-page PDF. EICAR is a harmless standard antivirus test string. */
export function syntheticScanFixture(kind: "clean_pdf" | "eicar") {
  if (kind === "eicar") return { contentType: "application/x-xoot-synthetic-eicar", bytes: new TextEncoder().encode(
    "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*",
  ) };
  let pdf = "%PDF-1.4\n";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Contents 4 0 R >>", "<< /Length 0 >>\nstream\n\nendstream"];
  const offsets = [0];
  for (const [index, body] of objects.entries()) { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${body}\nendobj\n`; }
  const start = pdf.length;
  pdf += "xref\n0 5\n0000000000 65535 f \n" + offsets.slice(1).map(offset => `${String(offset).padStart(10,"0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return { contentType: "application/pdf", bytes: new TextEncoder().encode(pdf) };
}

async function boundedBody(req: Request) {
  if (!req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];let size = 0;
  try {
    while (true) {
      const { done,value } = await reader.read();if (done) break;
      size += value.length;if(size > 4096) { await reader.cancel();return null; }chunks.push(value);
    }
    const bytes = new Uint8Array(size);let offset=0;
    for(const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.length;}
    return record(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {return null;} finally {reader.releaseLock();}
}

/** Privileged queue worker, never a browser uploader or a document-approval endpoint. */
export function createScanHandler(config: Configuration, store: Store, request: typeof fetch = fetch) {
  return async (req: Request) => {
    if (req.method !== "POST") return json({ error: "method_not_allowed" },405);
    const header = req.headers.get("Authorization") ?? "";
    if (!config.serviceKey || header.length > 4096 || !header.startsWith("Bearer ")) return json({error:"unauthorized"},401);
    const expected = await sha256(new TextEncoder().encode(`Bearer ${config.serviceKey}`));
    const provided = await sha256(new TextEncoder().encode(header));
    let mismatch=0;for(let i=0;i<expected.length;i++) mismatch|=expected.charCodeAt(i)^provided.charCodeAt(i);
    if(mismatch) return json({error:"unauthorized"},401);
    if(req.headers.has("Origin")) return json({error:"server_worker_required"},403);
    // The current Free account is evaluation-only. No production or real-person processing opens.
    if(config.supabaseUrl!=="https://fxmxyabdjqviqbcxmvlp.supabase.co") return json({error:"evaluation_staging_only"},409);
    if(!config.apiKey) return json({error:"scanner_not_configured"},503);
    const body=await boundedBody(req);
    if(!body || Object.keys(body).some(key=>key!=="fixture" && key!=="documentId") ||
      (body.fixture===undefined)===(body.documentId===undefined) ||
      (body.fixture!==undefined && (typeof body.fixture!=="string" || !["clean_pdf","eicar"].includes(body.fixture))) ||
      (body.documentId!==undefined && (typeof body.documentId!=="string" || !uuid.test(body.documentId)))) {
      return json({error:"invalid_scan_request"},400);
    }
    const claimed=await store.rpc("claim_kyc_scan",{p_document_id:body.documentId??null,p_fixture:body.fixture??null});
    const claim=record(claimed.data);
    if(claimed.error || !claim) return json({error:"scan_claim_unavailable"},503);
    if(claim.cached===true || claim.state!=="claimed") return json({state:claim.state,reason:claim.reason,
      attemptId:claim.attemptId,cached:claim.cached===true,malwareDetected:claim.malwareDetected===true});
    if(typeof claim.attemptId!=="string" || !uuid.test(claim.attemptId)) return json({error:"invalid_scan_claim"},503);
    let verdict: Awaited<ReturnType<typeof scanDocument>> = {verdict:"error",reason:"document_unavailable"};
    let observedSha: string | null=null;
    try {
      let bytes: Uint8Array;let contentType: string;
      if(body.fixture) ({bytes,contentType}=syntheticScanFixture(body.fixture as "clean_pdf"|"eicar"));
      else {
        if(typeof claim.storagePath!=="string" || typeof claim.byteLength!=="number" ||
          !Number.isSafeInteger(claim.byteLength) || claim.byteLength<1 || claim.byteLength>MAX_SCAN_BYTES ||
          typeof claim.contentType!=="string" || typeof claim.sha256!=="string") throw new Error("invalid_claim");
        const download=await store.storage.from("kyc-docs").download(claim.storagePath);
        if(download.error || !download.data || download.data.size!==claim.byteLength) throw new Error("download_unavailable");
        bytes=new Uint8Array(await download.data.arrayBuffer());contentType=claim.contentType;
        const inspected=await inspectDocumentBytes(bytes,contentType,claim.storagePath);observedSha=inspected.sha256;
        if(observedSha!==claim.sha256) throw new Error("object_changed");
      }
      const dispatchStarted=performance.now();
      const admitted=await store.rpc("authorize_kyc_scan_dispatch",{p_attempt_id:claim.attemptId});
      if(admitted.error || record(admitted.data)?.authorized!==true) verdict={verdict:"error",reason:"provider_dispatch_unavailable"};
      else verdict=await scanDocument(bytes,contentType,config.apiKey,request,()=>performance.now()-dispatchStarted<=2000);
    } catch { /* Fail closed; never return file paths, identity fields or provider errors. */ }
    const finished=await store.rpc("finish_kyc_scan",{p_attempt_id:claim.attemptId,p_verdict:verdict.verdict,
      p_reason:verdict.reason,p_response_sha256:verdict.responseSha256??null,p_observed_sha256:observedSha,
      p_malware_detected:verdict.malwareDetected===true});
    const receipt=record(finished.data);
    if(finished.error || !receipt) return json({error:"scan_receipt_unavailable"},503);
    return json({state:receipt.state,reason:receipt.reason,attemptId:receipt.attemptId,
      cached:receipt.cached===true,malwareDetected:receipt.malwareDetected===true});
  };
}
