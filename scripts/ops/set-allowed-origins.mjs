#!/usr/bin/env node
/**
 * Set `ALLOWED_ORIGINS` on a Supabase project's Edge Functions.
 *
 * Why this exists as its own script, rather than `set-supabase-edge-secrets.ps1`:
 *
 * 1. **`ALLOWED_ORIGINS` is not a secret.** It is a list of public domain names. The existing
 *    script rightly refuses to read from inside the repo and demands a secrets file kept
 *    elsewhere — correct for a service-role key, pure friction for this. Here the value is
 *    computed, so there is no file to make and nothing to keep out of git.
 * 2. It is Windows-only (`npx.cmd`). This runs anywhere node does.
 * 3. It sets everything in a file at once. This sets one variable, so it can be run without
 *    first assembling every other secret.
 *
 * **Why this is urgent** (see blocker.md): `getAllowedOrigins()` reads this variable and only
 * falls back to `defaultAllowedOrigins` compiled into the function at deploy time. Every
 * function deployed to production predates the xoot.co.za change, so every one of them still
 * has `zoothome.co.za` baked in and answers `403 origin not allowed` to the live site. Setting
 * this corrects all 42 at once, with no redeploy — which matters, because redeploying
 * `create-booking` would also reprice every booking.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=... node scripts/ops/set-allowed-origins.mjs production
 *   SUPABASE_ACCESS_TOKEN=... node scripts/ops/set-allowed-origins.mjs both
 *   node scripts/ops/set-allowed-origins.mjs both --print    # show the values, change nothing
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PROJECTS, compiledOrigins, productionValue, stagingValue } from "./lib/allowed-origins.mjs";

const CLI_VERSION = process.env.SUPABASE_CLI_VERSION ?? "2.108.0";
const SHARED = "supabase/functions/_shared/action-utils.ts";

const repoRoot = process.cwd();
const origins = compiledOrigins(readFileSync(join(repoRoot, SHARED), "utf8"));
const VALUES = { production: productionValue(origins), staging: stagingValue(origins) };

const args = process.argv.slice(2);
const printOnly = args.includes("--print");
const target = args.find((a) => !a.startsWith("--")) ?? "";
const targets = target === "both" ? ["production", "staging"] : [target];

if (!targets.every((t) => t in PROJECTS)) {
  console.error("Usage: set-allowed-origins.mjs <production|staging|both> [--print]");
  process.exit(2);
}

console.log("\nALLOWED_ORIGINS, derived from defaultAllowedOrigins:\n");
for (const t of targets) console.log(`  ${t.padEnd(11)} ${PROJECTS[t]}  ${VALUES[t]}`);

if (printOnly) {
  console.log("\n--print: nothing was changed.\n");
  process.exit(0);
}

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error(
    "\nSUPABASE_ACCESS_TOKEN is not set. Export it in your shell — do not paste it into chat," +
      "\nand do not commit it. The Supabase CLI reads it directly, so no `login` step is needed.\n",
  );
  process.exit(2);
}

for (const t of targets) {
  console.log(`\nSetting ALLOWED_ORIGINS on ${t}...`);
  execFileSync(
    "npx",
    ["-y", `supabase@${CLI_VERSION}`, "secrets", "set", `ALLOWED_ORIGINS=${VALUES[t]}`,
     "--project-ref", PROJECTS[t]],
    { stdio: "inherit" },
  );

  // `secrets list` prints names and digests, never values — Supabase does not read a secret
  // back. Seeing the name is the strongest confirmation available from outside the dashboard.
  const listed = execFileSync(
    "npx",
    ["-y", `supabase@${CLI_VERSION}`, "secrets", "list", "--project-ref", PROJECTS[t]],
    { encoding: "utf8" },
  );
  console.log(
    listed.includes("ALLOWED_ORIGINS")
      ? `  confirmed present on ${t}`
      : `  WARNING: ALLOWED_ORIGINS not listed on ${t} after setting it`,
  );
}

// Takes effect on the next invocation of each function — the variable is read per request by
// `getAllowedOrigins()`, not baked in at deploy. No redeploy, no restart.
console.log("\nDone. Live on the next request to each function; no redeploy needed.\n");
