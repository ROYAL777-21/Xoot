import { describe, expect, it } from "vitest";
import { BOOKING_ADD_ONS, type BookingQuoteInput } from "../../supabase/functions/_shared/booking-contract";
import { BookingQuoteValidationError, fingerprintBookingQuote, parseBookingQuoteInput, quoteBooking, type BookingQuoteFacts } from "../../supabase/functions/_shared/booking-quote";

const NOW = Date.parse("2026-09-27T10:00:00+02:00");
const valid = (patch: Partial<BookingQuoteInput> = {}): BookingQuoteInput => ({
  contractVersion: 1, service: "airbnb", propertyType: "airbnb", homeSize: "small",
  hours: 5.5, crewSize: 2, addOns: [], linen: "replace", date: "2026-10-01",
  time: "07:00", frequency: "once", repeatDays: [], referralCode: "",
  requestedCreditCents: 0, coverRequested: false, ...patch,
});
const facts = (patch: Partial<BookingQuoteFacts> = {}): BookingQuoteFacts => ({
  buyerId: "buyer-1", carePlusMember: false, availableCreditCents: 0,
  referralRecord: null, completedBookingCount: 0, hasPriorRedemption: false,
  coverAvailable: false, ...patch,
});
const parsed = (patch: Partial<BookingQuoteInput> = {}) => parseBookingQuoteInput(valid(patch), NOW);
const quoted = (patch: Partial<BookingQuoteInput> = {}, f: Partial<BookingQuoteFacts> = {}) => quoteBooking(parsed(patch), facts(f));

