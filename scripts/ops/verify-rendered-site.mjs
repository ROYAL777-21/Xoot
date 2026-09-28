#!/usr/bin/env node
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const timeout = Number(process.env.XOOT_SMOKE_TIMEOUT_MS ?? 15_000);
const artifact = option("--artifact");
const requestedUrl = option("--url");
// Render the actual artifact at its intended origin inside this isolated browser.
// Production correctly rejects localhost: a build check must not widen that allowlist.
// Only same-origin website files are intercepted; backend requests remain real.
const artifactOrigin = new URL(process.env.XOOT_SMOKE_ARTIFACT_ORIGIN || "http://localhost:5173");

if ((artifact && requestedUrl) || (!artifact && !requestedUrl)) {
  console.error("Usage: node scripts/ops/verify-rendered-site.mjs (--artifact dist | --url https://xoot.co.za)");
  process.exit(2);
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const createArtifactTarget = async (directory) => {
  const secureOrLoopback = artifactOrigin.protocol === "https:" ||
    (artifactOrigin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(artifactOrigin.hostname));
  if (!secureOrLoopback || artifactOrigin.pathname !== "/" || artifactOrigin.username || artifactOrigin.password || artifactOrigin.search || artifactOrigin.hash) {
    throw new Error("XOOT_SMOKE_ARTIFACT_ORIGIN must be an HTTPS or HTTP loopback origin without a path, credentials, query or fragment");
  }
  const root = resolve(directory);
  const index = resolve(root, "index.html");
  if (!existsSync(index)) throw new Error(`Built artifact is missing ${index}`);

  const asset = (url) => {
    const pathname = decodeURIComponent(new URL(url, artifactOrigin).pathname);
    const requested = resolve(root, `.${pathname}`);
    const insideRoot = requested === root || requested.startsWith(`${root}${sep}`);
    const file = insideRoot && existsSync(requested) && statSync(requested).isFile() ? requested : index;
    return { contentType: mimeTypes[extname(file)] ?? "application/octet-stream", body: readFileSync(file) };
  };

  // A real loopback document preserves Chromium's local-network boundary when a
  // development artifact uses a local backend. HTTPS deployment checks below only
  // substitute the website origin; all external backend traffic stays untouched.
  if (artifactOrigin.protocol === "http:") {
    const server = createServer((request, response) => {
      const file = asset(request.url ?? "/");
      response.writeHead(200, { "Content-Type": file.contentType });
      response.end(file.body);
    });
    await new Promise((resolveListening, reject) => {
      server.once("error", reject);
      server.listen(Number(artifactOrigin.port || 80), "127.0.0.1", resolveListening);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Artifact server did not bind to a TCP port");
    const url = new URL(artifactOrigin);
    url.port = String(address.port);
    return { server, url: url.href };
  }
  return {
    url: artifactOrigin.href,
    install: (context) => context.route((url) => url.origin === artifactOrigin.origin, async (route) => {
      await route.fulfill({ status: 200, ...asset(route.request().url()) });
    }),
  };
};

const sameLocation = (actual, expected) => {
  const actualUrl = new URL(actual);
  const expectedUrl = new URL(expected);
  const cleanPath = (value) => value.replace(/\/+$/, "") || "/";
  return actualUrl.origin === expectedUrl.origin && cleanPath(actualUrl.pathname) === cleanPath(expectedUrl.pathname);
};

let browser;
let artifactServer;
const runtimeProblems = [];

try {
  const target = artifact ? await createArtifactTarget(artifact) : { url: new URL(requestedUrl).href };
  artifactServer = target.server;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  await target.install?.(context);
  const page = await context.newPage();
  page.on("pageerror", (error) => runtimeProblems.push(`page error: ${error.message}`));
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" || /\[Xoot\].*(config|Supabase|fatal)/i.test(text)) {
      runtimeProblems.push(`console ${message.type()}: ${text}`);
    }
  });

  const response = await page.goto(target.url, { waitUntil: "domcontentloaded", timeout });
  if (!response || !response.ok()) throw new Error(`Homepage did not return a successful response (${response?.status() ?? "no response"})`);
  if (!sameLocation(page.url(), target.url)) throw new Error(`Browser reached ${page.url()} instead of the intended URL ${target.url}`);

  await page.locator("body").waitFor({ state: "visible", timeout });
  const body = await page.locator("body").innerText();
  if (/Configuration Error|temporarily unavailable|invalid public configuration/i.test(body)) {
    throw new Error("Configuration failure overlay is visible on the homepage");
  }

  const hero = page.locator("h1:visible").filter({ hasText: /Premium home care/i }).first();
  await hero.waitFor({ state: "visible", timeout });

  const signIn = page.getByRole("link", { name: /^Sign in$/i }).first();
  await signIn.waitFor({ state: "visible", timeout });
  const authUrl = new URL("/auth", target.url).href;
  await Promise.all([
    page.waitForURL((url) => sameLocation(url.href, authUrl), { timeout }),
    signIn.click(),
  ]);

  if (!sameLocation(page.url(), authUrl)) throw new Error(`Sign-in navigation reached ${page.url()}`);
  let authControl = "email field";
  try {
    await page.getByLabel("Your email", { exact: true }).waitFor({ state: "visible", timeout });
    authControl = "email-code action";
    await page.getByRole("button", { name: /^Send one-time code$/i }).waitFor({ state: "visible", timeout });
  } catch {
    throw new Error(`Auth navigation did not return a successful response with usable sign-in controls at /auth (missing ${authControl})`);
  }

  // Client-side routing can render a working form while the host returns 404 for
  // a direct visit. Reload to prove the deployed host also serves the auth route.
  const authResponse = await page.reload({ waitUntil: "domcontentloaded", timeout });
  if (!authResponse || !authResponse.ok()) {
    throw new Error(`Auth navigation did not return a successful response (${authResponse?.status() ?? "no response"})`);
  }
  if (!sameLocation(page.url(), authUrl)) throw new Error(`Auth deep link reached ${page.url()} instead of ${authUrl}`);
  authControl = "email field after reload";
  try {
    await page.getByLabel("Your email", { exact: true }).waitFor({ state: "visible", timeout });
    authControl = "email-code action after reload";
    await page.getByRole("button", { name: /^Send one-time code$/i }).waitFor({ state: "visible", timeout });
    authControl = "password-mode action";
    await page.getByRole("button", { name: /^Use your password instead$/i }).click();
    authControl = "password field";
    await page.getByLabel("Password", { exact: true }).waitFor({ state: "visible", timeout });
    authControl = "password submit action";
    await page.getByRole("button", { name: /^Continue$/i }).waitFor({ state: "visible", timeout });
  } catch {
    throw new Error(`Auth navigation did not return a successful response with usable sign-in controls at /auth (missing ${authControl})`);
  }

  await page.waitForTimeout(100);
  if (runtimeProblems.length > 0) throw new Error(`Relevant runtime problem detected: ${runtimeProblems[0]}`);

  console.log(`Rendered site smoke passed for ${target.url}: homepage content, sign-in navigation, controls, and runtime state verified.`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const detail = runtimeProblems.length && !message.includes(runtimeProblems[0]) ? `\n${runtimeProblems[0]}` : "";
  console.error(`Rendered site smoke failed: ${message}${detail}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (artifactServer) await new Promise((resolveClosed) => artifactServer.close(resolveClosed));
}
