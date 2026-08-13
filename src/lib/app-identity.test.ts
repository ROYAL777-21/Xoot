import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveNativeRoute } from "./native-routing";

/**
 * The app's identity — its URL scheme and its bundle identifier — restated in eight files.
 *
 * Nothing joined them, and the evidence that this matters was already in the tree:
 * `native-routing.ts` accepted `za.co.zoot.app:`, a protocol **no configuration has ever
 * produced**. The identifier was `za.co.zoothome.app` before the 2026-08-13 rename and
 * `za.co.xoot.app` after; `za.co.zoot.app` is neither. A hand-maintained list of protocols had
 * quietly fallen out of step with the config that produces them, and nobody noticed because
 * nothing checked.
 *
 * Both strings are unusually expensive to get wrong:
 *
 * - The **identifier** can never change after publication — Android forbids changing an
 *   `applicationId` outright, and an iOS bundle identifier is fixed at submission. It is also
 *   baked into `apple-app-site-association` and `assetlinks.json`, served from the website, so a
 *   mismatch between site and app silently stops universal links resolving.
 * - The **scheme** is the OAuth callback. `makeRedirectUri` builds the redirect URI from it, so a
 *   scheme that disagrees with Supabase's allowlist is a sign-in that dead-ends.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const BUNDLE_ID = "za.co.xoot.app";
const SCHEME = "xoot";
/** Kept registered so pre-rename links and un-updated OAuth clients still resolve (#34). */
const LEGACY_SCHEME = "zoot";

describe("app identity", () => {
  it("uses the same bundle identifier everywhere it is restated", () => {
    const appConfig = read("mobile/app.config.ts");
    const association = read("scripts/build/write-native-association-files.mjs");
    const envExample = read(".env.example");

    expect(appConfig).toContain(`'${BUNDLE_ID}'`);
    expect(appConfig).toContain(`'${BUNDLE_ID}.preview'`);

    // These two defaults generate the files the website serves. If they drift from `app.config.ts`
    // the app claims one identity and the site vouches for another, and universal links break with
    // no error anywhere.
    expect(association).toContain(`"XOOT_IOS_BUNDLE_ID", "${BUNDLE_ID}"`);
    expect(association).toContain(`"XOOT_ANDROID_PACKAGE_NAME", "${BUNDLE_ID}"`);
    expect(envExample).toContain(`XOOT_IOS_BUNDLE_ID=${BUNDLE_ID}`);
    expect(envExample).toContain(`XOOT_ANDROID_PACKAGE_NAME=${BUNDLE_ID}`);
    expect(envExample).toContain(`APPLE_BUNDLE_ID=${BUNDLE_ID}`);
  });

  it("keeps the Android package directory and declaration in step with the identifier", () => {
    // The Java package must match the applicationId's namespace, and the directory must match the
    // package — two things that a rename can leave disagreeing with no compile error until a
    // native build runs, which does not happen in this suite.
    const widget = "native/android/src/main/java/za/co/xoot/widgets/XootStatusWidgetProvider.java";
    expect(existsSync(join(process.cwd(), widget)), `${widget} is missing`).toBe(true);
    expect(read(widget)).toContain("package za.co.xoot.widgets;");
    expect(existsSync(join(process.cwd(), "native/android/src/main/java/za/co/zoothome"))).toBe(false);
  });

  it("registers the current scheme as primary and keeps the old one working", () => {
    const appConfig = read("mobile/app.config.ts");
    const authLinks = read("mobile/src/lib/auth-links.ts");

    // Expo takes the first entry as the default for `makeRedirectUri`, so order is the decision.
    expect(appConfig).toContain(`scheme: ['${SCHEME}', '${LEGACY_SCHEME}']`);
    expect(authLinks).toContain(`scheme: '${SCHEME}'`);

    // Behavioural, not textual: both identities must actually route.
    expect(resolveNativeRoute(`${SCHEME}://bookings?id=booking-1`)).toBe("/app/bookings/booking-1");
    expect(resolveNativeRoute(`${LEGACY_SCHEME}://bookings?id=booking-1`)).toBe("/app/bookings/booking-1");
    expect(resolveNativeRoute(`${BUNDLE_ID}://callback?code=abc&type=oauth`)).toBe(
      "/auth/callback?code=abc&type=oauth",
    );
  });

  it("emits the current scheme from everything Xoot itself generates", () => {
    // Shortcuts and widgets are regenerated on install, so there is nothing old to preserve in
    // them — unlike a link someone already shared.
    const shortcuts = read("native/android/res/xml/shortcuts.xml");
    const widget = read("native/android/src/main/java/za/co/xoot/widgets/XootStatusWidgetProvider.java");

    expect(shortcuts).toContain(`${SCHEME}://`);
    expect(shortcuts).not.toContain(`${LEGACY_SCHEME}://`);
    expect(widget).toContain(`${SCHEME}://`);
    expect(widget).not.toContain(`${LEGACY_SCHEME}://`);
  });

  it("has no pre-rename identifier left outside prose", () => {
    // `zoothome.co.za` the DOMAIN is a different thing and is deliberately still referenced in
    // history comments and in the allowed-origins tooling. Only the identifier is asserted here.
    for (const path of ["mobile/app.config.ts", "scripts/build/write-native-association-files.mjs", ".env.example"]) {
      expect(read(path), `${path} still names the pre-rename identifier`).not.toContain("za.co.zoothome.app");
    }
  });
});
