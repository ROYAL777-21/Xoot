#!/usr/bin/env node
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";
import { publicHtmlPath } from "../seo/public-html.mjs";

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const timeout = Number(process.env.XOOT_SMOKE_TIMEOUT_MS ?? 15_000);
if (!Number.isFinite(timeout) || timeout <= 0) throw new Error("XOOT_SMOKE_TIMEOUT_MS must be a positive finite number");
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
  const index = resolve(root, existsSync(resolve(root, "_spa.html")) ? "_spa.html" : "index.html");
  if (!existsSync(index)) throw new Error(`Built artifact is missing ${index}`);

  const asset = (url) => {
    const pathname = decodeURIComponent(new URL(url, artifactOrigin).pathname);
    const requested = resolve(root, `.${pathname}`);
    const insideRoot = requested === root || requested.startsWith(`${root}${sep}`);
    let snapshot;
    try { snapshot = resolve(root, publicHtmlPath(pathname)); } catch { /* Assets and private URLs use the existing shell. */ }
    const file = insideRoot && existsSync(requested) && statSync(requested).isFile() ? requested :
      snapshot && existsSync(snapshot) ? snapshot : index;
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

const openReturningUserCodeForm = async (page) => {
  // The approved guest entry starts at account creation. Verify that form
  // before following its returning-user switch; keep the code/password checks.
  const returningUser = page.getByRole("button", { name: /^Been here before\? Pick up where you left off$/i });
  if (await returningUser.isVisible()) {
    await page.getByLabel("Full name", { exact: true }).waitFor({ state: "visible", timeout });
    await page.getByLabel("Password", { exact: true }).waitFor({ state: "visible", timeout });
    await page.getByRole("button", { name: /^Get started$/i }).waitFor({ state: "visible", timeout });
    await returningUser.click({ timeout });
  }
  await page.getByRole("button", { name: /^Send one-time code$/i }).waitFor({ state: "visible", timeout });
};

let browser;
let artifactServer;
const runtimeProblems = [];
const resourceProblems = new Set();
const safeResourceUrl = (value) => {
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) ? `${url.origin}${url.pathname}` : url.protocol;
};

const isDirectoryRequest = (request) => request.method() === "POST" &&
  new URL(request.url()).pathname === "/functions/v1/public-xooter-directory";

