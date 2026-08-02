import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { KIT_DARK, KIT_LIGHT, kitVar } from "./kit-tokens";

/**
 * `design/Xoot_App.html` is the source of truth for how the app looks. That claim is only
 * worth anything if something checks it, so this re-extracts the kit and fails when the
 * generated files drift from it.
 *
 * It also pins the few facts about the kit's colour system that a hand summary keeps
 * getting wrong. The palette was described as "coral on cream" twice before anyone read
 * the token definitions; it is violet, with ink actions, and red reserved for Care+.
 */

const root = process.cwd();

describe("kit tokens", () => {
  it("matches what the kit actually declares", () => {
    // Throws with the regeneration command if src/lib/kit-tokens.ts or the CSS is stale.
    execFileSync("node", [join(root, "scripts/build/extract-kit-tokens.mjs"), "--check"], {
      cwd: root,
      stdio: "pipe",
    });
  });

  it("extracts both scopes, not just the default one", () => {
    // A brace-scanning bug once returned zero dark tokens and about a third of the light
    // ones, and the generated file looked perfectly plausible. Counts are the cheap guard.
    expect(Object.keys(KIT_LIGHT).length).toBeGreaterThan(200);
    expect(Object.keys(KIT_DARK).length).toBeGreaterThan(50);
  });

  it("keeps the palette out of the dark scope", () => {
    // The kit states the rule beside the selector: dark "re-declares SEMANTIC aliases only;
    // the palette in colors.css is never touched." If a raw scale entry appears here, a
    // colour now has two homes and will drift in one of them.
    const scales = Object.keys(KIT_DARK).filter((token) => /^[a-z]+-(?:\d{2,3})$/.test(token));
    expect(scales).toEqual([]);
  });

  it("uses violet as the brand and ink as the primary action", () => {
    expect(KIT_LIGHT["violet-500"]).toBe("#7C5CFC");
    expect(KIT_LIGHT["action-brand"]).toBe("var(--xoot-violet-500)");
    // Not the brand colour — the kit's commit button is ink, the Tiimo pattern.
    expect(KIT_LIGHT["action-primary"]).toBe("var(--xoot-ink-900)");
  });

  it("reserves red for Care+ and nothing else", () => {
    // "Care+ · the MEMBERSHIP red. Xoot's UI is violet; Care+ is red, always."
    expect(KIT_LIGHT["careplus-500"]).toBe("#E63329");

    const carePlusReferences = Object.entries(KIT_LIGHT)
      .filter(([, value]) => value.includes("--xoot-careplus-"))
      .map(([token]) => token);

    // Every alias pointing at the red family must itself be a Care+ alias. The moment a
    // general-purpose token borrows it, red has quietly become a second brand colour.
    for (const token of carePlusReferences) expect(token).toMatch(/^careplus-/);
  });

  it("carries the motion tokens, which are the first thing lost in a hand port", () => {
    for (const token of ["dur-instant", "dur-fast", "dur-base", "dur-slow", "dur-breathe"]) {
      expect(KIT_LIGHT[token as keyof typeof KIT_LIGHT]).toMatch(/^\d+ms$/);
    }
    for (const token of ["ease-out", "ease-in-out", "ease-settle", "ease-spring"]) {
      expect(KIT_LIGHT[token as keyof typeof KIT_LIGHT]).toMatch(/^cubic-bezier\(/);
    }
  });

  it("never specifies a tap target below the platform minimum", () => {
    // The kit asks for 48; iOS requires 44. Taking the larger is the only safe reading, so
    // this fails if a kit revision ever drops below the platform floor.
    expect(Number.parseInt(KIT_LIGHT["hit-min"], 10)).toBeGreaterThanOrEqual(44);
  });

  it("ships the fonts it names", () => {
    // Georgia is a system font and cannot be embedded, so the kit's display face is
    // Newsreader with Georgia as a fallback. Caveat is the script face the deferred cursive
    // splash needs. Both must stay present or the port silently substitutes.
    expect(KIT_LIGHT["font-display"]).toMatch(/Newsreader/);
    expect(KIT_LIGHT["font-script"]).toMatch(/Caveat/);

    const kit = readFileSync(join(root, "design/Xoot_App.html"), "utf8");
    expect(kit).toMatch(/font\/ttf/);
  });

  it("round-trips a token name back to its custom property", () => {
    // camelCase keys could not do this: violet-500 and violet-5-0-0 collide.
    expect(kitVar("violet-500")).toBe("var(--xoot-violet-500)");
    expect(kitVar("surface-page")).toBe("var(--xoot-surface-page)");
  });

  it("resolves every var() reference to a token the kit defines", () => {
    // A dangling var() is invisible in a browser — it just renders as nothing — so it has
    // to be caught here or it ships as an unstyled element.
    const defined = new Set(Object.keys(KIT_LIGHT));
    const dangling: string[] = [];

    for (const [scope, tokens] of [
      ["light", KIT_LIGHT],
      ["dark", KIT_DARK],
    ] as const) {
      for (const [token, value] of Object.entries(tokens)) {
        for (const match of value.matchAll(/var\(\s*--xoot-([a-z0-9-]+)/g)) {
          if (!defined.has(match[1])) dangling.push(`${scope}: ${token} -> --xoot-${match[1]}`);
        }
      }
    }

    expect(dangling).toEqual([]);
  });
});
