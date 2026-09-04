/**
 * Render the Xoot social creatives to real, postable PNGs.
 *
 * ⚠️ **These are TYPESET, not generated.** No Higgsfield, no Motion, no AI, no credits — and
 * therefore **no AI disclosure marker**, because a marker on a typeset asset would be a false
 * statement about its provenance.
 *
 * Brand values are read from `design/handoff-2026-09-03/xoot/tokens/colors.css` AT RENDER TIME
 * rather than retyped, so a token change reaches every creative and a missing token throws instead
 * of silently rendering the wrong brand. `colors.css` says of the violet:
 * *"500 is THE violet; never invent another."*
 *
 * Fonts are embedded as base64 from the real OFL binaries in the handoff, so output does not depend
 * on what is installed on the rendering machine.
 *
 * ⛔ **Do NOT run `npx playwright install`.** This environment ships Chromium at
 * /opt/pw-browsers (revision 1194) while the installed Playwright 1.62.1 wants 1234, so
 * `chromium.launch()` reports "Please run npx playwright install" — which looks like a missing
 * browser and is actually a revision mismatch. `executablePath` is the fix and the environment
 * documents it.
 *
 * Every headline below is verbatim from `docs/marketing/ad-matrix-and-avatars.md`. Creatives that
 * drift from the grid cannot be read against the test they belong to.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(root, "marketing-assets");
const CHROME = "/opt/pw-browsers/chromium";

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const css = readFileSync(join(root, "design/handoff-2026-09-03/xoot/tokens/colors.css"), "utf8");
const token = (name) => {
  const m = css.match(new RegExp(`--xoot-${name}\\s*:\\s*(#[0-9A-Fa-f]{3,8})`));
  if (!m) throw new Error(`token --xoot-${name} not found in colors.css — refusing to guess a brand colour`);
  return m[1];
};

const VIOLET = token("violet-500");
const VIOLET_DEEP = token("violet-600");
const INK = token("ink-900");
const MUTED = token("ink-600");
const CREAM = "#F5F3F2";

const fontDir = join(root, "design/handoff-2026-09-03/xoot/assets/fonts");
const b64 = (f) => readFileSync(join(fontDir, f)).toString("base64");
const FONTS = `
@font-face{font-family:'Newsreader';src:url(data:font/ttf;base64,${b64("Newsreader[opsz,wght].ttf")}) format('truetype');font-weight:200 800;font-display:block}
@font-face{font-family:'Plus Jakarta Sans';src:url(data:font/ttf;base64,${b64("PlusJakartaSans[wght].ttf")}) format('truetype');font-weight:200 800;font-display:block}
@font-face{font-family:'DM Mono';src:url(data:font/ttf;base64,${b64("DMMono-Medium.ttf")}) format('truetype');font-weight:500;font-display:block}`;

/** The Xoot mark, inlined. Geometry from assets/logo.svg — rx 115/512, two outlined circles. */
const MARK = (size, fg = "#fff", bg = VIOLET) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" role="img" aria-label="Xoot">
  <rect width="512" height="512" rx="115" fill="${bg}"/>
  <circle cx="190" cy="256" r="74" stroke="${fg}" stroke-width="34"/>
  <circle cx="322" cy="256" r="74" stroke="${fg}" stroke-width="34"/></svg>`;

const shell = (w, h, body, bg) => `<!doctype html><html><head><meta charset="utf-8"><style>
${FONTS}
*{margin:0;padding:0;box-sizing:border-box}
body{width:${w}px;height:${h}px;background:${bg};font-family:'Plus Jakarta Sans',system-ui,sans-serif;
 -webkit-font-smoothing:antialiased;overflow:hidden}
.serif{font-family:'Newsreader',Georgia,serif}
.mono{font-family:'DM Mono',ui-monospace,monospace}
.pad{width:100%;height:100%;display:flex;flex-direction:column;justify-content:space-between}
.rule{height:6px;background:${VIOLET};border-radius:3px}
.foot{display:flex;align-items:center;gap:18px}
.brand{font-weight:700;letter-spacing:-.02em}
</style></head><body>${body}</body></html>`;

/** Footer lock-up shared by the tall formats. */
const foot = (scale = 1, dark = false) => `
<div class="foot">
  <span class="brand" style="font-size:${34 * scale}px;color:${dark ? "#fff" : INK}">Xoot</span>
  <span class="mono" style="font-size:${28 * scale}px;color:${dark ? "rgba(255,255,255,.72)" : MUTED}">Your home. Handled.</span>
