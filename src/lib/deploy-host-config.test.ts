import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every host this repo can deploy to must be able to start a build.
 *
 * ── The defect, three times ─────────────────────────────────────────────────────────────────────
 * `scripts/config/validate-public-env.mjs` fails when `CI` is set and `VITE_APP_ENV` is not. Every
 * CI host sets `CI`. So every host fails this check until someone tells it which environment it is:
 *
 *   1. **GitHub Actions** — found, fixed in `tests.yml`, recorded in a comment.
 *   2. **Netlify** — walked into the identical hole. Four consecutive red deploy previews on #42.
 *      Fixed in `netlify.toml`, and guarded by `netlify-build-env.test.ts`.
 *   3. **Vercel** — 2026-09-01, commit `950dc5d` on `main`. `Error: Command "npm run build" exited
 *      with 1`, on the same line, before compiling anything.
 *
 * The guard written at step 2 watched **one file by name**. It passed the entire time Vercel was
 * failing, because Vercel is not Netlify. A per-host guard cannot catch a per-host bug — that is
 * the lesson this file exists to encode, and it is the same shape as the comment-is-not-a-control
 * lesson from step 2.
 *
 * ── What this file asserts, that the per-host ones cannot ───────────────────────────────────────
 * The validator now derives the environment from the host's own signal (`VERCEL_ENV`, `CONTEXT`).
 * These tests run the real validator as a subprocess against each host's real environment, rather
 * than reading its source — a source-text assertion would pass while the build failed, which is the
 * exact shape of the bug being guarded.
 */

const ROOT = process.cwd();
const VALIDATOR = join(ROOT, "scripts", "config", "validate-public-env.mjs");

/**
 * Run the real validator with a specific environment. Returns exit code and combined output.
 *
 * `env` is replaced, not merged: an inherited `CI` or `VITE_APP_ENV` from the machine running the
 * suite would make these tests pass for the wrong reason.
 */
const runValidator = (env: Record<string, string>) => {
  try {
    const stdout = execFileSync("node", [VALIDATOR], {
      cwd: ROOT,
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "", ...env },
    });
    return { code: 0, output: stdout };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return { code: failure.status ?? 1, output: `${failure.stdout ?? ""}${failure.stderr ?? ""}` };
  }
};

/**
 * Every host config this repo carries, and how that host announces its environment.
 *
 * ⚠️ Adding a host means adding a row here. That is deliberate: the failing test is the reminder
 * that a new host needs its environment wired up, which is precisely what was missed three times.
 */
const HOSTS = [
  {
    name: "Vercel",
    config: "vercel.json",
    // https://vercel.com/docs/environment-variables/system-environment-variables
    productionEnv: { CI: "1", VERCEL: "1", VERCEL_ENV: "production" },
    previewEnv: { CI: "1", VERCEL: "1", VERCEL_ENV: "preview" },
  },
  {
    name: "Netlify",
    config: "netlify.toml",
    productionEnv: { CI: "true", NETLIFY: "true", CONTEXT: "production" },
    previewEnv: { CI: "true", NETLIFY: "true", CONTEXT: "deploy-preview" },
  },
] as const;

