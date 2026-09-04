/**
 * Render the PWA / apple-touch icons from the Xoot mark.
 *
 * ⚠️ Written 2026-09-04 because `icon-192.png`, `icon-512.png` and `apple-touch-icon.png` were a
 * terracotta **Z** on navy — the pre-rename Zoot mark, dated 2026-08-08. The rename reached the
 * code, the copy and the domain months before it reached the icon a customer taps on their home
 * screen.
 *
 * The geometry is `design/handoff-2026-09-03/xoot/assets/logo.svg`, not a redraw.
 *
 * **Maskable, so full-bleed.** Both manifests declare `purpose: "any maskable"`, which means the
 * launcher crops to its own shape — a circle on Android. A mark inset on a contrasting ground (what
 * the Z icons did) loses that ground to the crop and reads as a floating blob. So the violet runs
 * edge to edge and the squircle radius is dropped for the PNGs: the launcher supplies the corners.
 *
 * The rings sit within the maskable safe zone by measurement, not by eye: the icon spec reserves
 * the central 80%, which is 51.2px to 460.8px at 512. The rings span 111 to 415 (cx 196 and 330,
 * r 66, stroke 38 -> 85px outer radius). Comfortably inside, with 60px to spare on the tight side.
 */
import { Buffer } from "node:buffer";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

/* The image ships chromium-1194; Playwright 1.62.1 asks for 1234 and reports the mismatch as
 * "Please run npx playwright install", which this environment forbids. Naming the binary is the
 * fix — the browser is present, only the revision-derived path is wrong. */
const EXECUTABLE = "/opt/pw-browsers/chromium";

/** rx=0: full bleed for the maskable PNGs. The SVG favicon keeps the squircle — nothing masks it. */
const markSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <rect width="512" height="512" fill="#7C5CFC"/>
  <circle cx="196" cy="256" r="66" fill="none" stroke="#FFFFFF" stroke-width="38"/>
  <circle cx="330" cy="256" r="66" fill="none" stroke="#FFFFFF" stroke-width="38"/>
</svg>`;

const TARGETS = [
  { file: "public/icon-192.png", size: 192 },
  { file: "public/icon-512.png", size: 512 },
  { file: "public/apple-touch-icon.png", size: 180 },
];

/** The sizes packed into `favicon.ico`. 16 is what a browser tab actually renders. */
const ICO_SIZES = [16, 32, 48];

/**
 * Pack PNGs into an ICO container.
 *
 * PNG-in-ICO rather than BMP-in-ICO: every browser since IE11 reads it, and the BMP path would
 * mean hand-rolling a bottom-up DIB with a separate AND mask for transparency.
 *
 * Layout: a 6-byte ICONDIR, then one 16-byte ICONDIRENTRY per image, then the PNG payloads.
 * In an entry, a width or height byte of 0 means 256 — irrelevant at these sizes, but the reason
 * the field is one byte wide.
 */
const buildIco = (images) => {
  const HEADER = 6;
  const ENTRY = 16;
  const dir = Buffer.alloc(HEADER + ENTRY * images.length);
  dir.writeUInt16LE(0, 0); // reserved
  dir.writeUInt16LE(1, 2); // type 1 = icon
  dir.writeUInt16LE(images.length, 4);

  let offset = dir.length;
  images.forEach(({ size, buf }, i) => {
    const at = HEADER + ENTRY * i;
    dir.writeUInt8(size >= 256 ? 0 : size, at);
    dir.writeUInt8(size >= 256 ? 0 : size, at + 1);
    dir.writeUInt8(0, at + 2); // palette size — 0 for direct colour
    dir.writeUInt8(0, at + 3); // reserved
    dir.writeUInt16LE(1, at + 4); // colour planes
    dir.writeUInt16LE(32, at + 6); // bits per pixel
    dir.writeUInt32LE(buf.length, at + 8);
    dir.writeUInt32LE(offset, at + 12);
    offset += buf.length;
  });

  return Buffer.concat([dir, ...images.map((i) => i.buf)]);
};

const browser = await chromium.launch({ executablePath: EXECUTABLE });
try {
  for (const { file, size } of TARGETS) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<body style="margin:0;width:${size}px;height:${size}px">${markSvg(size)}</body>`,
    );
    const buf = await page.screenshot({ omitBackground: true });
    mkdirSync("public", { recursive: true });
    writeFileSync(file, buf);
    await page.close();
    console.log(`${file}  ${size}x${size}  ${buf.length} bytes`);
  }

  /*
   * ⚠️ `favicon.ico` was not a stale Xoot asset — it was the scaffold's default gradient heart,
   * shipped since the repository was created. Browsers request /favicon.ico unprompted, so it was
   * served to anyone whose browser did not take the SVG.
   *
   * At 16px the two rings resolve to a pair of dots roughly 5px across. That is the mark's floor,
   * and it is the right trade: a different glyph at small sizes would be a second logo to keep true.
   */
  const icoImages = [];
  for (const size of ICO_SIZES) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<body style="margin:0;width:${size}px;height:${size}px">${markSvg(size)}</body>`,
    );
    icoImages.push({ size, buf: await page.screenshot({ omitBackground: true }) });
    await page.close();
  }
  const ico = buildIco(icoImages);
  writeFileSync("public/favicon.ico", ico);
  console.log(`public/favicon.ico  ${ICO_SIZES.join("/")}  ${ico.length} bytes`);
} finally {
  await browser.close();
}
