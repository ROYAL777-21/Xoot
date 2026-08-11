#!/usr/bin/env node
/**
 * Compare what is deployed against what is in this repository.
 *
 * Nothing did this until 2026-08-07, and every one of the 42 production Edge Functions turned
 * out to be behind. Two consequences had been live for weeks without a single test going red:
 * production charged a pricing model the repo had already replaced, and every function served
 * the old domain in its CORS allow-list. Both were invisible because the suite's guards read
 * repo files, and the repo files were correct.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=... node scripts/ops/check-deployed-drift.mjs [--staging]
 *   node scripts/ops/check-deployed-drift.mjs --from-json <file>
 *
 * `--from-json` takes the same shape the Management API returns ({ slug, updated_at } in ms),
 * for running where the API is not reachable — CI without the token, or a network that blocks
 * api.supabase.com. The comparison is identical either way; only where the list comes from
 * differs.
 *
 * Exit codes: 0 nothing stale, 1 drift found, 2 could not determine.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { classifyDrift, sharedClosure } from "./lib/deployed-drift.mjs";

const PROJECTS = { production: "mvlrkelahhsyjrwgsxaf", staging: "fxmxyabdjqviqbcxmvlp" };
const FUNCTIONS_DIR = "supabase/functions";
const SHARED_DIR = join(FUNCTIONS_DIR, "_shared");

const args = process.argv.slice(2);
const jsonAt = args.indexOf("--from-json");
const environment = args.includes("--staging") ? "staging" : "production";

const die = (message, code = 2) => {
  console.error(`deployed-drift: ${message}`);
  process.exit(code);
};

/** Last commit touching a path, as epoch seconds. 0 when git knows nothing about it. */
const lastCommit = (path) => {
  const out = execFileSync("git", ["log", "-1", "--format=%ct", "--", path], { encoding: "utf8" }).trim();
  return out ? Number(out) : 0;
};

const readIfPresent = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

async function fetchDeployments(ref) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) die("SUPABASE_ACCESS_TOKEN is not set. Pass --from-json to compare without it.");

  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/functions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) die(`Supabase API answered ${response.status}. Pass --from-json to compare without it.`);
  return response.json();
}

const loadDeployments = async () => {
  if (jsonAt !== -1) {
    const path = args[jsonAt + 1];
    if (!path) die("--from-json needs a file path.");
    return JSON.parse(readFileSync(path, "utf8"));
  }
  return fetchDeployments(PROJECTS[environment]);
};

const raw = await loadDeployments();
const list = Array.isArray(raw) ? raw : raw.functions;
if (!Array.isArray(list)) die("Could not read a function list from that input.");

// `updated_at` is epoch milliseconds from the API; git speaks seconds.
const deployments = list.map((fn) => ({ slug: fn.slug, deployedAt: Math.floor(fn.updated_at / 1000) }));

const sharedSources = {};
const sharedTimes = {};
for (const name of readdirSync(SHARED_DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
  sharedSources[name] = readFileSync(join(SHARED_DIR, name), "utf8");
  sharedTimes[name] = lastCommit(join(SHARED_DIR, name));
}

const ownTimes = {};
const closures = {};
for (const slug of readdirSync(FUNCTIONS_DIR)) {
  const dir = join(FUNCTIONS_DIR, slug);
  if (slug.startsWith("_") || !statSync(dir).isDirectory()) continue;
  ownTimes[slug] = lastCommit(dir);
  closures[slug] = sharedClosure(readIfPresent(join(dir, "index.ts")), sharedSources);
}

const { stale, inStep, orphans } = classifyDrift({ deployments, ownTimes, closures, sharedTimes });

const day = (seconds) => new Date(seconds * 1000).toISOString().slice(0, 16).replace("T", " ");
const source = jsonAt !== -1 ? args[jsonAt + 1] : `${environment} (${PROJECTS[environment]})`;

console.log(`\nDeployed vs repo — ${source}\n`);

if (stale.length > 0) {
  console.log(`${"function".padEnd(28)} ${"deployed".padEnd(18)} ${"repo newest".padEnd(18)} driven by`);
  console.log("-".repeat(94));
  for (const row of stale) {
    console.log(`${row.slug.padEnd(28)} ${day(row.deployedAt).padEnd(18)} ${day(row.sourceAt).padEnd(18)} ${row.driver}`);
  }
}

const notDeployed = Object.keys(ownTimes).filter((slug) => !deployments.some((d) => d.slug === slug)).sort();

console.log(`\n${stale.length} stale, ${inStep.length} in step, of ${deployments.length} deployed.`);
if (orphans.length > 0) console.log(`Deployed with NO source in this repo: ${orphans.join(", ")}`);
if (notDeployed.length > 0) console.log(`In repo but not deployed: ${notDeployed.join(", ")}`);

// Said plainly, because a green run here is a weaker claim than it looks. Timestamps prove a
// deployment CANNOT contain current code; they cannot prove it does. A function deployed from
// another branch, or edited by hand in the dashboard, reads as current. Only get_edge_function
// and a diff settle that, and it is worth doing for anything that charges money.
console.log(
  "\nTimestamps only. In step here means the deployment is not provably behind — it does not\n" +
    "prove the bytes match. Diff the live source for anything that touches money or auth.",
);

process.exit(stale.length > 0 || orphans.length > 0 ? 1 : 0);
