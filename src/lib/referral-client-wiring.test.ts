import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ZD-036 — guards that the referral is REACHABLE from the booking flow.
 *
 * ⚠️ This file exists because the server half shipped first and was, for one commit, completely
 * unreachable: `create-booking` accepted `referralCode`, no client ever sent one, and
 * `Loyalty.tsx` advertised "referral credits" in copy the whole time. Every unit test passed.
 * A feature nothing can invoke is not a finished feature, and nothing in the suite noticed.
 */
const BOOK = readFileSync(join(process.cwd(), "src/pages/app/Book.tsx"), "utf8");
const CODE = BOOK.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("the referral is reachable from the booking flow", () => {
  it("sends referralCode to create-booking", () => {
    // The whole point. Without this line the server feature cannot be invoked by any customer.
    expect(CODE).toMatch(/referralCode: referralCode\.trim\(\) \|\| undefined/);
  });

  it("offers an input for it", () => {
    expect(CODE).toMatch(/id="referral-code"/);
    expect(CODE).toMatch(/htmlFor="referral-code"/);
    expect(CODE).toMatch(/aria-describedby="referral-code-help"/);
  });

  it("reads the refusal from the response body, not from error.message", () => {
    /*
     * The trap this guard exists for.
     *
     * `fail()` sends the reason in a JSON body with a 409. But `supabase.functions.invoke` sets
     * `error.message` to a generic "Edge Function returned a non-2xx status code" for EVERY
     * failure — the body is only reachable through `error.context`, the raw Response.
     *
     * Matching on `error.message` compiles, type-checks, and silently never fires. The customer
     * gets a toast that tells them nothing, and the four carefully ordered refusal reasons on
     * the server are thrown away at the last step.
     */
    expect(CODE).toMatch(/error as \{ context\?: Response \}/);
    expect(CODE).toMatch(/context\.clone\(\)\.json\(\)/);
    expect(CODE).toMatch(/serverMessage\.includes\(entry\.reason\)/);
    expect(CODE).not.toMatch(/error\.message\?\.includes\(entry\.reason\)/);
  });

  it("maps all four server refusals, and keeps own_code distinct from already_used", () => {
    // The server checks own_code BEFORE already_used so a person entering their own burned code
    // is told the honest reason. Flattening these into one "invalid code" throws that away.
    for (const reason of ["unknown_code", "own_code", "already_used", "not_a_first_booking"]) {
      expect(CODE).toMatch(new RegExp(`reason: "${reason}"`));
    }
    const own = BOOK.match(/reason: "own_code", message: "([^"]+)"/)?.[1];
    const used = BOOK.match(/reason: "already_used", message: "([^"]+)"/)?.[1];
    expect(own).toBeTruthy();
    expect(used).toBeTruthy();
    expect(own).not.toBe(used);
  });

  it("never previews a credit amount on the client", () => {
    /*
     * `locked-commercial-facts.md` lists "referral qualification" among the things the frontend
     * is never authoritative for, and `_shared/referrals.ts` has no client mirror by design.
     *
     * So this screen must not import the rule, and must not state a rand figure for the credit.
     * The total shown excludes it and the customer is charged less — over-stating, which is the
     * survivable direction under the CPA.
     */
    expect(CODE).not.toMatch(/REFERRAL_REWARD_CENTS|referralCreditCents|checkReferral/);
    const help = BOOK.match(/id="referral-code-help"[\s\S]{0,600}?<\/p>/)?.[0] ?? "";
    expect(help).toBeTruthy();
    expect(help).not.toMatch(/R\s?\d/);
  });
});
