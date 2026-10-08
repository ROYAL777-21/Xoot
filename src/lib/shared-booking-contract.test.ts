import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SERVER_CONTRACTS, BOOKING_MODULES, banner, serverBanner } from "../../scripts/build/sync-shared-native.mjs";
import { bookingCrewCap, bookingHomeSize, bookingStartSlots, createBookingInput, readBookingQuoteResponse } from "./booking-flow";
import { crewCapFor, crewHours } from "../../supabase/functions/_shared/pricing";
import { bookingVisitDurationHours } from "./booking-contract";
import { parseBookingQuoteInput } from "../../supabase/functions/_shared/booking-quote";

describe("shared booking contract", () => {
  it.each(SERVER_CONTRACTS)("keeps server, web and native %s identical", name => {
    const source = readFileSync(`supabase/functions/_shared/${name}`, "utf8").replace(/\r\n/g, "\n");
    for (const folder of ["src/lib", "mobile/src/generated"]) {
      expect(readFileSync(`${folder}/${name}`, "utf8").replace(/\r\n/g, "\n")).toBe(serverBanner(name) + source);
    }
    expect(source).not.toMatch(/^\s*import\s/m);
  });
  it.each(BOOKING_MODULES)("keeps native %s identical with only local contract imports", name => {
    const source = readFileSync(`src/lib/${name}`, "utf8").replace(/\r\n/g, "\n");
    expect(readFileSync(`mobile/src/generated/${name}`, "utf8").replace(/\r\n/g, "\n")).toBe(banner(name) + source);
    const imports = source.match(/^import .* from .*$/gm) ?? [];
    expect(imports).toHaveLength(1);
    expect(imports[0]).toContain('from "./booking-contract"');
  });
  it("keeps visible crew caps aligned with the server", () => {
    for (const service of ["regular", "airbnb", "express", "office", "moving"] as const) {
      for (const size of ["small", "medium", "large"] as const) expect(bookingCrewCap(service, size)).toBe(crewCapFor(service, size));
    }
  });
  it("uses the handoff room-size boundaries including larger bathroom counts", () => {
    expect(bookingHomeSize(1, 1)).toBe("small");
    expect(bookingHomeSize(2, 1)).toBe("medium");
    expect(bookingHomeSize(1, 2)).toBe("medium");
    expect(bookingHomeSize(4, 1)).toBe("large");
    expect(bookingHomeSize(2, 3)).toBe("large");
  });
  it("offers future SAST slots, observes the Airbnb boundary and starts without cover", () => {
    const now = Date.parse("2026-09-27T11:45:00Z");
    expect(bookingStartSlots({ ...createBookingInput("airbnb", now), date: "2026-09-27", hours: 5.5, crewSize: 2 }, now)).toEqual(["14:00"]);
    expect(createBookingInput("express", now)).toMatchObject({ hours: 1, date: "2026-09-28", coverRequested: false });
  });
  it("uses the same approved duration as the pricing module for solo and crew visits", () => {
    const base = createBookingInput();
    for (let hours = 1; hours <= 10; hours += .5) for (const crewSize of [1,2,3,4]) {
      const input = { ...base, hours, crewSize, addOns: ["inside_fridge"] as const };
      expect(bookingVisitDurationHours({ ...input, addOns: [...input.addOns] })).toBe(crewSize === 1 ? hours + 1 : crewHours(hours + 1, crewSize));
    }
  });
  it("offers only server-valid starts with extras, service corrections and crews", () => {
    const now = Date.parse("2026-09-27T06:00:00Z");
    for (const input of [
      { ...createBookingInput("moving", now), date: "2026-09-28", hours: 8 },
      { ...createBookingInput("regular", now), date: "2026-09-28", hours: 5.5, addOns: ["inside_fridge"] as const },
      { ...createBookingInput("regular", now), propertyType: "office" as const, date: "2026-09-28", hours: 4, crewSize: 2 },
    ]) {
      const draft = { ...input, addOns: [...input.addOns] };
      const slots = bookingStartSlots(draft, now);
      expect(slots.length).toBeGreaterThan(0);
      for (const time of slots) expect(() => parseBookingQuoteInput({ ...draft, time }, now)).not.toThrow();
      expect(() => parseBookingQuoteInput({ ...draft, time: "17:00" }, now)).toThrow(/17:00/);
    }
  });
  it("rejects old, malformed or non-reconciling quote responses", () => {
    for (const value of [null, {}, { quote: { total: 0 } }, { quote: { contractVersion: 1, totalCents: 0, lines: [] } }]) {
      expect(() => readBookingQuoteResponse(value)).toThrow();
    }
  });
});
