import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
const policies = [
  vercel.headers.find((rule: { source: string }) => rule.source === "/(.*)")
    .headers.find((header: { key: string }) => header.key === "Content-Security-Policy").value,
  readFileSync("public/_headers", "utf8").match(/Content-Security-Policy: (.+)/)![1],
] as string[];

const directives = (policy: string) => policy.split(";").map(value => value.trim().split(/\s+/)).filter(([name]) => name);

describe.each(policies)("provider CSP: %s", policy => {
  const entries = directives(policy);
  const sources = new Map(entries.map(([name, ...values]) => [name, values]));

  it("has one unambiguous directive for each capability", () => {
    expect(new Set(entries.map(([name]) => name)).size).toBe(entries.length);
    expect(sources.get("default-src")).toEqual(["'self'"]);
    expect(sources.get("script-src")).toEqual(["'self'"]);
    expect(sources.get("object-src")).toEqual(["'none'"]);
  });

  it("permits the PayFast form posts and no other external form targets", () => {
    expect(sources.get("form-action")).toEqual([
      "'self'", "https://sandbox.payfast.co.za/eng/process", "https://www.payfast.co.za/eng/process",
    ]);
  });

  it("permits the default analytics endpoint without weakening frame isolation", () => {
    expect(sources.get("connect-src")).toContain("https://us.i.posthog.com");
    expect(sources.get("connect-src")).not.toContain("https:");
    expect(sources.get("connect-src")).not.toContain("*");
    expect(sources.get("frame-src")).toEqual(["'none'"]);
    expect(sources.get("frame-ancestors")).toEqual(["'none'"]);
  });
});

it("keeps the Vercel and legacy static provider policies identical", () => {
  expect(directives(policies[0])).toEqual(directives(policies[1]));
});
