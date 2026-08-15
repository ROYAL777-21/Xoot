import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ── Every semantic colour must still be the kit's colour ───────────────────────────────────────
 *
 * `design-contrast.test.ts` proves the palette is *readable*. `design-tokens.test.ts` proves the
 * CSS and the React Native mirror *agree with each other*. Neither asks the question that actually
 * went wrong: **is this still the kit's colour at all?**
 *
 * It was not. For months `--gradient-warm` painted 58 surfaces terracotta — a hue that appears
 * nowhere in `design/Xoot_App.html` — while the semantic tokens beside it said violet and ink.
 * `bg-brand` had **zero** uses; the kit's defining colour was absent from the product it defines.
 * Every existing test passed throughout, because each was comparing the palette to itself.
 *
 * ── The rule, and why it is asymmetric ─────────────────────────────────────────────────────────
 *
 * Each role below names the `--xoot-*` ramp token it derives from. Two assertions:
 *
 *   1. **Hue matches**, within 4°. Measured deltas across the whole table are ≤ 1.3°, so 4° is
 *      three times the worst real case — loose enough to survive re-rounding a token, tight enough
 *      that terracotta (14°) could never pass as coral (7°), nor olive (105°) as sage (155°).
 *
 *   2. **Never lighter than the kit**, in the light scheme only. This is the direction that
 *      matters: four roles are deliberately DARKER than their kit source because the kit's own
 *      500 weights fail WCAG AA for white body text — `success` −7.7%, `destructive` −7.7%,
 *      `care-plus` −2.1%, and `brand` which takes violet-600 rather than violet-500 (4.38:1).
 *      Darkening is the fix; lightening is the regression. A 1% allowance absorbs rounding.
 *
 * The dark scheme is checked for **hue only**. There, tokens legitimately go lighter — a brand
 * colour on a near-black page has to — so a lightness ceiling would be wrong rather than strict.
 *
 * Planted 2026-08-13: pointing `--accent` at a blue fails the hue assertion; lightening it past
 * the kit's weight fails the lightness one. Restored after each.
 */

const css = readFileSync(join(process.cwd(), "src/index.css"), "utf8");
const kit = readFileSync(join(process.cwd(), "src/styles/kit-tokens.css"), "utf8");

type Hsl = { h: number; s: number; l: number };

/** The bare `H S% L%` triplet form the app's tokens use, read out of a given selector block. */
function siteToken(name: string, selector: string): Hsl | null {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`selector ${selector} not found in index.css`);
  const body = css.slice(start, css.indexOf("\n  }", start));
  const m = new RegExp(`--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%;`).exec(body);
  return m ? { h: +m[1], s: +m[2], l: +m[3] } : null;
}

