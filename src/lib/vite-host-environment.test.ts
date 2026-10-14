import { describe, expect, it } from "vitest";
import { resolveHostAppEnvironment, setViteAppEnvironment } from "../../vite.config";

describe("Vite client environment injection", () => {
  it("inserts the production label for Vercel production when the dashboard value is absent", () => {
    const environment: Record<string, string | undefined> = { VERCEL_ENV: "production" };
    expect(setViteAppEnvironment(environment)).toBe("production");
    expect(environment.VITE_APP_ENV).toBe("production");
  });

  it("inserts development for Vercel preview, never production", () => {
    const environment: Record<string, string | undefined> = { VERCEL_ENV: "preview" };
    expect(setViteAppEnvironment(environment)).toBe("development");
    expect(environment.VITE_APP_ENV).toBe("development");
  });

  it("recognises Netlify contexts as well", () => {
    expect(resolveHostAppEnvironment({ CONTEXT: "production" })).toBe("production");
    expect(resolveHostAppEnvironment({ CONTEXT: "deploy-preview" })).toBe("development");
  });

  it("honours an explicit matching environment value", () => {
    const environment = { VERCEL_ENV: "production", VITE_APP_ENV: "production" };
    expect(setViteAppEnvironment(environment)).toBe("production");
  });

  it("rejects assigning production credentials to a preview", () => {
    expect(() => setViteAppEnvironment({ VERCEL_ENV: "preview", VITE_APP_ENV: "production" }))
      .toThrow(/preview build must not/);
  });

  it("does not guess an environment for local builds without host signals", () => {
    const environment: Record<string, string | undefined> = {};
    expect(setViteAppEnvironment(environment)).toBeUndefined();
    expect(environment.VITE_APP_ENV).toBeUndefined();
  });
});
