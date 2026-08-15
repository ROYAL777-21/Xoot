import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `netlify.toml` must tell every build context which environment it is.
 *
 * ── The defect, and it had never once succeeded ─────────────────────────────────
 * Netlify sets `CI=true`. `npm run build` runs `prebuild` → `config:check` →
 * `scripts/config/validate-public-env.mjs`, which fails outright when `CI` is set and
 * `VITE_APP_ENV` is not. `netlify.toml` set only `NODE_VERSION`, so **every Netlify build failed
 * before compiling a line**, and had done since the check was added.
 *
 * It read as a broken pull request each time. It was not: the deploy preview on #42 failed
 * identically on four consecutive commits, including after a lockfile fix that turned the
 * equivalent GitHub Actions job green.
 *
 * ── Why a test and not another comment ──────────────────────────────────────────
 * ⚠️ This is the **second** appearance of one bug. `.github/workflows/tests.yml` already carries
 * the comment *"when CI is set but VITE_APP_ENV is not. The Build step had therefore never once
 * succeeded"* — written when it was found and fixed **there**. The lesson was recorded in prose
 * and `netlify.toml` walked into the same hole anyway.
 *
 * A comment is not a control. This is.
 */

const read = (relative: string) => readFileSync(join(process.cwd(), relative), "utf8");

const NETLIFY_TOML = "netlify.toml";
const VALIDATOR = "scripts/config/validate-public-env.mjs";

/** Strip comments so a `#`-commented example never counts as a real setting. */
const settings = (toml: string) =>
  toml
    .split("\n")
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter(Boolean);

/** Every `[context.<name>.environment]` block and the settings under it. */
const contextBlocks = (toml: string) => {
  const blocks = new Map<string, string[]>();
  let current: string | null = null;
  for (const line of settings(toml)) {
    const header = line.match(/^\[([^\]]+)\]$/);
    if (header) {
      current = header[1].startsWith("context.") ? header[1] : null;
      if (current) blocks.set(current, []);
      continue;
    }
    if (current) blocks.get(current)!.push(line);
  }
  return blocks;
};

const appEnvOf = (lines: string[]) =>
  lines
    .map((line) => line.match(/^VITE_APP_ENV\s*=\s*"([^"]+)"$/)?.[1])
    .find((value): value is string => Boolean(value));

describe("netlify build environment", () => {
  const toml = read(NETLIFY_TOML);
  const blocks = contextBlocks(toml);

  it("defines at least the production and deploy-preview contexts", () => {
    expect([...blocks.keys()]).toEqual(
      expect.arrayContaining([
        "context.production.environment",
        "context.deploy-preview.environment",
      ]),
    );
  });

  it("sets VITE_APP_ENV in every context it defines", () => {
    /*
     * The assertion the whole file exists for. A context without `VITE_APP_ENV` fails the build at
     * `config:check` with a message that names an environment variable and nothing about Netlify,
     * which is why four commits went by without anyone connecting the two.
     */
    for (const [name, lines] of blocks) {
      expect(appEnvOf(lines), `${name} must set VITE_APP_ENV or its builds cannot start`).toBeTruthy();
    }
  });

  it("only uses values the validator actually accepts", () => {
    /*
     * Read out of `validate-public-env.mjs` rather than duplicated here. A hardcoded list would
     * pass while the build rejected the value — the same shape as the bug being guarded.
     */
    const allowed = [
      ...read(VALIDATOR).matchAll(/allowedAppEnvironments\s*=\s*new Set\(\[([^\]]+)\]/g),
    ]
      .flatMap((match) => [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));

    expect(allowed.length, "could not read allowedAppEnvironments from the validator").toBeGreaterThan(0);

    for (const [name, lines] of blocks) {
      const value = appEnvOf(lines);
      expect(allowed, `${name} sets VITE_APP_ENV="${value}", which the validator rejects`).toContain(value);
    }
  });

  it("names the extra requirement wherever a context needs real Supabase values", () => {
    /*
     * `staging` and `production` both make `requiresRealSupabase` true, so those contexts fail
     * unless VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in Netlify's own settings
     * — which this file deliberately does not carry.
     *
     * A context declaring one of those values without saying so leaves the next person to discover
     * it from a red build, which is exactly how this cost four commits.
     */
    const needsRealSupabase = [...blocks].filter(([, lines]) => {
      const value = appEnvOf(lines);
      return value === "staging" || value === "production";
    });

    if (needsRealSupabase.length) {
      expect(toml, "a staging/production context must document the Supabase requirement").toMatch(
        /VITE_SUPABASE_PUBLISHABLE_KEY/,
      );
      expect(toml, "and point at where it is recorded").toMatch(/NEEDS-FOUNDER/);
    }
  });

  it("keeps previews off the production Supabase project", () => {
    // A preview built as `production` would point real Supabase at branch code. `development`
    // requires no credentials and cannot reach it.
    for (const name of ["context.deploy-preview.environment", "context.branch-deploy.environment"]) {
      const lines = blocks.get(name);
      if (!lines) continue;
      expect(appEnvOf(lines), `${name} must not build as production`).not.toBe("production");
    }
  });

  it("still runs the build through npm run build, so prebuild hooks fire", () => {
    // `npx vite build` skips prebuild — and prebuild is where the association files and the env
    // check live. A build command that skips it would pass this suite and ship without them.
    expect(toml).toMatch(/command\s*=\s*"[^"]*npm run build"/);
  });
});
