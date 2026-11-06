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

  it("is the two public Xoot origins plus the native WebView origins", () => {
    expect(value).toBe(
      "https://xoot.co.za,https://www.xoot.co.za,https://localhost,http://localhost,capacitor://localhost,zoot://localhost,xoot://localhost",
    );
  });

  /**
   * The security-relevant property.
   *
   * Setting this variable REPLACES the fallback list rather than extending it, so anything
   * included is something production accepts. Developer loopback origins (port-carrying
   * localhost / 127.0.0.1) must never be carried across — any page on a developer's machine
   * could then call production Edge Functions with a real session. The WebView origins ARE
   * localhost-shaped, but they are the app's own native shell: no remote page can be served
   * from them, and every function still requires a valid JWT.
   */
  it("admits no developer loopback origin, and no origin beyond the web + WebView set", () => {
    expect(value).not.toMatch(/127\.0\.0\.1|0\.0\.0\.0|\[::1\]|:\d{4}/);
    const entries = value.split(",").filter(Boolean);
    const nativeWebViewOrigins = new Set([
      "https://localhost",
      "http://localhost",
      "capacitor://localhost",
      "zoot://localhost",
      "xoot://localhost",
    ]);
    for (const entry of entries) {
      expect(nativeWebViewOrigins.has(entry) || entry.startsWith("https://")).toBe(true);
    }
  });

  it("keeps every native WebView origin the shell may present", () => {
    // The legacy Capacitor shell 403s on every Edge Function call if its origin drops off
    // this list — the "Edge function returned a non-2xx code" failure mode.
    for (const origin of ["https://localhost", "http://localhost", "capacitor://localhost", "zoot://localhost", "xoot://localhost"]) {
      expect(value.split(",")).toContain(origin);
    }
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
