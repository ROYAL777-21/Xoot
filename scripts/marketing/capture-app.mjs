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

/*
 * ── ⛔ Nothing leaves this machine ───────────────────────────────────────────
 *
 * **`dist/` is compiled against `mvlrkelahhsyjrwgsxaf.supabase.co`, which is PRODUCTION.** Every
 * context below therefore routes `**` and refuses anything not served by the local static server.
 *
 * This is not caution about writes. The production project's "0 bookings, 1 user" is load-bearing
 * evidence in `NEEDS-FOUNDER` and in every claim-check in `docs/marketing/` — a capture run that
 * quietly created a row would not break the screenshot, it would break the argument the screenshots
 * exist to support, and nobody would notice for weeks.
 *
 * Requests are FULFILLED, not aborted. An aborted fetch surfaces as a rejected promise and the app
 * renders its error state; an empty 200 lets it render the empty state, which is the truthful frame
 * anyway — production really does hold no bookings.
 *
 * `escaped` is the assertion. It stays empty if the route handler saw every request; anything in it
 * at the end of the run fails the process, because a screenshot is not worth a production call.
 */
const escaped = [];
const intercepted = [];

const harden = async (ctx) => {
  await ctx.route("**", async (route) => {
    const url = route.request().url();
    if (url.startsWith(base) || url.startsWith("data:") || url.startsWith("blob:")) {
      return route.continue();
    }
    intercepted.push(url.split("?")[0]);
    // An empty JSON body satisfies both a REST list and a functions.invoke; neither screen below
    // renders anything from these, so the shape only has to parse.
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: "[]",
    });
  });
  ctx.on("request", (req) => {
    const url = req.url();
    if (!url.startsWith(base) && !url.startsWith("data:") && !url.startsWith("blob:")) {
      // Recorded for the report; the route handler above has already stopped it reaching the wire.
      if (!intercepted.includes(url.split("?")[0])) escaped.push(url.split("?")[0]);
    }
  });
};

/*
 * ── The four frames, from the design's own responsive contract ──────────────────
 *
 * `design/handoff-2026-09-03/Xoot Responsive Check.dc.html` is not a mood board — it renders the
 * website at exactly four viewports, and those are the sizes the design is claimed to work at:
 *
 *     iPhone 390x844 · Landscape phone 844x390 · iPad 834x1112 · Laptop 1280x800
 *
 * ⚠️ **This script shot two of them and had never rendered landscape phone or iPad**, while the
 * design source calls `useLandscapeCompact()` explicitly — so a breakpoint the designer wrote code
 * for had never once been looked at. Landscape phone is the cruel one: 390px of height with a
 * fixed nav on top leaves very little, and it is what someone gets watching a video and tilting.
 */
const PHONE = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const PHONE_LANDSCAPE = { width: 844, height: 390, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const IPAD = { width: 834, height: 1112, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const LAPTOP = { width: 1280, height: 800, deviceScaleFactor: 2 };
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 2 };

const shots = [];

/*
 * ── ⚠️ The app does not scroll the document, and two things were wrong because of it ──
 *
 * `<body>` is `overflow: hidden` and `document.body.scrollHeight` is exactly the viewport height.
 * The real scroller is an unclassed `<div>` inside the app shell — measured at **22204px** against
 * a 844px viewport on the homepage. So:
 *
 *   ⛔ `fullPage: true` captured ONE viewport and labelled it "full-page". That is why
 *      `site-home-phone.png` and `site-hero-phone.png` came out near-identical: they were the same
 *      frame twice, one of them mislabelled.
 *
 *   ⛔ Worse, `fullPage` also BROKE the frame. Playwright re-renders to stitch a full-page shot,
 *      and the hero's rotating phrase — which measures itself in a layout effect — came back blank.
 *      The headline read "Premium home care," with an empty band under it. The viewport capture of
 *      the same route at the same moment renders it correctly. A marketing still of a half-drawn
 *      headline is worse than no still.
 *
 *   ⛔ `record()` computed its scroll step from `document.body.scrollHeight`, so
 *      `(844 - 844) / 26` floored to a 1px step. The "homepage, scrolled" recordings moved 26
 *      pixels in total. They were static video of a hero.
 *
 * So: no fullPage anywhere, and everything that scrolls drives the real container.
 */
const SCROLLER = `(() => {
  const all = [...document.querySelectorAll("*")];
  let best = document.scrollingElement;
  let bestH = 0;
  for (const el of all) {
    const oy = getComputedStyle(el).overflowY;
    if (!["auto", "scroll", "overlay"].includes(oy)) continue;
    if (el.scrollHeight > el.clientHeight + 50 && el.scrollHeight > bestH) {
      best = el; bestH = el.scrollHeight;
    }
  }
  return best;
})()`;

/** Scroll the app's real container (not the window) and let it settle. */
const scrollTo = (page, y) =>
  page.evaluate(
    ([expr, top]) => {
      const el = eval(expr);
      el.scrollTo ? el.scrollTo({ top, behavior: "instant" }) : (el.scrollTop = top);
      return { top: el.scrollTop, height: el.scrollHeight, client: el.clientHeight };
    },
    [SCROLLER, y],
  );

/** Capture one route at a given device profile, optionally scrolled into the page. */
async function capture(id, path, viewport, { at = 0, wait = 2500, note = "" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor, isMobile: viewport.isMobile ?? false,
    hasTouch: viewport.hasTouch ?? false, colorScheme: "light" });
  await harden(ctx);
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
  let where = { top: 0, height: 0, client: 0 };
  if (at) {
    where = await scrollTo(page, at);
    // Long enough for the scroll-reveal animations the sections use to finish, or the frame
    // catches a section mid-fade — the same class of defect fullPage produced in the hero.
    await page.waitForTimeout(900);
  } else {
    where = await scrollTo(page, 0);
  }
  const file = join(OUT, `${id}.png`);
  await page.screenshot({ path: file });
  shots.push({
    id, path, size: `${viewport.width}x${viewport.height}`,
    at: where.top, of: where.height, note, errors: errors.length,
  });
  await ctx.close();
}

