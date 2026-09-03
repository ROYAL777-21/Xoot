import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ZD-036 — guards on how `create-booking` USES the referral rule, not on the rule itself.
 *
 * `referrals.test.ts` pins the decision. This file pins the wiring, because every defect this
 * feature can still ship is at the seam: reading a column that does not exist, discounting a
 * line that is not Xoot's to discount, or charging a customer a total they were not shown.
 *
 * Comments are stripped before matching. Two guards in this repo have already failed against
 * their own explanatory comment rather than against a regression.
 */
const SOURCE = readFileSync(
  join(process.cwd(), "supabase/functions/create-booking/index.ts"),
  "utf8",
)
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

describe("ZD-036 is wired into create-booking", () => {
  it("imports the decision rather than reimplementing it", () => {
    // The rule lives in one place. A second copy inside the handler is how the client and
    // server came to disagree about price three times in this repo.
    expect(SOURCE).toMatch(/from "\.\.\/_shared\/referrals\.ts"/);
    expect(SOURCE).toMatch(/checkReferral\(/);
    expect(SOURCE).toMatch(/referralCreditCents\(/);
  });

  it("reads the real columns, not the ones the first draft invented", () => {
    // Staging refused the first migration because public.referrals is keyed on user_id and has
    // been since 2026-04-23. referral_redemptions has no referral_code column at all — an
    // insert naming one fails at runtime, which no unit test would have caught.
    expect(SOURCE).toMatch(/\.from\("referrals"\)[\s\S]{0,80}\.select\("code,user_id"\)/);
    expect(SOURCE).toMatch(/referrer_user_id:/);
    expect(SOURCE).toMatch(/referred_user_id:/);
    expect(SOURCE).not.toMatch(/referral_code:/);
    expect(SOURCE).not.toMatch(/owner_id/);
  });

  it("counts completed_at, never status === 'completed'", () => {
    // booking-state-machine.ts allows completed -> rated. Filtering on the status lets a buyer
    // whose first booking was rated take a second first-booking discount, and does it silently:
    // the query returns 0 either way, and 0 is the eligible answer.
    expect(SOURCE).toMatch(/\.not\("completed_at", "is", null\)/);
    expect(SOURCE).not.toMatch(/\.eq\("status", "completed"\)/);
  });

  it("discounts the work, never the booking fee or the cover", () => {
    // The fee is Xoot's charge for arranging the booking; the cover is a premium passed to an
    // underwriter. The cap passed to referralCreditCents must be base + add-ons, which is why
    // the credit is computed before those two are added rather than taken off the gross.
    expect(SOURCE).toMatch(/baseCents:\s*discountedBaseCents/);
    // Shorthand, so `addOnsCents,` is the passing form and `addOnsCents: subtotalCents` is not.
    expect(SOURCE).toMatch(/addOnsCents,/);
    expect(SOURCE).not.toMatch(/addOnsCents:\s*(?!addOnsCents)/);
  });

  it("refuses a bad code instead of quietly charging full price", () => {
    // Under CPA s41 the displayed price is the price. A customer who entered a code expects a
    // total that includes it; creating the booking without it and mentioning the refusal in the
    // response body is the defect this repo has already shipped three times.
    expect(SOURCE).toMatch(/if \(!referralVerdict\.ok\) return fail\(/);
  });

  it("never lets a referral move a Xooter's commission", () => {
    // REFERRAL_FUNDING says "commission". The guard is that the credit and the rate never meet:
    // commission_rate_bps is struck from the Xooter's own rank and must not move because a
    // customer arrived through someone else's link.
    const creditLines = SOURCE.split("\n").filter((line) => /referralCredit/.test(line));
    expect(creditLines.length).toBeGreaterThan(0);
    for (const line of creditLines) {
      expect(line).not.toMatch(/commission_rate_bps|commissionRates/);
    }
  });

  it("shows the credit in the breakdown the customer gets back", () => {
    // A discount the server applied and the response does not name is a total the customer
    // cannot reconcile. It appears in the response, the payment record and the audit log.
    expect(SOURCE).toMatch(/referral_credit: referralCredit/);
    expect(SOURCE).toMatch(/breakdown: \{[^}]*referralCredit/);
  });
});

describe("ZD-035 crew pricing is deliberately NOT wired", () => {
  it("leaves create-booking on the live multi-worker model", () => {
    /*
     * This asserts an ABSENCE, and the absence is the decision.
     *
     * The live model inserts one booking row per Xooter and charges N x base, less 10% at three
     * or more. ZD-035's crew model charges one job at a coordination overhead. Measured against
     * each other:
     *
     *     crew   live      ZD-035    delta
     *     2      2.00x     1.15x     -43%
     *     3      2.70x     1.25x     -54%
     *     4      3.60x     1.40x     -61%
     *
     * Wiring crewPriceCents here would cut a four-Xooter booking by 61%. That is a change to a
     * locked commercial fact, which CLAUDE.md says moves only through a decision-log entry — so
     * the constants and the schema ship ready and the writer does not change until the founder
     * decides.
     *
     * The guard exists because "finish the port" is the obvious next instinct, and this is the
     * one part of it that must not be finished quietly.
     */
    expect(SOURCE).not.toMatch(/crewPriceCents|crewHours|CREW_OVERHEAD|crewCapFor/);
    expect(SOURCE).toMatch(/multiWorkerDiscount/);
    expect(SOURCE).toMatch(/\* workerCount/);
  });

  it("writes no crew_size, because under the live model every row is a solo job", () => {
    // The migration defaults crew_size to 1 precisely so existing rows read as the solo
    // bookings they were. Under the row-per-Xooter model that is also true of every NEW row,
    // so stamping a crew size here would record a number the price does not reflect.
    expect(SOURCE).not.toMatch(/crew_size|crew_elapsed_hours|booking_assignees/);
  });
});
