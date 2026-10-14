import { describe, expect, it } from "vitest";

import { inspectStartupConfig } from "./env-check";

describe("Xoot startup environment validation", () => {
  it("accepts production's committed public Supabase defaults even when the host omits them", () => {
    const { resolvedEnv, issue } = inspectStartupConfig({ VITE_APP_ENV: "production" }, { prod: true });
    expect(issue).toBeNull();
    expect(resolvedEnv.VITE_SUPABASE_URL).toBe("https://mvlrkelahhsyjrwgsxaf.supabase.co");
    expect(resolvedEnv.VITE_SUPABASE_PUBLISHABLE_KEY).toMatch(/^sb_publishable_/);
  });

  it("prefers explicit host settings over committed production defaults", () => {
    const { resolvedEnv, issue } = inspectStartupConfig(
      {
        VITE_APP_ENV: "production",
        VITE_SUPABASE_URL: "https://anotherproject12345.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_host_override",
      },
      { prod: true },
    );
    expect(issue).toBeNull();
    expect(resolvedEnv.VITE_SUPABASE_URL).toBe("https://anotherproject12345.supabase.co");
    expect(resolvedEnv.VITE_SUPABASE_PUBLISHABLE_KEY).toBe("sb_publishable_host_override");
  });

  it("never injects production configuration into development and preview builds", () => {
    const { resolvedEnv, issue } = inspectStartupConfig({ VITE_APP_ENV: "development" }, { prod: true });
    expect(resolvedEnv.VITE_SUPABASE_URL).toBeUndefined();
    expect(resolvedEnv.VITE_SUPABASE_PUBLISHABLE_KEY).toBeUndefined();
    expect(issue).toMatch(/Builds require real VITE_SUPABASE_URL/);
  });

  it("still blocks secret-looking browser environment variables", () => {
    const { issue } = inspectStartupConfig(
      { VITE_APP_ENV: "production", VITE_SUPABASE_SERVICE_ROLE_KEY: "never-public" },
      { prod: true },
    );
    expect(issue).toMatch(/Public VITE_ variables cannot contain secret-like names/);
  });

  it("still requires an explicit environment label in production mode", () => {
    const { issue } = inspectStartupConfig({}, { prod: true });
    expect(issue).toMatch(/VITE_APP_ENV is required/);
  });
});
