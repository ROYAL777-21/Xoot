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
  userId: "referrer-1",
  ...over,
});

const verdictFor = (over: Partial<Parameters<typeof checkReferral>[0]> = {}) =>
  checkReferral({
    record: record(),
    buyerId: "buyer-1",
    buyerCompletedBookings: 0,
    buyerHasRedeemed: false,
    ...over,
  });

describe("ZD-036 referral eligibility", () => {
  it("accepts a valid first-booking redemption", () => {
    expect(verdictFor()).toEqual({ ok: true, referrerUserId: "referrer-1", creditCents: 10000 });
    expect(REFERRAL_REWARD_CENTS).toBe(10000);
  });

  it("refuses a self-referral", () => {
    // The commonest attempt, and honest more often than not — but it is a discount funded by
    // Xoot for a customer Xoot already had.
    expect(verdictFor({ buyerId: "referrer-1" })).toEqual({ ok: false, reason: "own_code" });
  });

  it("refuses a buyer who has already redeemed one", () => {
    // The burn is `referral_redemptions.referred_user_id UNIQUE`, not a flag on the code —
    // one redemption per person, guaranteed by the database. Checked here too so the customer
    // gets an explanation rather than a constraint violation.
    expect(verdictFor({ buyerHasRedeemed: true })).toEqual({
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

  it("refuses an unknown code", () => {
    expect(verdictFor({ record: null })).toEqual({ ok: false, reason: "unknown_code" });
  });

  it("tells a self-referrer the honest reason even when they have also redeemed before", () => {
    // Order matters: "already used" would send them to support with the wrong question.
    expect(verdictFor({ buyerId: "referrer-1", buyerHasRedeemed: true })).toEqual({
      ok: false,
      reason: "own_code",
    });
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
    const refused = verdictFor({ buyerId: "referrer-1" });
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

describe("ZD-036 matches the schema that already exists", () => {
  // Comments stripped before matching. The file's own header *quotes* the mistake in order to
  // explain it, so a whole-file match fails against the explanation rather than a regression —
  // which is exactly how the first version of this guard failed.
  const source = readFileSync(
    join(process.cwd(), "supabase/functions/_shared/referrals.ts"),
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\//g, "");

  it("keys on user_id, because that is what public.referrals uses", () => {
    // The first version of this file invented an ownerId and a table to hold it. Staging
    // refused the migration: public.referrals has existed since April, keyed on user_id, with
    // a signup trigger already issuing codes.
    expect(source).toMatch(/userId/);
    expect(source).not.toMatch(/ownerId/);
  });

  it("does not reinvent the burn as a column on the code", () => {
    // referral_redemptions.referred_user_id is UNIQUE. That constraint is the burn, and a
    // nullable timestamp here would be a second, weaker copy of a guarantee the database
    // already makes.
    expect(source).not.toMatch(/burnedAt/);
    expect(source).toMatch(/buyerHasRedeemed/);
  });
});
