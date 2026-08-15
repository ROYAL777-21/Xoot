#!/usr/bin/env node
/**
 * Render the public routes in a real browser and assert what a build cannot.
 *
 * ── Why this exists ────────────────────────────────────────────────────────────────────────────
 *
 * `npm run build` succeeds whether or not a font loads, a token resolves, or a page throws on
 * mount. Every one of those failures ships green. This repo has already shipped a documented
 * command calling a global that does not exist and a signature test no runner collected — the
 * common thread is a check that never touched the thing it claimed to check.
 *
 * So this loads the built site in Chromium and reports:
 *   · the HTTP status of each route
 *   · whether both webfonts actually loaded, via `document.fonts.check`
 *   · the COMPUTED font-family of a real heading and of body — not the CSS we wrote, the value
 *     the browser resolved, which is the only thing that proves the @font-face took effect
 *   · console errors and failed requests, which is how a missing asset or a mount crash surfaces
 *
 * ── Running it ─────────────────────────────────────────────────────────────────────────────────
 *
 *     npm run build
 *     npx vite preview --port 4173 --strictPort --host 127.0.0.1 &
 *     node scripts/design/verify-public-render.mjs
 *
 * ⚠️ `--host 127.0.0.1` is not optional in this container. Vite binds `::` by default and IPv6 is
 * unavailable here, so the server dies with EAFNOSUPPORT and every check silently has nothing to
 * talk to.
 *
 * Screenshots go to `--out` (default `.render-check/`, which is git-ignored) at both 390px and
 * 1440px, so a restyle can be eyeballed as well as asserted.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const BASE = arg("base", process.env.BASE ?? "http://127.0.0.1:4173");
const OUT = arg("out", ".render-check");

/** The public surface. Add a route here when it is restyled, not before. */
const ROUTES = ["/", "/legal/terms", "/care-plus", "/auth", "/blog", "/welcome"];

/* Both must resolve, or the @font-face block is not doing what index.css claims. */
const REQUIRED_FONTS = [
  ['16px "Plus Jakarta Sans"', "Plus Jakarta Sans"],
  ['700 32px "Newsreader"', "Newsreader"],
];

/**
 * The repository's Playwright and the image's Chromium are different builds — the npm package
 * wants revision 1234 and `/opt/pw-browsers` carries 1194 — so the default launch fails with
 * "Executable doesn't exist" and helpfully suggests `npx playwright install`.
 *
 * Do not run that. This is a sandboxed environment with a browser deliberately pre-installed;
 * downloading a second copy costs ~150 MB against a fixed disk allowance and would need doing
 * again in every fresh session. Pointing at the existing binary is the supported path.
 *
 * `PLAYWRIGHT_CHROMIUM` overrides it if the image layout ever changes; the glob below is only a
 * default, and if neither resolves the error says so plainly rather than suggesting a download.
 */
const CHROMIUM =
  process.env.PLAYWRIGHT_CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

mkdirSync(OUT, { recursive: true });

let browser;
try {
  browser = await chromium.launch({ executablePath: CHROMIUM });
} catch (err) {
  console.error(`✗ Could not launch Chromium at ${CHROMIUM}`);
  console.error(`  ${err.message.split("\n")[0]}`);
  console.error("  Set PLAYWRIGHT_CHROMIUM to the browser binary. Do NOT run `playwright install`.");
  process.exit(1);
}
let failures = 0;

for (const route of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("requestfailed", (r) => failedRequests.push(r.url()));
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

  let status = 0;
  try {
    const resp = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 30_000 });
    status = resp?.status() ?? 0;
    await page.evaluate(() => document.fonts.ready);
  } catch (err) {
    console.log(`✗ ${route} — navigation failed: ${err.message}`);
    failures += 1;
    await ctx.close();
    continue;
  }

  const seen = await page.evaluate((checks) => {
    const heading = document.querySelector("h1, h2, h3");
    const resolved = {};
    for (const [spec, label] of checks) resolved[label] = document.fonts.check(spec);
    return {
      resolved,
      headingText: heading ? heading.textContent.trim().slice(0, 44) : null,
      headingFamily: heading ? getComputedStyle(heading).fontFamily.split(",")[0].replace(/"/g, "") : null,
      bodyFamily: getComputedStyle(document.body).fontFamily.split(",")[0].replace(/"/g, ""),
    };
  }, REQUIRED_FONTS);

  const missing = Object.entries(seen.resolved).filter(([, ok]) => !ok).map(([f]) => f);
  const fontRequestFails = failedRequests.filter((u) => u.includes(".woff2"));
  const ok = status === 200 && missing.length === 0 && fontRequestFails.length === 0 && consoleErrors.length === 0;
  if (!ok) failures += 1;

  console.log(`${ok ? "✓" : "✗"} ${route.padEnd(16)} http ${status}`);
  console.log(`     heading ${seen.headingText ? `"${seen.headingText}"` : "(none found)"} → ${seen.headingFamily ?? "—"}`);
  console.log(`     body → ${seen.bodyFamily}`);
  if (missing.length) console.log(`     ✗ font not loaded: ${missing.join(", ")}`);
  if (fontRequestFails.length) console.log(`     ✗ font request failed: ${fontRequestFails.join(", ")}`);
  for (const e of consoleErrors.slice(0, 3)) console.log(`     ✗ console: ${e.slice(0, 140)}`);

  const name = route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "-");
  await page.screenshot({ path: `${OUT}/${name}-1440.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${OUT}/${name}-390.png` });
  await ctx.close();
}

await browser.close();
console.log(
  failures === 0
    ? `\nAll ${ROUTES.length} routes rendered clean, both webfonts active. Screenshots in ${OUT}/`
    : `\n${failures} of ${ROUTES.length} routes failed. Screenshots in ${OUT}/`,
);
process.exit(failures === 0 ? 0 : 1);
