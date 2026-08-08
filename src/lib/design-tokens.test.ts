import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COLOR, DURATION, EASING, MIN_TAP_TARGET, RADIUS, SPACE, TYPE, alpha, color, durationFor, hsl } from "./design-tokens";

/**
 * `design-tokens.ts` is a mirror of `src/index.css`, kept because React Native cannot
 * read a stylesheet. A mirror is only safe while something proves it still reflects.
 *
 * These parse the CSS and compare. Change a colour in `index.css` without mirroring it
 * and this fails — which is the whole point, because the alternative is the web and the
 * native app slowly becoming different products with nobody noticing until a screenshot
 * puts them side by side.
 */

const css = readFileSync(join(process.cwd(), "src/index.css"), "utf8");

/** Pull the `--name: value;` declarations out of one selector block. */
function tokensIn(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`selector ${selector} not found in index.css`);
  const open = css.indexOf("{", start);
  const body = css.slice(open, css.indexOf("\n  }", open));

  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

/** `mutedForeground` here is `--muted-foreground` there. */
const cssName = (role: string) => role.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const SCHEMES = [
  ["light", "  :root {"],
  ["dark", "  .dark {"],
] as const;

/**
 * Colours in `index.css` that are deliberately absent from the native mirror, each with the
 * reason. Same idea as `UNTYPED_BY_DESIGN` in `supabase-schema-contract.test.ts`: a gap written
 * down and justified is a decision, a gap nobody listed is a bug waiting to be found by a user.
 *
 * Anything not on this list and not mirrored fails the check below. Remove an entry when the
 * token is mirrored — do not add one to silence a failure without a reason worth reading.
 */
const UNMIRRORED_BY_DESIGN: Record<string, string> = {
  popover:
    "Semantic and should be mirrored. Native has no popover primitive yet, so mirroring it now " +
    "would add a colour nothing consumes. Mirror it with the first native popover.",
  "popover-foreground": "Pairs with popover, above.",
  info:
    "Semantic and should be mirrored — the migration table maps it to mist-500. Left out when " +
    "the palette landed, alongside --brand. Mirror when a native surface needs it.",
  "info-foreground": "Pairs with info, above.",
  "primary-glow":
    "Web-only. Feeds the radial gradients in the hero and card treatments; React Native has no " +
    "equivalent and the native app does not render them.",
  "accent-soft": "Web-only tint used for hover and wash backgrounds behind accent surfaces.",
  terracotta: "Legacy from the red palette, still consumed by blog and marketing surfaces.",
  "terracotta-light": "Pairs with terracotta, above.",
  sage: "Legacy alias; the mirrored role is `success`, which carries the same value.",
  "sage-deep": "Legacy alias used by marketing copy accents.",
  cream: "Legacy from the red palette's warm page treatment.",
  ink: "Legacy alias; the mirrored role is `foreground`, which carries the same value.",
};

