import { describe, expect, it } from "vitest";
import { parseCreateReviewedBookingInput } from "../../supabase/functions/_shared/booking-creation-input";
import { fingerprintBookingQuote, parseBookingQuoteInput, quoteBooking } from "../../supabase/functions/_shared/booking-quote";
import type { BookingQuoteInput, CreateReviewedBookingInput } from "../../supabase/functions/_shared/booking-contract";

const id = (last: string) => `00000000-0000-4000-8000-${last.padStart(12, "0")}`;
const input = (patch: Partial<BookingQuoteInput> = {}): BookingQuoteInput => ({
  contractVersion: 1, service: "airbnb", propertyType: "airbnb", homeSize: "small", hours: 5.5,
  crewSize: 2, addOns: [], linen: "replace", date: "2026-10-01", time: "07:00", frequency: "once",
  repeatDays: [], referralCode: "", requestedCreditCents: 0, coverRequested: false, ...patch,
});
const request = async (patch: Partial<BookingQuoteInput> = {}): Promise<CreateReviewedBookingInput> => {
  const normalized = parseBookingQuoteInput(input(patch), Date.parse("2026-09-27T00:00:00Z"));
  const quote = quoteBooking(normalized, { buyerId: "buyer", carePlusMember: false, availableCreditCents: 0,
    referralRecord: null, completedBookingCount: 0, hasPriorRedemption: false, coverAvailable: false });
  return { contractVersion: 1, requestKey: id("1"), input: normalized,
    acceptedQuote: { ...quote, fingerprint: await fingerprintBookingQuote(quote, "buyer") },
    confirmedService: quote.service, booking: { selectedXooterIds: [id("2"), id("3")],
      householdProfileId: null, propertyAccountId: null, address: "14 Fredman Drive", instructions: "Gate at rear" } };
};
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe("reviewed booking creation input", () => {
  it("accepts the real R393/R432 quote and binds an empty or partial roster without changing crew price", async () => {
    const body = await request();
    expect(body.acceptedQuote.baseCents).toBe(39300);
    expect(body.acceptedQuote.totalCents).toBe(43200);
    for (const roster of [[], [id("2")], [id("2"), id("3")]]) {
      const parsed = parseCreateReviewedBookingInput({ ...body, booking: { ...body.booking, selectedXooterIds: roster } });
      expect(parsed.booking.selectedXooterIds).toEqual(roster);
      expect(parsed.input.crewSize).toBe(2);
      expect(parsed.acceptedQuote.totalCents).toBe(43200);
    }
  });

  it("accepts the explicit corrected service and rejects an unconfirmed correction", async () => {
    const body = await request({ service: "express", propertyType: "office", hours: 1, linen: null });
    expect(body.input.hours).toBe(5);
    expect(body.acceptedQuote.serviceCorrection).toMatchObject({ from: "express", to: "office" });
    expect(parseCreateReviewedBookingInput(body).confirmedService).toBe("office");
    expect(() => parseCreateReviewedBookingInput({ ...body, confirmedService: "express" })).toThrow();
  });

  it("normalizes harmless text, ID casing and roster ordering while preserving different definitions", async () => {
    const body = await request();
    const first = parseCreateReviewedBookingInput(body);
    const reordered = clone(body);
    reordered.requestKey = body.requestKey.toUpperCase();
    reordered.booking.selectedXooterIds = [id("3").toUpperCase(), id("2")];
    reordered.booking.address = "  14   Fredman Drive  ";
    reordered.booking.instructions = " Gate at rear \r\n";
    expect(parseCreateReviewedBookingInput(reordered)).toEqual(first);
    for (const changed of [
      { ...body.booking, address: "16 Fredman Drive" },
      { ...body.booking, instructions: "Gate at front" },
      { ...body.booking, propertyAccountId: id("4") },
      { ...body.booking, selectedXooterIds: [id("2")] },
    ]) expect(parseCreateReviewedBookingInput({ ...body, booking: changed })).not.toEqual(first);
  });

  it("parses an old accepted visit for replay while the live quote parser still rejects it", async () => {
    const body = await request({ date: "2026-10-01" });
    body.acceptedQuote.pricingVersion = "booking-old-v0";
    expect(parseCreateReviewedBookingInput(body).input.date).toBe("2026-10-01");
    expect(parseCreateReviewedBookingInput(body).acceptedQuote.pricingVersion).toBe("booking-old-v0");
    expect(() => parseBookingQuoteInput(body.input, Date.parse("2026-10-02T00:00:00Z"))).toThrow(/future/i);
  });

  it("rejects a referral discount paired with an ineligible referral status even when totals balance", async () => {
    const body = await request({ referralCode: "UNKNOWN" });
    for (const status of ["unknown_code", "own_code", "already_used", "not_a_first_booking"] as const) {
      const changed = clone(body);
      changed.acceptedQuote.referral.status = status;
      changed.acceptedQuote.referralDiscountCents = 100;
      changed.acceptedQuote.totalCents -= 100;
      changed.acceptedQuote.lines.find((line) => line.id === "referral")!.amountCents = -100;
      expect(() => parseCreateReviewedBookingInput(changed), status).toThrow();
    }
  });

  it("rejects unrecognized caller, nested and quote fields rather than dropping them", async () => {
    const body = await request();
    for (const changed of [
      { ...body, buyerId: id("8") }, { ...body, commissionRateBps: 0 },
      { ...body, balanceCents: 100 }, { ...body, payableCents: 1 },
      { ...body, input: { ...body.input, identity: id("8") } },
      { ...body, booking: { ...body.booking, notes: "other" } },
      { ...body, acceptedQuote: { ...body.acceptedQuote, buyerId: id("8") } },
      { ...body, acceptedQuote: { ...body.acceptedQuote, referral: { ...body.acceptedQuote.referral, ownerId: id("8") } } },
      { ...body, acceptedQuote: { ...body.acceptedQuote, lines: [{ ...body.acceptedQuote.lines[0], hidden: 2 }, ...body.acceptedQuote.lines.slice(1)] } },
    ]) expect(() => parseCreateReviewedBookingInput(changed)).toThrow();
    expect(() => parseCreateReviewedBookingInput(JSON.parse('{"contractVersion":1,"__proto__":{},"requestKey":"x"}'))).toThrow();
  });

  it("rejects duplicate, excessive and invalid UUIDs without truncating the roster", async () => {
    const body = await request();
    for (const roster of [[id("2"), id("2").toUpperCase()], [id("2"), id("3"), id("4")], ["bad"]]) {
      expect(() => parseCreateReviewedBookingInput({ ...body, booking: { ...body.booking, selectedXooterIds: roster } })).toThrow();
    }
    expect(() => parseCreateReviewedBookingInput({ ...body, requestKey: "bad" })).toThrow();
    expect(() => parseCreateReviewedBookingInput({ ...body, booking: { ...body.booking, householdProfileId: "bad" } })).toThrow();
    expect(() => parseCreateReviewedBookingInput({ ...body, booking: { ...body.booking, address: "a".repeat(241) } })).toThrow();
    expect(() => parseCreateReviewedBookingInput({ ...body, booking: { ...body.booking, instructions: "a".repeat(1201) } })).toThrow();
  });

  it("rejects malformed or inconsistent claimed quote/input and unsafe money", async () => {
    const body = await request();
    const quote = body.acceptedQuote;
    for (const changed of [
      { ...body, input: { ...body.input, crewSize: 1 } },
      { ...body, acceptedQuote: { ...quote, input: { ...quote.input, date: "2026-10-02" } } },
      { ...body, acceptedQuote: { ...quote, fingerprint: "claimed" } },
      { ...body, acceptedQuote: { ...quote, pricingVersion: "bad version" } },
      { ...body, acceptedQuote: { ...quote, totalCents: quote.totalCents + 1 } },
      { ...body, acceptedQuote: { ...quote, baseCents: Number.MAX_SAFE_INTEGER + 1 } },
      { ...body, acceptedQuote: { ...quote, lines: [{ ...quote.lines[0], amountCents: NaN }, ...quote.lines.slice(1)] } },
      { ...body, acceptedQuote: { ...quote, serviceCorrection: { from: "regular", to: "airbnb", reason: "wrong" } } },
    ]) expect(() => parseCreateReviewedBookingInput(changed)).toThrow();
  });
});
