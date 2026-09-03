import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REFERRAL_REWARD_CENTS as SERVER } from "../../supabase/functions/_shared/referrals";
import { REFERRAL_REWARD_CENTS as CLIENT } from "./referral-display";

/**
 * ZD-036 — the advertised amount must be the amount the server applies.
 *
 * ⚠️ This is the same class of guard as `pricing-parity` and `locked-facts-parity`, and it exists
 * for the same reason: **this repo has shipped a screen showing one number while charging another
 * three times.** A referral section advertising R100 while the server credits something else is
 * that defect in a new place, and under the CPA the displayed offer is the offer.
 */
describe("the advertised referral reward matches the server", () => {
  it("is the same number on both sides", () => {
    expect(CLIENT).toBe(SERVER);
  });

  it("the section renders the server's figure, not a hardcoded one", () => {
    // Catches someone "simplifying" the component by typing R100 in the copy. The moment the
    // server constant moves, that string is a false offer and nothing would notice.
    const section = readFileSync(
      join(process.cwd(), "src/components/xoot/ReferSection.tsx"),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(section).toMatch(/REFERRAL_REWARD_CENTS/);
    expect(section).not.toMatch(/R\{?100\}?\b/);
  });
});

describe("the display module stays display-only", () => {
  const source = readFileSync(join(process.cwd(), "src/lib/referral-display.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  it("carries no eligibility rule", () => {
    // The whole reason referrals have no client mirror. An amount is a claim; eligibility is an
    // authorisation decision, and authorisation belongs to the server.
    for (const banned of ["checkReferral", "referralCreditCents", "buyerHasRedeemed", "own_code"]) {
      expect(source).not.toMatch(new RegExp(banned));
    }
  });

  it("does not reintroduce the mirror the other guard forbids", () => {
    // referrals.test.ts guards src/lib/xoot-pricing.ts specifically. This asserts the rule was
    // not simply relocated into the pricing module instead.
    const pricing = readFileSync(join(process.cwd(), "src/lib/xoot-pricing.ts"), "utf8");
    expect(pricing).not.toMatch(/REFERRAL_REWARD_CENTS|checkReferral|referralCreditCents/);
  });
});
