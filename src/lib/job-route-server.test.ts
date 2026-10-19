import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  permanentFreeGeocodeUrl, parseServerRoute, parseSouthAfricanDestination,
  readFreshStoredJobFix, serverDirectionsUrl,
} from "../../supabase/functions/_shared/job-route";

describe("private GPS-to-road ETA backend", () => {
  const now = Date.parse("2026-10-19T08:30:00Z");
  const fix = {
    latitude: -26.107, longitude: 28.056, accuracy_m: 15, xooter_id: "worker-a",
    recorded_at: new Date(now - 15_000).toISOString(),
    expires_at: new Date(now + 40_000).toISOString(),
  };
  const outsideZone = { latitude: -29.61, longitude: 30.4 };
  const destination = { latitude: -26.07, longitude: 28.11 };

  it("accepts a current authorised point even when physically outside service zones", () => {
    expect(readFreshStoredJobFix(fix, "worker-a", now)).toEqual({
      latitude: fix.latitude, longitude: fix.longitude, recordedAt: fix.recorded_at,
    });
    expect(serverDirectionsUrl(outsideZone, destination, "pk.routing-test")).toContain(
      "30.400000,-29.610000;28.110000,-26.070000",
    );
  });

  it("rejects revoked/mismatched workers, stale, expired, poor or impossible fixes", () => {
    expect(readFreshStoredJobFix(fix, "worker-b", now)).toBeNull();
    expect(readFreshStoredJobFix({ ...fix, recorded_at: new Date(now - 61_000).toISOString() }, "worker-a", now)).toBeNull();
    expect(readFreshStoredJobFix({ ...fix, expires_at: new Date(now - 1).toISOString() }, "worker-a", now)).toBeNull();
    expect(readFreshStoredJobFix({ ...fix, accuracy_m: 210 }, "worker-a", now)).toBeNull();
    expect(readFreshStoredJobFix({ ...fix, longitude: NaN }, "worker-a", now)).toBeNull();
    expect(readFreshStoredJobFix({ ...fix, expires_at: new Date(now + 500_000).toISOString() }, "worker-a", now)).toBeNull();
  });

  it("geocodes only a plausible saved South African address with no permanent storage", () => {
    const url = permanentFreeGeocodeUrl("14 Fredman Drive, Sandton", "pk.routing-test");
    expect(url).not.toBeNull();
    const params = new URL(url!).searchParams;
    expect(params.get("permanent")).toBe("false");
    expect(params.get("country")).toBe("za");
    expect(params.get("limit")).toBe("1");
    expect(permanentFreeGeocodeUrl("x", "pk.routing-test")).toBeNull();
    expect(permanentFreeGeocodeUrl("14 Fredman Drive", "invalid-token")).toBeNull();
    expect(parseSouthAfricanDestination({ features: [{
      properties: { feature_type: "address", context: { country: { country_code: "za" } } },
      geometry: { coordinates: [28.11, -26.07] },
    }] })).toEqual(destination);
    expect(parseSouthAfricanDestination({ features: [{
      properties: { feature_type: "address", context: { country: { country_code: "fr" } } },
      geometry: { coordinates: [28.11, -26.07] },
    }] })).toBeNull();
  });

  it("rejects provider route failures instead of inventing an arrival estimate", () => {
    expect(parseServerRoute({ code: "Ok", routes: [{ duration: 1210, distance: 9200 }] }))
      .toEqual({ minutes: 21, kilometres: 9.2 });
    expect(parseServerRoute({ code: "NoRoute", routes: [] })).toBeNull();
    expect(parseServerRoute({ code: "Ok", routes: [{ duration: "120", distance: 50 }] })).toBeNull();
  });

  it("enforces consented server ownership and forbids coordinates/address in ETA request", () => {
    const edge = readFileSync(join(process.cwd(), "supabase/functions/xoot-job-location/index.ts"), "utf8");
    expect(edge).toContain('action === "eta"');
    expect(edge).toContain('select("id,user_id,xooter_id,status,address,');
    expect(edge).toContain("booking.address");
    expect(edge).toContain('db.rpc("consume_rate_limit"');
    expect(edge).toContain('Deno.env.get("MAPBOX_DIRECTIONS_TOKEN")');
    expect(edge).not.toContain("body.destinationAddress");
    expect(edge).not.toContain("body.origin");
    expect(edge).not.toContain("isApprovedLaunchRegion");
    expect(edge).not.toContain("XOOT_STRICT_GEO_COVERAGE");
  });
});
