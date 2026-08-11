#!/usr/bin/env node
/**
 * Screenshot every public screen, and fail on any that logs an error.
 *
 * `shoot-kit.mjs` covers the five kit primitives in isolation. This covers the screens a stranger
 * can actually reach — the ones that carry the product's first impression and, between them, most
 * of its legal text. Nothing was rendering these in a browser: the suite is jsdom, and jsdom does
 * not lay out, resolve a custom property or paint.
 *
 * It is as much an error sweep as a screenshot run. Each route is loaded with `pageerror` and
 * `console.error` collected, so a route that throws on mount fails the script instead of quietly
 * producing a picture of a blank page. That is the failure mode worth catching: a screenshot of a
 * crash looks like a screenshot.
 *
 * Usage:
 *   bunx vite --host 127.0.0.1 --port 5173 &
 *   node scripts/dev/shoot-screens.mjs [--url http://127.0.0.1:5173] [--out docs/screenshots/screens]
 *
 * Exit codes: 0 all clean, 1 at least one route errored or failed to load, 2 no dev server.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const base = arg("url", "http://127.0.0.1:5173").replace(/\/$/, "");
const outDir = arg("out", "docs/screenshots/screens");

/**
 * The public surface, by what it is for rather than by URL order. Auth-gated routes are absent
 * because a screenshot of a redirect proves nothing; covering those needs a seeded session and is
 * a separate job.
 */
const ROUTES = [
  ["landing", "/"],
  ["welcome", "/welcome"],
  ["onboarding", "/onboarding"],
  ["auth", "/auth"],
  ["care-plus", "/care-plus"],
  ["care-plus-join", "/care-plus/join"],
  ["booking-confirm", "/book/confirm"],
  ["blog", "/blog"],
  ["trust-centre", "/trust-centre"],
  ["install", "/install"],
  ["legal-terms", "/legal/terms"],
  ["legal-privacy", "/legal/privacy"],
  ["legal-popia", "/legal/popia"],
  ["legal-refunds", "/legal/refunds-cancellations"],
  ["legal-ai-concierge", "/legal/ai-concierge"],
];

/**
 * Console noise that is not a defect.
 *
 * Kept deliberately short and specific. A broad filter here turns the whole run into decoration —
 * the point is that an unexpected error fails the script, and every entry added weakens that.
 */
const IGNORE = [
  /Download the React DevTools/,
  /Failed to load resource.*favicon/i,
  // Supabase calls from a dev machine with no session. The screens are supposed to render
  // without one; a network refusal is the environment, not the page.
  /net::ERR_(CONNECTION_REFUSED|NAME_NOT_RESOLVED|BLOCKED_BY_CLIENT)/,
];

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("shoot-screens: playwright is not installed.");
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const context = await browser.newContext({
  viewport: { width: 390, height: 1400 },
  deviceScaleFactor: 2,
});

const failures = [];

for (const [name, path] of ROUTES) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (!IGNORE.some((re) => re.test(text))) errors.push(text);
  });

  try {
    const response = await page.goto(`${base}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    if (!response) throw new Error("no response");

    // The router is lazy on every route, so wait for the app to have painted *something* of its
    // own rather than for a fixed delay. `main` or a heading is the cheapest reliable signal.
    await page
      .locator("main, h1, h2")
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });

    /*
     * Size the viewport to the content instead of shooting a fixed 1400px.
     *
     * `fullPage` is not an option here: the app shell scrolls an inner element rather than the
     * document, so the document is never taller than the window and `fullPage` returns exactly
     * one viewport. The first run proved it the other way round too — short pages like
     * /book/confirm came out as a screen of content above a thousand pixels of white.
     *
     * So measure the tallest scrollable thing on the page and resize to it, capped at 5000 so a
     * runaway list cannot produce a 40MB PNG.
     */
    const height = await page.evaluate(() => {
      const candidates = [document.documentElement.scrollHeight, document.body.scrollHeight];
      for (const el of document.querySelectorAll("*")) {
        if (el.scrollHeight > el.clientHeight + 8) candidates.push(el.scrollHeight);
      }
      return Math.max(...candidates);
    });
    await page.setViewportSize({ width: 390, height: Math.min(Math.max(height, 844), 5000) });
    // One frame for the resize to settle before the shutter.
    await page.waitForTimeout(250);

    /*
     * The consent notice must not sit under a floating widget.
     *
     * `TermsNotice` documents the rule — implicit acceptance only binds if the notice is
     * genuinely visible before the action — and nothing enforced it. The first run of this
     * script found the Concierge launcher (`fixed bottom-4 right-4 z-50`) covering the words
     * "Privacy Policy" on `/care-plus/join`, the screen where consent matters most.
     *
     * Geometry, not appearance: intersect the notice's box against every `position: fixed`
     * element that is actually visible. jsdom cannot do this at all — it has no layout.
     */
    const overlaps = await page.evaluate(() => {
      const notice = document.querySelector("[data-terms-notice]");
      if (!notice) return [];
      // The *text* line boxes, not the element box. A block paragraph spans its container's
      // full width even when padding has pushed the glyphs inwards, so an element-box test
      // reports an overlap that the reader never sees — and would keep reporting it however
      // much padding was added. Range rects are what is actually on screen.
      const range = document.createRange();
      range.selectNodeContents(notice);
      const lines = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      if (lines.length === 0) return [];

      const hits = [];
      for (const el of document.querySelectorAll("body *")) {
        const style = getComputedStyle(el);
        if (style.position !== "fixed" || style.visibility === "hidden") continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const covered = lines.some(
          (n) => r.left < n.right && r.right > n.left && r.top < n.bottom && r.bottom > n.top,
        );
        if (covered) hits.push(`${el.tagName.toLowerCase()}.${el.className?.toString().slice(0, 60)}`);
      }
      return hits;
    });
    for (const hit of overlaps) errors.push(`terms notice covered by fixed element: ${hit}`);

    await page.screenshot({ path: join(outDir, `${name}.png`) });
    const status = errors.length > 0 ? `${errors.length} error(s)` : "clean";
    console.log(`${errors.length ? "✗" : "✓"} ${name.padEnd(20)} ${path.padEnd(32)} ${status}`);
    for (const e of errors) console.log(`      ${e.slice(0, 160)}`);
    if (errors.length > 0) failures.push({ name, path, errors });
  } catch (err) {
    console.log(`✗ ${name.padEnd(20)} ${path.padEnd(32)} did not render: ${err}`);
    failures.push({ name, path, errors: [String(err)] });
  } finally {
    await page.close();
  }
}

await browser.close();

console.log(`\nshoot-screens: ${ROUTES.length - failures.length}/${ROUTES.length} clean.`);
if (failures.length > 0) {
  console.error(`shoot-screens: ${failures.map((f) => f.name).join(", ")} need attention.`);
  process.exit(1);
}
