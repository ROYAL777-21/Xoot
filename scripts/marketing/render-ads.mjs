/**
 * Composite the REAL app captures into postable ad frames.
 *
 * Founder: *"Ensure that the content shows the actual app in the ad/post."* So nothing here is
 * illustrated. Every frame is a photograph of software that exists, taken by
 * `capture-app.mjs` from a locally-served production build with every off-host request intercepted.
 *
 * ⛔ **No AI marker on these, deliberately.** `ugc-and-ads.md` requires one on every generated
 * asset; these are screenshots and typeset text, so a marker would be a false statement in the
 * other direction. The hero photograph inside the homepage capture carries its own marker, drawn
 * by the app itself — which is the right place for it.
 *
 * ── The call-out layer, and why these ads have one now ──────────────────────────
 *
 * `hormozi-playbooks.md` (Hooks): a hook is **call-out + condition for value**. The call-out is the
 * "this is for me" half — the cocktail-party effect, the thing that makes the right person turn
 * around. The condition is the promise.
 *
 * Every hook in `ad-matrix-and-avatars.md` is condition-for-value with **no call-out**. So each ad
 * renders as an A/B pair: `-a` is the hook alone, `-b` prefixes a call-out. That is a testable
 * change rather than a rewrite, and the pair is what makes it measurable.
 *
 * ⛔ **A suburb call-out may only name a real launch suburb.** `approvedLaunchRegions` in
 * `src/lib/operations.ts` is the list, imported rather than retyped. `launch-protocol.md` gate 5
 * exists because advertising outside the service area produces people who cannot be served — and
 * an ad naming a suburb Xoot does not cover is a misrepresentation under CPA s41, not a typo.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SHOTS = join(root, "marketing-assets/app");
const OUT = join(root, "marketing-assets/ads");
const CHROME = "/opt/pw-browsers/chromium";

/* Brand values read from the handoff at render time — a token change reaches every ad, and a
 * missing token throws rather than silently rendering the wrong brand. Same contract as
 * `render-creatives.mjs`; `colors.css` says of the violet: "500 is THE violet; never invent another." */
