import { describe, expect, it } from "vitest";

import {
  getPublicConfigIssueForEnv,
  getPublicSecretLeaks,
  isSupabasePublicConfigComplete,
} from "./env";

const realSupabaseEnv = {
  VITE_APP_ENV: "production",
  VITE_SUPABASE_URL: "https://project.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-key-for-browser",
};

describe("public environment validation", () => {
  it("accepts real production Supabase public config", () => {
    expect(getPublicConfigIssueForEnv(realSupabaseEnv, { prod: true })).toBeNull();
    expect(isSupabasePublicConfigComplete(realSupabaseEnv)).toBe(true);
  });

  it("blocks preview Supabase in production", () => {
    expect(
      getPublicConfigIssueForEnv(
        {
          VITE_APP_ENV: "production",
          VITE_SUPABASE_URL: "https://preview.supabase.co",
          VITE_SUPABASE_PUBLISHABLE_KEY: "preview-anon-key",
        },
        { prod: true },
      ),
    ).toMatch(/Builds require real/);
  });

  it("blocks copied example placeholders in production", () => {
    expect(
      getPublicConfigIssueForEnv(
        {
          VITE_APP_ENV: "production",
          VITE_SUPABASE_URL: "https://your-project-ref.supabase.co",
          VITE_SUPABASE_PUBLISHABLE_KEY: "your-anon-key",
        },
        { prod: true },
      ),
    ).toMatch(/Builds require real/);
  });

  it("requires explicit app environment for production-mode builds", () => {
    expect(
      getPublicConfigIssueForEnv(
        {
          VITE_SUPABASE_URL: "https://project.supabase.co",
          VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-key-for-browser",
        },
        { prod: true },
      ),
    ).toMatch(/VITE_APP_ENV is required/);
  });

  it("blocks preview mode for CI and demos", () => {
    expect(
      getPublicConfigIssueForEnv(
        {
          VITE_APP_ENV: "preview",
          VITE_SUPABASE_URL: "https://preview.supabase.co",
          VITE_SUPABASE_PUBLISHABLE_KEY: "preview-anon-key",
        },
        { prod: true },
      ),
    ).toMatch(/VITE_APP_ENV must be one of development, staging, or production/);
  });

  it("blocks explicit demo mode in every environment", () => {
    expect(
      getPublicConfigIssueForEnv(
        {
          VITE_APP_ENV: "development",
          VITE_ENABLE_DEMO_MODE: "true",
          VITE_SUPABASE_URL: "https://project.supabase.co",
          VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-key-for-browser",
        },
        { dev: true },
      ),
    ).toMatch(/VITE_ENABLE_DEMO_MODE is no longer supported/);
  });

  it("detects secret-like VITE variable names", () => {
    expect(getPublicSecretLeaks({ VITE_TWILIO_AUTH_TOKEN: "never-public" })).toEqual(["VITE_TWILIO_AUTH_TOKEN"]);
  });
});
