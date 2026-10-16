import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mapboxDirectionsUrl, mapboxRoutingDestinationUrl, parseMapboxRoadEstimate, readTemporaryDestination } from "./mapbox-directions";

describe("authorised, explicit Mapbox driving estimate", () => {
  const start = { longitude: 28.056, latitude: -26.108 };
  const destination = { longitude: 28.11, latitude: -26.07 };

  it("never initiates routing with secret token, invalid positions or private data in code", () => {
    expect(mapboxDirectionsUrl(start, destination, "sk.secret")).toBeNull();
    expect(mapboxDirectionsUrl({ longitude: NaN, latitude: 20 }, destination, "pk.test")).toBeNull();
    expect(mapboxDirectionsUrl({ longitude: 181, latitude: 0 }, destination, "pk.test")).toBeNull();
    expect(mapboxRoutingDestinationUrl("1 Road, Sandton", "sk.private")).toBeNull();
    expect(mapboxRoutingDestinationUrl("a", "pk.public")).toBeNull();
  });

  it("uses ZA temporary geocoding and true road traffic directions at request time", () => {
    const geo = new URL(mapboxRoutingDestinationUrl("14 Fredman Drive, Sandton, South Africa", "pk.test")!);
    expect(geo.pathname).toBe("/search/geocode/v6/forward");
    expect(geo.searchParams.get("permanent")).toBe("false");
    expect(geo.searchParams.get("autocomplete")).toBe("false");
    expect(geo.searchParams.get("country")).toBe("za");
    const directions = new URL(mapboxDirectionsUrl(start, destination, "pk.test")!);
    expect(directions.pathname).toBe("/directions/v5/mapbox/driving-traffic/28.056000,-26.108000;28.110000,-26.070000");
    expect(directions.searchParams.get("overview")).toBe("false");
  });

  it("rejects unverified foreign or non-street destinations", () => {
    const feature = (code: string, type: string, coords: unknown) => ({
      features: [{ properties: { feature_type: type, context: { country: { country_code: code } } },
        geometry: { coordinates: coords } }],
    });
    expect(readTemporaryDestination(feature("ZA", "address", [28.1, -26.11]))).toEqual({ longitude: 28.1, latitude: -26.11 });
    expect(readTemporaryDestination(feature("GB", "address", [28.1, -26.11]))).toBeNull();
    expect(readTemporaryDestination(feature("ZA", "place", [28.1, -26.11]))).toBeNull();
    expect(readTemporaryDestination(feature("ZA", "address", ["28", -26]))).toBeNull();
    expect(readTemporaryDestination({ features: [] })).toBeNull();
  });

  it("displays only valid route data and never invents an ETA", () => {
    expect(parseMapboxRoadEstimate({ code: "Ok", routes: [{ duration: 1081.5, distance: 10440 }] }))
      .toEqual({ minutes: 19, kilometres: 10.4 });
    for (const body of [null, {}, { code: "NoRoute", routes: [] }, { code: "Ok", routes: [] },
      { code: "Ok", routes: [{ duration: NaN, distance: 8000 }] },
      { code: "Ok", routes: [{ duration: 10, distance: -20 }] }]) {
      expect(parseMapboxRoadEstimate(body)).toBeNull();
    }
  });
});

describe("route UX privacy", () => {
  const page = readFileSync(join(process.cwd(), "src/pages/app/BookingDetail.tsx"), "utf8");
  const worker = readFileSync(join(process.cwd(), "src/components/xoot/WorkerRoadEstimate.tsx"), "utf8");
  it("mounts only for assigned worker on active booking, preserving customer no-GPS fallback", () => {
    expect(page).toContain("isAssignedXooter && activeVisit");
    expect(page).toContain("WorkerRoadEstimate bookingId={id} destinationAddress={booking.address}");
    expect(page).toContain("Live location is not available for this visit yet");
    expect(worker).toContain("getCurrentPosition(resolve, reject");
    expect(worker).toContain("enabledHighAccuracy").toBe(false);
    expect(worker).toContain("currentRequest.current?.abort()");
    expect(worker).toContain("Location permission");
    expect(worker).toContain("Neither is stored by this feature");
    expect(worker).not.toContain("watchPosition");
    expect(worker).not.toContain("setInterval");
  });
});