// One deadline covers request arrival, body completion, validation and React's
// rendered settlement. Receiving headers alone does not prove a usable response.
const verifyRoster = async (page, directoryRequests, directoryOutcomes) => {
  const deadline = Date.now() + timeout;
  const remaining = () => Math.max(1, deadline - Date.now());
  const bounded = async (work, message) => {
    let timer;
    try {
      return await Promise.race([
        work,
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(typeof message === "function" ? message() : message)), remaining()); }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
  const roster = page.locator("[data-xoot-roster-state]");
  try {
    await roster.waitFor({ state: "visible", timeout: remaining() });
  } catch {
    throw new Error("Homepage roster readiness is missing; deploy a build exposing its current configuration and roster state");
  }
  const environment = await roster.getAttribute("data-xoot-app-environment");
  const state = await roster.getAttribute("data-xoot-roster-state");
  const endpoint = await roster.getAttribute("data-xoot-roster-endpoint");
  if (!["development", "staging", "production"].includes(environment)) {
    throw new Error("Homepage roster has an unknown app environment; check the build's public configuration");
  }
  if (state === "unconfigured") {
    if (environment !== "development" || endpoint || directoryRequests.length > 0 ||
      !/Live roster\s+temporarily unavailable/.test(await roster.innerText())) {
      throw new Error("Only explicitly unconfigured development may skip the directory response; release environments require the real roster");
    }
    return "explicitly unconfigured development (real roster not checked)";
  }
  let url;
  try { url = new URL(endpoint); } catch { /* Report only the public contract, never raw attribute data. */ }
  if (!url || !["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash ||
    url.pathname !== "/functions/v1/public-xooter-directory") {
    throw new Error("Configured homepage roster is missing a valid public directory endpoint");
  }
  const matches = (request) => isDirectoryRequest(request) && request.url() === url.href;
  const observed = directoryOutcomes.find((outcome) => matches(outcome.request));
  let outcome = observed;
  if (!outcome) {
    let onResponse;
    let onFailure;
    try {
      outcome = await bounded(new Promise((resolveOutcome) => {
        onResponse = (response) => {
          if (matches(response.request())) resolveOutcome({ request: response.request(), response });
        };
        onFailure = (request) => {
          if (matches(request)) resolveOutcome({ request, failed: true });
        };
        page.on("response", onResponse);
        page.on("requestfailed", onFailure);
      }), () => directoryRequests.some(matches)
        ? `Directory response did not settle within ${timeout}ms at ${safeResourceUrl(url.href)}; check endpoint availability and browser network access`
        : `Configured directory request was not observed within ${timeout}ms at ${safeResourceUrl(url.href)}; check homepage loading and public backend configuration`);
    } finally {
      page.removeListener("response", onResponse);
      page.removeListener("requestfailed", onFailure);
    }
  }
  if (outcome.failed) throw new Error(`Directory network request failed at ${safeResourceUrl(url.href)}`);
  if (!outcome.response.ok()) throw new Error(`Directory returned HTTP ${outcome.response.status()} at ${safeResourceUrl(url.href)}; the configured roster must succeed before leaving home`);
  let payload;
  try {
    payload = await bounded(outcome.response.json(), `Directory response body did not finish within ${timeout}ms at ${safeResourceUrl(url.href)}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("did not finish")) throw error;
    throw new Error(`Directory returned invalid JSON at ${safeResourceUrl(url.href)}`);
  }
  if (!payload || !Array.isArray(payload.xooters) || !Number.isInteger(payload.total) || payload.total < 0) {
    throw new Error("Directory payload must contain an xooters array and a nonnegative integer total");
  }
  try {
    await page.waitForFunction(({ endpoint: expectedEndpoint, total }) => {
      const element = document.querySelector("[data-xoot-roster-state]");
      return element?.getAttribute("data-xoot-roster-state") === "ready" &&
        element.getAttribute("data-xoot-roster-endpoint") === expectedEndpoint &&
        element.textContent?.replace(/\s+/g, " ").trim() === `Live roster ${total} approved Xooters`;
    }, { endpoint: url.href, total: payload.total }, { timeout: remaining() });
    await roster.waitFor({ state: "visible", timeout: remaining() });
  } catch {
    throw new Error(`Directory succeeded but homepage roster did not render its settled truthful count (${payload.total}) within ${timeout}ms`);
  }
  return `real directory response and settled roster (${payload.total} approved Xooters)`;
};

try {
  const target = artifact ? await createArtifactTarget(artifact) : { url: new URL(requestedUrl).href };
  artifactServer = target.server;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  await target.install?.(context);
  const page = await context.newPage();
  const directoryRequests = [];
  const directoryOutcomes = [];
  page.on("request", (request) => { if (isDirectoryRequest(request)) directoryRequests.push(request); });
  page.on("response", (resource) => {
    if (isDirectoryRequest(resource.request())) directoryOutcomes.push({ request: resource.request(), response: resource });
    if (resource.status() >= 400) {
      resourceProblems.add(`HTTP ${resource.status()} ${resource.request().method()} ${safeResourceUrl(resource.url())}`);
    }
  });
  page.on("requestfailed", (request) => {
    if (isDirectoryRequest(request)) directoryOutcomes.push({ request, failed: true });
    resourceProblems.add(`Failed ${request.method()} ${safeResourceUrl(request.url())}: ${request.failure()?.errorText ?? "request failure"}`);
  });
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
  // The existing unconfigured-development roster fallback is a truthful status,
  // not a configuration overlay. Keep the unavailable guard for all other copy.
  if (/Configuration Error|temporarily unavailable|invalid public configuration/i.test(body.replace(/Live roster\s+temporarily unavailable/g, ""))) {
    throw new Error("Configuration failure overlay is visible on the homepage");
  }

  const hero = page.locator("h1:visible").filter({ hasText: /Premium home care/i }).first();
  await hero.waitFor({ state: "visible", timeout });

  // Generic rendered smoke must accept minimal synthetic pages so its negative
  // tests can independently exercise configuration, backend and auth defects.
  // The accepted design and keyboard focus have their own fail-closed browser
  // smoke: scripts/ops/verify-approved-design.mjs, also run by live CI.
  const rosterVerification = await verifyRoster(page, directoryRequests, directoryOutcomes);

  const signIn = page.getByRole("link", { name: /^Sign in$/i }).first();
  await signIn.waitFor({ state: "visible", timeout });
  const authUrl = new URL("/auth", target.url).href;
  await Promise.all([
    page.waitForURL((url) => sameLocation(url.href, authUrl), { timeout }),
    signIn.click({ timeout }),
  ]);

  if (!sameLocation(page.url(), authUrl)) throw new Error(`Sign-in navigation reached ${page.url()}`);
  let authControl = "email field";
  try {
    await page.getByLabel("Your email", { exact: true }).waitFor({ state: "visible", timeout });
    authControl = "email-code action";
    await openReturningUserCodeForm(page);
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
    await openReturningUserCodeForm(page);
    authControl = "password-mode action";
    await page.getByRole("button", { name: /^Use your password instead$/i }).click({ timeout });
    authControl = "password field";
    await page.getByLabel("Password", { exact: true }).waitFor({ state: "visible", timeout });
    authControl = "password submit action";
    await page.getByRole("button", { name: /^Continue$/i }).waitFor({ state: "visible", timeout });
  } catch {
    throw new Error(`Auth navigation did not return a successful response with usable sign-in controls at /auth (missing ${authControl})`);
  }

  if (runtimeProblems.length > 0) throw new Error(`Relevant runtime problem detected: ${runtimeProblems[0]}`);

  console.log(`Rendered site smoke passed for ${target.url}: ${rosterVerification}, homepage content, sign-in navigation, controls, and runtime state verified.`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const detail = runtimeProblems.length && !message.includes(runtimeProblems[0]) ? `\n${runtimeProblems[0]}` : "";
  const resources = [...resourceProblems].slice(0, 5).map((problem) => `\n${problem}`).join("");
  console.error(`Rendered site smoke failed: ${message}${detail}${resources}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (artifactServer) await new Promise((resolveClosed) => artifactServer.close(resolveClosed));
}
