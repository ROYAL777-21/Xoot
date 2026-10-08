import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COLOR, SPACE } from "./design-tokens";

/**
 * The native app renders the same design system as the web, from the same tokens.
 *
 * It did not, twice. First the whole palette was a rebrand behind — gold accents and
 * dark-green backgrounds, in `constants/theme.ts`. Fixing that file left 39 more colours
 * hardcoded in individual components, which is where the old brand had really been
 * living. Both were invisible until someone opened the app next to the website.
 *
 * So this walks the native source and fails on a raw colour. A design system is only a
 * system while nothing is allowed to sidestep it.
 */

const NATIVE_ROOT = join(process.cwd(), "mobile/src");

/**
 * Generated copies are checked against their source by `shared-native-sync.test.ts`;
 * the mascot's own art carries literal fallbacks on purpose, so it renders outside the
 * token scope.
 */
const EXEMPT = [/\/generated\//, /splash-animation\.tsx$/];

function nativeFiles(dir = NATIVE_ROOT, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) nativeFiles(full, out);
    else if (/\.tsx?$/.test(full) && !EXEMPT.some((re) => re.test(full.replace(/\\/g, "/")))) out.push(full);
  }
  return out;
}

const files = nativeFiles();

/**
 * Comments are prose, not code. Without this the checks match the very sentences that
 * explain why a value was removed — and the fix would be to delete the explanation.
 */
const codeOf = (file: string) =>
  readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("native design system", () => {
  it("finds native source to check", () => {
    // A guard that silently checks nothing is worse than no guard.
    expect(files.length).toBeGreaterThan(10);
  });

  it.each([
    ["hex colours", /#[0-9a-fA-F]{3,8}\b/],
    ["rgb/rgba literals", /\brgba?\(\s*\d/],
  ])("has no %s outside the token layer", (_label, pattern) => {
    const offenders = files
      .filter((f) => pattern.test(codeOf(f)))
      .map((f) => f.replace(process.cwd() + "/", ""));

    expect(offenders).toEqual([]);
  });

  it("builds the native theme from the shared tokens", () => {
    // The theme may be the only place that resolves a role to a value, but it must
    // resolve it *from* the tokens rather than restating them.
    const theme = readFileSync(join(NATIVE_ROOT, "constants/theme.ts"), "utf8");
    expect(theme).toMatch(/from ['"]@\/generated\/design-tokens['"]/);
    expect(codeOf(join(NATIVE_ROOT, "constants/theme.ts"))).not.toMatch(/#[0-9a-fA-F]{6}/);
    // Every colour role the web defines should be reachable natively.
    for (const role of ["primary", "background", "foreground", "border", "destructive"]) {
      expect({ role, present: theme.includes(role) }).toEqual({ role, present: true });
    }
  });

  it("uses the shared spacing scale, not the old pseudo-numeric one", () => {
    // The previous scale read as multiples and was not: `two` was 8 and `four` was 24.
    // Anything still calling those names is measuring against a ruler that no longer
    // exists.
    const old = /Spacing\.(half|one|two|three|four|five|six)\b/;
    const offenders = files
      .filter((f) => old.test(codeOf(f)))
      .map((f) => f.replace(process.cwd() + "/", ""));
    expect(offenders).toEqual([]);
    expect(Object.keys(SPACE)).toContain("lg");
  });

  it("keeps native and web on one palette", () => {
    // Not a new copy of the values — the same object the web mirror test pins to
    // index.css. If that mirror breaks, this breaks with it.
    const generated = readFileSync(join(NATIVE_ROOT, "generated/design-tokens.ts"), "utf8");
    for (const [role, value] of Object.entries(COLOR.light)) {
      expect({ role, inGenerated: generated.includes(`"${value}"`) }).toEqual({ role, inGenerated: true });
    }
  });
});
