import { inflateSync } from "node:zlib";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The shipped brand assets are Xoot's, and the service worker can install.
 *
 * ⚠️ **Written 2026-09-04, after finding that the app icon was a terracotta `Z`.**
 *
 * The rename from Zoot to Xoot reached the code, the copy, the database and the domain. It did not
 * reach `public/`. `icon-512.png`, `icon-192.png` and `apple-touch-icon.png` — dated 2026-08-08 —
 * were a large terracotta **Z** on navy, wired as PWA icons in both manifests; `zoot-icon.svg` was
 * the same mark as the `<link rel="icon">` in `index.html`. `favicon.ico` was never Xoot's at all:
 * it was the scaffold's default gradient heart.
 *
 * So the browser tab, the installed home-screen icon and every marketing screenshot showed the
 * wrong company's letter, and nothing in a 1200-test suite noticed — because nothing looked at an
 * image. These guards look at the bytes.
 */
const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p));
const text = (p: string) => read(p).toString("utf8");

/**
 * Strip comments before matching source.
 *
 * ⚠️ Not optional, and this file proved it on its first run. `sw.js` explains *why* it moved off
 * `zoot-static-v6` and away from `zoot-icon.svg`, so both "nothing references the old mark" guards
 * failed against the sentence documenting the fix rather than against any regression.
 *
 * CLAUDE.md records two earlier guards in this repo that failed the same way. This is the third.
 */
const code = (p: string) =>
  text(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** `--xoot-violet-500`, the mark's ground. The retired Z icons were `#1A1A2E` navy at every edge. */
const VIOLET = { r: 0x7c, g: 0x5c, b: 0xfc };

/**
 * Read the top-left pixel of an 8-bit truecolour PNG.
 *
 * Only the first scanline is decoded, which is all the assertion needs and avoids pulling an image
 * library into the test tree for four files. The prior row is all zeros on row 0, so the Up, Average
 * and Paeth filters collapse to their left-only terms — hence the shared `left` in the switch.
 */
const topLeftPixel = (png: Buffer) => {
  expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

  let width = 0;
  let bitDepth = 0;
  let colourType = -1;
  const idat: Buffer[] = [];

  for (let at = 8; at + 8 <= png.length; ) {
    const len = png.readUInt32BE(at);
    const type = png.subarray(at + 4, at + 8).toString("ascii");
    const body = png.subarray(at + 8, at + 8 + len);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      bitDepth = body.readUInt8(8);
      colourType = body.readUInt8(9);
      expect(body.readUInt8(12), "interlaced PNG — this reader assumes none").toBe(0);
    } else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
    at += 12 + len; // length + type + data + crc
  }

  expect(bitDepth, "expected an 8-bit PNG").toBe(8);
  expect([2, 6], "expected truecolour, with or without alpha").toContain(colourType);
  const channels = colourType === 6 ? 4 : 3;

  const raw = inflateSync(Buffer.concat(idat));
  const filter = raw.readUInt8(0);
  const left = Array.from({ length: channels }, (_, c) => raw.readUInt8(1 + c));

  // On row 0 every filter that references the row above references zero.
  switch (filter) {
    case 0: // None
    case 1: // Sub — no pixel to the left of the first pixel either
    case 2: // Up
    case 3: // Average
    case 4: // Paeth
      break;
    default:
      throw new Error(`unknown PNG filter ${filter}`);
  }

  expect(width).toBeGreaterThan(0);
  return { r: left[0], g: left[1], b: left[2] };
};

