#!/usr/bin/env node
/**
 * Extract the design kit's webfonts from `design/Xoot_App.html` and write subset WOFF2 into
 * `public/fonts/`.
 *
 * ── Why this exists as a script rather than a one-off ──────────────────────────────────────────
 *
 * `design/Xoot_App.html` is a 2.9 MB self-extracting bundle exported from Claude Design, and it is
 * the only durable copy of the kit — the `DesignSync` MCP tool needs `/design-login`, which needs
 * an interactive terminal, so CI and remote sessions cannot reach the project. When the kit is
 * re-exported, the fonts need re-extracting, and a documented script is the difference between
 * that being a two-minute job and an archaeology exercise.
 *
 * The extraction itself follows the snippet in `design/README.md` rather than inventing a parser.
 *
 * ── What it ships, and what it deliberately does not ───────────────────────────────────────────
 *
 * The bundle carries seven TTFs across four families. Only two are shipped:
 *
 *   Plus Jakarta Sans   variable, 172 KB TTF   → body
 *   Newsreader          variable, 441 KB TTF   → display
 *
 * `DM Mono` is for code, and the public site renders none. `Caveat` is the script face used by the
 * kit's `LogoScript` component, which the web wordmark does not use. Shipping either would be
 * ~490 KB of TTF for nothing on screen. Both are still in the bundle if a later surface wants them.
 *
 * Both shipped families are VARIABLE, which is why one file per family covers every weight. The
 * weight axis is preserved deliberately — pinning it would mean one file per weight and a larger
 * total, not a smaller one.
 *
 * ── Subsetting ─────────────────────────────────────────────────────────────────────────────────
 *
 * Newsreader is 441 KB largely because it carries Greek, Cyrillic and Vietnamese. Xoot ships in
 * South African English. The subset below is Latin + Latin-1 Supplement + the punctuation and
 * symbols the site actually renders, which is where most of the saving comes from — WOFF2
 * compression alone would leave the unused scripts in place.
 *
 * ── Running it ─────────────────────────────────────────────────────────────────────────────────
 *
 *     npm install --no-save subset-font
 *     node scripts/design/extract-kit-fonts.mjs
 *
 * `subset-font` is deliberately NOT a devDependency. The repository carries both `bun.lock` (CI)
 * and `package-lock.json` (Netlify runs `npm ci`), so a permanent entry means keeping two
 * lockfiles in step for a step that runs once per kit export. The generated `.woff2` files are
 * committed, so neither CI nor the Netlify build ever needs this package.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";

const BUNDLE = "design/Xoot_App.html";
const OUT_DIR = "public/fonts";

/**
 * Families to ship, the file each becomes, and which variation axes survive.
 *
 * ── Why the axes are constrained, measured rather than guessed ─────────────────────────────────
 *
 * First run: Newsreader subset to 159 KB and Plus Jakarta Sans to 37 KB — 196 KB total, which
 * blew the budget below by 76 KB. The cause was not the glyph count. Newsreader carries TWO axes,
 * `wght 200–800` and `opsz 6–72`, and a variable font stores deltas for every glyph across every
 * axis, so the optical-size axis was roughly doubling the file.
 *
 * `opsz` is pinned at 24 because Newsreader is display-only here: the public site renders it at
 * `text-2xl` through `text-5xl` (24–48px), and 24 sits at the bottom of that band where the
 * difference is most visible. Pinning removes the axis entirely rather than merely limiting it.
 *
 * `wght` keeps 400–800 rather than the 600–800 the headings suggest, because two decorative uses
 * (`tracking-[0.24em]` and `tracking-[0.3em]`) carry no weight class and inherit 400. Clamping to
 * 600 would silently embolden them.
 *
 * Plus Jakarta Sans has only `wght` and is already small, so it keeps its full range.
 */
const WANTED = new Map([
  [
    "Plus Jakarta Sans",
    { file: "plus-jakarta-sans-latin-var.woff2", role: "body", axes: { wght: { min: 300, max: 800 } } },
  ],
  [
    "Newsreader",
    { file: "newsreader-latin-var.woff2", role: "display", axes: { wght: { min: 400, max: 800 }, opsz: 24 } },
  ],
]);

/**
 * The characters kept. Built explicitly rather than as a unicode-range string because
 * `subset-font` takes text, and because an explicit list is reviewable — someone can see at a
 * glance that the rand sign and the typographic quotes survived.
 */
const CHARSET = [
  // ASCII printable
  ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)),
  // Latin-1 Supplement. This is the range that carries the accents South African copy actually
  // uses: Afrikaans needs ê ë î ï ô û á é í ó ú à è, and every one of them lives here.
  ...Array.from({ length: 96 }, (_, i) => String.fromCharCode(0xa0 + i)),
  // Punctuation and symbols the site renders
  "–—‘’‚“”„†‡•…‰‹›⁄€™≠≤≥±×÷°§¶©®→←↑↓✓✗★☆",
].join("");

