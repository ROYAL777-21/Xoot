import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "supabase/functions");
const functionFiles = readdirSync(ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "_shared")
  .map((entry) => join(ROOT, entry.name, "index.ts"));

describe("Edge Function request hardening", () => {
  it("has no direct unbounded JSON parser in deployed handlers", () => {
    const offenders = functionFiles.filter((file) => {
      const source = readFileSync(file, "utf8");
      return /(?:await\s+)?req\.json\s*\(\)/.test(source);
    });
    expect(offenders.map((file) => file.replace(process.cwd() + "/", ""))).toEqual([]);
  });

  it("keeps the shared body limit and streaming reader in place", () => {
    const shared = readFileSync(join(ROOT, "_shared/action-utils.ts"), "utf8");
    expect(shared).toMatch(/MAX_JSON_BODY_BYTES\s*=\s*256\s*\*\s*1024/);
    expect(shared).toContain("req.body.getReader()");
    expect(shared).toContain("total > maxBytes");
  });

  it("does not return raw database errors from sensitive-access handlers", () => {
    for (const name of ["sensitive-access-read", "sensitive-access-save"]) {
      const source = readFileSync(join(ROOT, name, "index.ts"), "utf8");
      expect(source).not.toMatch(/jsonResponse\(\{\s*error:\s*error\.message/);
      expect(source).not.toMatch(/jsonResponse\(\{\s*error:\s*decisionError\.message/);
    }
  });
});