describe("the app icons carry the Xoot mark", () => {
  const RASTER = ["public/icon-192.png", "public/icon-512.png", "public/apple-touch-icon.png"];

  it.each(RASTER)("%s is violet to the edge, not the retired Z on navy", (file) => {
    /*
     * The corner is the assertion, and it is not arbitrary. Both manifests declare these
     * `purpose: "any maskable"`, so a launcher crops them to its own shape and the ground must run
     * edge to edge or the crop eats it. The retired icons had `#1A1A2E` here — a mark floating on a
     * contrasting square, which is the exact thing maskable forbids.
     */
    const { r, g, b } = topLeftPixel(read(file));
    expect({ r, g, b }).toEqual(VIOLET);
  });

  it("favicon.ico is a real multi-size icon, not the scaffold's heart", () => {
    const ico = read("public/favicon.ico");
    expect(ico.readUInt16LE(0), "ICONDIR reserved").toBe(0);
    expect(ico.readUInt16LE(2), "ICONDIR type — 1 is icon, 2 is cursor").toBe(1);

    const count = ico.readUInt16LE(4);
    expect(count, "16px is what a browser tab renders; it must be one of the packed sizes")
      .toBeGreaterThanOrEqual(2);

    const sizes: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const at = 6 + 16 * i;
      const size = ico.readUInt8(at) === 0 ? 256 : ico.readUInt8(at);
      const bytes = ico.readUInt32BE ? ico.readUInt32LE(at + 8) : 0;
      const offset = ico.readUInt32LE(at + 12);
      sizes.push(size);
      // Every entry points at a real PNG payload inside the file, and that payload is the mark.
      const payload = ico.subarray(offset, offset + bytes);
      expect(payload.length, `entry ${i} runs past the end of the file`).toBe(bytes);
      expect(topLeftPixel(payload)).toEqual(VIOLET);
    }
    expect(sizes).toContain(16);
  });

  it("the SVG mark is the handoff geometry, not a redraw", () => {
    // Byte-comparable against `design/handoff-2026-09-03/xoot/assets/logo.svg`: same viewBox, same
    // radius, same two rings at the same centres. A redraw that merely looked right would drift.
    const svg = text("public/xoot-icon.svg");
    expect(svg).toMatch(/viewBox="0 0 512 512"/);
    expect(svg).toMatch(/<rect width="512" height="512" rx="115" fill="#7C5CFC"/);
    expect(svg).toMatch(/<circle cx="196" cy="256" r="66"[^>]*stroke-width="38"/);
    expect(svg).toMatch(/<circle cx="330" cy="256" r="66"[^>]*stroke-width="38"/);
  });
});

describe("nothing still points at the retired Zoot mark", () => {
  it("is gone from public/ entirely", () => {
    expect(existsSync(join(root, "public/zoot-icon.svg"))).toBe(false);
  });

  it.each(["index.html", "public/manifest.json", "public/manifest.webmanifest", "public/sw.js"])(
    "%s references xoot-icon.svg",
    (file) => {
      const source = code(file);
      expect(source).not.toMatch(/zoot-icon/);
      expect(source).toMatch(/xoot-icon\.svg/);
    },
  );
});

describe("the service worker can install", () => {
  /**
   * ⛔ **`cache.addAll` is atomic.** One 404 rejects the whole promise, the worker never activates,
   * and offline support is gone with nothing logged on the page — the failure is inside the worker,
   * where nobody is looking.
   *
   * Deleting `zoot-icon.svg` while `sw.js` still precached it produced exactly that state for the
   * few minutes between the two edits. This guard is the reason it cannot ship.
   */
  const SW = code("public/sw.js");

  it("precaches only files that exist", () => {
    const list = SW.match(/const STATIC_ASSETS = \[([\s\S]*?)\];/)?.[1];
    expect(list, "STATIC_ASSETS not found — this guard is reading the wrong shape").toBeTruthy();

    const paths = [...list!.matchAll(/"(\/[^"]*)"/g)].map((m) => m[1]);
    // OFFLINE_URL is a bare identifier in the array, so pull its value separately.
    const offline = SW.match(/const OFFLINE_URL = "([^"]+)"/)?.[1];
    expect(offline).toBeTruthy();
    paths.push(offline!);

    expect(paths.length).toBeGreaterThan(3);
    const missing = paths.filter((p) => !existsSync(join(root, "public", p)));
    expect(missing, "precached by sw.js but absent from public/").toEqual([]);
  });

  it("names the cache for this brand, so old clients drop the old icons", () => {
    // `activate` deletes every cache key that is not CACHE_NAME. If the key had stayed at
    // `zoot-static-v6` through an icon change, returning users would keep being served the Z from
    // their own cache and the fix would be invisible to exactly the people who had already visited.
    expect(SW).toMatch(/const CACHE_NAME = "xoot-static-v\d+"/);
    expect(SW).not.toMatch(/zoot-static/);
  });
});
