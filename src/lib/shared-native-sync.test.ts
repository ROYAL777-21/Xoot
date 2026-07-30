import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MODULES, banner } from "../../scripts/build/sync-shared-native.mjs";

/**
 * `mobile/src/generated/` holds copies of the modules the native app shares with the
 * web app, because Metro cannot resolve a file outside its project root (see the
 * script's header for what was tried).
 *
 * A duplicated file is only safe while something proves it is still a duplicate. This
 * is that something: it fails if the copy is edited by hand, and it fails if the source
 * changes and `npm run shared:sync` was not re-run. Without it, the native splash would
 * quietly become a different animation the first time the choreography was retimed —
 * exactly the failure the single-definition rule in ZD-022 exists to prevent.
 */

const root = process.cwd();

describe("shared native modules", () => {
  it.each(MODULES)("mobile/src/generated/%s is an exact copy of the source", (module) => {
    const source = readFileSync(join(root, "src/lib", module), "utf8");
    const copy = readFileSync(join(root, "mobile/src/generated", module), "utf8");

    expect(copy.startsWith(banner(module))).toBe(true);
    expect(copy.slice(banner(module).length)).toBe(source);
  });

  it("shares only modules that import nothing", () => {
    // mobile/ installs its own React Native copies and does not resolve the web app's
    // node_modules, so a shared module with any import fails at bundle time. Type-only
    // imports would survive, but allowing them invites a value import next to one.
    for (const module of MODULES) {
      const source = readFileSync(join(root, "src/lib", module), "utf8");
      expect(source).not.toMatch(/^\s*import\s/m);
      expect(source).not.toMatch(/\brequire\(/);
    }
  });

  it("keeps the native component off the originals", () => {
    // An import of the source path would typecheck and then fail to bundle, which is
    // the worst order to find out.
    const native = readFileSync(join(root, "mobile/src/components/splash-animation.tsx"), "utf8");
    expect(native).not.toMatch(/@shared\//);
    expect(native).not.toMatch(/\.\.\/\.\.\/\.\.\/src\//);
    for (const module of MODULES) {
      expect(native).toMatch(new RegExp(`@/generated/${module.replace(".ts", "")}`));
    }
  });
});
