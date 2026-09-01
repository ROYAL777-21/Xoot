import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { getPublicEnvironmentDefaults, resolvePublicEnv } from "./public-environment";

/**
 * Committed public defaults must configure production and NOTHING else.
 *
 * ── Why this file is the important one ──────────────────────────────────────────────────────────
 * `config/public-environments.json` removes a manual dashboard step by committing the public
 * Supabase URL and publishable key. That is safe for exactly one reason: the defaults are keyed by
 * `VITE_APP_ENV`, and a preview build derives `development`, whose block is empty.
 *
 * If that ever stops being true, a preview deployment of any branch starts reading and writing the
 * **production** database. `netlify.toml` avoided this by hand and said so in a comment; a comment
 * is not a control. These assertions are the control.
 */

const CONFIG = "config/public-environments.json";
const raw = JSON.parse(readFileSync(join(process.cwd(), CONFIG), "utf8"));

describe("committed public environment defaults", () => {
  it("gives production a real Supabase URL and publishable key", () => {
    const production = getPublicEnvironmentDefaults("production");
    expect(production.VITE_SUPABASE_URL, "production must be self-configuring").toMatch(
      /^https:\/\/[a-z0-9]{20}\.supabase\.co$/,
    );
    expect(production.VITE_SUPABASE_PUBLISHABLE_KEY).toBeTruthy();
  });

  it("keeps the project id consistent with the URL it ships beside", () => {
    // A mismatched pair points the app at one project while telling it it is another. The mobile
    // validator already checks this; the web side had no equivalent.
    const production = getPublicEnvironmentDefaults("production");
    const refInUrl = /https:\/\/([a-z0-9]{20})\.supabase\.co/.exec(production.VITE_SUPABASE_URL ?? "")?.[1];
    expect(production.VITE_SUPABASE_PROJECT_ID).toBe(refInUrl);
  });

  it("gives development and staging NOTHING — this is the whole safety property", () => {
    for (const name of ["development", "staging"]) {
      expect(
        Object.keys(getPublicEnvironmentDefaults(name)),
        `${name} must stay empty, or previews inherit production credentials`,
      ).toEqual([]);
    }
  });

  it("does not leak production config into a preview-shaped environment", () => {
    // The end-to-end version of the assertion above, through the function the app actually calls.
    const preview = resolvePublicEnv({ VITE_APP_ENV: "development" });
    expect(preview.VITE_SUPABASE_URL).toBeUndefined();
    expect(preview.VITE_SUPABASE_PUBLISHABLE_KEY).toBeUndefined();

    const unset = resolvePublicEnv({});
    expect(unset.VITE_SUPABASE_URL).toBeUndefined();
  });

  it("fills production, and lets a real environment variable win", () => {
    const filled = resolvePublicEnv({ VITE_APP_ENV: "production" });
    expect(filled.VITE_SUPABASE_URL).toMatch(/supabase\.co/);

    const overridden = resolvePublicEnv({
      VITE_APP_ENV: "production",
      VITE_SUPABASE_URL: "https://someotherproject12345.supabase.co",
    });
    expect(overridden.VITE_SUPABASE_URL, "a host variable must beat the committed default").toBe(
      "https://someotherproject12345.supabase.co",
    );
  });

  it("treats a blank host variable as unset, not as configured", () => {
    // Defining the variable and leaving the value empty is a common dashboard slip. Honouring it
    // would ship an empty Supabase URL and a site that cannot sign anyone in.
    const blank = resolvePublicEnv({ VITE_APP_ENV: "production", VITE_SUPABASE_URL: "   " });
    expect(blank.VITE_SUPABASE_URL).toMatch(/supabase\.co/);
  });

  it("contains no value that is not already public", () => {
    /*
     * The rule that keeps this file safe to commit. Everything here is compiled into the browser
     * bundle, so a service-role key, a password or a private token in this file is an immediate
     * full-database compromise — not a misconfiguration.
     */
    const body = JSON.stringify(raw);
    expect(body, "service-role key in a browser-shipped file").not.toMatch(/sb_secret_|sb_service_role_/);
    expect(body, "a JWT here could be a service_role token — shape alone cannot tell").not.toMatch(
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    );
    expect(body, "private key material").not.toMatch(/BEGIN [A-Z ]*PRIVATE KEY/);

    for (const [name, block] of Object.entries(raw)) {
      if (name.startsWith("$")) continue;
      for (const key of Object.keys(block as Record<string, string>)) {
        expect(key, `${name}.${key} is not a public VITE_ variable`).toMatch(/^VITE_/);
        expect(key, `${name}.${key} has a secret-like name`).not.toMatch(
          /SERVICE_ROLE|CLIENT_SECRET|PRIVATE_KEY|WEBHOOK_SECRET|SIGNING_SECRET|SECRET_KEY|API_SECRET/i,
        );
      }
    }
  });
});
