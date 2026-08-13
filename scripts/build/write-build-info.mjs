#!/usr/bin/env node
/**
 * Stamp the built site with the commit it came from, so "is the live site current?" is answerable.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────────
 * `go-live.md` §3b says the web app must ship before the two booking writers, and its gate is
 * "wait for the Netlify deploy to succeed". Until now that gate was a human squinting at the site,
 * because nothing published anywhere said which build was serving.
 *
 * Measured 2026-08-12: the booking functions went out **70 seconds** after the merge. Netlify had
 * almost certainly not finished building, so for a few minutes the new server charged R39 on a
 * recurring booking while the old client still displayed R0 — the under-statement §3b exists to
 * prevent. Nothing caught it because nothing could.
 *
 * With this file in `dist`, `.github/workflows/verify-live-deploy.yml` fetches
 * `https://xoot.co.za/build-info.json` and compares the commit. The gate becomes a check.
 *
 * ⚠️ An agent session cannot do that comparison itself. Outbound CONNECT to `xoot.co.za:443` is
 * refused by the organisation's egress policy — the proxy logs it as `connect_rejected`, gateway
 * 403 — and `/root/.ccr/README.md` says to report policy denials rather than work around them. A
 * CI runner has no such restriction, which is why the check lives in a workflow.
 *
 * ── What is in it, and what is deliberately not ─────────────────────────────────
 * The commit SHA and a build timestamp. A SHA is an identifier, not a credential, and it is the
 * standard way to answer "what is deployed". Nothing else goes in here: this file is world-readable
 * on a public origin, so it must never carry branch names that hint at unreleased work, build
 * environment detail, or anything resembling configuration.
 *
 * ── Why it can never fail the build ─────────────────────────────────────────────
 * Every lookup falls through to the next, ending at "unknown". A missing stamp costs one
 * verification; a build that refuses to finish costs the deploy. The check reports "unknown" as
 * "this build predates the stamp", which is true and actionable, rather than as a failure.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const OUT = resolve(process.cwd(), "dist", "build-info.json");

/**
 * The commit being built, from whichever CI is doing the building.
 *
 * `COMMIT_REF` is Netlify's — it is the one that matters, because Netlify is what serves the site.
 * `GITHUB_SHA` covers a CI build. The `git` call covers a local build. Order is deliberate: the
 * platform doing the deploying is more authoritative about what it is deploying than the checkout
 * happens to be.
 */
const commitFromEnv = () => {
  for (const name of ["COMMIT_REF", "GITHUB_SHA", "VERCEL_GIT_COMMIT_SHA"]) {
    const value = String(process.env[name] ?? "").trim();
    if (/^[0-9a-f]{7,40}$/i.test(value)) return value;
  }
  return "";
};

const commitFromGit = () => {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    // No git in the build image, or a shallow export. Not a problem worth failing over.
    return "";
  }
};

const commit = commitFromEnv() || commitFromGit() || "unknown";

/**
 * The pricing rule this build implements, read out of the module that implements it.
 *
 * `deploy-edge-functions.yml` refuses to ship a booking writer to production while the live site
 * still serves a different rule — the §3b ordering gate, which was missed by ~70 seconds on
 * 2026-08-12 and briefly charged R39 against a client showing R0.
 *
 * Read from source rather than hardcoded here, because a second hand-maintained copy of a money
 * rule is precisely the drift this repo keeps paying for. Regex rather than an import because
 * this is plain node ESM and the source is TypeScript; `pricing-parity.test.ts` asserts this
 * script still reads them, so the extraction cannot quietly start returning "unknown".
 *
 * Same fall-through discipline as the commit: a marker that cannot be read costs one
 * verification, and the deploy guard treats a missing rule as "this build predates the stamp",
 * which is true and actionable. A build that refuses to finish costs the deploy.
 */
const pricingFromSource = () => {
  try {
    const src = readFileSync(resolve(process.cwd(), "src/lib/xoot-pricing.ts"), "utf8");
    const rule = /export const PRICING_RULE = "([A-Z]+-\d+)"/.exec(src)?.[1] ?? "";
    const fee = /export const BOOKING_FEE_CENTS = (\d+)/.exec(src)?.[1] ?? "";
    return { pricingRule: rule || "unknown", bookingFeeCents: fee ? Number(fee) : null };
  } catch {
    return { pricingRule: "unknown", bookingFeeCents: null };
  }
};

const info = { commit, builtAt: new Date().toISOString(), ...pricingFromSource() };

try {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(info, null, 2)}\n`, "utf8");
  console.log(`Wrote dist/build-info.json (commit ${commit.slice(0, 8)})`);
} catch (error) {
  // Same reasoning as above: report it, do not fail the build over a verification aid.
  console.warn(`Could not write dist/build-info.json: ${error?.message ?? error}`);
}
