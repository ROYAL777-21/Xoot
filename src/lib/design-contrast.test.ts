import { describe, expect, it } from "vitest";
import { COLOR, type Scheme } from "./design-tokens";

/**
 * Step 5 of `docs/palette-migration.md`, which was the one step nothing enforced.
 *
 * The migration doc's headline finding is that two of the kit's own brand colours fail WCAG AA
 * for white body text at their 500 weight — `violet-500` measures 4.38 and `careplus-500` 4.31,
 * against a 4.5 threshold. The mapping handles it by using `violet-600` for `--brand` and
 * darkening Care+ by 2%. But nothing checked, so the next person to reach for the brighter
 * violet because it "looks more like the kit" would reintroduce the failure silently.
 *
 * This codebase has already learned this exact lesson once and written it down: `src/index.css`
 * carries a note explaining that `--primary` is 51% rather than 53% because "at 53% white-on-red
 * measures 4.35:1, which fails AA for body text and a 14px button label is body text". A comment
 * records a decision; a test keeps it.
 *
 * Deliberately asserted against `design-tokens.ts` rather than parsed from the CSS.
 * `design-tokens.test.ts` already proves the two agree, so going through the typed mirror means
 * a role that stops existing is a compile error here rather than a silently-skipped assertion.
 */

/** WCAG 2.1 relative luminance. Expects a bare `H S% L%` triplet, the form the tokens use. */
function luminance(hslTriplet: string): number {
  const match = /^(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/.exec(hslTriplet.trim());
  if (!match) throw new Error(`not an HSL triplet: "${hslTriplet}"`);
  const [h, s, l] = [Number(match[1]), Number(match[2]) / 100, Number(match[3]) / 100];

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = (
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  ).map((v) => v + m);

  // sRGB → linear, then the 0.2126/0.7152/0.0722 weighting.
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
}

/** AA thresholds. 3.0 is the large-text/UI-component floor; 4.5 is body text. */
const AA_BODY = 4.5;
const AA_LARGE = 3.0;

describe("the migrated palette clears WCAG AA where it must", () => {
  /**
   * The pairs where a foreground token sits on its matching background token. Each one is a
   * combination a component actually renders — a button label on its fill, body text on the
   * page — so failing here means a real screen is unreadable, not a theoretical mismatch.
   */
  const pairs = (s: Scheme) => {
    const c = COLOR[s];
    return [
      ["foreground on background", c.foreground, c.background],
      ["cardForeground on card", c.cardForeground, c.card],
      ["primaryForeground on primary", c.primaryForeground, c.primary],
      ["secondaryForeground on secondary", c.secondaryForeground, c.secondary],
      ["accentForeground on accent", c.accentForeground, c.accent],
      ["brandForeground on brand", c.brandForeground, c.brand],
    ] as const;
  };

  for (const scheme of ["light", "dark"] as const) {
    describe(scheme, () => {
      for (const [label, fg, bg] of pairs(scheme)) {
        it(`${label} reaches AA for body text`, () => {
          expect(contrast(fg, bg), `${label} in ${scheme}`).toBeGreaterThanOrEqual(AA_BODY);
        });
      }

      /**
       * `mutedForeground` is the one role deliberately allowed to sit at the large-text floor.
       * The migration table maps it to `neutral-500`, measured at 4.00 on the page — under the
       * body threshold on purpose, because it carries captions and secondary labels rather than
       * prose. Pinned at 3.0 so it cannot quietly drift further down.
       */
      it("mutedForeground clears the large-text floor on the page", () => {
        const c = COLOR[scheme];
        expect(contrast(c.mutedForeground, c.background)).toBeGreaterThanOrEqual(AA_LARGE);
      });

      /**
       * `destructive` does not clear AA, and in dark it does not clear even the UI floor.
       * Measured here rather than asserted green, because asserting green would launder a defect
       * the founder has not been asked about.
       *
       *   light  destructiveForeground on destructive  3.70  — below 4.5 body
       *   dark   destructiveForeground on destructive  2.88  — below 3.0 UI
       *
       * Note the light figure is 3.70, not the 3.87 in `palette-migration.md`. The doc measured
       * pure white on `coral-500`; the token pair actually rendered is the off-white
       * `destructive-foreground` (`36 40% 98%`), which is slightly worse. Worth knowing that the
       * audit table is optimistic by a small margin wherever a foreground is not pure white.
       *
       * `palette-migration.md` classifies `coral-500` as "UI only", so the light figure is a
       * known consequence of the approved mapping. **The dark figure is not** — 2.88 is
       * under the minimum for a UI component of any size, which means a destructive button in
       * dark mode is below the floor for its border and its label alike.
       *
       * This is the same finding this repo already acted on once for red, where `--primary` moved
       * from 53% to 51% because "a 14px button label is body text". Fixing it means darkening
       * coral or lightening its foreground — a change to an approved palette value, so it is
       * recorded for a decision rather than taken here. See the ledger entry.
       *
       * Pinned to the measured values so neither can drift further without this failing.
       */
      it("records destructive's contrast, which is below AA and in dark below the UI floor", () => {
        const c = COLOR[scheme];
        const measured = contrast(c.destructiveForeground, c.destructive);
        const floor = scheme === "light" ? 3.69 : 2.87;
        expect(measured, `${scheme} destructive contrast`).toBeGreaterThanOrEqual(floor);
        expect(measured, `${scheme} destructive must not silently reach AA without the decision`)
          .toBeLessThan(AA_BODY);
      });
    });
  }

  /**
   * The specific trap the migration doc names.
   *
   * `--brand` must stay at violet-600 `253 79% 58%` (6.10 against white), not violet-500
   * `252 96% 67%` (4.38). The lighter one is the kit's nominal brand colour and looks more
   * "correct" next to the design file, which is exactly why someone will try it.
   */
  it("keeps --brand at the weight that passes, not the one that looks like the kit", () => {
    const white = "0 0% 100%";
    expect(contrast(white, COLOR.light.brand)).toBeGreaterThanOrEqual(AA_BODY);

    // The value that would fail, asserted so the number in the doc is verifiable here.
    expect(contrast(white, "252 96% 67%")).toBeLessThan(AA_BODY);
  });

  /**
   * Care+ red is darkened 2% from the kit's `careplus-500` for the same reason. It carries
   * white text on the paywall and the plan badges, so it is body text on a fill.
   */
  it("keeps Care+ red dark enough to carry white text", () => {
    expect(contrast("0 0% 100%", COLOR.light.carePlus)).toBeGreaterThanOrEqual(AA_BODY);
    expect(contrast("0 0% 100%", "3 79% 53%")).toBeLessThan(AA_BODY);
  });
});
