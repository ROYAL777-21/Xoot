import { describe, expect, it } from "vitest";
import {
  quoteGift,
  validateGiftDraft,
  isGiftRequestKey,
} from "../../supabase/functions/_shared/gift-order";

const draft = {
  service: "regular",
  count: 3,
  tint: "blush",
  delivery: "email",
  recipientName: "Recipient",
  recipientEmail: "person@example.test",
  senderName: "Sender",
  note: "",
  occasion: "",
};

describe("server gift quotes", () => {
  it("covers each whole visit and its booking fee, with no bundle discount", () => {
    expect(quoteGift("regular", 3)).toMatchObject({
      hours: 5.5,
      currency: "ZAR",
      basePerVisitCents: 29600,
      feePerVisitCents: 3900,
      perVisitCents: 33500,
      totalCents: 100500,
    });
    expect(quoteGift("airbnb", 4)).toMatchObject({
      hours: 4,
      basePerVisitCents: 30400,
      totalCents: 137200,
    });
    expect(quoteGift("office", 12)).toMatchObject({
      hours: 5,
      basePerVisitCents: 45200,
      totalCents: 589200,
    });
    expect(quoteGift("express", 1)).toMatchObject({
      hours: 1,
      totalCents: 25900,
    });
  });
  it.each([0, -1, 2, 3.5, 100000, "3", null])(
    "rejects unsupported quantities: %s",
    (count) => expect(() => quoteGift("regular", count)).toThrow(),
  );
  it.each(["__proto__", "constructor", "deep", "laundry", ""])(
    "rejects unavailable or prototype services: %s",
    (service) => expect(() => quoteGift(service, 1)).toThrow(),
  );
});
describe("gift personalisation", () => {
  it("normalises real input without accepting a client amount", () =>
    expect(
      validateGiftDraft({
        ...draft,
        recipientEmail: " Person@Example.test ",
        totalCents: 1,
      }),
    ).toEqual({ ...draft, recipientEmail: "person@example.test" }));
  it("removes stale recipient data from shareable gifts", () =>
    expect(validateGiftDraft({ ...draft, delivery: "link" })).toMatchObject({
      recipientName: "",
      recipientEmail: "",
    }));
  it.each([
    { senderName: "" },
    { recipientName: "" },
    { recipientEmail: "invalid" },
    { note: "x".repeat(91) },
    { tint: "unknown" },
    { delivery: "sms" },
  ])("rejects invalid details: %s", (change) =>
    expect(() => validateGiftDraft({ ...draft, ...change })).toThrow(),
  );
  it("requires a UUID v4 idempotency key", () => {
    expect(isGiftRequestKey("b579e5f7-1c19-49dc-9d1a-32b08bec4050")).toBe(true);
    expect(isGiftRequestKey("retry")).toBe(false);
  });
});
