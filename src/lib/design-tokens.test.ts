import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COLOR, MIN_TAP_TARGET, RADIUS, SPACE, TYPE, alpha, color, hsl } from "./design-tokens";

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

  it("covers both schemes with the same roles", () => {
    // A role present in one scheme and not the other is a component that renders in
    // light and throws in dark, found by a user rather than by this.
    expect(Object.keys(COLOR.light).sort()).toEqual(Object.keys(COLOR.dark).sort());
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
