import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { requestLiveRoadEstimate } from "./mapbox-live-routing";

afterEach(() => { vi.unstubAllGlobals(); });

describe("Mapbox live customer traffic estimates", () => {
  const worker = { latitude: -26.107, longitude: 28.056 };
  const clock = Date.parse("2026-10-17T10:30:00.000Z");
  const captured = new Date(clock - 15_000).toISOString();
  const address = "14 Fredman Drive, Sandton, South Africa";

  it("rejects unconsented/stale input upstream and never makes a provider call", async () => {
    const mock = vi.fn();
    vi.stubGlobal("fetch", mock);
    const ctrl = new AbortController();
    expect(await requestLiveRoadEstimate(worker, address, "sk.private", captured, ctrl.signal, clock)).toBeNull();
    expect(await requestLiveRoadEstimate(worker, address, "pk.test", new Date(clock - 61_000).toISOString(), ctrl.signal, clock)).toBeNull();
    expect(await requestLiveRoadEstimate(worker, "x", "pk.test", captured, ctrl.signal, clock)).toBeNull();
    ctrl.abort();
    expect(await requestLiveRoadEstimate(worker, address, "pk.test", captured, ctrl.signal, clock)).toBeNull();
    expect(mock).not.toHaveBeenCalled();
  });

  it("uses temporary ZA address lookup and live traffic routing without persisting anything", async () => {
    const seen: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string, options: RequestInit) => {
      seen.push(input);
      expect(options.cache).toBe("no-store");
      if (seen.length === 1) return {
        ok: true,
        json: async () => ({ features: [{
          properties: { feature_type: "address", context: { country: { country_code: "ZA" } } },
          geometry: { coordinates: [28.11, -26.07] },
        }] }),
      };
      return { ok: true, json: async () => ({ code: "Ok", routes: [{ duration: 1100, distance: 7250 }] }) };
    }));
    const result = await requestLiveRoadEstimate(worker, address, "pk.test", captured, new AbortController().signal, clock);
    expect(result).toEqual({ minutes: 19, kilometres: 7.3, fixRecordedAt: captured, calculatedAt: new Date(clock).toISOString() });
    expect(seen).toHaveLength(2);
    expect(new URL(seen[0]).searchParams.get("permanent")).toBe("false");
    expect(new URL(seen[0]).searchParams.get("country")).toBe("za");
    expect(seen[1]).toContain("/directions/v5/mapbox/driving-traffic/");
  });

  it("never displays an estimate after routing failure or a foreign ambiguous address", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));
    expect(await requestLiveRoadEstimate(worker, address, "pk.test", captured, new AbortController().signal, clock)).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ features: [{ properties: { feature_type: "place", context: { country: { country_code: "FR" } } }, geometry: { coordinates: [2, 48] } }] }),
    })));
    expect(await requestLiveRoadEstimate(worker, address, "pk.test", captured, new AbortController().signal, clock)).toBeNull();
  });
});

describe("Mapbox route helpers remain identical on native and web", () => {
  for (const module of ["mapbox-directions.ts", "mapbox-live-routing.ts"]) {
    it(module + " is a tested mirror, not an unsynchronised algorithm", () => {
      const source = readFileSync(join(process.cwd(), "src/lib", module), "utf8");
      const native = readFileSync(join(process.cwd(), "mobile/src/lib", module), "utf8");
      expect(native).toBe("// Exact native mirror of src/lib/" + module +
        "; parity enforced by mapbox-live-routing.test.ts.\n" + source);
    });
  }
});
