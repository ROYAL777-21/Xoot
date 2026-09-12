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

const createArtifactServer = async (directory) => {
  const root = resolve(directory);
  const index = resolve(root, "index.html");
  if (!existsSync(index)) throw new Error(`Built artifact is missing ${index}`);

  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://artifact.local").pathname);
    const requested = resolve(root, `.${pathname}`);
    const insideRoot = requested === root || requested.startsWith(`${root}${sep}`);
    const file = insideRoot && existsSync(requested) && statSync(requested).isFile() ? requested : index;
    response.statusCode = 200;
    response.setHeader("content-type", mimeTypes[extname(file)] ?? "application/octet-stream");
    response.end(readFileSync(file));
  });

  await new Promise((resolveListening, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListening);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Artifact server did not bind to a TCP port");
  return { server, url: `http://127.0.0.1:${address.port}/` };
};

const sameLocation = (actual, expected) => {
  const actualUrl = new URL(actual);
  const expectedUrl = new URL(expected);
  const cleanPath = (value) => value.replace(/\/+$/, "") || "/";
  return actualUrl.origin === expectedUrl.origin && cleanPath(actualUrl.pathname) === cleanPath(expectedUrl.pathname);
};

let artifactServer;
let browser;

try {
  const target = artifact ? await createArtifactServer(artifact) : { url: new URL(requestedUrl).href };
  artifactServer = target.server;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const runtimeProblems = [];
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
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/auth", { timeout }),
    signIn.click(),
  ]);

  if (new URL(page.url()).pathname !== "/auth") throw new Error(`Sign-in navigation reached ${page.url()}`);
  try {
    await page.getByLabel("Email", { exact: true }).waitFor({ state: "visible", timeout });
    await page.getByLabel("Password", { exact: true }).waitFor({ state: "visible", timeout });
    await page.getByRole("button", { name: /^Continue$/i }).waitFor({ state: "visible", timeout });
  } catch {
    throw new Error("Auth navigation did not return a successful response with usable sign-in controls at /auth");
  }

  await page.waitForTimeout(100);
  if (runtimeProblems.length > 0) throw new Error(`Relevant runtime problem detected: ${runtimeProblems[0]}`);

  console.log(`Rendered site smoke passed for ${target.url}: homepage content, sign-in navigation, controls, and runtime state verified.`);
} catch (error) {
  console.error(`Rendered site smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (artifactServer) await new Promise((resolveClosed) => artifactServer.close(resolveClosed));
}
