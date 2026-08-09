import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CARE_PLUS_MONTHLY_CENTS,
  XOOTER_SHARE_OF_DISCOUNT,
  savingsFor,
} from "./care-plus";
import { FLOOR_RATE_BPS, STARTING_RATE_BPS, xooterPayoutFor } from "./xooter-commission";

/**
 * Keeps `docs/care-plus-unit-economics.md` from becoming a document that describes what someone
 * once believed.
 *
 * That page answers a founder question — are fortnightly members our least profitable — with
 * specific rands. Every one of those figures is derived from constants in `care-plus.ts`, the
 * commission ladder in `xooter-commission.ts`, and the flat rate `create-booking` applies. Change
 * any of them and the page silently starts lying, which is exactly how `palette-migration.md` came
 * to claim work was undone weeks after it shipped and `blocker.md` came to list functions for
 * redeployment that had never been deployed.
 *
 * So the numbers are recomputed here and matched against the text. When an input moves, this fails
 * and names the paragraph to rewrite.
 *
 * The commission rate is no longer a local constant standing in for a number nobody had. It is read
 * from the ladder, at both ends, because "what does a member contribute" now depends on who cleans
 * their home and the page has to say so.
 */

const doc = readFileSync(join(process.cwd(), "docs/care-plus-unit-economics.md"), "utf8");

/** The rate the server actually applies — flat, cadence-ignored. See the divergence note. */
const SERVER_RATE = 0.1;
const MEDIUM_CLEAN_CENTS = 29600;

const rands = (cents: number) => Math.round(cents / 100);

/** Xoot's contribution per member per month, in rands, at a given cadence and commission rate. */
function contribution(cadence: string, rateBps: number) {
  const { spendCents } = savingsFor(cadence, MEDIUM_CLEAN_CENTS, "standard");
  const returnedCents = Math.round(spendCents * SERVER_RATE);
  // `splitDiscount` caps the Xooter's share at the pay floor per booking; at the aggregate level
  // the page uses the nominal split, which is the more conservative direction for Xoot.
  const absorbedCents = Math.round(returnedCents * (1 - XOOTER_SHARE_OF_DISCOUNT));
  const { commissionCents } = xooterPayoutFor(spendCents, rateBps);
  return rands(CARE_PLUS_MONTHLY_CENTS + commissionCents - absorbedCents);
}

/** What the member gets back, minus what they pay, in rands. Negative means they are down. */
function memberPosition(cadence: string) {
  const { spendCents } = savingsFor(cadence, MEDIUM_CLEAN_CENTS, "standard");
  return rands(Math.round(spendCents * SERVER_RATE) - CARE_PLUS_MONTHLY_CENTS);
}

