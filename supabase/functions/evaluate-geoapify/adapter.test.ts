import { describe, expect, it, vi } from "vitest";
import { attributionFor, evaluateResponse, fixtureId, PUBLIC_FIXTURES } from "./adapter";
import { evaluatePublicFixture } from "./provider";

export const civicResponse = () => ({ results: [{ housenumber: "1035", street: "Frances Baard St", city: "Pretoria", state: "Gauteng",
  country_code: "za", lat: -25.75, lon: 28.23, result_type: "building",
  rank: { confidence: 1, confidence_city_level: 1, confidence_street_level: 1, confidence_building_level: 1, match_type: "full_match" },
  datasource: { sourcename: "openstreetmap", attribution: "© OpenStreetMap contributors", license: "Open Database License", url: "https://www.openstreetmap.org/copyright" },
}] });
const jsonResponse = (value: unknown) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });

describe("Geoapify public fixture adapter (synthetic provider responses, no network)", () => {
  it("accepts only own fixed fixture IDs, never a customer address or prototype property", () => {
    expect(fixtureId("gcis_head_office")).toBe(true);
    for (const value of ["toString", "__proto__", "1035 Frances Baard Street", "", null, {}]) expect(fixtureId(value)).toBe(false);
    expect(Object.values(PUBLIC_FIXTURES).every(value => new URL(value.source).protocol === "https:")).toBe(true);
  });
  it("projects a high-confidence public building as a candidate, without inventing verification", () => {
    const report = evaluateResponse(civicResponse(), "gcis_head_office")!;
    expect(report.outcome).toBe("address_candidate"); expect(report.houseNumber).toBe("match");
    expect(report.confidence).toEqual({ overall: 1, city: 1, street: 1, building: 1 });
    expect(report).not.toHaveProperty("verifiedAddress"); expect(report).not.toHaveProperty("workerAvailable");
  });
  it.each(["us", "", "ZA"])("does not accept country %s despite a full_match", country => {
    const response = civicResponse(); response.results[0].country_code = country;
    expect(evaluateResponse(response, "gcis_head_office")?.outcome).toBe("needs_review");
  });
  it.each(["103", "1035A", "", "01035"])("does not accept a missing/different house number %s", number => {
    const response = civicResponse(); response.results[0].housenumber = number;
    expect(evaluateResponse(response, "gcis_head_office")?.outcome).toBe("needs_review");
  });
  it("does not label a street/suburb centroid as an exact building", () => {
    const response = civicResponse(); response.results[0].result_type = "street";
    expect(evaluateResponse(response, "gcis_head_office")?.outcome).toBe("needs_review");
  });
  it.each(["confidence", "confidence_city_level", "confidence_street_level", "confidence_building_level"] as const)("requires the actual %s, not a full_match label", field => {
    const response = civicResponse(); response.results[0].rank[field] = 0.4;
    expect(evaluateResponse(response, "gcis_head_office")?.outcome).toBe("needs_review");
  });
  it("retains absent building confidence as null rather than a fabricated score", () => {
    const response = civicResponse(); Reflect.deleteProperty(response.results[0].rank, "confidence_building_level");
    const report = evaluateResponse(response, "gcis_head_office")!;
    expect(report.confidence.building).toBeNull(); expect(report.outcome).toBe("needs_review");
  });
  it.each([NaN, Infinity, 91])("rejects invalid WGS84 latitude %s", latitude => {
    const response = civicResponse(); response.results[0].lat = latitude;
    const report = evaluateResponse(response, "gcis_head_office")!;
    expect(report.location.latitude).toBeNull(); expect(report.outcome).toBe("needs_review");
  });
  it("requires matching street, locality and province", () => {
    for (const field of ["street", "city", "state"] as const) {
      const response = civicResponse(); response.results[0][field] = "Other place";
      expect(evaluateResponse(response, "gcis_head_office")?.outcome).toBe("needs_review");
    }
  });
  it("reports a no-house-number public place as a place candidate only", () => {
    const response = civicResponse(); response.results[0].street = "Government Ave";
    Reflect.set(response.results[0], "name", "Union Buildings");
    const report = evaluateResponse(response, "union_buildings")!;
    expect(report.outcome).toBe("place_candidate"); expect(report.houseNumber).toBe("not_requested");
  });
  it("does not accept another building along the named public place's street", () => {
    const response = civicResponse(); response.results[0].street = "Government Ave";
    Reflect.set(response.results[0], "name", "Different civic building");
    expect(evaluateResponse(response, "union_buildings")?.outcome).toBe("needs_review");
  });
  it("does not fabricate a data-source licence or emit hostile upstream HTML/URLs", () => {
    const response = civicResponse(); response.results[0].datasource = { sourcename: "other", attribution: "<img src=x onerror=alert(1)>",
      license: "unreviewed", url: "https://attacker.invalid/?apiKey=synthetic-private-value" };
    const report = evaluateResponse(response, "gcis_head_office")!;
    expect(report.outcome).toBe("needs_review"); expect(attributionFor(report).reviewRequired).toBe(true);
    expect(attributionFor(report).dataSource).toBeNull(); expect(JSON.stringify(report)).not.toMatch(/attacker|apiKey|onerror/);
  });
  it("emits both reviewed attribution links and nothing from the arbitrary provider body", () => {
    const response = { ...civicResponse(), apiKey: "synthetic-never-returned", query: { apiKey: "synthetic-never-returned" } };
    const report = evaluateResponse(response, "gcis_head_office")!;
    expect(attributionFor(report).dataSource?.url).toBe("https://www.openstreetmap.org/copyright");
    expect(attributionFor(report).geoapify.url).toBe("https://www.geoapify.com/");
    expect(JSON.stringify(report)).not.toContain("synthetic-never-returned");
  });
  it("bounds candidate count and distinguishes empty results from an invalid response", () => {
    expect(evaluateResponse({ results: [] }, "gcis_head_office")?.outcome).toBe("no_results");
    for (const body of [null, [], {}, { results: {} }, { results: Array(4).fill({}) }]) expect(evaluateResponse(body, "gcis_head_office")).toBeNull();
  });
});

