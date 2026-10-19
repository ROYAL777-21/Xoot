import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { approvedLaunchRegions, resolveLaunchRegion } from "./operations";

/** CI source contract: the server and booking UI must never drift on launch suburbs. */
const server = readFileSync(join(process.cwd(), "supabase/functions/_shared/action-utils.ts"), "utf8");
const serverRegions = () => {
  const block = /export const approvedLaunchRegions = \[([\s\S]*?)\];/.exec(server)?.[1];
  if (!block) throw new Error("Cannot find server launch-region allowlist");
  const literalStrings = [...block.matchAll(/"([^"]+)"/g)].map(match => match[1]);
  if (literalStrings.length === 0) throw new Error("Server region allowlist unexpectedly empty");
  return literalStrings;
};

describe("web and Edge coverage have the same conservative rules", () => {
  it("uses an identical configured preliminary launch-region list", () => {
    expect(serverRegions()).toEqual(approvedLaunchRegions);
  });

  it("server must not use substring contains() to accept a launch area", () => {
    const matcher = server.slice(server.indexOf("export const resolveLaunchRegion"),
      server.indexOf("export const getPriority"));
    expect(matcher).toContain('input.normalize("NFKC")');
    expect(matcher).toContain('split(/[^a-z0-9]+/)');
    expect(matcher).toContain('parts.every((part, offset) => tokens[index + offset] === part)');
    expect(matcher).not.toContain('value.includes(region)');
    expect(matcher).not.toContain('input.includes(region)');
    expect(matcher).toContain('resolveLaunchRegion(input) !== ""');
  });

  it("preliminary text alone is explicitly not treated as verified geographical coverage", () => {
    expect(resolveLaunchRegion("NotSandton Road, Cape Town")).toBe("");
    expect(server).toContain("Preliminary region-name matching only.");
  });
});
