import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Invariants of the iOS build that only `expo prebuild` or App Store review would
 * otherwise catch — one of them late enough to cost a release cycle.
 *
 * Both of these were live on the branch: a splash configuration Expo warns is broken,
 * and an entitlement claimed with no module able to honour it.
 */

const root = process.cwd();
const config = readFileSync(join(root, "mobile/app.config.ts"), "utf8");
const pkg = JSON.parse(readFileSync(join(root, "mobile/package.json"), "utf8"));

/** HSL triplet to `#rrggbb`, so the expected launch colour is derived from index.css. */
function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lum = l / 100;
  const c = (1 - Math.abs(2 * lum - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lum - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}

/** Largest per-channel difference between two hex colours. */
function channelDistance(a: string, b: string): number {
  const parse = (hex: string) =>
    [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const [x, y] = [parse(a), parse(b)];
  return Math.max(...x.map((v, i) => Math.abs(v - y[i])));
}

describe("iOS build setup", () => {
  it("does not combine userInterfaceStyle with a dark splash variant", () => {
    // `expo prebuild` says it outright: "The existing userInterfaceStyle property is
    // preventing splash screen from working properly." Setting both does not give you
    // a light and a dark launch screen — it gives you a broken one.
    const pinned = /userInterfaceStyle:\s*'(light|dark)'/.test(config);
    const hasDarkVariant = /dark:\s*\{\s*backgroundColor/.test(config);
    expect({ pinned, hasDarkVariant }).not.toEqual({ pinned: true, hasDarkVariant: true });
  });

  it("matches the launch screen to the scheme the app is pinned to", () => {
    // A launch screen that does not match the app's first frame shows as a flash of the
    // wrong colour on every cold start.
    //
    // This used to `return` unless the app was pinned dark, which made it silently vacuous
    // the moment the app moved to light (ZD-024) — it passed without checking anything.
    // Reading the expected colour out of `src/index.css` instead means the invariant holds
    // whichever scheme is pinned, and it cannot go stale when the palette changes again.
    const pinned = config.match(/userInterfaceStyle:\s*'(light|dark)'/)?.[1];
    expect(pinned, "app.config.ts must pin a scheme while the splash is one colour").toBeTruthy();

    const css = readFileSync(join(root, "src/index.css"), "utf8");
    const scope = pinned === "dark" ? "  .dark {" : "@layer base {";
    const triplet = css.slice(css.indexOf(scope)).match(/--background:\s*([^;]+);/)?.[1]?.trim();
    expect(triplet, `--background not found in ${scope}`).toBeTruthy();

    const [h, s, l] = triplet!.split(/\s+/).map(Number.parseFloat);
    const expected = hslToHex(h, s, l);

    const splash = config.slice(config.indexOf("'expo-splash-screen'"));
    const backgrounds = [
      ...splash.slice(0, 1400).matchAll(/backgroundColor:\s*'(#[0-9a-fA-F]{6})'/g),
    ].map((m) => m[1].toLowerCase());

    expect(backgrounds.length).toBeGreaterThan(0);
    // Within one step per channel: the CSS triplet is integer HSL, so the round trip is not
    // bit-exact and demanding equality would fail on a colour that is visually identical.
    for (const value of backgrounds) {
      expect({ value, close: channelDistance(value, expected) <= 1 }).toEqual({ value, close: true });
    }
  });

  it("only claims the Apple Sign-In entitlement when it can honour it", () => {
    // Apple's Guideline 4.8 requires an app offering third-party sign-in — Xoot offers
    // Google — to offer Sign in with Apple, and on iOS it must be the native sheet.
    // Claiming `usesAppleSignIn` with no module installed ships an entitlement the app
    // cannot use, behind a button that cannot work.
    if (!/usesAppleSignIn:\s*true/.test(config)) return;
    expect(pkg.dependencies["expo-apple-authentication"]).toBeTruthy();
  });

  it("signs in with Apple natively rather than through the browser", () => {
    // Routing Apple through the same web OAuth flow as Google is a documented
    // rejection reason. The native sheet returns an identity token Supabase exchanges
    // directly, so this is also the shorter path.
    const apple = readFileSync(join(root, "mobile/src/lib/apple-auth.ts"), "utf8");
    expect(apple).toMatch(/AppleAuthentication\.signInAsync/);
    expect(apple).toMatch(/signInWithIdToken/);

    const account = readFileSync(join(root, "mobile/src/app/account.tsx"), "utf8");
    expect(account).not.toMatch(/startOAuth\(['"]apple['"]\)/);
  });

  it("keeps the generated shared modules committed for EAS", () => {
    // EAS runs `npm ci` and bundles — it never runs mobile's `prestart`, so the synced
    // copies have to be in the repository or the build fails resolving them.
    const ignore = readFileSync(join(root, "mobile/.gitignore"), "utf8");
    expect(ignore).not.toMatch(/^\s*\/?src\/generated/m);
    // And the native project itself must stay generated, not committed.
    expect(ignore).toMatch(/^\/ios$/m);
  });

  it("pins every native dependency to the version Expo bundles", () => {
    // A native module off the SDK's bundled version is the classic EAS build failure:
    // it resolves locally and breaks when the native side is compiled.
    const bundled = JSON.parse(
      readFileSync(join(root, "mobile/node_modules/expo/bundledNativeModules.json"), "utf8"),
    );
    const drifted = Object.entries(pkg.dependencies as Record<string, string>)
      .filter(([name]) => bundled[name])
      .filter(([name, version]) => version.replace(/^[~^]/, "") !== bundled[name].replace(/^[~^]/, ""))
      .map(([name, version]) => `${name}@${version} (expo bundles ${bundled[name]})`);

    expect(drifted).toEqual([]);
  });
});
