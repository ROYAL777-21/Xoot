import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The mobile app must not build for a store while believing it is a development build.
 *
 * ── Found while fixing the web deploy, 2026-09-01 ───────────────────────────────────────────────
 * The web build failed loudly on Vercel because `VITE_APP_ENV` was unset. Checking whether the app
 * had the same hole found a worse one:
 *
 *   - `eas.json` sets `"environment": "production"` on the production profile. That selects which
 *     **EAS environment variables** to load. It does not set `EXPO_PUBLIC_APP_ENV`.
 *   - `validate-env.ts` fell back to `'development'` whenever `EXPO_PUBLIC_APP_ENV` was unset — and
 *     every real-Supabase assertion in that file is gated behind `preview | staging | production`.
 *   - `config:check` had **no `eas-build-*` hook**, so it never ran on EAS at all.
 *
 * Net effect: `eas build --profile production` with the variable unset would validate nothing,
 * build, sign, and submit an app pointed at no backend. The web version of this bug stopped a
 * deploy. This version reaches the App Store.
 *
 * Same root cause both times: **the build host knows which environment it is, and nobody asked
 * it.** `deploy-host-config.test.ts` guards the web half; this guards the native half.
 */

const ROOT = process.cwd();
const VALIDATOR = join(ROOT, "mobile", "scripts", "validate-env.ts");

const easProfiles = () => {
  const eas = JSON.parse(readFileSync(join(ROOT, "mobile", "eas.json"), "utf8"));
  return Object.keys(eas.build ?? {});
};

/** The profile → environment map, read out of the validator rather than duplicated here. */
const mappedProfiles = () => {
  const source = readFileSync(VALIDATOR, "utf8");
  const block = source.match(/easProfileEnvironments[^{]*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  return [...block.matchAll(/^\s*'?([\w-]+)'?\s*:/gm)].map((match) => match[1]);
};

describe("mobile build environment", () => {
  it("runs the config check during an EAS build", () => {
    /*
     * Without this hook the validator is a script nobody calls on the machine that matters. It was
     * in `package.json` as `config:check` and referenced by two GitHub workflows — neither of which
     * runs when `eas build` runs.
     */
    const pkg = JSON.parse(readFileSync(join(ROOT, "mobile", "package.json"), "utf8"));
    expect(
      pkg.scripts["eas-build-post-install"],
      "EAS must run config:check, or the validation never executes on the build machine",
    ).toMatch(/config:check/);
  });

  it("knows the environment of every profile eas.json defines", () => {
    /*
     * The assertion that makes adding a profile safe. A new `eas.json` profile with no mapping
     * would previously have inherited the `development` fallback silently; now it fails here, at
     * the point the profile is added, rather than in a store build.
     */
    const mapped = mappedProfiles();
    expect(mapped.length, "could not read easProfileEnvironments from the validator").toBeGreaterThan(0);
    for (const profile of easProfiles()) {
      expect(mapped, `eas.json profile "${profile}" has no environment mapping in validate-env.ts`).toContain(profile);
    }
  });

  it("never lets a production profile validate as development", () => {
    // The behavioural assertion, run against the real script. A source-text check would pass while
    // the build shipped — the same shape as the bug.
    let output = "";
    let code = 0;
    try {
      output = execFileSync(process.execPath, ["--import", "tsx", "scripts/validate-env.ts"], {
        cwd: join(ROOT, "mobile"),
        encoding: "utf8",
        env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", EAS_BUILD: "true", EAS_BUILD_PROFILE: "production" },
      });
    } catch (error) {
      const failure = error as { status?: number; stdout?: string; stderr?: string };
      code = failure.status ?? 1;
      output = `${failure.stdout ?? ""}${failure.stderr ?? ""}`;
    }

    // With no Supabase values supplied, a production profile must REFUSE, not fall through to a
    // development pass. Either outcome exits non-zero; only one of them is safe.
    expect(code, `a production EAS build validated with no configuration:\n${output}`).toBe(1);
    expect(output, "it must fail as production, not pass as development").toMatch(/for production builds/);
    expect(output).not.toMatch(/development configuration shape is valid/);
  }, 60_000);
});
