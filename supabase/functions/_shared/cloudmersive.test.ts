import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { CLOUDMERSIVE_SCAN_URL, MAX_SCAN_BYTES, parseScanVerdict, scanDocument } from "./cloudmersive";

const clean = {
  CleanResult: true, ContainsExecutable: false, ContainsInvalidFile: false, ContainsScript: false,
  ContainsPasswordProtectedFile: false, ContainsRestrictedFileFormat: false, ContainsMacros: false,
  ContainsXmlExternalEntities: false, ContainsInsecureDeserialization: false, ContainsHtml: false,
  ContainsUnsafeArchive: false, ContainsOleEmbeddedObject: false, ContainsUnwantedAction: false,
  VerifiedFileFormat: ".pdf", FoundViruses: [],
};
const file = new TextEncoder().encode("%PDF-1.4\nsynthetic integration fixture");
beforeAll(() => vi.stubGlobal("crypto", webcrypto));
afterAll(() => vi.unstubAllGlobals());
describe("private Cloudmersive scanning", () => {
  it("requires explicit clean, every threat flag, no detected virus and a verified permitted format", () => {
    expect(parseScanVerdict(clean).verdict).toBe("clean");
    expect(parseScanVerdict({ ...clean, CleanResult: "true" }).verdict).toBe("error");
    expect(parseScanVerdict({ ...clean, ContainsHtml: undefined }).verdict).toBe("error");
    expect(parseScanVerdict({ ...clean, ContainsScript: true }).verdict).toBe("blocked");
    expect(parseScanVerdict({ ...clean, FoundViruses: [{ FileName: "private name", VirusName: "EICAR" }] }).verdict).toBe("blocked");
    expect(parseScanVerdict({ ...clean, VerifiedFileFormat: ".exe" }).verdict).toBe("blocked");
    expect(parseScanVerdict({ CleanResult: false })).toEqual({ verdict: "blocked", reason: "provider_rejected", malwareDetected: false });
  });
  it("never sends an unsupported or over-limit upload, or a missing key", async () => {
    const request = vi.fn();
    for (const [bytes, type, key] of [[file, "text/html", "synthetic"], [new Uint8Array(MAX_SCAN_BYTES + 1), "application/pdf", "synthetic"],
      [file, "application/pdf", ""], [file, "application/pdf", "bad\r\nkey"]] as const) {
      expect((await scanDocument(bytes, type, key, request)).verdict).toBe("error");
    }
    expect(request).not.toHaveBeenCalled();
  });
  it("pins HTTPS, blocks redirects and risky content, and uses only a generic filename", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify(clean), { headers: { "content-type": "application/json" } }));
    const verdict = await scanDocument(file, "application/pdf", "synthetic-not-a-real-key", request);
    expect(verdict.verdict).toBe("clean");
    expect(verdict.responseSha256).toMatch(/^[a-f0-9]{64}$/);
    const [url, init] = request.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(CLOUDMERSIVE_SCAN_URL);
    expect(init.redirect).toBe("error");
    expect((init.headers as Headers).get("allowHtml")).toBe("false");
    expect((init.headers as Headers).get("allowUnwantedAction")).toBe("false");
    expect(((init.body as FormData).get("inputFile") as File).name).toBe("document.pdf");
    expect(JSON.stringify(verdict)).not.toContain("synthetic-not-a-real-key");
  });
  it.each([401, 413, 429, 500])("keeps HTTP %s quarantined without raw errors or retries", async status => {
    const request = vi.fn(async () => new Response("sensitive provider failure body", { status }));
    const result = await scanDocument(file, "application/pdf", "synthetic", request);
    expect(result.verdict).toBe("error");
    expect(JSON.stringify(result)).not.toContain("sensitive");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("rejects HTML, malformed and unbounded streaming responses", async () => {
    for (const response of [new Response("<html>login</html>"),
      new Response("not-json", { headers: { "content-type": "application/json" } }),
      new Response("x".repeat(65537), { headers: { "content-type": "application/json" } })]) {
      expect((await scanDocument(file, "application/pdf", "synthetic", async () => response)).verdict).toBe("error");
    }
  });
  it("never invokes fetch after the worker's dispatch window expires",async()=>{
    const request=vi.fn();
    expect(await scanDocument(file,"application/pdf","synthetic",request,()=>false))
      .toEqual({verdict:"error",reason:"dispatch_window_expired"});
    expect(request).not.toHaveBeenCalled();
  });
});