describe("deploy host configuration", () => {
  it("carries a config file for every host it claims to support", () => {
    for (const host of HOSTS) {
      expect(existsSync(join(ROOT, host.config)), `${host.name}: ${host.config} is missing`).toBe(true);
    }
  });

  describe.each(HOSTS)("$name", (host) => {
    it("resolves an environment without VITE_APP_ENV being set by hand", () => {
      /*
       * The assertion the whole file exists for. Before the fix this failed on Vercel with
       * "CI builds must set VITE_APP_ENV explicitly" — a message naming an environment variable
       * and nothing about the host, which is why four commits went by on Netlify without anyone
       * connecting the two.
       *
       * This asserts on the MESSAGE rather than the exit code, so it stays true regardless of what
       * the second gate (real Supabase values) does — that gate is covered separately below.
       */
      const preview = runValidator(host.previewEnv);
      expect(preview.code, `${host.name} preview build could not resolve an environment:\n${preview.output}`).toBe(0);

      const production = runValidator(host.productionEnv);
      expect(
        production.output,
        `${host.name} production build could not resolve an environment:\n${production.output}`,
      ).not.toMatch(/must set VITE_APP_ENV explicitly/);
    });

    it("never builds a preview as production", () => {
      // A preview built as `production` points branch code at the production Supabase project.
      // `netlify.toml` chose `development` for previews by hand for this reason; the derivation
      // has to preserve it or it quietly undoes a deliberate safety decision.
      const preview = runValidator(host.previewEnv);
      expect(preview.output).not.toMatch(/passed for production/);
      expect(preview.output).toMatch(/passed for development/);
    });

    it("says where the environment came from, so a wrong one is visible in the build log", () => {
      const preview = runValidator(host.previewEnv);
      // Netlify sets VITE_APP_ENV explicitly in netlify.toml, so it has nothing to derive and
      // nothing to report — only a derived value needs its provenance printed.
      const derived = /derived from/.test(preview.output);
      const explicit = /passed for (development|staging|production)\.$/m.test(preview.output);
      expect(derived || explicit, `${host.name} printed no resolvable environment:\n${preview.output}`).toBe(true);
    });

    it("runs the build through npm run build, so prebuild hooks fire", () => {
      // `vite build` alone skips `prebuild` — where the env check, the SEO validation and the
      // native association files live. A build command that skips it ships without all three.
      const config = readFileSync(join(ROOT, host.config), "utf8");
      expect(config, `${host.name} must build via npm run build`).toMatch(/npm run build/);
    });
  });

  it("still refuses to guess when no host signal exists", () => {
    /*
     * The guard is derived-from, not defaulted-to. An unknown CI host must fail loudly rather than
     * silently picking one — a production build that quietly became `development` would deploy
     * green and point at nothing.
     */
    const unknown = runValidator({ CI: "1" });
    expect(unknown.code).toBe(1);
    expect(unknown.output).toMatch(/must set VITE_APP_ENV explicitly/);
    // And the message has to be actionable, which the original one-liner was not.
    expect(unknown.output, "the failure must name the signals it looked for").toMatch(/VERCEL_ENV/);
    expect(unknown.output, "and where to read next").toMatch(/deploy-hosts\.md/);
  });

  it("gives production real Supabase values without anything set in a dashboard", () => {
    /*
     * ── This assertion was REWRITTEN on 2026-09-02, and the reason matters ────────────────────
     * It used to assert that a production build with nothing set FAILS. That was correct until
     * `config/public-environments.json` made production self-configuring, at which point this test
     * went red — correctly. It had caught a real behaviour change.
     *
     * The invariant it was protecting is NOT "production fails". It is **"production never ships
     * without real Supabase config"**. That is still enforced; the enforcement simply moved from a
     * failure to a committed default. So the test now asserts the invariant rather than the old
     * mechanism, and the next assertion keeps the original teeth.
     */
    const production = runValidator({ CI: "1", VERCEL: "1", VERCEL_ENV: "production" });
    expect(production.code, `production could not configure itself:\n${production.output}`).toBe(0);
    expect(production.output).toMatch(/passed for production/);
    expect(production.output, "the defaults must be visible in the build log, not silent").toMatch(
      /filled from config\/public-environments\.json/,
    );
  });

  it("still refuses a production build when the defaults are gone AND nothing is set", () => {
    /*
     * The original teeth, preserved. If someone empties the production block in
     * `config/public-environments.json` and no host variable covers it, the build must fail — a
     * production site that cannot sign anyone in must never deploy green.
     *
     * Run against a temporary copy of the repo config so the real file is untouched.
     */
    const config = join(ROOT, "config", "public-environments.json");
    const original = readFileSync(config, "utf8");
    try {
      const stripped = JSON.parse(original);
      stripped.production = {};
      writeFileSync(config, JSON.stringify(stripped, null, 2));

      const production = runValidator({ CI: "1", VERCEL: "1", VERCEL_ENV: "production" });
      expect(production.code).toBe(1);
      expect(production.output).toMatch(/require real VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY/);
    } finally {
      writeFileSync(config, original);
    }
  });

  it("passes production once the two public values are supplied", () => {
    const production = runValidator({
      CI: "1",
      VERCEL: "1",
      VERCEL_ENV: "production",
      VITE_SUPABASE_URL: "https://mvlrkelahhsyjrwgsxaf.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_value_for_this_assertion",
    });
    expect(production.code, production.output).toBe(0);
    expect(production.output).toMatch(/passed for production/);
  });
});