// ── The public marketing site — no auth, the real thing ──────────────────────
/*
 * Each frame is a postable asset in its own right — 1170x2532 is a 9:16 story, 2880x1800 a 16:9
 * — which is why they are named for what they show rather than dumped as one unusable tall strip.
 * The `at` offsets are read from the measured section positions on the homepage.
 */
await capture("site-hero-phone", "/", PHONE, { note: "Hero above the fold, phone" });
// The two sections ported 2026-09-04 — design positions 2 and 3, absent from the site until then.
await capture("site-gift-phone", "/", PHONE, { at: 1290, note: "Gift a clean, phone" });
await capture("site-careplus-phone", "/", PHONE, { at: 2560, note: "Care+ band, phone" });
/* The design's own four frames. These exist to be LOOKED at, not posted — a layout check. */
await capture("frame-phone-landscape", "/", PHONE_LANDSCAPE, { note: "844x390 — never rendered before" });
await capture("frame-ipad", "/", IPAD, { note: "834x1112 iPad" });
await capture("frame-laptop", "/", LAPTOP, { note: "1280x800 laptop" });
await capture("site-services-phone", "/", PHONE, { at: 3050, note: "The six services, phone" });
await capture("site-trust-phone", "/", PHONE, { at: 4900, note: "Trust workflow, phone" });
await capture("site-refer-phone", "/", PHONE, { at: 19080, note: "Referral — R100 for them, R100 for you" });
await capture("site-hero-desktop", "/", DESKTOP, { note: "Hero above the fold, desktop" });
await capture("site-services-desktop", "/", DESKTOP, { at: 1500, note: "Services, desktop" });
await capture("site-care-plus", "/care-plus", DESKTOP, { note: "Care+ page, top" });
await capture("site-trust", "/trust-centre", DESKTOP, { note: "Trust centre, top" });

/*
 * ── The screen recording — form factor F2 ───────────────────────────────────
 *
 * ⚠️ `ad-matrix-and-avatars.md`: *"F2 is underrated and should be first. It is real, it cannot be
 * faked, it needs no budget."* This is that asset, produced from the actual app.
 *
 * A slow, even scroll rather than a fast one: the founder asked for natural and low-energy, and a
 * frantic scroll is the tell of a produced ad. This should look like someone reading.
 */
async function record(id, path, viewport, { steps = 26, travel = 6000, note = "" } = {}) {
  const dir = join(OUT, `video-${id}`);
  const ctx = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2, isMobile: viewport.isMobile ?? false, hasTouch: viewport.hasTouch ?? false,
    colorScheme: "light",
    recordVideo: { dir, size: { width: viewport.width, height: viewport.height } },
  });
  await harden(ctx);
  const page = await ctx.newPage();
  try {
    await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 30000 });
  } catch {
    await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  }
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(1400);
  /*
   * ⚠️ Measured from the real scroller, not `document.body`. See the block above `capture()` — body
   * reports the viewport height here, which floored the step to 1px and made these recordings
   * static.
   *
   * `travel` caps how far down the page the recording goes. A 22204px homepage scrolled end to end
   * in 26 steps is a blur; the founder asked for natural and low-energy, and the useful footage is
   * the first few screens where the product actually is.
   */
  const { height, client } = await scrollTo(page, 0);
  const reach = Math.max(0, Math.min(height - client, travel));
  const step = Math.max(1, Math.floor(reach / steps));
  for (let i = 0; i <= steps; i++) {
    await scrollTo(page, i * step);
    await page.waitForTimeout(240);
  }
  await page.waitForTimeout(700);
  await ctx.close();
  videos.push({
    id, path, size: `${viewport.width}x${viewport.height}`,
    travelled: `${step * steps}px of ${height}px`, note,
  });
}

const videos = [];
await record("home-scroll-phone", "/", PHONE, { travel: 6400, note: "The real homepage, scrolled — 9:16 screen recording" });
await record("care-plus-phone", "/care-plus", PHONE, { steps: 20, travel: 4200, note: "Care+ page, phone" });

await browser.close();
server.close();

/*
 * ⛔ The gate. Reported as measured counts, never as "should be safe".
 *
 * A run that intercepted ZERO off-host requests is also worth seeing: it means either the app made
 * none, or the handler never attached. Both are stated so the difference is visible rather than
 * assumed from a silent pass.
 */
const offHost = [...new Set(intercepted)];
console.log(`\nintercepted ${intercepted.length} off-host request(s) across ${offHost.length} endpoint(s):`);
for (const u of offHost) console.log(`  · ${u}`);
if (escaped.length) {
  console.error(`\n⛔ ${escaped.length} request(s) reached the network un-mocked:`);
  for (const u of [...new Set(escaped)]) console.error(`  · ${u}`);
  process.exitCode = 1;
} else {
  console.log("✅ no request left this machine — production was not contacted.");
}

const lines = shots.map((s) =>
  `| \`${s.id}.png\` | \`${s.path}\` | ${s.size} | at ${s.at}px of ${s.of}px | ${s.note} | ${s.errors ? `⚠️ ${s.errors} page error(s)` : "clean"} |`);
console.log(`captured ${shots.length} stills, ${videos.length} recordings\n` + lines.join("\n") + "\n" + videos.map((v) => `| video-${v.id}/ | \`${v.path}\` | ${v.size} | scrolled ${v.travelled} | ${v.note} |`).join("\n"));
