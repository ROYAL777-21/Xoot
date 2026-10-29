import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// Plain-JS ops module: the CLI that uses it runs under bare node, so it cannot be TypeScript.
import {
  PROJECTS,
  compiledOrigins,
  productionValue,
  stagingValue,
} from "../../scripts/ops/lib/allowed-origins.mjs";

/**
 * `ALLOWED_ORIGINS` is the one lever that fixes CORS on all 42 deployed functions without a
 * redeploy — and redeploying is not a neutral alternative, because `create-booking` would
 * reprice every booking on the way past.
 *
 * The value is derived from `defaultAllowedOrigins` rather than retyped. These tests pin that
 * derivation, because the failure this whole thing exists to fix was a domain that lived in
 * several places and only got updated in some of them.
 */

const shared = readFileSync(
  join(process.cwd(), "supabase/functions/_shared/action-utils.ts"),
  "utf8",
);
const origins = compiledOrigins(shared);

describe("the origins the code falls back to", () => {
  it("is read out of action-utils rather than restated", () => {
    expect(origins).toContain("https://xoot.co.za");
    expect(origins).toContain("https://www.xoot.co.za");
  });

  it("no longer mentions the old domain anywhere in the shared module", () => {
    // The deployed bundles still say zoothome.co.za. The repo must not.
    expect(shared).not.toMatch(/zoothome/);
  });

  it("throws rather than guessing when the array cannot be found", () => {
    // Silently returning [] would set ALLOWED_ORIGINS to an empty string, which
    // `getAllowedOrigins` would then filter to nothing — locking every browser out.
    expect(() => compiledOrigins("export const somethingElse = [];")).toThrow();
  });
});

describe("the production value", () => {
  const value = productionValue(origins);

  it("is exactly the two public Xoot origins", () => {
    expect(value).toBe("https://xoot.co.za,https://www.xoot.co.za");
  });

  /**
   * The security-relevant property.
   *
   * Setting this variable REPLACES the fallback list rather than extending it, so anything
   * included is something production accepts from a browser. Carrying localhost across would
   * let any page on a developer's machine call production Edge Functions with a real session.
   */
  it("admits no loopback origin", () => {
    expect(value).not.toMatch(/localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/);
    for (const entry of value.split(",")) expect(entry.startsWith("https://")).toBe(true);
  });

  it("is never empty, which would lock every browser out", () => {
    // getAllowedOrigins() splits on "," and filters falsy, so "" yields [] and
    // isAllowedOrigin() then rejects every origin that is not null.
    expect(value.length).toBeGreaterThan(0);
    expect(value.split(",").filter(Boolean).length).toBeGreaterThanOrEqual(2);
  });
});

describe("the staging value", () => {
  const value = stagingValue(origins);

  it("keeps loopback, because that is what staging is for", () => {
    expect(value).toMatch(/http:\/\/localhost:5173/);
    expect(value).toMatch(/http:\/\/127\.0\.0\.1:5173/);
  });

  it("uses the staging host and never the production one", () => {
    expect(value).toMatch(/https:\/\/staging\.xoot\.co\.za/);
    expect(value).not.toMatch(/https:\/\/(www\.)?xoot\.co\.za(,|$)/);
  });

  it("accepts only the verified Xoot preview branches without widening production", () => {
    const branch = "https://xoot-git-codex-xoot-production-20260911-royal777-21s-projects.vercel.app";
    const integration = "https://xoot-git-integration-website-stagi-56296d-royal777-21s-projects.vercel.app";
    expect(value.split(",")).toContain(branch);
    expect(value.split(",")).toContain("http://127.0.0.1:4199");
    expect(productionValue(origins).split(",")).not.toContain(branch);
    expect(productionValue(origins).split(",")).not.toContain(integration);
    expect(value).not.toContain("*");
    expect(value.split(",")).toEqual([
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:4173",
      "https://staging.xoot.co.za",
      "http://127.0.0.1:4199",
      branch,
      integration,
    ]);
  });
});

describe("the projects it targets", () => {
  it("names both refs, and does not confuse them", () => {
    expect(PROJECTS.production).toBe("mvlrkelahhsyjrwgsxaf");
    expect(PROJECTS.staging).toBe("fxmxyabdjqviqbcxmvlp");
    expect(PROJECTS.production).not.toBe(PROJECTS.staging);
  });

  it("agrees with the refs the drift checker uses", () => {
    // Two scripts, one estate. A mismatch would have one of them silently reporting on the
    // wrong project.
    const drift = readFileSync(join(process.cwd(), "scripts/ops/check-deployed-drift.mjs"), "utf8");
    expect(drift).toMatch(new RegExp(`production: "${PROJECTS.production}"`));
    expect(drift).toMatch(new RegExp(`staging: "${PROJECTS.staging}"`));
  });
});
