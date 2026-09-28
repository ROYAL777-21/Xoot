import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BOOKING_REFERRAL_MESSAGES } from "./booking-flow";

// Behavioral submission/refusal/late-response coverage is in BookingFlow.test.tsx.
// This boundary guard prevents moving financial eligibility back into the browser.
describe("referral authority boundary", () => {
  it("keeps referral qualification and all price arithmetic on the server", () => {
    const code = readFileSync("src/pages/app/BookingFlow.tsx", "utf8");
    expect(code).not.toMatch(/REFERRAL_REWARD_CENTS|referralCreditCents|checkReferral|priceQuote|calculateBookingQuote/);
    expect(code).not.toMatch(/invoke\("create-booking"/);
  });
  it("keeps the four refusal explanations distinct", () => {
    const reasons = ["unknown_code", "own_code", "already_used", "not_a_first_booking"] as const;
    expect(new Set(reasons.map(reason => BOOKING_REFERRAL_MESSAGES[reason])).size).toBe(4);
  });
});
