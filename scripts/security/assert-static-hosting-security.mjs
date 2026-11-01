import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const headersText = readFileSync(join(ROOT, "public", "_headers"), "utf8");
const htaccessText = readFileSync(join(ROOT, "public", ".htaccess"), "utf8");
const netlifyText = readFileSync(join(ROOT, "netlify.toml"), "utf8");

const findings = [];

const requireMatch = (name, text, pattern) => {
  if (!pattern.test(text)) findings.push(name);
};

const parseNetlifyHeaders = (text) => {
  const routes = new Map();
  let currentRoute = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;
    if (!/^\s/.test(rawLine)) {
      currentRoute = line.trim();
      routes.set(currentRoute, []);
      continue;
    }
    if (currentRoute) routes.get(currentRoute).push(line.trim());
  }

  return routes;
};

const headerRoutes = parseNetlifyHeaders(headersText);
const requiredPrivateRoutes = [
  "/app",
  "/app/*",
  "/auth",
  "/auth/*",
  "/admin",
  "/admin/*",
  "/xooter",
  "/xooter/*",
];

requireMatch("Netlify headers define CSP", headersText, /Content-Security-Policy:\s+.*default-src 'self'/);
requireMatch("Netlify CSP blocks framing", headersText, /Content-Security-Policy:\s+.*frame-ancestors 'none'/);
requireMatch("Netlify CSP blocks plugins", headersText, /Content-Security-Policy:\s+.*object-src 'none'/);
requireMatch("Netlify headers enable HSTS", headersText, /Strict-Transport-Security:\s+max-age=31536000; includeSubDomains; preload/);
requireMatch("Netlify headers disable MIME sniffing", headersText, /X-Content-Type-Options:\s+nosniff/);
requireMatch("Netlify headers set referrer policy", headersText, /Referrer-Policy:\s+strict-origin-when-cross-origin/);
requireMatch("Netlify headers restrict device permissions", headersText, /Permissions-Policy:\s+.*camera=\(\).*microphone=\(\).*payment=\(\)/);
requireMatch("Netlify service worker is not cached immutably", headersText, /\/sw\.js\s+Cache-Control:\s+no-cache/s);

for (const route of requiredPrivateRoutes) {
  const rules = headerRoutes.get(route)?.join("\n") ?? "";
  if (!/X-Robots-Tag:\s+noindex, noarchive, nosnippet/.test(rules)) {
    findings.push(`Netlify ${route} noindex header missing`);
  }
  if (!/Cache-Control:\s+no-store, private, max-age=0, must-revalidate/.test(rules)) {
    findings.push(`Netlify ${route} no-store header missing`);
  }
}

