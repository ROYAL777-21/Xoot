import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  REFERRAL_FUNDING,
  REFERRAL_REWARD_CENTS,
  checkReferral,
  referralCreditCents,
  type ReferralRecord,
} from "../../supabase/functions/_shared/referrals";

const record = (over: Partial<ReferralRecord> = {}): ReferralRecord => ({
  code: "THANDI100",
  ownerId: "owner-1",
  active: true,
  burnedAt: null,
  ...over,
});

const verdictFor = (over: Partial<Parameters<typeof checkReferral>[0]> = {}) =>
  checkReferral({ record: record(), buyerId: "buyer-1", buyerCompletedBookings: 0, ...over });

describe("ZD-036 referral eligibility", () => {
  it("accepts a valid first-booking redemption", () => {
    expect(verdictFor()).toEqual({ ok: true, ownerId: "owner-1", creditCents: 10000 });
    expect(REFERRAL_REWARD_CENTS).toBe(10000);
  });

  it("refuses a self-referral", () => {
    // The commonest attempt, and honest more often than not — but it is a discount funded by
    // Xoot for a customer Xoot already had.
    expect(verdictFor({ buyerId: "owner-1" })).toEqual({ ok: false, reason: "own_code" });
  });

  it("refuses a code that has already been redeemed", () => {
    expect(verdictFor({ record: record({ burnedAt: "2026-09-01T10:00:00Z" }) })).toEqual({
      ok: false,
      reason: "already_used",
    });
  });

  it("refuses a buyer who has completed a booking before", () => {
    // A referral buys a first customer. Paying R100 to keep an existing one is a different
    // programme with different economics.
    expect(verdictFor({ buyerCompletedBookings: 1 })).toEqual({
      ok: false,
      reason: "not_a_first_booking",
    });
  });

  it("refuses an unknown or withdrawn code", () => {
    expect(verdictFor({ record: null })).toEqual({ ok: false, reason: "unknown_code" });
    expect(verdictFor({ record: record({ active: false }) })).toEqual({
      ok: false,
      reason: "code_inactive",
    });
  });

  it("tells a self-referrer the honest reason even when their code is also burned", () => {
    // Order matters: "already used" would send them to support with the wrong question.
    expect(
      verdictFor({ buyerId: "owner-1", record: record({ burnedAt: "2026-09-01T10:00:00Z" }) }),
    ).toEqual({ ok: false, reason: "own_code" });
  });
});

describe("ZD-036 referral credit", () => {
  const ok = verdictFor();

  it("comes off the work, never the fee or the cover", () => {
    // The booking fee is Xoot's charge for arranging the booking and the cover is a premium
    // passed to an underwriter. A referral eating either funds a discount out of someone
    // else's money — so the cap is base + add-ons and nothing beyond it.
    expect(referralCreditCents({ verdict: ok, baseCents: 34200, addOnsCents: 3000 })).toBe(10000);
    // A cheap express booking: the credit is capped at the work, not at the total.
    expect(referralCreditCents({ verdict: ok, baseCents: 6000, addOnsCents: 0 })).toBe(6000);
  });

  it("is zero on any refusal, and never negative", () => {
    const refused = verdictFor({ buyerId: "owner-1" });
    expect(referralCreditCents({ verdict: refused, baseCents: 34200, addOnsCents: 0 })).toBe(0);
    expect(referralCreditCents({ verdict: ok, baseCents: -500, addOnsCents: -100 })).toBe(0);
  });

  it("is funded from commission, never from Xooter pay", () => {
    // The rule most likely to be quietly reversed under margin pressure. A Xooter's pay must
    // not move because a customer arrived through someone else's link.
    expect(REFERRAL_FUNDING).toBe("commission");
  });
});

describe("ZD-036 stays server-side", () => {
  const root = join(process.cwd());

  it("has no client mirror, unlike every other duplicated money rule", () => {
    // locked-commercial-facts.md already lists "referral qualification" among the things the
    // frontend is never authoritative for — locked before the design that broke it existed.
    // The design implements all of these checks in the browser, which makes them suggestions.
    //
    // So the guard is the absence: if a client-side copy ever appears, this fails.
    const client = readFileSync(join(root, "src/lib/xoot-pricing.ts"), "utf8");
    expect(client).not.toMatch(/REFERRAL_REWARD_CENTS|checkReferral|referralCreditCents/);
  });

  it("keeps the locked fact that names it", () => {
    const locked = readFileSync(join(root, "docs/product/locked-commercial-facts.md"), "utf8");
    expect(locked).toMatch(/referral qualification/i);
  });
});