const css = readFileSync(join(root, "design/handoff-2026-09-03/xoot/tokens/colors.css"), "utf8");
const token = (name) => {
  const m = css.match(new RegExp(`--xoot-${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`token --xoot-${name} not found in colors.css — refusing to guess a brand colour`);
  return m[1].trim();
};
const VIOLET = token("violet-500");
const INK = token("ink-900");
const PAGE = token("neutral-25");

/* Real OFL binaries from the handoff, embedded so output never depends on a system font. */
const fontB64 = (file) =>
  readFileSync(join(root, "design/handoff-2026-09-03/xoot/assets/fonts", file)).toString("base64");
const NEWSREADER = fontB64("Newsreader[opsz,wght].ttf");
const JAKARTA = fontB64("PlusJakartaSans[wght].ttf");

/** The launch suburbs, parsed from the source of truth rather than retyped. */
const opsSource = readFileSync(join(root, "src/lib/operations.ts"), "utf8");
const suburbBlock = opsSource.slice(
  opsSource.indexOf("approvedLaunchRegions"),
  opsSource.indexOf("];", opsSource.indexOf("approvedLaunchRegions")),
);
const SUBURBS = [...suburbBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
if (SUBURBS.length < 5) throw new Error("could not read approvedLaunchRegions — refusing to invent a suburb");
const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const shot = (file) => {
  const buf = readFileSync(join(SHOTS, file));
  return `data:image/png;base64,${buf.toString("base64")}`;
};

/*
 * Hooks verbatim from `ad-matrix-and-avatars.md`. `callOut` is the half the Hooks playbook says is
 * missing — a label naming who this is for. `null` means the pair is hook-only on both sides.
 */
const ADS = [
  {
    id: "AD-01", screen: "site-hero-phone.png",
    hook: "You've walked past that same pile for eleven days.",
    callOut: `${title(SUBURBS[1])} homes`,
  },
  {
    id: "AD-02", screen: "site-services-phone.png",
    hook: "A form, a callback, and a price at the end.",
    callOut: "Anyone who has phoned for a quote",
  },
  {
    id: "AD-03", screen: "site-trust-phone.png",
    hook: "The button stays off until both photos exist.",
    callOut: "If you have ever been let into your own home by a stranger",
  },
  {
    id: "AD-04", screen: "site-careplus-phone.png",
    hook: "Book the same Xooter again.",
    callOut: "Care+ members",
  },
  {
    id: "AD-05", screen: "site-gift-phone.png",
    hook: "Give someone their weekend back.",
    callOut: "For your mother, who will not ask",
  },
  {
    id: "AD-06", screen: "site-refer-phone.png",
    hook: "Four hours, every Saturday.",
    callOut: `${title(SUBURBS[7])} and ${title(SUBURBS[5])}`,
  },
];

/** 1080x1350 — the 4:5 Meta feed frame, the largest slot in the feed. */
const W = 1080;
const H = 1350;

const page = ({ hook, callOut, screen }) => `
<style>
  @font-face{font-family:'Newsreader';src:url(data:font/ttf;base64,${NEWSREADER}) format('truetype');font-weight:200 800}
  @font-face{font-family:'Jakarta';src:url(data:font/ttf;base64,${JAKARTA}) format('truetype');font-weight:200 800}
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${W}px;height:${H}px;background:${PAGE};font-family:'Jakarta',sans-serif;
       display:flex;flex-direction:column;overflow:hidden}
  .top{padding:64px 64px 0;flex:0 0 auto}
  .callout{display:inline-block;background:${VIOLET};color:#fff;font-size:22px;font-weight:700;
           letter-spacing:.04em;text-transform:uppercase;padding:10px 18px;border-radius:999px;
           margin-bottom:26px}
  h1{font-family:'Newsreader',serif;font-weight:500;font-size:${hook.length > 46 ? 62 : 72}px;
     line-height:1.06;letter-spacing:-.02em;color:${INK};text-wrap:balance}
  .stage{flex:1 1 auto;position:relative;margin-top:44px;display:flex;justify-content:center;
         align-items:flex-start;overflow:hidden}
  /* The device frame. The screenshot is 1170x2532 at DSR 3, so it is scaled by width and allowed
     to run off the bottom edge — the top of the screen is the part that carries the message. */
  .phone{width:520px;border-radius:52px;border:12px solid ${INK};background:${INK};
         box-shadow:0 40px 90px -30px rgba(21,21,21,.45);overflow:hidden}
  .phone img{display:block;width:100%}
  .lockup{position:absolute;bottom:0;left:0;right:0;padding:34px 64px;display:flex;
          align-items:center;gap:12px;background:linear-gradient(180deg,rgba(245,243,242,0),${PAGE} 42%)}
  .mark{width:44px;height:44px;border-radius:10px}
  .word{font-family:'Newsreader',serif;font-size:32px;font-weight:700;color:${INK}}
</style>
<div class="top">
  ${callOut ? `<div class="callout">${callOut}</div>` : ""}
  <h1>${hook}</h1>
</div>
<div class="stage">
  <div class="phone"><img src="${shot(screen)}"></div>
  <div class="lockup">
    <svg class="mark" viewBox="0 0 512 512">
      <rect width="512" height="512" rx="115" fill="${VIOLET}"/>
      <circle cx="196" cy="256" r="66" fill="none" stroke="#fff" stroke-width="38"/>
      <circle cx="330" cy="256" r="66" fill="none" stroke="#fff" stroke-width="38"/>
    </svg>
    <span class="word">Xoot</span>
  </div>
</div>`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const rows = [];
for (const ad of ADS) {
  for (const [variant, callOut] of [["a", null], ["b", ad.callOut]]) {
    const p = await ctx.newPage();
    await p.setContent(page({ ...ad, callOut }));
    await p.evaluate(() => document.fonts.ready);
    const file = join(OUT, `${ad.id}-${variant}.png`);
    const buf = await p.screenshot();
    writeFileSync(file, buf);
    rows.push(`| \`${ad.id}-${variant}.png\` | ${W}x${H} | ${callOut ? `call-out: "${callOut}"` : "hook only"} | ${ad.screen} | ${(buf.length / 1024).toFixed(0)} KB |`);
    await p.close();
  }
}
await browser.close();

console.log(`rendered ${rows.length} ad frames into marketing-assets/ads/\n`);
console.log("| file | size | variant | real screen behind it | bytes |");
console.log("|---|---|---|---|---|");
console.log(rows.join("\n"));
console.log(`\nsuburbs read from operations.ts: ${SUBURBS.length} approved regions`);