requireMatch("Apache .htaccess sets CSP", htaccessText, /Header always set Content-Security-Policy "/);
requireMatch("Apache .htaccess CSP uses self default", htaccessText, /Content-Security-Policy ".*default-src 'self'/);
requireMatch("Apache .htaccess CSP blocks framing", htaccessText, /Content-Security-Policy ".*frame-ancestors 'none'/);
requireMatch("Apache .htaccess CSP blocks plugins", htaccessText, /Content-Security-Policy ".*object-src 'none'/);
requireMatch("Apache .htaccess protects private SPA routes from indexing", htaccessText, /SetEnvIf Request_URI "\^\/\(app\|auth\|admin\)\(\/\|\$\)" XOOT_NOINDEX/);
requireMatch("Apache .htaccess marks private SPA routes no-store", htaccessText, /SetEnvIf Request_URI "\^\/\(app\|auth\|admin\)\(\/\|\$\)" XOOT_NOSTORE/);
if (!htaccessText.includes('SetEnvIf Request_URI "^/xooter(/|$)" XOOT_NOINDEX')) findings.push("Apache all Xooter routes noindex missing");
if (!htaccessText.includes('SetEnvIf Request_URI "^/xooter(/|$)" XOOT_NOSTORE')) findings.push("Apache all Xooter routes no-store missing");
requireMatch("Apache .htaccess emits no-store for private routes", htaccessText, /Header always set Cache-Control "no-store, private, max-age=0, must-revalidate" env=XOOT_NOSTORE/);
requireMatch("Apache .htaccess leaves service worker revalidating", htaccessText, /<Files "sw\.js">[\s\S]*Header set Cache-Control "no-cache"[\s\S]*<\/Files>/);
requireMatch("Netlify build uses deterministic npm install", netlifyText, /command\s*=\s*"npm ci --no-audit --prefer-offline && npm run build"/);

/*
 * ── Vercel ─────────────────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ `public/_headers` is a NETLIFY file format. Vercel does not read it, does not warn about it,
 * and serves the site without a single one of those headers. Switching hosts on 2026-09-01 would
 * therefore have shipped xoot.co.za with no CSP, no HSTS, and no `noindex` on `/app`, `/auth` and
 * `/admin` — silently, on a green build.
 *
 * The loud build failure was the cheap half of that host switch. This is the expensive half, and
 * nothing in the repo would have caught it, because every check here was written against the
 * previous host by name.
 */
const vercelPath = join(ROOT, "vercel.json");
if (!existsSync(vercelPath)) {
  findings.push("vercel.json is missing — the project deploys on Vercel and would ship with no security headers");
} else {
  const vercel = JSON.parse(readFileSync(vercelPath, "utf8"));

  /** Every header value Vercel would send for a path, flattened to `Key: value` lines. */
  const vercelHeadersFor = (predicate) =>
    (vercel.headers ?? [])
      .filter((rule) => predicate(rule.source))
      .flatMap((rule) => rule.headers ?? [])
      .map((header) => `${header.key}: ${header.value}`)
      .join("\n");

  const globalHeaders = vercelHeadersFor((source) => source === "/(.*)");

  requireMatch("Vercel headers define CSP", globalHeaders, /Content-Security-Policy:\s+.*default-src 'self'/);
  requireMatch("Vercel CSP blocks framing", globalHeaders, /Content-Security-Policy:\s+.*frame-ancestors 'none'/);
  requireMatch("Vercel CSP blocks plugins", globalHeaders, /Content-Security-Policy:\s+.*object-src 'none'/);
  requireMatch("Vercel headers enable HSTS", globalHeaders, /Strict-Transport-Security:\s+max-age=31536000; includeSubDomains; preload/);
  requireMatch("Vercel headers disable MIME sniffing", globalHeaders, /X-Content-Type-Options:\s+nosniff/);
  requireMatch("Vercel headers set referrer policy", globalHeaders, /Referrer-Policy:\s+strict-origin-when-cross-origin/);
  requireMatch("Vercel headers restrict device permissions", globalHeaders, /Permissions-Policy:\s+.*camera=\(\).*microphone=\(\).*payment=\(\)/);
  requireMatch("Vercel service worker is not cached immutably", vercelHeadersFor((source) => source === "/sw.js"), /Cache-Control:\s+no-cache/);

  /*
   * The same private routes `_headers` protects. Vercel writes wildcards as `(.*)` rather than `*`,
   * so the routes are matched by prefix instead of compared literally — a literal comparison would
   * pass on Netlify's syntax and ship nothing on Vercel.
   */
  for (const route of requiredPrivateRoutes) {
    const prefix = route.replace(/[*]$/, "").replace(/\/$/, "");
    const rules = vercelHeadersFor((source) =>
      route === "/xooter" ? source === "/xooter" :
      route === "/xooter/*" ? source === "/xooter/(.*)" :
      source === prefix || source.startsWith(`${prefix}/`) || source.startsWith(`${prefix}(`));
    if (!/X-Robots-Tag:\s+noindex, noarchive, nosnippet/.test(rules)) {
      findings.push(`Vercel ${route} noindex header missing`);
    }
    if (!/Cache-Control:\s+no-store, private, max-age=0, must-revalidate/.test(rules)) {
      findings.push(`Vercel ${route} no-store header missing`);
    }
  }

  for (const source of ["/book", "/book/(.*)"]) {
    const rules = vercelHeadersFor(value => value === source);
    requireMatch(`Vercel ${source} stays out of search`, rules, /X-Robots-Tag:\s+noindex, noarchive, nosnippet/);
    requireMatch(`Vercel ${source} prevents shared caching`, rules, /Cache-Control:\s+no-store, private, max-age=0, must-revalidate/);
  }

  // A Vite SPA with no rewrite 404s on every deep link — including every link in a marketing post.
  const rewrites = vercel.rewrites ?? [];
  if (!rewrites.some((rule) => rule.destination === "/_spa.html")) {
    findings.push("Vercel has no rewrite to the separate client shell /_spa.html — private deep links would break");
  }
  // `/.well-known/*` must be served as real files. Rewriting them to index.html breaks Universal
  // Links and App Links, which fail silently: the app simply stops opening from a link.
  if (!rewrites.some((rule) => /well-known/.test(rule.source))) {
    findings.push("Vercel SPA rewrite does not exclude /.well-known/ — native app links would break");
  }
  if (vercel.buildCommand !== "npm run build") {
    findings.push("Vercel buildCommand must be `npm run build` so prebuild hooks fire");
  }
  if (vercel.installCommand !== "npm ci --no-audit --prefer-offline") {
    findings.push("Vercel install must be deterministic (`npm ci --no-audit --prefer-offline`)");
  }
}

if (findings.length > 0) {
  console.error("Static hosting security configuration is incomplete:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Static hosting security configuration passed.");
