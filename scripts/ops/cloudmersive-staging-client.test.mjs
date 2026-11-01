import { test } from "node:test";
import assert from "node:assert/strict";
import { invokeFixedStagingFixture, projectStagingScanResult, STAGING_SCANNER_URL } from "./cloudmersive-staging-client.mjs";
test("remote error/object/secret values cannot become logged evidence", () => {
  const source = { state: { key: "synthetic-secret" }, reason: "synthetic-secret", attemptId: ["synthetic-secret"],
    cached: "true", malwareDetected: { token: "synthetic-secret" }, arbitrary: "synthetic-secret" };
  assert.deepEqual(projectStagingScanResult(source, "eicar", 503), { fixture: "eicar", http: 503, state: null, reason: null,
    attemptId: null, cached: false, malwareDetected: false });
  assert(!JSON.stringify(projectStagingScanResult(source, "eicar", 503)).includes("synthetic-secret"));
});
test("known statuses/reasons and UUID are retained without extra remote fields", () => {
  assert.deepEqual(projectStagingScanResult({ state: "blocked", reason: "provider_rejected",
    attemptId: "00000000-0000-4000-8000-000000000001", cached: true, malwareDetected: true, body: "private payload" }, "eicar", 200),
  { fixture: "eicar", http: 200, state: "blocked", reason: "provider_rejected",
    attemptId: "00000000-0000-4000-8000-000000000001", cached: true, malwareDetected: true });
});
test("privileged transport pins staging, rejects redirects and returns projected values", async () => {
  let captured;
  const request = async (url, init) => {
    captured = { url, init };
    return new Response(JSON.stringify({ state: "clean", reason: "provider_clean", unexpected: "synthetic-secret" }),
      { headers: { "Content-Type": "application/json" } });
  };
  const result = await invokeFixedStagingFixture("synthetic-service-credential", "clean_pdf", request);
  assert.equal(captured.url, STAGING_SCANNER_URL);
  assert.equal(captured.init.redirect, "error");
  assert.equal(captured.init.headers.apikey, "synthetic-service-credential");
  assert.equal(captured.init.body, JSON.stringify({ fixture: "clean_pdf" }));
  assert(!JSON.stringify(result).includes("synthetic"));
});
test("unknown fixtures cannot reach the privileged transport", async () => {
  let called = false;
  await assert.rejects(invokeFixedStagingFixture("synthetic-service-credential", "arbitrary", async () => { called = true; }), /Invalid fixed/);
  assert.equal(called, false);
});