describe("booking quote contract", () => {
  it("rejects visits ending after 17:00 including extras, but admits crew-adjusted finish boundaries", () => {
    expect(() => parsed({ crewSize: 1, time: "12:00" })).toThrow(/17:00/);
    expect(() => parsed({ crewSize: 1, time: "11:30" })).not.toThrow();
    expect(() => parsed({ crewSize: 2, time: "14:00" })).not.toThrow();
    expect(() => parsed({ crewSize: 2, time: "14:00", addOns: ["restock_supplies"] })).toThrow(/17:00/);
    expect(() => parsed({ service: "express", propertyType: "office", hours: 1, crewSize: 1, linen: null, time: "16:00" })).toThrow(/17:00/);
  });
  it("uses the approved R393 two-person Airbnb price once, independently of a worker roster", () => {
    const q = quoted();
    expect(q.baseCents).toBe(39300);
    expect(q.totalCents).toBe(43200);
    expect(q.crewSize).toBe(2);
    expect(q.soloHours).toBe(5.5);
    expect(q.estimatedDurationHours).toBe(3);
    expect(q.lines.reduce((sum, line) => sum + line.amountCents, 0)).toBe(q.totalCents);
  });

  it("prices the master ladder, long-job floor, and each crew overhead without multiplying by headcount", () => {
    expect(quoted({ crewSize: 1 }).baseCents).toBe(34200);
    expect(quoted({ crewSize: 2 }).baseCents).toBe(39300);
    expect(quoted({ crewSize: 3 }).baseCents).toBe(42800);
    expect(quoted({ service: "office", propertyType: "office", hours: 2, linen: null, crewSize: 4 }).baseCents).toBe(45400);
    expect(quoted({ service: "regular", propertyType: "house", hours: 8, homeSize: "large", linen: null, crewSize: 1 }).baseCents).toBe(37600);
    expect(quoted({ service: "regular", propertyType: "house", hours: 10, linen: null, crewSize: 1 }).baseCents).toBe(47000);
    expect(quoted({ service: "express", propertyType: "flat", hours: 1, linen: null, crewSize: 1 }).baseCents).toBe(22000);
    expect(quoted({ service: "moving", propertyType: "empty", hours: 8, linen: null, crewSize: 1 }).baseCents).toBe(43000);
    expect(() => parsed({ crewSize: 4 })).toThrow(BookingQuoteValidationError); // small Airbnb cap 3
    expect(() => parsed({ service: "regular", propertyType: "house", linen: null, crewSize: 3 })).toThrow(BookingQuoteValidationError);
    expect(() => parsed({ service: "express", propertyType: "flat", linen: null, hours: 1, crewSize: 4 })).toThrow(BookingQuoteValidationError);
  });

  it("returns property correction, resets hours, and rejects stale extras", () => {
    const q = quoted({ service: "express", propertyType: "office", hours: 1, linen: null });
    expect(q.requestedService).toBe("express");
    expect(q.service).toBe("office");
    expect(q.serviceCorrection).toMatchObject({ from: "express", to: "office" });
    expect(q.input.hours).toBe(5);
    expect(q.baseCents).toBe(52000);
    expect(() => parsed({ service: "regular", propertyType: "empty", hours: 4, crewSize: 1, linen: null, addOns: ["inside_fridge"] })).toThrow(/not available/i);
  });

  it("prices R30 extras, R20 linen, duration, and the legacy high-demand slot", () => {
    const q = quoted({ hours: 5, crewSize: 1, linen: "wash_dry_repack", addOns: ["restock_supplies"], time: "11:00" });
    expect(q.addOnsCents).toBe(5000);
    expect(q.soloHours).toBe(6);
    expect(q.highDemandCents).toBe(0);
    const late = quoted({ service: "express", propertyType: "house", linen: null, hours: 1, crewSize: 1, time: "16:00" });
    expect(late.highDemandCents).toBe(3300);
    expect(() => parsed({ linen: "wash_dry_repack", hours: 4.5 })).toThrow(/5 hours/i);
    expect(() => parsed({ time: "14:30" })).toThrow(/07:00.*14:00/i);
    expect(() => parsed({ service: "regular", propertyType: "flat", linen: "replace" })).toThrow();
    expect(() => parsed({ service: "express", propertyType: "flat", hours: 1, crewSize: 1, linen: null, addOns: ["small_flatlet"] })).toThrow(/not available/i);
    expect(() => parsed({ service: "office", propertyType: "office", linen: null, addOns: ["clean_appliances"] })).toThrow(/not available/i);
    expect(BOOKING_ADD_ONS.small_flatlet.services).toEqual(["regular"]);
  });

  it("rejects malformed scalar values, prototype tricks, duplicate sets, and past SAST starts", () => {
    const invalid = [
      { hours: "5.5" }, { hours: NaN }, { hours: Infinity }, { hours: 5.25 },
      { crewSize: 0 }, { crewSize: 5 }, { service: "laundry" },
      { addOns: ["restock_supplies", "restock_supplies"] }, { addOns: ["__proto__"] },
      { repeatDays: [4, 4], frequency: "weekly" }, { repeatDays: [7], frequency: "weekly" },
      { repeatDays: [4] }, { frequency: "weekly", repeatDays: [3] },
      { date: "2026-02-30" }, { date: "2026-09-27", time: "09:30" },
      { date: "2026-09-27", time: "10:00" }, // exact current SAST instant
      { time: "07:15" }, { referralCode: "bad code" }, { requestedCreditCents: 1.5 },
      { requestedCreditCents: -1 }, { coverRequested: "false" },
    ];
    for (const patch of invalid) expect(() => parseBookingQuoteInput(valid(patch as Partial<BookingQuoteInput>), NOW)).toThrow(BookingQuoteValidationError);
    expect(() => parseBookingQuoteInput(JSON.parse('{"contractVersion":1,"__proto__":{"polluted":true}}'), NOW)).toThrow();
    expect(() => parseBookingQuoteInput(Object.assign(Object.create({ service: "airbnb" }), valid()), NOW)).toThrow();
    expect(() => parseBookingQuoteInput([], NOW)).toThrow();
    expect(parsed({ referralCode: "  abcd_2 " }).referralCode).toBe("ABCD_2");
    expect(parsed({ addOns: ["restock_toiletries", "clean_appliances"] }).addOns).toEqual(["clean_appliances", "restock_toiletries"]);
    expect(parsed({ frequency: "weekly", repeatDays: [6, 4] }).repeatDays).toEqual([4, 6]);
    expect(quoted({ frequency: "fortnightly", repeatDays: [4] }).bookingFeeCents).toBe(3900);
  });

  it("applies verified Care+, referral, cover, and credits with a R50 payment floor", () => {
    const q = quoted({ service: "regular", propertyType: "flat", hours: 4, crewSize: 1, linen: null, addOns: ["inside_fridge"], referralCode: "FRIEND", coverRequested: true, requestedCreditCents: 999999 }, {
      carePlusMember: true, coverAvailable: true, availableCreditCents: 20000, referralRecord: { code: "FRIEND", userId: "friend" },
    });
    expect(q.carePlusDiscountCents).toBe(2800);
    expect(q.referralDiscountCents).toBe(10000);
    expect(q.bookingFeeCents).toBe(0);
    expect(q.coverCents).toBe(2200);
    expect(q.creditUsedCents).toBe(12400);
    expect(q.totalCents).toBe(5000);
    expect(q.lines.reduce((sum, line) => sum + line.amountCents, 0)).toBe(q.totalCents);
    expect(q.lines).toContainEqual({ id: "booking_fee", label: "Booking fee", amountCents: 0 });
    expect(() => quoted({ coverRequested: true })).toThrow(/cover/i);
  });

  it("returns only public referral refusal statuses", () => {
    const input = { referralCode: "FRIEND" };
    expect(quoted(input).referral.status).toBe("unknown_code");
    expect(quoted(input, { referralRecord: { code: "FRIEND", userId: "buyer-1" } }).referral.status).toBe("own_code");
    expect(quoted(input, { referralRecord: { code: "FRIEND", userId: "friend" }, hasPriorRedemption: true }).referral.status).toBe("already_used");
    expect(quoted(input, { referralRecord: { code: "FRIEND", userId: "friend" }, completedBookingCount: 1 }).referral.status).toBe("not_a_first_booking");
    expect(quoted(input, { referralRecord: { code: "FRIEND", userId: "friend" } }).referral.status).toBe("eligible");
    expect(JSON.stringify(quoted(input, { referralRecord: { code: "FRIEND", userId: "friend" } }))).not.toContain('"friend"');
  });

  it("hashes canonical quotes and changes when ownership or verified facts change", async () => {
    const a = quoted({ addOns: ["restock_supplies", "clean_appliances"] });
    const b = quoted({ addOns: ["clean_appliances", "restock_supplies"] });
    const hash = await fingerprintBookingQuote(a, "buyer-1");
    expect(hash).toBe(await fingerprintBookingQuote(b, "buyer-1"));
    expect(hash).not.toBe(await fingerprintBookingQuote(a, "buyer-2"));
    expect(hash).not.toBe(await fingerprintBookingQuote(quoted({ crewSize: 1 }), "buyer-1"));
    expect(hash).not.toBe(await fingerprintBookingQuote(quoted({}, { carePlusMember: true }), "buyer-1"));
    for (const patch of [
      { service: "regular", propertyType: "flat", linen: null, hours: 5.5, crewSize: 1 },
      { date: "2026-10-02" }, { time: "07:30" }, { addOns: ["restock_supplies"] },
      { frequency: "weekly", repeatDays: [4] },
    ] as Partial<BookingQuoteInput>[]) {
      expect(hash).not.toBe(await fingerprintBookingQuote(quoted(patch), "buyer-1"));
    }
    expect(hash).not.toBe(await fingerprintBookingQuote(quoted({}, { coverAvailable: true }), "buyer-1"));
    expect(hash).not.toBe(await fingerprintBookingQuote({ ...a, pricingVersion: "next-pricing-version" }, "buyer-1"));
    expect(hash).not.toBe(await fingerprintBookingQuote({ ...a, totalCents: a.totalCents + 100 }, "buyer-1"));
    expect(await fingerprintBookingQuote(quoted({ referralCode: "FRIEND" }), "buyer-1"))
      .not.toBe(await fingerprintBookingQuote(quoted({ referralCode: "FRIEND" }, { referralRecord: { code: "FRIEND", userId: "friend" } }), "buyer-1"));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