describe("one-shot provider transport", () => {
  it("sends only fixed public text, explicit ZA filtering and no ambient credential/IP bias", async () => {
    const request = vi.fn(async () => jsonResponse(civicResponse()));
    expect((await evaluatePublicFixture("gcis_head_office", "synthetic-provider-key", request, () => true)).reason).toBe("provider_response");
    const [input, init] = request.mock.calls[0] as unknown as [URL, RequestInit];
    expect(input.origin).toBe("https://api.geoapify.com"); expect(input.pathname).toBe("/v1/geocode/search");
    expect(input.searchParams.get("text")).toBe(PUBLIC_FIXTURES.gcis_head_office.query);
    expect(input.searchParams.get("filter")).toBe("countrycode:za"); expect(input.searchParams.get("bias")).toBe("countrycode:none");
    expect(init.redirect).toBe("error"); expect(init.credentials).toBe("omit"); expect(init.headers).toEqual({ Accept: "application/json" });
  });
  it("does not dispatch after the one-use authorization window", async () => {
    const request = vi.fn();
    expect((await evaluatePublicFixture("state_theatre", "synthetic-provider-key", request, () => false)).reason).toBe("dispatch_window_elapsed");
    expect(request).not.toHaveBeenCalled();
  });
  it("never retries or falls back after an ambiguous keyed URL error", async () => {
    const request = vi.fn(async () => { throw new Error("https://api.geoapify.com/?apiKey=synthetic-provider-key"); });
    const result = await evaluatePublicFixture("state_theatre", "synthetic-provider-key", request, () => true);
    expect(result).toEqual({ reason: "provider_unavailable", report: null }); expect(request).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain("synthetic-provider-key");
  });
  it("refuses HTTP errors, redirects, non-JSON, oversized and malformed results", async () => {
    for (const response of [new Response("echo-key", { status: 429 }), new Response("redirect", { status: 302 }),
      new Response("not-json"), jsonResponse({ results: Array(4).fill({}) }), jsonResponse({ noise: "x".repeat(65_536) })]) {
      const request = vi.fn(async () => response);
      expect((await evaluatePublicFixture("state_theatre", "synthetic-provider-key", request, () => true)).report).toBeNull();
      expect(request).toHaveBeenCalledTimes(1);
    }
  });
});
