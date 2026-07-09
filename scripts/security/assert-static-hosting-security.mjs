import { readFileSync } from "node:fs";
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
  "/zooter/jobs*",
  "/zooter/earnings*",
  "/zooter/kyc*",
  "/zooter/profile*",
  "/zooter/training*",
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
requireMatch("Apache .htaccess protects private SPA routes from indexing", htaccessText, /SetEnvIf Request_URI "\^\/\(app\|auth\|admin\)\(\/\|\$\)" ZOOT_NOINDEX/);
requireMatch("Apache .htaccess marks private SPA routes no-store", htaccessText, /SetEnvIf Request_URI "\^\/\(app\|auth\|admin\)\(\/\|\$\)" ZOOT_NOSTORE/);
requireMatch("Apache .htaccess emits no-store for private routes", htaccessText, /Header always set Cache-Control "no-store, private, max-age=0, must-revalidate" env=ZOOT_NOSTORE/);
requireMatch("Apache .htaccess leaves service worker revalidating", htaccessText, /<Files "sw\.js">[\s\S]*Header set Cache-Control "no-cache"[\s\S]*<\/Files>/);
requireMatch("Netlify build uses deterministic npm install", netlifyText, /command\s*=\s*"npm ci --no-audit --prefer-offline && npm run build"/);

if (findings.length > 0) {
  console.error("Static hosting security configuration is incomplete:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Static hosting security configuration passed.");
