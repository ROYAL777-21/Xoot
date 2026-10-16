import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mapboxAddressSearchUrl, parseMapboxAddressSuggestions } from "./mapbox-geocoding";

const suggestion = (id: string, label: string, country = "ZA", feature_type = "address") => ({
  properties: { mapbox_id: id, full_address: label, feature_type,
    context: { country: { country_code: country } } },
});

describe("Mapbox temporary South African address search", () => {
  it("only builds temporary, country-restricted search with a public browser token", () => {
    const url = mapboxAddressSearchUrl(" 123 Main Road,   Sandton", "pk.test");
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.origin).toBe("https://api.mapbox.com");
    expect(parsed.pathname).toBe("/search/geocode/v6/forward");
    expect(parsed.searchParams.get("q")).toBe("123 Main Road, Sandton");
    expect(parsed.searchParams.get("country")).toBe("za");
    expect(parsed.searchParams.get("permanent")).toBe("false");
    expect(parsed.searchParams.get("limit")).toBe("5");
    expect(parsed.searchParams.get("access_token")).toBe("pk.test");
  });

  it("never queries with absent, private or oversized unbounded input", () => {
    expect(mapboxAddressSearchUrl("Main Road", "")).toBeNull();
    expect(mapboxAddressSearchUrl("Main Road", "sk.private")).toBeNull();
    expect(mapboxAddressSearchUrl("a", "pk.test")).toBeNull();
    expect(mapboxAddressSearchUrl("x".repeat(161), "pk.test")).toBeNull();
    expect(mapboxAddressSearchUrl(Array(21).fill("word").join(" "), "pk.test")).toBeNull();
  });

  it("accepts bounded South African suggestions, excludes other countries and duplicates", () => {
    const input = {
      features: [
        suggestion("one", "123 Main Road, Sandton, South Africa"),
        suggestion("not-za", "123 Main Road, UK", "GB"),
        suggestion("one", "123 Main Road duplicate, South Africa"),
        suggestion("two", "Rosebank, South Africa", "ZA", "neighborhood"),
        suggestion("three", "Somewhere, South Africa", "ZA", "unknown"),
      ],
    };
    expect(parseMapboxAddressSuggestions(input)).toEqual([
      { id: "one", label: "123 Main Road, Sandton, South Africa", featureType: "address" },
      { id: "two", label: "Rosebank, South Africa", featureType: "neighborhood" },
    ]);
  });

  it("rejects missing/malformed responses without leaking coordinates", () => {
    for (const value of [null, {}, { features: "string" }, { features: [null, {}, { properties: {} }] }]) {
      expect(parseMapboxAddressSuggestions(value)).toEqual([]);
    }
    const raw = { features: [{ ...suggestion("id", "Road, Johannesburg, South Africa"), geometry: { coordinates: [28.06, -26.1] } }] };
    const result = parseMapboxAddressSuggestions(raw);
    expect(JSON.stringify(result)).not.toContain("28.06");
    expect(result[0]).not.toHaveProperty("coordinates");
  });
});

describe("Mapbox consumer safety regressions", () => {
  const detail = readFileSync(new URL("../pages/app/BookingDetail.tsx", import.meta.url), "utf8");
  const address = readFileSync(new URL("../components/xoot/VerifiedAddressInput.tsx", import.meta.url), "utf8");

  it("never fabricates live Xooter coordinates or starts a 12-minute ticking ETA", () => {
    expect(detail).not.toContain("setEta");
    expect(detail).not.toContain("setInterval(() => setEta");
    expect(detail).not.toContain("etaMinutes: liveStatus");
    expect(detail).not.toContain("Arriving in ${eta}");
    expect(detail).toContain("ETA not available");
    expect(detail).toContain("No live GPS feed or calculated arrival time");
    expect(detail).toContain("Live location is not available");
    expect(detail).not.toContain("Share ETA</Button>");
  });

  it("manual address fallback is available and substring matching cannot confirm coverage", () => {
    expect(address).not.toContain("is in active Xoot coverage");
    expect(address).not.toContain("address.includes(region)");
    expect(address).toContain("Address suggestions are unavailable");
    expect(address).toContain("availability are not yet confirmed");
    expect(address).toContain("No exact coordinates are stored");
    expect(address).toContain("controller.abort()");
    expect(address).toContain("cache: \"no-store\"");
  });
});
