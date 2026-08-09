#!/usr/bin/env node
/**
 * Screenshot the kit gallery in both schemes.
 *
 * The five primitives in `src/components/kit/` shipped with token assertions and jsdom
 * behaviour tests and no visual verification. jsdom does not lay out, does not resolve a custom
 * property and does not paint, so every one of those tests passes on a component that renders as
 * a stack of invisible boxes. This is the part that can only be settled by looking.
 *
 * Usage:
 *   bun run dev &            # or `npm run dev`
 *   node scripts/dev/shoot-kit.mjs [--url http://localhost:5173] [--out docs/screenshots]
 *
 * Chromium is pre-installed in this environment at PLAYWRIGHT_BROWSERS_PATH; the script uses
 * whatever `playwright` resolves and falls back to that path rather than downloading a browser.
 *
 * Exit codes: 0 wrote both shots, 1 the page reported an error, 2 could not reach the dev server.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const url = arg("url", "http://localhost:5173");
const outDir = arg("out", "docs/screenshots");
const target = `${url.replace(/\/$/, "")}/dev/kit`;

const die = (message, code) => {
  console.error(`shoot-kit: ${message}`);
  process.exit(code);
};

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  die("playwright is not installed. `bun add -d playwright` (the browser itself is already here).", 2);
}

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});

// 390 wide is the kit's own frame — an iPhone 14 Pro. Shooting at a desktop width would prove
// the components render and nothing about whether they fit the screen they were drawn for.
//
// The height is deliberately 2200 rather than 844 with `fullPage: true`. Two reasons, both found
// by looking at the first attempt:
//
//  1. `fullPage` captured exactly one viewport. The app shell scrolls an inner element, not the
//     document, so the document is never taller than the window and there is nothing for
//     `fullPage` to extend into.
//  2. `DockedCTA` is `position: sticky`. Under a scrolling `fullPage` capture it follows the
//     scroll and gets painted over the middle of the gallery — a picture of a bug that is not
//     there. At a viewport tall enough to hold everything it settles where it belongs.
const page = await browser.newPage({ viewport: { width: 390, height: 2200 }, deviceScaleFactor: 2 });

// A blank white PNG is the classic false pass here: the shot succeeds, the app crashed. Collect
// console errors and fail on them rather than writing a picture of the failure.
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

try {
  await page.goto(target, { waitUntil: "networkidle", timeout: 20_000 });
} catch {
  await browser.close();
  die(`could not reach ${target}. Is the dev server running?`, 2);
}

// Wait for real content, not for a timer. The route is lazy, so `networkidle` can land before
// the chunk has mounted anything.
await page.getByRole("group", { name: "Extra tasks" }).waitFor({ timeout: 15_000 });

const shoot = async (name) => {
  const path = join(outDir, `kit-${name}.png`);
  await page.screenshot({ path });
  console.log(`wrote ${path}`);
};

await shoot("light");
await page.getByTestId("scheme-toggle").click();
// The toggle flips `data-theme` on the wrapper; the tokens transition, so let motion settle
// rather than catching the palette mid-crossfade.
await page.waitForTimeout(600);
await shoot("dark");

await browser.close();

if (errors.length > 0) {
  console.error("shoot-kit: the page logged errors:");
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log("shoot-kit: both schemes captured, no page errors.");