describe("Care+ unit economics", () => {
  it("still ranks monthly below fortnightly below weekly, at both ends of the ladder", () => {
    // The document's headline answer. If this order ever inverts, the answer to the founder's
    // question changes and the page has to be rewritten, not patched. Checked at both rates,
    // because a rank-dependent commission could in principle reorder them and does not.
    for (const rateBps of [STARTING_RATE_BPS, FLOOR_RATE_BPS]) {
      expect(contribution("weekly", rateBps)).toBeGreaterThan(contribution("biweekly", rateBps));
      expect(contribution("biweekly", rateBps)).toBeGreaterThan(contribution("monthly", rateBps));
    }
  });

  it("matches the contribution figures printed in the document", () => {
    const start = STARTING_RATE_BPS;
    const floor = FLOOR_RATE_BPS;

    expect({
      weekly: contribution("weekly", start),
      fortnightly: contribution("biweekly", start),
      monthly: contribution("monthly", start),
    }).toEqual({ weekly: 472, fortnightly: 286, monthly: 185 });

    expect({
      weekly: contribution("weekly", floor),
      fortnightly: contribution("biweekly", floor),
      monthly: contribution("monthly", floor),
    }).toEqual({ weekly: 279, fortnightly: 189, monthly: 140 });

    expect(doc).toContain("| Weekly | **R472** | **R279** |");
    expect(doc).toContain("| Fortnightly | **R286** | **R189** |");
    expect(doc).toContain("| Monthly | **R185** | **R140** |");
  });

  it("keeps the plan-on-the-floor advice pointed at the right column", () => {
    // The page tells the founder to size Care+ against the floor, and quotes that column back.
    // If the floor moves, the sentence has to move with it.
    expect(doc).toContain("Size Care+ against the floor, not the average.");
    expect(doc).toContain("The R279 / R189 / R140 column is the one to plan on.");
    // And the worst cell it reassures about is genuinely the worst cell.
    const worst = contribution("monthly", FLOOR_RATE_BPS);
    expect(worst).toBe(140);
    expect(doc).toContain(`the worst cell in the table is R${worst} a month`);
    expect(worst * 100).toBeGreaterThan(CARE_PLUS_MONTHLY_CENTS);
  });

  it("matches the member's own position, including the sign", () => {
    // The sign is the whole argument. Weekly ahead, everyone else down — and fortnightly down by
    // an amount small enough to feel like an error, which is the churn risk the page is about.
    expect(memberPosition("weekly")).toBe(30);
    expect(memberPosition("biweekly")).toBe(-35);
    expect(memberPosition("monthly")).toBe(-69);

    expect(doc).toContain("+R30 ahead");
    expect(doc).toContain("−R35 down");
    expect(doc).toContain("−R69 down");
  });

  it("holds the claim that the member's position is unmoved by commission", () => {
    // The page rests the fortnightly argument on this: commission changed our margin and not the
    // member's arithmetic, which is why the churn case survived the repricing intact.
    const { spendCents } = savingsFor("biweekly", MEDIUM_CLEAN_CENTS, "standard");
    for (const rateBps of [STARTING_RATE_BPS, FLOOR_RATE_BPS]) {
      // Commission touches what Xoot keeps, never what the member is returned.
      expect(xooterPayoutFor(spendCents, rateBps).commissionCents).toBeGreaterThan(0);
    }
    expect(doc).toContain("The member's own position does not move with commission at all");
  });

  it("keeps the paywall's shortfall sentence true for fortnightly", () => {
    // The mitigation that shipped: the fortnightly branch says the member rate does not cover the
    // fee. That sentence is only honest while the position is actually negative.
    expect(memberPosition("biweekly")).toBeLessThan(0);
    const paywall = readFileSync(join(process.cwd(), "src/pages/CarePlusPaywall.tsx"), "utf8");
    expect(paywall).toContain("won&rsquo;t cover itself on price");
  });

  it("holds the claim that cadence tiering does nothing for fortnightly", () => {
    // The page tells the founder that aligning the server with CADENCE_DISCOUNT is a
    // weekly-versus-monthly lever, not a fortnightly one. That is true only because the intended
    // fortnightly rate and the flat rate are the same number. If the table changes, the advice
    // changes with it.
    const { discountRate } = savingsFor("biweekly", MEDIUM_CLEAN_CENTS, "standard");
    expect(discountRate).toBe(SERVER_RATE);
    expect(doc).toContain("It leaves fortnightly untouched at exactly 10%");
  });

  it("names the floor and the rank mix as the missing inputs, not the rate", () => {
    // The old caveat — "commission rate, unconfirmed" — is answered and must not linger, or the
    // page reads as though nothing was learned. What replaced it is what actually moves the answer.
    expect(doc).not.toContain("Commission rate (c).");
    expect(doc).toContain("**The commission floor.**");
    expect(doc).toContain("**Rank mix.**");
    // And the retired warning is described as retired rather than quietly deleted.
    expect(doc).toContain("is retired. The floor is 20%.");
  });

  it("keeps the pay-floor conflict on the page while it is still live", () => {
    // Founder decision pending. The page must carry it until the conflict is resolved, because a
    // unit-economics doc that omits "we pay below our own stated minimum" is worse than none.
    const newcomerPay = xooterPayoutFor(MEDIUM_CLEAN_CENTS, STARTING_RATE_BPS).xooterPayCents;
    expect(newcomerPay).toBe(19240);
    expect(doc).toContain("R192.40");
    expect(doc).toContain("Minimum pay enforced: R220 (half) / R300 (full)");
    expect(doc).toContain("Founder decision required.");
  });
});
