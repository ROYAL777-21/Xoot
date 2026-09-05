import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ── Every function the client invokes must actually be deployed from this repo ──────────────
 *
 * `supabase.functions.invoke("name")` takes a string. Nothing type-checks it against the
 * directories under `supabase/functions/`, so a rename, a typo, or a copied line from another
 * project compiles, lints, builds and ships — and then returns 404 to a real person who was
 * trying to tell us something.
 *
 * ── What it found on its first run ──────────────────────────────────────────────────────────
 *
 * One, and it was live on the public homepage:
 *
 *   · `src/components/xoot/FeedbackSection.tsx` invoked **`create-support-ticket`**, which has
 *     never existed in `supabase/functions/`. The real one is `create-support-case`, and it
 *     already accepts this component's exact body shape (`body.description ?? body.body`).
 *     Every unit test passed. The form showed "Feedback could not be sent right now" to
 *     everyone who used it, because the catch branch cannot tell a 404 from a network blip.
 *
 * That is the shape of the defect this file exists for: a feature that is fully written, fully
 * styled, fully tested and wired to nothing.
 */

const ROOT = process.cwd();
const FUNCTIONS_DIR = join(ROOT, "supabase", "functions");

/** Directory names under supabase/functions/, minus the shared module which is not a function. */
const deployable = new Set(
  readdirSync(FUNCTIONS_DIR).filter(
    (name) => name !== "_shared" && statSync(join(FUNCTIONS_DIR, name)).isDirectory(),
  ),
);

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      sourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Only literal invocations are checked. A name built from a variable cannot be resolved
 * statically, and pretending otherwise would make this guard lie about its own coverage.
 */
const INVOKE = /functions\s*\.\s*invoke\(\s*["'`]([^"'`]+)["'`]/g;

const callSites: { name: string; file: string }[] = [];
for (const file of sourceFiles(join(ROOT, "src"))) {
  const code = readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  for (const match of code.matchAll(INVOKE)) {
    callSites.push({ name: match[1], file: relative(ROOT, file) });
  }
}

describe("edge function callers", () => {
  it("finds the call sites at all, so a passing run means something", () => {
    // Without this, a regex that stops matching turns every assertion below into a no-op.
    expect(callSites.length).toBeGreaterThan(20);
    expect(deployable.size).toBeGreaterThan(20);
  });

  it("invokes only functions that exist in supabase/functions/", () => {
    const missing = callSites
      .filter((site) => !deployable.has(site.name))
      .map((site) => `${site.file} invokes "${site.name}", which is not a directory in supabase/functions/`)
      .sort();

    expect(missing).toEqual([]);
  });

  it("each invoked function has an entrypoint, not just a directory", () => {
    const headless = [...new Set(callSites.map((site) => site.name))]
      .filter((name) => deployable.has(name))
      .filter((name) => !existsSync(join(FUNCTIONS_DIR, name, "index.ts")))
      .sort();

    expect(headless).toEqual([]);
  });
});
