// Offline provider contract tests; these do not replace real JWT/provider acceptance.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assessVerifiedCoverage } from "../../supabase/functions/_shared/verified-coverage";

const geometry = JSON.parse(readFileSync("data/service-zones/gauteng/gauteng.geojson", "utf8")).features[0].geometry;
const zone = { id: "fixture-only", name: "Gauteng fixture", geometry, active: true,
  approved_at: "2026-10-19T00:00:00Z", service_types: ["regular"] };
function fixture(zones: unknown[] = [zone], budget = true) {
  const query = { select: vi.fn(() => query), eq: vi.fn(() => query), limit: vi.fn(async () => ({ data: zones, error: null })) };
  const rpc = vi.fn(async () => ({ data: budget, error: null }));
  const db = { from: vi.fn(() => query), rpc } as unknown as Parameters<typeof assessVerifiedCoverage>[0]["db"];
  return { db, rpc };
}
const result = (coordinates = [28.0473, -26.2041], country = "za", accuracy = "rooftop") => ({ features: [{
  geometry: { type: "Point", coordinates }, properties: { feature_type: "address",
    match_code: { confidence: "exact", address_number: "matched", street: "matched" },
    context: { country: { country_code: country } }, coordinates: { accuracy } },
}] });
const base = { address: "1 Example Street, Johannesburg", service: "regular", actorId: "unit-actor", token: "pk.unit-test-only-token" };
afterEach(() => vi.unstubAllGlobals());

describe("offline server geocoder and full Gauteng polygon contract", () => {
  it("avoids provider charges for absent zones, missing credentials and exhausted budget", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    expect(await assessVerifiedCoverage({ ...base, ...fixture([]) })).toEqual({ state: "review", reason: "no_approved_zone" });
    expect(await assessVerifiedCoverage({ ...base, ...fixture(), token: "" })).toEqual({ state: "unavailable", reason: "geocoding_not_configured" });
    expect(await assessVerifiedCoverage({ ...base, ...fixture([zone], false) })).toEqual({ state: "rate_limited", reason: "coverage_check_limit" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("uses server Permanent ZA address geocoding and returns geography without a capacity claim", async () => {
    const fetcher = vi.fn(async () => Response.json(result())); vi.stubGlobal("fetch", fetcher);
    const f = fixture(); const verdict = await assessVerifiedCoverage({ ...base, ...f });
    expect(verdict).toEqual({ state: "available", zoneId: zone.id, zoneName: zone.name });
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    const params = new URL(url).searchParams;
    expect(params.get("country")).toBe("za"); expect(params.get("permanent")).toBe("true");
    expect(params.get("types")).toBe("address"); expect(params.get("autocomplete")).toBe("false");
    expect(options.cache).toBe("no-store");
    expect(f.rpc).toHaveBeenCalledWith("xoot_consume_coverage_query", { p_user_id: "unit-actor" });
    expect(verdict).not.toHaveProperty("workerAvailable");
  });
  it("does not convert a suburb string, outside province, wrong country or coarse result into coverage", async () => {
    for (const [body, reason] of [
      [result([31.0218, -29.8587]), "outside_approved_zones"],
      [result([28.0473, -26.2041], "us"), "address_not_verified"],
      [result([28.0473, -26.2041], "za", "interpolated"), "address_requires_pin_review"],
      [{ features: [] }, "address_not_verified"],
    ] as const) {
      vi.stubGlobal("fetch", vi.fn(async () => Response.json(body)));
      expect(await assessVerifiedCoverage({ ...base, ...fixture(), address: "Sandton, Outside Gauteng" })).toEqual({ state: "review", reason });
    }
  });
  it("fails closed on provider denial, bad JSON and network failure", async () => {
    for (const fetcher of [async () => new Response(null, { status: 403 }),
      async () => new Response("not-json"), async () => { throw new Error("offline"); }]) {
      vi.stubGlobal("fetch", fetcher);
      expect((await assessVerifiedCoverage({ ...base, ...fixture() })).state).toBe("unavailable");
    }
  });
  it("requires a strong query match even when the returned address has a rooftop point", async () => {
    for (const match of [undefined, null, {},
      { confidence: "low", address_number: "matched", street: "matched" },
      { confidence: "medium", address_number: "matched", street: "matched" },
      { confidence: "high", address_number: "plausible", street: "matched" },
      { confidence: "exact", address_number: "unmatched", street: "matched" },
      { confidence: "high", address_number: "matched", street: "unmatched" },
    ]) {
      const body = result();
      const feature = body.features[0];
      vi.stubGlobal("fetch", vi.fn(async () => Response.json({ features: [{ ...feature,
        properties: { ...feature.properties, match_code: match } }] })));
      expect(await assessVerifiedCoverage({ ...base, ...fixture() })).toEqual({ state: "review", reason: "address_match_requires_review" });
    }
  });
  it.each(["exact", "high"])("accepts %s matches with a matched house number and street", async confidence => {
    const body = result(); body.features[0].properties.match_code.confidence = confidence;
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(body)));
    expect((await assessVerifiedCoverage({ ...base, ...fixture() })).state).toBe("available");
  });
});