</div>`;

const tall = ({ pad, mark, body, dark = false, scale = 1 }) => `
<div class="pad" style="padding:${pad}">
  <div>${mark}</div>
  <div>${body}</div>
  ${foot(scale, dark)}
</div>`;

const wide = ({ pad, headline, sub, dark = false, hs = 62 }) => `
<div class="pad" style="padding:${pad}">
  <div style="display:flex;align-items:center;gap:20px">${MARK(60, dark ? VIOLET_DEEP : "#fff", dark ? "#fff" : VIOLET)}
    <span class="brand" style="font-size:30px;color:${dark ? "#fff" : INK}">Xoot</span></div>
  <div>
    <p class="serif" style="font-size:${hs}px;line-height:1.1;letter-spacing:-.02em;max-width:940px;color:${dark ? "#fff" : INK}">${headline}</p>
    ${sub ? `<p style="font-size:26px;line-height:1.5;margin-top:22px;max-width:880px;color:${dark ? "rgba(255,255,255,.82)" : MUTED}">${sub}</p>` : ""}
  </div>
  <div class="mono" style="font-size:22px;color:${dark ? "rgba(255,255,255,.7)" : MUTED}">Your home. Handled.</div>
</div>`;

const H1 = `You've walked past that same pile for eleven days.`;
const H1B = `It's not laziness.<br/>It's Tuesday, again.`;
const H4 = `Book the same Xooter again.`;
const H4B = `They already know about the cat, the good glasses, and the door that sticks.`;

