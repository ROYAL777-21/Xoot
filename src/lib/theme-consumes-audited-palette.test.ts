import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ── Why this file exists ───────────────────────────────────────────────────────────────────────
 *
 * `src/index.css` holds two colour systems, and only one of them is safe to render.
 *
 *   1. `--xoot-*` in `src/styles/kit-tokens.css` — 339 tokens generated from
 *      `design/Xoot_App.html`. The kit's raw palette, exactly as the designer drew it.
 *   2. `--background`, `--brand`, `--care-plus`, … in the `:root` block — the same palette
 *      **after a contrast audit**, with four colours deliberately darkened so that white or ink
 *      on top of them clears WCAG AA.
 *
 * The second is not a copy of the first. It diverges on purpose, and every divergence is a
 * measurement recorded in `index.css`:
 *
 *   | role          | kit's raw value        | ratio  | audited value | ratio |
 *   |---------------|------------------------|--------|---------------|-------|
 *   | `brand`       | violet-500 `#7C5CFC`   | 4.38 ✗ | violet-600    | 6.10 ✓|
 *   | `care-plus`   | 53% lightness          | 4.31 ✗ | 51%           | 4.50 ✓|
 *   | `destructive` | 56% lightness          | 3.70 ✗ | 48%           | 4.55 ✓|
 *   | `success`     | 43% lightness          | 3.20 ✗ | 35%           | 4.62 ✓|
 *
 * A 14px button label is body text, so 4.5 is the threshold, and all four raw values fail it.
 *
 * ── The gap this closes ────────────────────────────────────────────────────────────────────────
 *
 * Nothing renders `:root` directly. Tailwind renders `@theme inline`, which is what turns
 * `--brand` into the `bg-brand` class every component actually uses. `design-tokens.test.ts` and
 * `design-contrast.test.ts` both parse the `:root` and `.dark` blocks — neither one looks at
 * `@theme inline` at all.
 *
 * So rewriting one line:
 *
 *     --color-brand: hsl(var(--brand));      →      --color-brand: var(--xoot-violet-500);
 *
 * moves the whole app onto the unaudited palette, drops `bg-brand` from 6.10:1 to 4.38:1, and
 * **every existing test still passes**, because the `:root` triple it checks is still sitting
 * there, still correct, and no longer consumed by anything.
 *
 * That edit is not hypothetical or perverse — it is the obvious way to read "adopt the design
 * system", and it looks like progress in a diff. This file is the thing that says no.
 *
 * Planted and confirmed 2026-08-13: pointing `--color-brand` at `var(--xoot-violet-500)` fails
 * the first test below; pointing `--color-care-plus` at `var(--xoot-red-500)` fails the second.
 * Restored after each.
 */

const rawCss = readFileSync(join(process.cwd(), "src/index.css"), "utf8");

/**
 * Comments are stripped before anything is parsed, and that is load-bearing twice over.
 *
 * This test failed on its own first full-suite run: the explanation added to the top of
 * `index.css` contains the words "@theme inline", `indexOf` matched the prose rather than the
 * at-rule, and the parser walked off into `@utility container` and found no colours at all. It
 * reported "0 colours" as a failure rather than as a pass, which is the only reason it was
 * noticed — but a guard that can be blinded by someone describing it is not a guard.
 *
 * It also closes a quieter hole: a `--color-brand:` line commented out rather than deleted would
 * otherwise still satisfy the mapping assertion while rendering nothing.
 */
const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * `@theme inline` contains nested `@keyframes` blocks, so the closing brace cannot be found by
 * searching for the next `}`. Count depth instead.
 */
function themeBlock(): string {
  const match = /@theme\s+inline\s*\{/.exec(css);
  if (!match) throw new Error("@theme inline block not found in src/index.css");
  const start = match.index;

  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    else if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error("@theme inline block is unterminated in src/index.css");
}

/** Only the colour entries — `--font-*`, `--radius-*` and `--animate-*` are not palette. */
function themeColours(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of themeBlock().matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

/**
 * The four roles whose audited value is measurably different from the kit's raw one. These are
 * the ones where a rewire is not a stylistic change but an accessibility regression.
 */
const AUDITED_ROLES = ["brand", "care-plus", "destructive", "success", "primary"] as const;

describe("@theme inline consumes the audited palette, not the raw kit", () => {
  it("exposes every colour through the audited :root token", () => {
    const colours = themeColours();
    expect(Object.keys(colours).length).toBeGreaterThan(0);

    const raw = Object.entries(colours).filter(([, value]) => value.includes("--xoot-"));
    expect(
      raw,
      "these @theme colours bypass the contrast-audited :root palette and render the kit's raw " +
        "values, which fail WCAG AA — see the table at the top of this file",
    ).toEqual([]);
  });

  it("maps each contrast-audited role to its own :root token", () => {
    const colours = themeColours();

    for (const role of AUDITED_ROLES) {
      expect(colours[role], `--color-${role} is missing from @theme inline`).toBeDefined();
      expect(
        colours[role],
        `--color-${role} must read hsl(var(--${role})) so it inherits the audited value`,
      ).toBe(`hsl(var(--${role}))`);
    }
  });

  /**
   * The kit tokens are still imported and still used — `--xoot-dur-*`, `--xoot-ease-*` and the
   * `--slot-*` aliases all reference them, and the kit primitives in `src/components/kit/**` are
   * built on them directly. This guard is about the Tailwind colour layer only, so it must not be
   * read as "delete the kit tokens".
   */
  it("leaves the kit token import in place", () => {
    expect(rawCss).toContain("@import './styles/kit-tokens.css';");
  });
});