describe("design tokens", () => {
  it.each(SCHEMES)("%s colours match index.css exactly", (scheme, selector) => {
    const declared = tokensIn(selector);

    for (const [role, triplet] of Object.entries(COLOR[scheme])) {
      const name = cssName(role);
      expect(
        { role, value: declared[name] },
        `--${name} is missing from ${selector} or differs from design-tokens.ts`,
      ).toEqual({ role, value: triplet });
    }
  });

  it("stores colours as bare HSL triplets, not resolved values", () => {
    // The triplet form is what makes the comparison above a literal one. Store hex here
    // and the mirror becomes a conversion nobody can check by eye.
    for (const scheme of ["light", "dark"] as const) {
      for (const [role, value] of Object.entries(COLOR[scheme])) {
        expect({ role, ok: /^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/.test(value) }).toEqual({
          role,
          ok: true,
        });
      }
    }
  });

  /**
   * Motion has to be mirrored as literally as colour, and for a sharper reason: the durations
   * are the difference between the kit's feel and a hand translation of it, and nothing about a
   * screenshot reveals that they drifted. `index.css` writes `280ms`; this file writes `280`.
   */
  it("mirrors every duration from index.css, in milliseconds", () => {
    const root = tokensIn("  :root {");
    for (const [key, ms] of Object.entries(DURATION)) {
      const declared = root[`xoot-dur-${key}`];
      expect({ key, declared }, `--xoot-dur-${key} missing from :root`).toEqual({
        key,
        declared: `${ms}ms`,
      });
    }
  });

  it("mirrors every easing curve from index.css, as control points", () => {
    const root = tokensIn("  :root {");
    const cssName = { out: "out", inOut: "in-out", settle: "settle", spring: "spring" } as const;
    for (const [key, points] of Object.entries(EASING)) {
      const declared = root[`xoot-ease-${cssName[key as keyof typeof cssName]}`];
      const parsed = declared?.match(/cubic-bezier\(([^)]*)\)/)?.[1]
        .split(",")
        .map((n) => Number(n.trim()));
      expect({ key, parsed }).toEqual({ key, parsed: [...points] });
    }
  });

  /**
   * The reduced-motion block is easy to drop in a port and impossible to notice missing unless
   * you have the OS setting on. Asserted as a block rather than a flag so removing it fails.
   */
  it("zeroes every duration under prefers-reduced-motion", () => {
    const reduced = tokensIn("  @media (prefers-reduced-motion: reduce) {\n    :root {");
    for (const key of Object.keys(DURATION)) {
      expect({ key, value: reduced[`xoot-dur-${key}`] }).toEqual({ key, value: "0ms" });
    }
    // The rule, not just the values: durationFor is what native consumes.
    expect(durationFor("base", true)).toBe(0);
    expect(durationFor("base", false)).toBe(DURATION.base);
  });

  it("covers both schemes with the same roles", () => {
    // A role present in one scheme and not the other is a component that renders in
    // light and throws in dark, found by a user rather than by this.
    expect(Object.keys(COLOR.light).sort()).toEqual(Object.keys(COLOR.dark).sort());
  });

  /**
   * The direction the test above cannot see.
   *
   * "Every role here matches the CSS" says nothing about a colour that exists in the CSS and
   * never made it into this file — and that is not hypothetical. `--brand` and
   * `--brand-foreground` were added to `index.css` by the palette migration and left out of the
   * mirror entirely, so the web had the new brand violet and the native app had no brand colour
   * at all. Nothing failed, because nothing was looking this way.
   *
   * `--zoey-*` and the gradient/shadow tokens are deliberately excluded: they are web-only
   * decoration with no React Native equivalent, and mirroring them would mean inventing values
   * the native app cannot use.
   */
  it.each(SCHEMES)("%s mirrors every colour token index.css declares", (scheme, selector) => {
    const webOnly = /^(zoey|gradient|shadow|sidebar|chart|radius)/;
    const mirrored = new Set(Object.keys(COLOR[scheme]).map(cssName));
    const declared = tokensIn(selector);

    const missing = Object.keys(declared)
      .filter((name) => !webOnly.test(name) && !mirrored.has(name))
      // Bare `--foo` colour roles only; anything with a unit or a var() is not a colour.
      .filter((name) => /^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/.test(declared[name]))
      .filter((name) => !(name in UNMIRRORED_BY_DESIGN));

    expect(missing, `these colours exist in ${selector} but not in design-tokens.ts`).toEqual([]);
  });

  it("renders colours React Native can actually parse", () => {
    // A literal triplet, so this half of the assertion survives a palette change.
    expect(hsl("3 78% 51%")).toBe("hsl(3, 78%, 51%)");
    // The primary action is ink, per the kit: "Xoot's commit button is INK, the Tiimo way;
    // violet carries selection, progress and brand emphasis." Brand violet is `--brand`.
    expect(color("light", "primary")).toBe("hsl(0, 0%, 8%)");
    expect(alpha("dark", "primary", 0.2)).toBe("hsla(20, 13%, 95%, 0.2)");
  });

  it("keeps the Care+ red distinct from the destructive red", () => {
    // This used to compare `primary` against `destructive`, because red was the brand.
    // Under the kit (ZD-024) the primary action is ink and red belongs to Care+ alone, so
    // comparing `primary` here would pass on a difference between ink and red and prove
    // nothing. The real collision risk is Care+ against destructive: if a membership badge
    // and a delete button read as the same red, a destructive action stops looking dangerous.
    for (const scheme of ["light", "dark"] as const) {
      const [carePlusH, , carePlusL] = COLOR[scheme].carePlus.split(" ");
      const [destructiveH, , destructiveL] = COLOR[scheme].destructive.split(" ");
      const hueGap = Math.abs(parseFloat(carePlusH) - parseFloat(destructiveH));
      const lightnessGap = Math.abs(parseFloat(carePlusL) - parseFloat(destructiveL));
      expect({ scheme, distinct: hueGap >= 4 || lightnessGap >= 10 }).toEqual({
        scheme,
        distinct: true,
      });
    }
  });

  it("keeps the primary action away from every brand hue", () => {
    // The kit is explicit: "Xoot's commit button is INK, the Tiimo way; violet carries
    // selection, progress and brand emphasis." A saturated primary means someone has
    // quietly reverted that.
    for (const scheme of ["light", "dark"] as const) {
      const [, saturation] = COLOR[scheme].primary.split(" ");
      expect({ scheme, neutral: parseFloat(saturation) <= 15 }).toEqual({
        scheme,
        neutral: true,
      });
    }
  });

  it("keeps the scales ordered and on a 4-point grid", () => {
    const spaces = Object.values(SPACE);
    expect([...spaces].sort((a, b) => a - b)).toEqual(spaces);
    for (const v of spaces) expect(v % 4).toBe(0);

    const radii = Object.values(RADIUS);
    expect([...radii].sort((a, b) => a - b)).toEqual(radii);
  });

  it("keeps type sizes rising and line heights above them", () => {
    const roles = ["caption", "body", "title", "display"] as const;
    for (let i = 1; i < roles.length; i++) {
      expect(TYPE[roles[i]].size).toBeGreaterThan(TYPE[roles[i - 1]].size);
    }
    // A line height below the font size clips descenders — it looks fine in Latin
    // sample text and breaks on the first "g".
    for (const t of Object.values(TYPE)) expect(t.lineHeight).toBeGreaterThan(t.size);
  });

  it("does not let a control be built below the tap-target floor", () => {
    expect(MIN_TAP_TARGET).toBeGreaterThanOrEqual(44);
  });

  it("imports nothing, so it can be shared with native", () => {
    // mobile/ does not resolve the web app's node_modules. An import here breaks the
    // native bundle rather than this test, which is why the check lives here.
    const src = readFileSync(join(process.cwd(), "src/lib/design-tokens.ts"), "utf8");
    expect(src).not.toMatch(/^\s*import\s/m);
    expect(src).not.toMatch(/\brequire\(/);
  });
});