/** The kit ships hex. Only the concrete ramp entries are referenced, so no `var()` resolution. */
function kitToken(name: string): Hsl | null {
  const m = new RegExp(`--xoot-${name}:\\s*#([0-9A-Fa-f]{6});`).exec(kit);
  if (!m) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

/** Smallest angle between two hues — 359° and 1° are 2° apart, not 358°. */
const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/**
 * Which kit ramp each semantic role comes from.
 *
 * `sage` is listed even though `design-tokens.ts` does not mirror it — that omission is exactly
 * why the olive-vs-teal divergence survived. A role missing from the native mirror still ships on
 * the web, so this table reads the CSS rather than the mirror.
 */
const DERIVATION: { role: string; from: string; note?: string }[] = [
  { role: "accent", from: "honey-500" },
  {
    role: "accent-ink",
    from: "honey-ink",
    note: "the amber's own ink — 43 places rendered green ink on this amber wash",
  },
  { role: "warning", from: "honey-500" },
  { role: "info", from: "mist-500" },
  { role: "sage", from: "sage-500" },
  { role: "sage-deep", from: "sage-ink" },
  { role: "success", from: "sage-500", note: "darkened 7.7% — white on sage-500 is 3.25" },
  { role: "brand", from: "violet-600", note: "violet-500 measures 4.38 for white body text" },
  { role: "destructive", from: "coral-500", note: "darkened 7.7% — issue #38" },
  { role: "care-plus", from: "careplus-500", note: "darkened 2.1% — careplus-500 is 4.31" },
];

const HUE_TOLERANCE = 4;
const LIGHTNESS_ROUNDING = 1;

describe("the semantic palette still derives from the kit", () => {
  it("reads both stylesheets and finds every role", () => {
    // A table that silently resolves to nothing passes every assertion below while checking none.
    expect(DERIVATION.length).toBeGreaterThan(5);
    for (const { role, from } of DERIVATION) {
      expect(siteToken(role, "  :root {"), `--${role} missing from index.css`).not.toBeNull();
      expect(kitToken(from), `--xoot-${from} missing from kit-tokens.css`).not.toBeNull();
    }
  });

  it("keeps every role in its kit family, by hue", () => {
    const strays: string[] = [];
    for (const { role, from } of DERIVATION) {
      for (const scheme of ["  :root {", "  .dark {"]) {
        const site = siteToken(role, scheme);
        const source = kitToken(from)!;
        if (!site) continue; // not every role is redeclared in dark; that is fine
        const gap = hueGap(site.h, source.h);
        if (gap > HUE_TOLERANCE) {
          strays.push(
            `${scheme.trim()} --${role}: hue ${site.h}° is ${gap.toFixed(1)}° from ` +
              `--xoot-${from} (${source.h.toFixed(1)}°)`,
          );
        }
      }
    }
    expect(
      strays,
      "these colours have left the kit's family. This is how terracotta survived for months " +
        "beside tokens that said violet — every other test compared the palette to itself.",
    ).toEqual([]);
  });

  it("never lightens a role past its kit weight in the light scheme", () => {
    const lightened: string[] = [];
    for (const { role, from, note } of DERIVATION) {
      const site = siteToken(role, "  :root {")!;
      const source = kitToken(from)!;
      if (site.l > source.l + LIGHTNESS_ROUNDING) {
        lightened.push(
          `--${role}: ${site.l}% is lighter than --xoot-${from} (${source.l.toFixed(1)}%)` +
            (note ? ` — it is meant to be darker: ${note}` : ""),
        );
      }
    }
    expect(
      lightened,
      "Darkening is how this palette clears AA; lightening is the regression. The kit's own 500 " +
        "weights fail for white body text, which is why four roles sit below their source.",
    ).toEqual([]);
  });

  /**
   * The four that are deliberately darker. Asserted positively as well as by the ceiling above,
   * because "not lighter" is also satisfied by "identical" — and if one of these ever quietly
   * matched its kit source, the AA failure it was darkened to avoid would be back.
   */
  it("holds the four AA darkenings genuinely darker than the kit", () => {
    for (const role of ["success", "destructive", "care-plus", "brand"]) {
      const { from } = DERIVATION.find((d) => d.role === role)!;
      const site = siteToken(role, "  :root {")!;
      const source = kitToken(from)!;
      // `brand` takes violet-600, already darker than the violet-500 the kit calls brand, so it
      // is equal to its stated source; the other three sit below theirs.
      const floor = role === "brand" ? source.l + LIGHTNESS_ROUNDING : source.l;
      expect(site.l, `--${role} must not drift up toward --xoot-${from}`).toBeLessThanOrEqual(floor);
    }
  });

  /**
   * ── ZD-034: the large-surface gradient is ink; brand emphasis is still violet ────────────────
   *
   * The table above reads semantic tokens. `--gradient-warm` is not one, and it is precisely the
   * token that drifted terracotta for months while everything around it said violet — so it gets
   * its own assertion rather than none.
   *
   * The founder chose ink for it on 2026-08-15 from three rendered variants. That is a departure
   * from `design/README.md` and it is *narrow*: only the 29 large painted surfaces move. Violet
   * keeps emphasis, selection and progress via `--brand`. Both halves are asserted, because the
   * failure mode is drifting back toward one colour for everything — in either direction.
   */
  it("holds the ink/violet split: large surfaces ink, brand emphasis violet", () => {
    const decl = /--gradient-warm:([^;]*);/.exec(css);
    expect(decl, "--gradient-warm not declared in index.css").not.toBeNull();
    const stops = [...decl![1].matchAll(/hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)/g)];
    expect(stops.length, "--gradient-warm should declare two hsl() stops").toBe(2);

    for (const [, h, s, l] of stops) {
      expect(
        +s,
        `--gradient-warm stop hsl(${h} ${s}% ${l}%) carries chroma. ZD-034 makes this surface ` +
          "ink; a saturated stop means it has drifted back to a hue.",
      ).toBeLessThanOrEqual(15);
      expect(
        +l,
        `--gradient-warm stop hsl(${h} ${s}% ${l}%) is too light for the white text all 29 of ` +
          "these surfaces carry.",
      ).toBeLessThanOrEqual(25);
    }

    // The other half. If brand ever follows the gradient to ink, violet leaves the product
    // entirely — which is the state ZD-032 was opened to fix.
    const brand = siteToken("brand", "  :root {")!;
    expect(brand.s, "--brand must stay chromatic violet; ZD-034 moved the gradient, not the brand")
      .toBeGreaterThan(40);
  });
});
