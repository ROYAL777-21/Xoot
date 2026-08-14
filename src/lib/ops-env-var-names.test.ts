import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The deploy scripts and the page telling a person what to export must name the same variables.
 *
 * ── The defect ──────────────────────────────────────────────────────────────────
 * ZD-029 renamed the reads in `scripts/ops/*.ps1` from `ZOOT_` to `XOOT_` and left
 * `docs/STAGING_BACKEND_DEPLOYMENT.md` — the page a founder actually follows — saying `ZOOT_`.
 * Exporting exactly what the documentation said therefore produced:
 *
 *     "Set PRODUCTION database URL or SUPABASE_ACCESS_TOKEN locally before deploying."
 *
 * which reads as a missing credential when the credential was set and only the name was wrong.
 * Identical in shape to the `ZOOT_INVOICE_*` variables that killed invoice generation, and to
 * `TWILIO_API_KEY` and `ENVIRONMENT` before that.
 *
 * ── Why this one mattered more than the others ──────────────────────────────────
 * It sits on the only route to production that currently exists. GitHub Actions has been down for
 * this account since 2026-08-13, and the repo's `SUPABASE_ACCESS_TOKEN` is a project key rather
 * than an `sbp_` personal token (`go-live.md` §0), so both automated paths are shut. A local
 * PowerShell shell is the only way to apply the four pending migrations — and that shell was being
 * told the wrong variable names.
 *
 * The scripts now accept either spelling, `XOOT_` first, so an existing profile does not break.
 * This test pins the direction: the documented name must be one the script reads.
 */

const ROOT = process.cwd();
const OPS = join(ROOT, "scripts/ops");
const DEPLOY_DOC = "docs/STAGING_BACKEND_DEPLOYMENT.md";

/** Internal toggles no document tells anyone to set, so there is nothing to agree with. */
const UNDOCUMENTED_INTERNAL_TOGGLES = new Set(["ZOOT_CHECK_NPX_SUPABASE"]);

const opsScripts = () =>
  readdirSync(OPS)
    .filter((f) => f.endsWith(".ps1"))
    .map((f) => ({ file: f, source: readFileSync(join(OPS, f), "utf8") }));

/** Every `$env:XOOT_…` / `$env:ZOOT_…` the ops scripts read, name -> first file seen. */
const envNamesReadByScripts = () => {
  const names = new Map<string, string>();
  for (const { file, source } of opsScripts()) {
    for (const m of source.matchAll(/\$env:((?:XOOT|ZOOT)_[A-Z0-9_]+)/g)) {
      if (!names.has(m[1])) names.set(m[1], file);
    }
  }
  return names;
};

/**
 * The same, but **per file**.
 *
 * The fallback pattern is written at the read site — `if ($env:XOOT_X) { … } else { $env:ZOOT_X }`
 * — so whether a `ZOOT_` name is a deliberate fallback or an overlooked rename is a question about
 * one file, not about the repo. Checking globally lets an `XOOT_` read in `repair-…ps1` vouch for a
 * `ZOOT_`-only read in `deploy-…ps1`, which is exactly the false pass this test was caught giving.
 */
const envNamesPerFile = () =>
  opsScripts().map(({ file, source }) => ({
    file,
    names: new Set([...source.matchAll(/\$env:((?:XOOT|ZOOT)_[A-Z0-9_]+)/g)].map((m) => m[1])),
  }));

describe("ops env var names agree between scripts and the page people follow", () => {
  const read = envNamesReadByScripts();

  it("found env reads in the ops scripts", () => {
    expect(read.size, "no $env: reads parsed — has the script style changed?").toBeGreaterThan(5);
  });

  it("every ZOOT_ name a script still reads is a documented fallback, not the only spelling", () => {
    /*
     * A `ZOOT_` read is fine — it is how an existing shell profile keeps working. What is NOT fine
     * is a `ZOOT_` read with no `XOOT_` sibling, because that is a name the rename simply missed.
     */
    const orphans: string[] = [];
    for (const { file, names } of envNamesPerFile()) {
      for (const name of names) {
        if (!name.startsWith("ZOOT_")) continue;
        if (UNDOCUMENTED_INTERNAL_TOGGLES.has(name)) continue;
        const modern = name.replace(/^ZOOT_/, "XOOT_");
        // Per file, not repo-wide: see the note on envNamesPerFile.
        if (!names.has(modern)) orphans.push(`${file} reads ${name} with no ${modern} beside it`);
      }
    }
    expect(orphans, "a ZOOT_ name is the only spelling that read site accepts").toEqual([]);
  });

  it("the deployment page names variables the scripts actually read", () => {
    const doc = readFileSync(join(ROOT, DEPLOY_DOC), "utf8");
    const documented = new Set(
      [...doc.matchAll(/`?\$?(?:env:)?((?:XOOT|ZOOT)_[A-Z0-9_]+)`?/g)].map((m) => m[1]),
    );
    expect(documented.size, `no env names found in ${DEPLOY_DOC}`).toBeGreaterThan(0);

    const unread = [...documented].filter((name) => !read.has(name));
    expect(
      unread,
      `${DEPLOY_DOC} tells people to export names no ops script reads — exporting exactly what ` +
        "the page says would fail with a missing-credential error",
    ).toEqual([]);
  });

  it("the page instructs the XOOT_ spelling, not the retired one", () => {
    const doc = readFileSync(join(ROOT, DEPLOY_DOC), "utf8");
    // Only the executable examples, not the note explaining what the old name was.
    const shellLines = doc
      .split("\n")
      .filter((line) => line.trimStart().startsWith("$env:"))
      .join("\n");
    expect(
      [...shellLines.matchAll(/\$env:(ZOOT_[A-Z0-9_]+)/g)].map((m) => m[1]),
      "a copy-pasteable example still exports a retired ZOOT_ name",
    ).toEqual([]);
  });
});
