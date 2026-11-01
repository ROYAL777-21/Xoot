// Manual, synthetic-only integration check. Credentials stay in memory; output is allowlisted.
import { writeFileSync } from "node:fs";
import { invokeFixedStagingFixture, isExpectedStagingResult, readStagingServiceTransport, STAGING_SCANNER_PROJECT as project, STAGING_SCANNER_URL as target } from "./cloudmersive-staging-client.mjs";
let key;
try {
  key = await readStagingServiceTransport(process.env.SUPABASE_ACCESS_TOKEN);
} catch (error) {
  const reason = error instanceof Error && ["credential_transport_token_missing", "credential_transport_unavailable",
    "credential_transport_access_denied", "credential_transport_invalid_response"].includes(error.message) ? error.message : "credential_transport_unavailable";
  console.error(reason);
  process.exit(1);
}
const evidence = { project, environment: "staging", syntheticOnly: true, at: new Date().toISOString(), anonymous: null, results: [] };
let passed = true;
try {
  const anonymous = await fetch(target, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fixture: "clean_pdf" }),
    redirect: "error", signal: AbortSignal.timeout(35000) });
  evidence.anonymous = { http: anonymous.status };
  if (anonymous.status !== 401) passed = false;
  for (const fixture of ["clean_pdf", "eicar"]) {
    const safe = await invokeFixedStagingFixture(key, fixture);
    evidence.results.push(safe);
    console.log(JSON.stringify(safe));
    if (!isExpectedStagingResult(safe)) passed = false;
    if (safe.http !== 200 || safe.state === "held" || safe.state === "claimed") break;
    await new Promise(resolve => setTimeout(resolve, 3600));
  }
} catch { passed = false; console.error("The synthetic integration check could not finish. No raw provider response was retained."); }
evidence.passed = passed && evidence.results.length === 2;
writeFileSync("cloudmersive-staging-evidence.json", `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ project, passed: evidence.passed, anonymous: evidence.anonymous, count: evidence.results.length }));
if (!evidence.passed) process.exitCode = 1;
