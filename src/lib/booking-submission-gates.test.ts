import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { bookingSubmissionAvailable } from "../../supabase/functions/_shared/booking-submission";

// Execute each actual Deno registration/handler with a blocked data transport.
// Only import adapters are synthetic; deleting/moving a gate runs legacy I/O and
// fails these tests. No source-string-only gate assertions.
function endpoint(name: string, authenticated = true) {
  let handler!: (req: Request) => Promise<Response>;
  const sideEffect = vi.fn(() => { throw new Error("Unexpected database access"); });
  const readBody = vi.fn(async (req: Request) => req.json());
  const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const service = { from: sideEffect, rpc: sideEffect };
  const actions = {
    handlePreflight: (req: Request) => req.method === "OPTIONS" ? new Response(null, { status: 204 }) :
      req.method !== "POST" ? response({}, 405) : null,
    requireAuth: async () => authenticated ? { user: { id: "verified-buyer" }, supa: service } : { response: response({}, 401) },
    fail: (error: string, _origin: unknown, status: number, extra: object) => response({ error, ...extra }, status),
    readJson: readBody,
  };
  const imports = new Proxy({}, { get: () => sideEffect });
  const source = readFileSync(`supabase/functions/${name}/index.ts`, "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, {
    exports: {}, Request, Response, URL, console,
    Deno: { serve: (fn: typeof handler) => { handler = fn; }, env: { get: () => undefined } },
    require: (path: string) => path.endsWith("booking-submission.ts") ? { bookingSubmissionAvailable } :
      path.endsWith("action-utils.ts") ? actions : path.startsWith("https://") ? {
        createClient: () => ({ ...service, auth: { getUser: async () => ({ data: { user: authenticated ? { id: "verified-buyer" } : null } }) } }),
      } : imports,
  });
  return { handler, sideEffect, readBody };
}

describe.each(["create-booking", "create-booking-request"])("disabled %s", (name) => {
  it.each([
    { serviceType: "airbnb", workerCount: 2, xooterIds: ["a", "b"] },
    { serviceType: "residential", workerCount: 1 },
    { contractVersion: 1, requestKey: "key", acceptedQuote: { totalCents: 1 }, bookingSubmissionAvailable: true },
    { contractVersion: 1, booking: { selectedXooterIds: [] } },
  ])("denies old and reviewed payloads before any booking side effect: %j", async (body) => {
    const test = endpoint(name);
    const result = await test.handler(new Request(`https://example.test/${name}`, {
      method: "POST", headers: { Authorization: "Bearer synthetic", "Content-Type": "application/json" }, body: JSON.stringify(body),
    }));
    expect(result.status).toBe(409);
    expect(await result.json()).toMatchObject({ status: "booking_submission_unavailable", bookingSubmissionAvailable: false });
    expect(test.sideEffect).not.toHaveBeenCalled();
    expect(test.readBody).not.toHaveBeenCalled();
  });
  it("preserves authentication and preflight without data access", async () => {
    const test = endpoint(name, false);
    expect((await test.handler(new Request("https://example.test", { method: "POST", headers: { Authorization: "Bearer synthetic" } }))).status).toBe(401);
    expect((await test.handler(new Request("https://example.test", { method: "OPTIONS" }))).status).toBe(204);
    expect(test.sideEffect).not.toHaveBeenCalled();
  });
});
