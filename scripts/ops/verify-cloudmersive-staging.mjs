// Manual, synthetic-only integration check. Credentials stay in memory; output is allowlisted.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const project = "fxmxyabdjqviqbcxmvlp";
let key;
try {
  const raw = execFileSync("supabase", ["projects", "api-keys", "--project-ref", project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000 });
  const parsed = JSON.parse(raw);
  const keys = Array.isArray(parsed) ? parsed : parsed.api_keys ?? parsed.keys ?? [];
  key = keys.find(item => item.name === "service_role" || item.type === "service_role")?.api_key;
} catch {
  console.error("The configured staging credential transport is unavailable. No credential output was retained.");
  process.exit(1);
}
if (typeof key !== "string" || !key) { console.error("A configured staging service key is required."); process.exit(1); }
const target = "https://fxmxyabdjqviqbcxmvlp.supabase.co/functions/v1/scan-xooter-document";
const evidence = { project, environment: "staging", syntheticOnly: true, at: new Date().toISOString(), anonymous: null, results: [] };
let passed = true;
try {
  const anonymous = await fetch(target, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fixture: "clean_pdf" }) });
  evidence.anonymous = { http: anonymous.status };
  if (anonymous.status !== 401) passed = false;
  for (const fixture of ["clean_pdf", "eicar"]) {
    const response = await fetch(target, { method: "POST", headers: { Authorization: `Bearer ${key}`, apikey: key,
      "Content-Type": "application/json" }, body: JSON.stringify({ fixture }), signal: AbortSignal.timeout(35000) });
    const value = await response.json();
    const safe = { fixture, http: response.status, state: value.state ?? null, reason: value.reason ?? value.error ?? null,
      attemptId: value.attemptId ?? null, cached: value.cached === true, malwareDetected: value.malwareDetected === true };
    evidence.results.push(safe);
    console.log(JSON.stringify(safe));
    if (response.status !== 200 || safe.state !== (fixture === "clean_pdf" ? "clean" : "blocked") ||
      (fixture === "eicar" && !safe.malwareDetected)) passed = false;
    if (response.status !== 200 || safe.state === "held" || safe.state === "claimed") break;
    await new Promise(resolve => setTimeout(resolve, 3600));
  }
} catch { passed = false; console.error("The synthetic integration check could not finish. No raw provider response was retained."); }
evidence.passed = passed && evidence.results.length === 2;
writeFileSync("cloudmersive-staging-evidence.json", `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ project, passed: evidence.passed, anonymous: evidence.anonymous, count: evidence.results.length }));
if (!evidence.passed) process.exitCode = 1;
