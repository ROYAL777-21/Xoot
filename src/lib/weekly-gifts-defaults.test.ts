import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BOOKING_SERVICES } from "./booking-contract";
import { bookingWeekday, repeatDaysForNewDate, changeBookingService, createBookingInput } from "./booking-flow";
import {
  ANNUAL_WEEKLY_VISITS, giftAppBundles, giftBundles, giftSetupPath, readGiftSelection,
} from "./gift-selection";
import { quoteGift } from "../../supabase/functions/_shared/gift-order";

const fixedToday = Date.parse("2026-10-14T10:00:00Z");

describe("founder-approved weekly default across every available booking service", () => {
  it.each(BOOKING_SERVICES)("starts %s with one weekly repeat day matching the first visit", (service) => {
    const draft = createBookingInput(service, fixedToday);
    expect(draft.frequency).toBe("weekly");
    expect(draft.repeatDays).toEqual([bookingWeekday(draft.date)]);
    expect(draft.repeatDays).toHaveLength(1);
  });

  it("moves the first weekly repeat day with the date without inventing an extra day", () => {
    const original = createBookingInput("regular", fixedToday);
    const nextDate = "2026-10-19";
    expect(repeatDaysForNewDate(original, nextDate)).toEqual([bookingWeekday(nextDate)]);
    const extraDay = (bookingWeekday(original.date) + 2) % 7;
    const selected = { ...original, repeatDays: [bookingWeekday(original.date), extraDay] };
    expect(repeatDaysForNewDate(selected, nextDate))
      .toEqual([...new Set([bookingWeekday(nextDate), extraDay])].sort((a, b) => a - b));
    expect(repeatDaysForNewDate({ ...original, frequency: "once", repeatDays: [] }, nextDate))
      .toEqual([]);
  });

  it.each(BOOKING_SERVICES)("does not reset a customer's explicit cadence when changing to %s", (service) => {
    const recurring = createBookingInput("regular", fixedToday);
    expect(changeBookingService(recurring, service).frequency).toBe("weekly");
    expect(changeBookingService(recurring, service).repeatDays).toEqual(recurring.repeatDays);

    const once = { ...recurring, frequency: "once" as const, repeatDays: [] };
    expect(changeBookingService(once, service).frequency).toBe("once");
    expect(changeBookingService(once, service).repeatDays).toEqual([]);
  });
});

describe("truthful gift bundle durations", () => {
  it("uses 52 weekly visits for an annual clean, never 12 or 32", () => {
    expect(ANNUAL_WEEKLY_VISITS).toBe(52);
    expect(giftBundles.find(gift => gift.count === 12)?.detail).toMatch(/three months weekly/i);
    expect(giftAppBundles.find(gift => gift.count === 6)?.note).not.toMatch(/half a year/i);
    expect(giftAppBundles.find(gift => gift.count === 12)?.note).toMatch(/twelve weeks/i);
    expect([...giftBundles, ...giftAppBundles].filter(x => x.count === 12).every(x =>
      !JSON.stringify(x).match(/whole year|full year|one year/i))).toBe(true);
  });

  it("keeps the signed-out and signed-in bundle counts in the supported server vocabulary", () => {
    for (const bundle of [...giftBundles, ...giftAppBundles]) {
      expect(() => quoteGift("regular", bundle.count)).not.toThrow();
    }
    // Do not present a purchasable 52-visit bundle while the backend rejects 52.
    expect(() => quoteGift("regular", ANNUAL_WEEKLY_VISITS)).toThrow(/available visit bundle/i);
  });

  it("preserves website gift selections on the sign-in handoff", () => {
    const selection = { service: "airbnb" as const, count: 12, occasion: 1 };
    const path = giftSetupPath(selection);
    expect(path).toContain("visits=12");
    expect(readGiftSelection(new URLSearchParams(path.split("?")[1]))).toEqual(selection);
  });

  it("prevents false year-long promotional copy in the actual gift components", () => {
    const app = readFileSync("src/pages/app/GiftClean.tsx", "utf8");
    const site = readFileSync("src/components/xoot/GiftBand.tsx", "utf8");
    expect(app).not.toMatch(/Twelve cleans.{0,100}whole year/i);
    expect(site).toContain("ANNUAL_WEEKLY_VISITS");
    expect(app).toContain("ANNUAL_WEEKLY_VISITS");
  });
});