/*
 * Latin Extended-A (U+0100–U+017F) was in the first draft and has been dropped deliberately.
 *
 * It is 128 codepoints of Polish, Czech, Hungarian and Turkish letterforms — ł, ő, ř, ş, ż. No
 * South African English or Afrikaans string needs any of them, and in a variable font each glyph
 * costs its deltas across every remaining axis, so they were not free. If a name on a real page
 * ever renders as tofu, widen this and re-run; do not guess it back in pre-emptively.
 */

const readBundle = () => {
  if (!existsSync(BUNDLE)) {
    console.error(`✗ ${BUNDLE} not found. Nothing to extract.`);
    process.exit(1);
  }
  const src = readFileSync(BUNDLE, "utf8");
  const line = src.split("\n").find((l) => l.trim().startsWith('{"') && l.includes('"data"'));
  if (!line) {
    console.error("✗ No asset map found in the bundle. Its export format may have changed —");
    console.error("  re-read the extraction snippet in design/README.md before editing this.");
    process.exit(1);
  }
  return JSON.parse(line);
};

/**
 * Read the family name out of a TTF `name` table.
 *
 * Identifying fonts by name rather than by file size or map order matters: the asset map is keyed
 * by opaque UUIDs with no ordering guarantee, so "the third font" is not a stable identity and
 * would silently ship the wrong face after a re-export.
 */
function familyName(buf) {
  const numTables = buf.readUInt16BE(4);
  for (let i = 0; i < numTables; i += 1) {
    const rec = 12 + i * 16;
    if (buf.toString("latin1", rec, rec + 4) !== "name") continue;
    const off = buf.readUInt32BE(rec + 8);
    const count = buf.readUInt16BE(off + 2);
    const strOff = off + buf.readUInt16BE(off + 4);
    let fallback = null;
    for (let n = 0; n < count; n += 1) {
      const p = off + 6 + n * 12;
      const platform = buf.readUInt16BE(p);
      const nameId = buf.readUInt16BE(p + 6);
      const len = buf.readUInt16BE(p + 8);
      const so = buf.readUInt16BE(p + 10);
      if (nameId !== 1 && nameId !== 16) continue;
      const raw = buf.subarray(strOff + so, strOff + so + len);
      const text = platform === 3 ? raw.swap16().toString("utf16le") : raw.toString("latin1");
      // nameID 16 is the typographic family and wins where present; 1 is the legacy fallback.
      if (nameId === 16) return text;
      fallback ??= text;
    }
    return fallback;
  }
  return null;
}

let subsetFont;
try {
  ({ default: subsetFont } = await import("subset-font"));
} catch {
  console.error("✗ subset-font is not installed. It is intentionally not a devDependency:");
  console.error("    npm install --no-save subset-font");
  process.exit(1);
}

const assets = readBundle();
mkdirSync(OUT_DIR, { recursive: true });

const found = new Map();
for (const entry of Object.values(assets)) {
  if (!String(entry.mime ?? "").includes("ttf")) continue;
  let buf = Buffer.from(entry.data, "base64");
  if (entry.compressed) buf = gunzipSync(buf);
  const family = familyName(buf);
  if (WANTED.has(family) && !found.has(family)) found.set(family, buf);
}

const missing = [...WANTED.keys()].filter((f) => !found.has(f));
if (missing.length) {
  console.error(`✗ Not in the bundle: ${missing.join(", ")}`);
  console.error("  The export may have changed which families it carries. Do not guess a");
  console.error("  substitute — check design/README.md and the kit's --xoot-font-* tokens.");
  process.exit(1);
}

console.log(`Charset: ${[...new Set(CHARSET)].length} unique characters\n`);
let total = 0;

for (const [family, buf] of found) {
  const { file, role, axes } = WANTED.get(family);
  const out = await subsetFont(buf, CHARSET, { targetFormat: "woff2", variationAxes: axes });
  writeFileSync(join(OUT_DIR, file), out);
  total += out.length;
  const pct = ((1 - out.length / buf.length) * 100).toFixed(0);
  console.log(
    `${family.padEnd(20)} ${role.padEnd(8)} ${String(Math.round(buf.length / 1024)).padStart(4)} KB TTF` +
      ` → ${String(Math.round(out.length / 1024)).padStart(3)} KB WOFF2  (−${pct}%)  ${file}`,
  );
}

console.log(`\nTotal shipped: ${Math.round(total / 1024)} KB`);

/*
 * The budget is not decoration. design/PERFORMANCE.md sets LCP ≤ 2.5s at p75 on ordinary mobile
 * networks, and fonts are render-blocking for text. 120 KB is roughly a second of a slow 3G
 * connection spent on glyphs. Exceeding it is allowed — but it has to be a decision someone makes
 * out loud, not something that drifts upward one re-export at a time.
 */
const BUDGET_KB = 120;
if (total / 1024 > BUDGET_KB) {
  console.error(`\n✗ Over the ${BUDGET_KB} KB budget in design/PERFORMANCE.md by ` +
    `${Math.round(total / 1024 - BUDGET_KB)} KB. Narrow the charset or drop a family.`);
  process.exit(1);
}
console.log(`Within the ${BUDGET_KB} KB budget.`);
