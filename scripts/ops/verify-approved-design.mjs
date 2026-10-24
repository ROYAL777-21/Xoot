#!/usr/bin/env node
/**
 * Independent Xoot design/typing smoke test.
 *
 * This intentionally does NOT wait for the live Xooter directory or assert a
 * paid/booking journey: those have their own mandatory backend release checks.
 * It makes the founder-selected handoff and browser typing regressions observable,
 * even while Supabase staging/prod parity is being repaired.
 *
 * Usage:
 *   node scripts/ops/verify-approved-design.mjs --url https://xoot.co.za
 *   node scripts/ops/verify-approved-design.mjs --artifact dist
 */
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";
import { publicHtmlPath } from "../seo/public-html.mjs";

const args = process.argv.slice(2);
const at = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1]; };
const url = at("--url");
const artifact = at("--artifact");
if (Boolean(url) === Boolean(artifact)) {
  console.error("Usage: verify-approved-design.mjs (--url https://xoot.co.za | --artifact dist)");
  process.exit(2);
}

const mime = {
  ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp",
  ".woff": "font/woff", ".woff2": "font/woff2", ".jpg": "image/jpeg",
};
let server;
const target = artifact ? await (async () => {
  const root = resolve(artifact);
  const index = resolve(root, "index.html");
  if (!existsSync(index)) throw new Error("Built site is missing dist/index.html");
  server = createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname); }
    catch { response.writeHead(400); response.end(); return; }
    const resolved = resolve(root, "." + pathname);
    const safe = (resolved === root || resolved.startsWith(root + sep));
    let snapshot;
    try { snapshot = resolve(root, publicHtmlPath(pathname)); } catch { /* Assets and private URLs use the existing shell. */ }
    const actual = safe && existsSync(resolved) && statSync(resolved).isFile() ? resolved :
      snapshot && existsSync(snapshot) ? snapshot : index;
    response.writeHead(200, { "Content-Type": mime[extname(actual)] ?? "application/octet-stream" });
    response.end(readFileSync(actual));
  });
  await new Promise((ok, fail) => { server.once("error", fail); server.listen(0, "127.0.0.1", ok); });
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Local artifact server did not start");
  return "http://127.0.0.1:" + addr.port + "/";
})() : new URL(url).href;

let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 1000 },
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      const response = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30_000 });
      if (!response?.ok()) throw new Error("Homepage failed HTTP " + (response?.status() ?? "no response"));
      // The marker is intentionally set ONLY on the accepted handoff homepage.
      // The old 'main' homepage has the generic Xoot heading, but not this marker.
      const home = page.locator('[data-xoot-design-version="2026-09-handoff"]');
      await home.waitFor({ state: "visible", timeout: 15_000 });
      const sections = ["#gift", "#careplus", ".xoot-feedback-card"];
      for (const selector of sections) {
        if (await home.locator(selector).count() !== 1) {
          throw new Error("Redesigned homepage missing " + selector);
        }
      }
      const giftY = await home.locator("#gift").evaluate(el => el.getBoundingClientRect().top + window.scrollY);
      const careY = await home.locator("#careplus").evaluate(el => el.getBoundingClientRect().top + window.scrollY);
      if (!(giftY < careY)) throw new Error("Gift/Care+ visual section order reverted");
      const field = page.getByRole("textbox", { name: "Service address" });
      await field.waitFor({ state: "visible", timeout: 15_000 });
      await field.fill("Sandton");
      await page.evaluate(() => window.scrollBy(0, 80));
      await field.pressSequentially(" Johannesburg");
      const typed = await field.inputValue();
      const stillFocused = await field.evaluate(input => document.activeElement === input);
      if (typed !== "Sandton Johannesburg" || !stillFocused) {
        throw new Error("Address typing/focus regressed after scrolling");
      }
      const body = await page.locator("body").innerText();
      if (/Configuration Error|This release has an invalid public configuration/i.test(body)) {
        throw new Error("Fatal public configuration overlay is present");
      }
      if (errors.length) throw new Error("Browser runtime error: " + errors[0]);
      console.log("PASS " + width + "px: redesigned handoff, section order, address typing, browser startup");
    } finally {
      await context.close();
    }
  }
} catch (error) {
  console.error("FAIL Xoot approved design check: " + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server) await new Promise(done => server.close(done));
}
