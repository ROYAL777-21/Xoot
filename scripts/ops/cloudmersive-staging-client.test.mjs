import { test } from "node:test";
import assert from "node:assert/strict";
import { invokeFixedStagingFixture, isExpectedStagingResult, projectStagingScanResult, STAGING_SCANNER_URL } from "./cloudmersive-staging-client.mjs";
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
test("a terminal state with unknown reason or absent/malformed receipt cannot pass acceptance", async () => {
  for (const remote of [{ state: "clean" }, { state: "clean", reason: "unknown", attemptId: "00000000-0000-4000-8000-000000000001" },
    { state: "clean", reason: "provider_clean", attemptId: "invalid" }]) {
    const result = await invokeFixedStagingFixture("synthetic-service-credential", "clean_pdf", async () =>
      new Response(JSON.stringify(remote), { headers: { "Content-Type": "application/json" } }));
    assert.equal(isExpectedStagingResult(result), false);
  }
});
test("complete clean and actual-malware-block evidence can pass", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  assert.equal(isExpectedStagingResult(projectStagingScanResult({ state: "clean", reason: "provider_clean", attemptId: id }, "clean_pdf", 200)), true);
  const blocked = projectStagingScanResult({ state: "blocked", reason: "provider_rejected", malwareDetected: true, attemptId: id }, "eicar", 200);
  assert.equal(isExpectedStagingResult(blocked), true);
  assert.equal(isExpectedStagingResult({ ...blocked, malwareDetected: false }), false);
});
