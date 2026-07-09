import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const read = (path: string) => readFileSync(join(repoRoot, path), "utf8");

describe("auth autocomplete and password-manager readiness", () => {
  it("exposes password-manager friendly fields on the main auth form", () => {
    const authPage = read("src/pages/Auth.tsx");

    expect(authPage).toContain('autoComplete="on"');
    expect(authPage).toContain('autoComplete={mode === "signin" ? "current-password" : "new-password"}');
    expect(authPage).toContain('autoComplete="one-time-code"');
    expect(authPage).toContain("generateStrongPassword");
  });

  it("exposes generated-password friendly fields on reset", () => {
    const resetPage = read("src/pages/AuthReset.tsx");

    expect(resetPage).toContain('autoComplete="on"');
    expect(resetPage).toContain('name="new-password"');
    expect(resetPage).toContain('autoComplete="new-password"');
    expect(resetPage).toContain("setConfirmation(generated)");
  });
});
