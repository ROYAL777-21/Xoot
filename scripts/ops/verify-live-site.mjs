#!/usr/bin/env node
import { hasNoindex, hasPrivateNoStore } from './live-header-contract.mjs';
/*
 * Prove a deployed Xoot site is actually correct — not merely that the build went green.
 *
 * ── Why this exists ────────────────────────────────────────────────────────────────────────────
 * The Vercel switch on 2026-09-01 could have shipped a GREEN build that was wrong in three ways
 * nothing in the repo would have caught:
 *
 *   1. `public/_headers` is a Netlify format. Vercel ignores it silently, so the site would serve
 *      with no CSP, no HSTS, and no `noindex` on /app, /auth and /admin.
 *   2. A Vite SPA with no rewrite 404s on every deep link — including every link in a blog post.
 *   3. Rewriting `/.well-known/*` to index.html breaks iOS Universal Links and Android App Links,
 *      and it fails silently: the app simply stops opening from a link.
 *
 * `assert-static-hosting-security.mjs` checks the CONFIG. This checks the SERVED SITE, which is the
 * only thing that is actually true. Run it after any deploy, or after switching hosts.
 *
 *   node scripts/ops/verify-live-site.mjs https://xoot.co.za
 *
 * Exits non-zero on any failure, so it can be a CI step or a release gate.
 */

const target = (process.argv[2] ?? "https://xoot.co.za").replace(/\/$/, "");
const timeoutMs = Number(process.env.XOOT_VERIFY_TIMEOUT_MS ?? 15000);

const results = [];
const record = (name, ok, detail) => results.push({ name, ok, detail });

const fetchWithTimeout = async (url, init = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
};

/** Header names are case-insensitive; `Headers` already normalises, but be explicit about it. */
const check = (response, header, pattern, label) => {
  const value = response.headers.get(header) ?? "";
  record(label, pattern.test(value), value || "(header absent)");
};

const run = async () => {
  console.log(`Verifying ${target}\n`);

  // ── The root document: security headers ───────────────────────────────────────────────────────
  let root;
  try {
    root = await fetchWithTimeout(`${target}/`);
  } catch (error) {
    console.error(`Could not reach ${target}: ${error.message}`);
    console.error("If this is a network-policy denial rather than a broken site, say so — do not");
    console.error("report the site as down on the strength of a blocked request.");
    process.exit(2);
  }

  record("root responds 200", root.status === 200, `HTTP ${root.status}`);
  check(root, "content-security-policy", /default-src 'self'/, "CSP present and self-default");
  check(root, "content-security-policy", /frame-ancestors 'none'/, "CSP blocks framing");
  check(root, "content-security-policy", /object-src 'none'/, "CSP blocks plugins");
  check(root, "strict-transport-security", /max-age=31536000/, "HSTS present");
  check(root, "x-content-type-options", /nosniff/, "MIME sniffing disabled");
  check(root, "referrer-policy", /strict-origin-when-cross-origin/, "Referrer policy set");
  check(root, "permissions-policy", /camera=\(\)/, "Permissions policy restricts camera");

  // ── The SPA rewrite: a deep link must serve the app, not a 404 ────────────────────────────────
  const deepLink = await fetchWithTimeout(`${target}/care-plus`);
  const deepBody = await deepLink.text();
  record(
    "deep link serves the SPA (not 404)",
    deepLink.status === 200 && /<div id="root">|<script/i.test(deepBody),
    `HTTP ${deepLink.status}, ${deepBody.length} bytes`,
  );

  // ── Private routes must not be indexable ──────────────────────────────────────────────────────
  // Cover every private entry point and an otherwise unlisted nested path: protecting
  // only known Xooter pages silently exposes any newly added private route.
  for (const route of [
    "/app", "/auth", "/admin", "/xooter", "/xooter/jobs",
    "/xooter/earnings", "/xooter/kyc", "/xooter/profile",
    "/xooter/training", "/xooter/apply", "/xooter/future-private-route",
  ]) {
    const response = await fetchWithTimeout(`${target}${route}`);
    const robots = response.headers.get("x-robots-tag") ?? "";
    const cache = response.headers.get("cache-control") ?? "";
    record(`${route} responds without server failure`, response.status < 500, `HTTP ${response.status}`);
    record(`${route} is noindex`, hasNoindex(robots), robots || "(header absent)");
    record(`${route} is private no-store`, hasPrivateNoStore(cache), cache || "(header absent)");
  }

  // ── Native app links must be served as real JSON, never rewritten to index.html ───────────────
  for (const path of ["/.well-known/apple-app-site-association", "/.well-known/assetlinks.json"]) {
    const response = await fetchWithTimeout(`${target}${path}`);
    if (response.status === 404) {
      // Not generated unless the signing values are set. Absent is honest; HTML is the bug.
      record(`${path} not rewritten to HTML`, true, "404 — not generated yet (needs signing values)");
      continue;
    }
    const body = await response.text();
    const isJson = body.trim().startsWith("{");
    record(`${path} served as JSON, not the SPA`, isJson, isJson ? "JSON" : "HTML — REWRITE IS TOO GREEDY");
  }

  // ── The bundle must carry a real Supabase config ──────────────────────────────────────────────
  const scriptMatch = deepBody.match(/src="(\/assets\/index-[^"]+\.js)"/);
  if (scriptMatch) {
    const bundle = await fetchWithTimeout(`${target}${scriptMatch[1]}`).then((r) => r.text());
    record(
      "bundle carries a real Supabase project URL",
      /https:\/\/[a-z0-9]{20}\.supabase\.co/.test(bundle),
      /https:\/\/[a-z0-9]{20}\.supabase\.co/.exec(bundle)?.[0] ?? "none found",
    );
    record(
      "bundle carries a publishable key, not a placeholder",
      /sb_publishable_[A-Za-z0-9_-]{10,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(bundle),
      "present",
    );
    /*
     * The one that would be a genuine incident. A service-role key in a browser bundle grants
     * every caller full database access with RLS bypassed.
     */
    record(
      "bundle contains NO service-role key",
      !/sb_secret_|sb_service_role_|"role"\s*:\s*"service_role"/.test(bundle),
      "checked",
    );
  } else {
    record("could locate the main bundle", false, "no /assets/index-*.js in the HTML");
  }

  // ── Report ────────────────────────────────────────────────────────────────────────────────────
  const width = Math.max(...results.map((r) => r.name.length));
  for (const { name, ok, detail } of results) {
    console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(width)}  ${detail}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);

  if (failed.length > 0) {
    /*
     * ⚠️ Distinguish "the site is wrong" from "you could not see the site".
     *
     * Run from a sandbox behind an egress proxy, every request comes back 403 and every check
     * fails — which looks exactly like a totally broken deploy and is not one. This repo has
     * already recorded a policy denial being misread as a real failure; do not do it again from
     * this script's output.
     */
    if (root.status === 401 || root.status === 403) {
      console.error(
        `\nThe root document answered HTTP ${root.status} before any check could run.\n` +
          "That is an ACCESS result, not a verdict on the site — a network-policy denial, Vercel\n" +
          "deployment protection, or an auth wall all look like this. Re-run from a network that\n" +
          "can reach the site before concluding anything about it.",
      );
      process.exitCode = 2;
      return;
    }
    console.error(`\n${failed.length} failed. See docs/release/deploy-hosts.md.`);
    // Let in-flight HTTP handles close before exit; forced exit can crash libuv
    // on Windows instead of returning the intended negative-control status.
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
