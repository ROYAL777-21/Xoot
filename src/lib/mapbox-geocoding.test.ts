import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mapboxAddressSearchUrl, mapboxPermanentAddressUrl, parseMapboxAddressSuggestions } from "./mapbox-geocoding";

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

  it("only permits saving a Mapbox-suggested address after Permanent Geocoding confirmation", () => {
    const temporary = mapboxAddressSearchUrl("Midrand South Africa", "pk.test");
    const permanent = mapboxPermanentAddressUrl("dXJuOm1ieGFkcjpzeW50aGV0aWM", "pk.test");
    expect(new URL(temporary!).searchParams.get("permanent")).toBe("false");
    expect(new URL(permanent!).searchParams.get("permanent")).toBe("true");
    expect(new URL(permanent!).searchParams.get("autocomplete")).toBe("false");
    expect(new URL(permanent!).searchParams.get("country")).toBe("za");
    expect(mapboxPermanentAddressUrl("abc", "sk.secret")).toBeNull();
    expect(mapboxPermanentAddressUrl("a;b", "pk.test")).toBeNull();
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
  const detail = readFileSync(join(process.cwd(), "src/pages/app/BookingDetail.tsx"), "utf8");
  const address = readFileSync(join(process.cwd(), "src/components/xoot/VerifiedAddressInput.tsx"), "utf8");
  const booking = readFileSync(join(process.cwd(), "src/pages/app/BookingFlow.tsx"), "utf8");
  const areaMap = readFileSync(join(process.cwd(), "src/components/xoot/InteractiveServiceAreaMap.tsx"), "utf8");

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

  it("interactive website map uses Mapbox real tiles, mandatory branding and public suburb pins only", () => {
    expect(booking).toContain("showAreaMap && <div id=\"xoot-booking-service-map\"><InteractiveServiceAreaMap />");
    expect(booking).toContain('View interactive area map');
    expect(areaMap).toContain('void import("mapbox-gl")');
    expect(areaMap).toContain('mapbox://styles/mapbox/streets-v12');
    expect(areaMap).toContain('attributionControl: true');
    expect(areaMap).toContain('map?.remove()');
    expect(areaMap).toContain('window.clearTimeout(watchdog)');
    expect(areaMap).toContain('Try map again');
    expect(areaMap).toContain('not customer addresses or proof');
    expect(areaMap).not.toContain('navigator.geolocation');
    expect(areaMap).not.toContain('booking.address');
    expect(areaMap).not.toContain('worker.coordinates');
    expect(areaMap).not.toContain('attributionControl: false');
  });

  it("manual address fallback is available and substring matching cannot confirm coverage", () => {
    expect(address).not.toContain("is in active Xoot coverage");
    expect(address).not.toContain("address.includes(region)");
    expect(address).toContain("Address lookup or confirmation is unavailable");
    expect(address).toContain("Enable Mapbox suggestions");
    expect(address).toContain("searchEnabled && selectedText !== value");
    expect(address).toContain("Optional: sends what you type to Mapbox");
    expect(address).toContain("aria-pressed={searchEnabled}");
    expect(address).toContain("availability are not yet confirmed");
    expect(address).toContain("no exact coordinates are stored");
    expect(address).toContain("mapboxPermanentAddressUrl(suggestion.id, browserToken)");
    expect(address).toContain("const confirmed = parseMapboxAddressSuggestions(body)");
    expect(address).not.toContain("onChange(suggestion.label)");
    expect(booking).toContain("<VerifiedAddressInput value={address}");
    expect(booking).toContain("addressEdited.current = true");
    expect(address).toContain("controller.abort()");
    expect(address).toContain("cache: \"no-store\"");
  });
});
