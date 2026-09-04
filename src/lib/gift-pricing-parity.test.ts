import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GIFT_HOURS as SERVER_HOURS,
  giftPriceCents as serverGift,
  basePrice,
} from "../../supabase/functions/_shared/pricing";
import { GIFT_HOURS as CLIENT_HOURS, giftPriceCents as clientGift } from "./xoot-pricing";

/**
 * ZD-038 — the gift surface prices from the real ladder, on both sides.
 *
 * ⚠️ **This guard exists because its absence shipped a live money defect.** `GiftClean.tsx` (routed
 * at `/app/gifts`, in the nav and the omnibox) and `ops-workflow` each carried their own copy of:
 *
 *     { residential: 270, deep: 365, airbnb: 315, premium: 420, moving: 455 }
 *
 * **None of those numbers existed in `LADDERS`.** Two of them — 270 and 315 — are the exact phantom
 * prices ZD-037 established had never been charged by anything: the gift page was quoting the ghost
 * ladder from a document that was itself wrong.
 *
 * `pricing-parity.test.ts` pins the booking surfaces. It never covered gift, so this ran for months
 * and nothing failed. Under the CPA the displayed price is the price, and this repo has shipped a
 * screen showing one figure while charging another three times.
 */
describe("ZD-038 gift prices come from the ladder", () => {
  it("client and server agree on the durations", () => {
    expect(CLIENT_HOURS).toEqual(SERVER_HOURS);
  });

  it("client and server compute the same gift price for every service", () => {
    for (const service of Object.keys(SERVER_HOURS)) {
      expect(clientGift(service), `${service} disagrees`).toBe(serverGift(service));
    }
  });

  it("every gift price is a real rung on the real ladder", () => {
    // The heart of it. A gift price must be derivable from basePrice at its stated duration —
    // which is exactly what the old table could not do.
    for (const [service, hours] of Object.entries(SERVER_HOURS)) {
      const fromLadder = basePrice(service, hours);
      expect(fromLadder.ok, `${service} at ${hours}h is not on the ladder`).toBe(true);
      if (fromLadder.ok) expect(serverGift(service)).toBe(fromLadder.baseCents);
    }
  });

  it("refuses an unpriced service instead of guessing", () => {
    // Returning a default amount for an unknown service is how a wrong number reaches a customer.
    expect(serverGift("nonsense")).toBeNull();
    expect(clientGift("nonsense")).toBeNull();
  });

  it("neither gift writer carries a hardcoded rand figure any more", () => {
    // The actual regression guard. If someone reintroduces a literal price table in either place,
    // this fails before it reaches a customer.
    const files = [
      "src/pages/app/GiftClean.tsx",
      "supabase/functions/ops-workflow/index.ts",
    ];
    for (const file of files) {
      const code = readFileSync(join(process.cwd(), file), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      expect(code, `${file} still declares a gift price table`).not.toMatch(/servicePrices\s*[:=]/);
      // The five phantom figures, in any numeric form.
      for (const phantom of [270, 365, 315, 420, 455]) {
        expect(code, `${file} still contains the phantom figure ${phantom}`)
          .not.toMatch(new RegExp(`\\b${phantom}\\b`));
      }
    }
  });

  it("prices what a person would expect for the money", () => {
    // Sanity, in rands, so a reviewer can eyeball it: a gifted residential clean is the same
    // R250 as booking one yourself. If these ever diverge, gift has become a different product.
    expect(serverGift("residential")! / 100).toBe(250);
    expect(serverGift("deep")! / 100).toBe(296);
    expect(serverGift("premium")! / 100).toBe(376);
  });
});
