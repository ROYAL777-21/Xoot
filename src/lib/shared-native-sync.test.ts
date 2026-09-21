import { readFileSync, readdirSync, statSync } from "node:fs";
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
    const source = readFileSync(join(root, "src/lib", module), "utf8").replace(/\r\n/g, "\n");
    const copy = readFileSync(join(root, "mobile/src/generated", module), "utf8").replace(/\r\n/g, "\n");

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

  it("keeps native off the original paths entirely", () => {
    // An import of the source path would typecheck and then fail to bundle, which is
    // the worst order to find out. Checked across all of mobile/src rather than one
    // component, because the next module to be shared will be imported somewhere else.
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry);
        return statSync(full).isDirectory() ? walk(full) : /\.tsx?$/.test(full) ? [full] : [];
      });

    for (const file of walk(join(root, "mobile/src"))) {
      const src = readFileSync(file, "utf8");
      expect({ file, bad: /@shared\//.test(src) }).toEqual({ file, bad: false });
      expect({ file, bad: /from ["'].*\.\.\/src\/lib\//.test(src) }).toEqual({ file, bad: false });
    }
  });

  it("has each shared module reached through the generated copy", () => {
    // Not "every module is imported by one component" — that was true only while the
    // splash was the sole consumer, and broke the moment tokens joined the list.
    const consumers = readdirSync(join(root, "mobile/src/generated"));
    for (const module of MODULES) {
      expect({ module, present: consumers.includes(module) }).toEqual({ module, present: true });
    }
  });
});
