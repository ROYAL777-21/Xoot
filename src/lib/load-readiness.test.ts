import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

describe("staging load-readiness harness", () => {
  const script = readFileSync(join(repoRoot, "scripts/load/xoot-staging-10k-readiness.js"), "utf8");
  const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };

  it("runs exactly 10,000 public/staging iterations", () => {
    const iterations = [...script.matchAll(/^\s+iterations:\s*(\d+),$/gm)].map((match) => Number(match[1]));

    expect(iterations).toEqual([7000, 1500, 1500]);
    expect(iterations.reduce((total, count) => total + count, 0)).toBe(10000);
  });

  it("fails closed unless an approved staging target is supplied", () => {
    expect(script).toContain('LOAD_TEST_ENV !== "staging"');
    expect(script).toContain("Refusing to run a staging readiness test against the production host");
    expect(script).toContain("ALLOW_PRODUCTION_LOAD_TEST");
    expect(script).toContain("ALLOW_LOCALHOST_LOAD_TEST");
    expect(script).toContain("ALLOW_NON_STAGING_BASE_URL");
    expect(script).toContain("new URL(value).hostname.toLowerCase()");
  });

  it("uses only public-safe Supabase credentials", () => {
    expect(script).toContain("SUPABASE_ANON_KEY");
    expect(script).not.toMatch(/SERVICE_ROLE|DATABASE_PASSWORD|SUPABASE_DB_URL|SECRET_API_KEY|OPENAI_API_KEY/);
  });

  it("stores threshold evidence separately from checks", () => {
    expect(script).toContain("threshold_results: pickThresholds(data.metrics)");
    expect(script).toContain("check_results: data.root_group?.checks || []");
  });

  it("is exposed through an npm script", () => {
    expect(packageJson.scripts["load:test:10k:staging"]).toBe(
      "k6 run scripts/load/xoot-staging-10k-readiness.js",
    );
  });
});
