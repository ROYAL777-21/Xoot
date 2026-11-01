import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

// Execute the actual route's pre-write selection block, excluding its remote Auth SDK.
// This proves a request is refused rather than silently sliced; no database/Auth proof.
const source = readFileSync("supabase/functions/create-booking-request/index.ts", "utf8");
const services = source.match(/const multiWorkerServices = new Set\(\[[^\]]*\]\);/)?.[0];
const start = source.indexOf("\n", source.indexOf("if (xooterIds.length === 0)"));
const end = source.indexOf("const bookedHours", start);
if (!services || start < 0 || end <= start) throw new Error("Legacy request selection block changed; update executable coverage");
function select(serviceType: string, requestedWorkerCount: number, xooterIds: string[]) {
  return runInNewContext(`(() => { ${services}\n${source.slice(start, end)}\nreturn {status:200,selectedXooterIds}; })()`, {
    serviceType, requestedWorkerCount, xooterIds, origin: null,
    json: (data: unknown, status: number) => ({ status, data }),
  }) as { status: number; selectedXooterIds?: string[] };
}
describe("legacy booking-request crew boundary", () => {
  it.each(["residential", "express", "deep", "premium", "moving"])("rejects crafted %s crews before creating any row", service => {
    expect(select(service, 2, ["one", "two"]).status).toBe(400);
    expect(select(service, 2, ["one"]).status).toBe(400);
    expect(select(service, 1, ["one", "two"]).status).toBe(400);
    expect(select(service, 1, ["one"]).status).toBe(200);
  });
  it.each(["office", "airbnb"])("preserves %s's existing eligible selection", service => {
    expect(select(service, 2, ["one", "two"]).selectedXooterIds).toHaveLength(2);
  });
});
