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
    // wrong colour, every cold start.
    const pinnedDark = /userInterfaceStyle:\s*'dark'/.test(config);
    if (!pinnedDark) return;

    const splash = config.slice(config.indexOf("'expo-splash-screen'"));
    const backgrounds = [...splash.slice(0, 900).matchAll(/backgroundColor:\s*'(#[0-9a-fA-F]{6})'/g)].map(
      (m) => m[1].toLowerCase(),
    );
    expect(backgrounds.length).toBeGreaterThan(0);
    // `--background` in the `.dark` scope of src/index.css.
    for (const value of backgrounds) expect(value).toBe("#15100f");
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
