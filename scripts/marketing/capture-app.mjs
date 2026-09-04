/**
 * Capture the REAL Xoot app for use in ads.
 *
 * Founder, 2026-09-04: *"Ensure that the content shows the actual app in the ad/post."*
 *
 * ⚠️ **This is the strongest creative available and every playbook already says so.**
 * `ad-matrix-and-avatars.md`: *"F2 is underrated and should be first. It is real, it cannot be
 * faked, it needs no budget."* It is also the one format immune to the AI-slop fatigue Eden
 * measured (a 615x-outlier essay on exactly that).
 *
 * ⛔ **Do NOT run `npx playwright install`.** The image ships chromium-1194; the installed
 * Playwright 1.62.1 wants 1234, so `chromium.launch()` reports "Please run npx playwright install",
 * which looks like a missing browser and is a revision mismatch. `executablePath` is the fix.
 *
 * ⚠️ **What is real here and what is not, stated plainly because the ads must say the same:**
 *   REAL — the app, the components, the design tokens, the routes, and the PRICES. `quote()` runs
 *          client-side off the same ladder `create-booking` charges from, pinned by
 *          `pricing-parity.test.ts`. Nothing on screen is a mock-up.
 *   NOT   — the data. Production holds 0 bookings and 1 user, so there is no real booking to film
 *          and no real customer's information can possibly appear. That is a feature, not a gap.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir, rm, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const DIST = join(root, "dist");
const OUT = join(root, "marketing-assets/app");
const CHROME = "/opt/pw-browsers/chromium";
const PORT = 4321;

if (!existsSync(join(DIST, "index.html"))) {
  console.error("dist/ is missing — run `npx vite build` first.");
  process.exit(1);
}

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".woff2": "font/woff2", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json",
};

/** Static server with SPA fallback — the app is client-routed, so unknown paths serve index.html. */
const server = createServer(async (req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
  let file = join(DIST, url);
  try {
    if (!existsSync(file) || (await readdir(DIST).then(() => false).catch(() => false))) throw 0;
  } catch { /* fall through */ }
  if (!existsSync(file) || extname(file) === "") file = join(DIST, "index.html");
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});
await new Promise((r) => server.listen(PORT, r));
const base = `http://127.0.0.1:${PORT}`;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });

/** Phone frame — what a TikTok/Reels viewer expects a screen recording to look like. */
const PHONE = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 2 };

const shots = [];

/** Capture one route, full-page and viewport, at a given device profile. */
async function capture(id, path, viewport, { full = false, wait = 2500, note = "" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor, isMobile: viewport.isMobile ?? false,
    hasTouch: viewport.hasTouch ?? false, colorScheme: "light" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  try {
    await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 30000 });
  } catch {
    await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  }
  await page.waitForTimeout(wait);
  await page.evaluate(() => document.fonts?.ready);
  const file = join(OUT, `${id}.png`);
  await page.screenshot({ path: file, fullPage: full });
  shots.push({ id, path, size: `${viewport.width}x${viewport.height}`, full, note, errors: errors.length });
  await ctx.close();
}

// ── The public marketing site — no auth, the real thing ──────────────────────
await capture("site-home-phone", "/", PHONE, { full: true, note: "Full homepage, phone — the real site" });
await capture("site-home-desktop", "/", DESKTOP, { full: true, note: "Full homepage, desktop" });
await capture("site-hero-phone", "/", PHONE, { note: "Hero above the fold, phone" });
await capture("site-care-plus", "/care-plus", DESKTOP, { full: true, note: "Care+ page" });
await capture("site-trust", "/trust-centre", DESKTOP, { full: true, note: "Trust centre" });

/*
 * ── The screen recording — form factor F2 ───────────────────────────────────
 *
 * ⚠️ `ad-matrix-and-avatars.md`: *"F2 is underrated and should be first. It is real, it cannot be
 * faked, it needs no budget."* This is that asset, produced from the actual app.
 *
 * A slow, even scroll rather than a fast one: the founder asked for natural and low-energy, and a
 * frantic scroll is the tell of a produced ad. This should look like someone reading.
 */
async function record(id, path, viewport, { steps = 26, note = "" } = {}) {
  const dir = join(OUT, `video-${id}`);
  const ctx = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2, isMobile: viewport.isMobile ?? false, hasTouch: viewport.hasTouch ?? false,
    colorScheme: "light",
    recordVideo: { dir, size: { width: viewport.width, height: viewport.height } },
  });
  const page = await ctx.newPage();
  try {
    await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 30000 });
  } catch {
    await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  }
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(1400);
  const height = await page.evaluate(() => document.body.scrollHeight);
  const step = Math.max(1, Math.floor((height - viewport.height) / steps));
  for (let i = 0; i <= steps; i++) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), i * step);
    await page.waitForTimeout(240);
  }
  await page.waitForTimeout(700);
  await ctx.close();
  videos.push({ id, path, size: `${viewport.width}x${viewport.height}`, note });
}

const videos = [];
await record("home-scroll-phone", "/", PHONE, { note: "The real homepage, scrolled — 9:16 screen recording" });
await record("care-plus-phone", "/care-plus", PHONE, { steps: 20, note: "Care+ page, phone" });

await browser.close();
server.close();

const lines = shots.map((s) =>
  `| \`${s.id}.png\` | \`${s.path}\` | ${s.size}${s.full ? " full-page" : ""} | ${s.note} | ${s.errors ? `⚠️ ${s.errors} page error(s)` : "clean"} |`);
console.log(`captured ${shots.length} stills, ${videos.length} recordings\n` + lines.join("\n") + "\n" + videos.map((v) => `| video-${v.id}/ | \`${v.path}\` | ${v.size} | ${v.note} |`).join("\n"));