const creatives = [
  // ── Instagram feed · 1080x1350 ──────────────────────────────────────────────
  { id: "IG-01-guilt", ch: "Instagram", w: 1080, h: 1350, bg: CREAM,
    note: "Avatar A x H1 (the guilt name). Grid cell 2 — the no-presenter arm.",
    body: tall({ pad: "96px 88px", mark: MARK(84), body: `
      <div class="rule" style="width:96px;margin-bottom:44px"></div>
      <p class="serif" style="font-size:94px;line-height:1.06;letter-spacing:-.025em;color:${INK}">${H1}</p>
      <p class="serif" style="font-size:62px;line-height:1.15;color:${VIOLET};margin-top:34px">${H1B}</p>` }) },

  { id: "IG-02-arithmetic", ch: "Instagram", w: 1080, h: 1350, bg: CREAM,
    note: "Avatar A x H2 (the time arithmetic). Same avatar, different hook — isolates the hook.",
    body: tall({ pad: "96px 88px", mark: MARK(84), body: `
      <div class="mono" style="font-size:210px;line-height:.92;letter-spacing:-.04em;color:${VIOLET}">26</div>
      <p class="serif" style="font-size:74px;line-height:1.1;color:${INK};margin-top:24px">days a year.</p>
      <p style="font-size:37px;line-height:1.45;color:${MUTED};margin-top:26px;max-width:830px">
        Four hours every Saturday is twenty-six full days of your year, spent cleaning.</p>` }) },

  { id: "IG-03-ladder", ch: "Instagram", w: 1080, h: 1350, bg: CREAM,
    note: "The transparent ladder. Unblocked by ZD-037 — could not have been made before 2026-09-03.",
    body: tall({ pad: "88px 88px", mark: MARK(84), body: `
      <p class="serif" style="font-size:76px;line-height:1.08;letter-spacing:-.02em;color:${INK}">The price you see is the price you pay.</p>
      <div style="margin-top:46px;display:flex;flex-direction:column;gap:20px">
        ${[["Small home · 4 hours", "R250"], ["Medium · 5.5 hours", "R296"], ["Large · 8 hours", "R376"]]
          .map(([l, v], i) => `<div style="display:flex;justify-content:space-between;align-items:baseline;${i < 2 ? `border-bottom:2px solid rgba(0,0,0,.08);padding-bottom:16px` : ""}">
            <span style="font-size:37px;color:${INK}">${l}</span>
            <span class="mono" style="font-size:45px;color:${VIOLET}">${v}</span></div>`).join("")}
      </div>
      <p style="font-size:29px;color:${MUTED};margin-top:30px">No quote forms. No callbacks. Shown before you book.</p>` }) },

  // ── Stories / Reels / TikTok covers · 1080x1920 ─────────────────────────────
  { id: "STORY-01-guilt", ch: "Instagram Stories / Reels", w: 1080, h: 1920, bg: CREAM,
    note: "9:16 cut of IG-01.",
    body: tall({ pad: "190px 88px", scale: 1.2, mark: MARK(92), body: `
      <div class="rule" style="width:110px;margin-bottom:48px"></div>
      <p class="serif" style="font-size:110px;line-height:1.05;letter-spacing:-.025em;color:${INK}">${H1}</p>
      <p class="serif" style="font-size:68px;line-height:1.14;color:${VIOLET};margin-top:40px">${H1B}</p>` }) },

  { id: "TT-01-cover-flow", ch: "TikTok cover", w: 1080, h: 1920, bg: VIOLET_DEEP,
    note: "Cover for TT-01/02 — the real booking-flow screen recording. Zero-credit hero asset.",
    body: tall({ pad: "190px 88px", scale: 1.2, dark: true, mark: MARK(92, VIOLET_DEEP, "#fff"), body: `
      <p class="serif" style="font-size:104px;line-height:1.07;letter-spacing:-.02em;color:#fff">This is the whole booking flow.</p>
      <p style="font-size:44px;line-height:1.45;color:rgba(255,255,255,.86);margin-top:36px;max-width:840px">
        No quote forms. No callbacks. No one phoning you back on Tuesday.</p>` }) },

  { id: "TT-02-cover-continuity", ch: "TikTok cover", w: 1080, h: 1920, bg: CREAM,
    note: "Cover for the continuity script. Avatar C x H4 — the objection is briefing cost, not price.",
    body: tall({ pad: "190px 88px", scale: 1.2, mark: MARK(92), body: `
      <p class="serif" style="font-size:104px;line-height:1.07;letter-spacing:-.02em;color:${INK}">${H4}</p>
      <p style="font-size:44px;line-height:1.45;color:${MUTED};margin-top:36px;max-width:850px">${H4B}</p>` }) },

  // ── Facebook Page + LinkedIn · 1200x628 ─────────────────────────────────────
  { id: "FB-01-mechanism", ch: "Facebook Page", w: 1200, h: 628, bg: CREAM,
    note: "Avatar D x H3 — show the access mechanism rather than claim trust.",
    body: wide({ pad: "72px 76px",
      headline: "Access opens when your booking starts. It closes when the job ends.",
      sub: "You can revoke it at any time." }) },

  { id: "FB-02-ladder", ch: "Facebook Page", w: 1200, h: 628, bg: CREAM,
    note: "The ladder, wide format.",
    body: wide({ pad: "72px 76px", hs: 58,
      headline: "R250 for a four-hour clean. Shown before you book.",
      sub: "Fixed prices. No quote forms, no callbacks. Medium R296, large R376." }) },

  { id: "LI-01-supply", ch: "LinkedIn", w: 1200, h: 628, bg: VIOLET_DEEP,
    note: "Founder register. The supply-constraint finding — the strongest B2B-adjacent idea.",
    body: wide({ pad: "72px 76px", dark: true, hs: 56,
      // ⚠️ Reworded after review. The first version said "We built the supply side first" — an
      // OUTCOME claim, and false: gate 5 is open and there are no activated Xooters yet. Intent
      // tense is both true and the only version CPA s41 permits.
      headline: "In a service marketplace, customers are not the hard part.",
      sub: "Finding and keeping good people is. That is the side we are building first." }) },

  { id: "LI-02-defect", ch: "LinkedIn", w: 1200, h: 628, bg: CREAM,
    note: "Build-in-public. Pairs with the deploy-check essay.",
    body: wide({ pad: "72px 76px", hs: 56,
      headline: "Our deploy check passed for three weeks while checking nothing.",
      sub: "What we changed, and how we found it." }) },

  // ── X · 1600x900 ────────────────────────────────────────────────────────────
  { id: "X-01-company", ch: "X (company)", w: 1600, h: 900, bg: CREAM,
    note: "Company launch card.",
    body: wide({ pad: "84px 92px", hs: 72,
      headline: "Pick your home size. Pick your day. A Xooter comes.",
      sub: "Fixed prices from R250, shown before you book." }) },

  { id: "X-02-founder-godaddy", ch: "X (founder)", w: 1600, h: 900, bg: CREAM,
    note: "Founder register, build-in-public. VOICE: UNCALIBRATED.",
    body: wide({ pad: "84px 92px", hs: 68,
      headline: "Two correct builds sat unreachable while the domain served someone else's page.",
      sub: "Three weeks. Both hosts green. Zero traffic." }) },

  { id: "X-03-founder-price", ch: "X (founder)", w: 1600, h: 900, bg: VIOLET_DEEP,
    note: "The pricing-conflict story — a document naming a number the software never charged.",
    body: wide({ pad: "84px 92px", dark: true, hs: 68,
      headline: "Our pricing doc named a number the software had never charged.",
      sub: "Three sets of prices. None of them agreed. No test compared any of them." }) },

  // ── Substack headers · 1200x600 ─────────────────────────────────────────────
  { id: "SUB-01-header", ch: "Substack", w: 1200, h: 600, bg: CREAM,
    note: "Essay header — the deploy check that never checked.",
    body: wide({ pad: "68px 76px", hs: 58,
      headline: "The check that passed for three weeks while checking nothing.",
      sub: "Building Xoot in public." }) },

  { id: "SUB-02-header", ch: "Substack", w: 1200, h: 600, bg: VIOLET_DEEP,
    note: "Essay header — supply before demand.",
    body: wide({ pad: "68px 76px", dark: true, hs: 58,
      headline: "We were marketing to the wrong side of the marketplace.",
      sub: "Building Xoot in public." }) },

  // ── YouTube ─────────────────────────────────────────────────────────────────
  { id: "YT-banner", ch: "YouTube", w: 2560, h: 1440, bg: CREAM,
    note: "Channel art. ⚠️ Safe area is the central 1546x423 — everything legible must sit inside it.",
    body: `<div style="width:100%;height:100%;display:grid;place-items:center">
      <div style="width:1546px;height:423px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px">
        ${MARK(132)}
        <p class="serif" style="font-size:82px;letter-spacing:-.02em;color:${INK}">Xoot</p>
        <p class="mono" style="font-size:34px;color:${MUTED}">Your home. Handled.</p>
      </div></div>` },

  { id: "YT-avatar", ch: "YouTube", w: 800, h: 800, bg: VIOLET,
    note: "Channel avatar — the mark, full bleed.",
    body: `<div style="width:100%;height:100%;display:grid;place-items:center">${MARK(800, "#fff", VIOLET)}</div>` },
];

const browser = await chromium.launch({ executablePath: CHROME });
const rows = [];
for (const c of creatives) {
  const page = await browser.newPage({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: 1 });
  await page.setContent(shell(c.w, c.h, c.body, c.bg), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(OUT, `${c.id}.png`) });
  await page.close();
  rows.push({ id: c.id, ch: c.ch, w: c.w, h: c.h, note: c.note });
}
await browser.close();

writeFileSync(
  join(OUT, "MANIFEST.md"),
  `# Rendered creatives\n\nGenerated ${new Date().toISOString().slice(0, 10)} by ` +
    `\`scripts/marketing/render-creatives.mjs\`.\n\n` +
    `Brand read from \`tokens/colors.css\`: violet **${VIOLET}**, deep **${VIOLET_DEEP}**, ink **${INK}**.\n\n` +
    `⚠️ **Typeset, not AI-generated — no disclosure marker required.**\n\n` +
    `| File | Channel | Size | Concept |\n|---|---|---|---|\n` +
    rows.map((r) => `| \`${r.id}.png\` | ${r.ch} | ${r.w}×${r.h} | ${r.note} |`).join("\n") + "\n",
);
console.log(`rendered ${rows.length} creatives -> marketing-assets/`);
