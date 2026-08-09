import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CARE_PLUS_MONTHLY_CENTS,
  XOOTER_SHARE_OF_DISCOUNT,
  savingsFor,
} from "./care-plus";

/**
 * Keeps `docs/care-plus-unit-economics.md` from becoming a document that describes what someone
 * once believed.
 *
 * That page answers a founder question — are fortnightly members our least profitable — with
 * specific rands. Every one of those figures is derived from constants in `care-plus.ts` and from
 * the flat rate `create-booking` applies. Change any of them and the page silently starts lying,
 * which is exactly how `palette-migration.md` came to claim work was undone weeks after it shipped
 * and `blocker.md` came to list functions for redeployment that had never been deployed.
 *
 * So the numbers are recomputed here and matched against the text. When an input moves, this fails
 * and names the paragraph to rewrite.
 */

const doc = readFileSync(join(process.cwd(), "docs/care-plus-unit-economics.md"), "utf8");

/** The rate the server actually applies — flat, cadence-ignored. See the divergence note. */
const SERVER_RATE = 0.1;
/** The illustrative commission the page solves at. Not an established figure; that is the point. */
const ILLUSTRATIVE_COMMISSION = 0.15;
const MEDIUM_CLEAN_CENTS = 29600;

const rands = (cents: number) => Math.round(cents / 100);

/** Xoot's contribution per member per month, in rands, at a given cadence. */
function contribution(cadence: string) {
  const { spendCents } = savingsFor(cadence, MEDIUM_CLEAN_CENTS, "standard");
  const returnedCents = Math.round(spendCents * SERVER_RATE);
  // `splitDiscount` caps the Xooter's share at the pay floor per booking; at the aggregate level
  // the page uses the nominal split, which is the more conservative direction for Xoot.
  const absorbedCents = Math.round(returnedCents * (1 - XOOTER_SHARE_OF_DISCOUNT));
  const commissionCents = Math.round(spendCents * ILLUSTRATIVE_COMMISSION);
  return rands(CARE_PLUS_MONTHLY_CENTS + commissionCents - absorbedCents);
}

/** What the member gets back, minus what they pay, in rands. Negative means they are down. */
function memberPosition(cadence: string) {
  const { spendCents } = savingsFor(cadence, MEDIUM_CLEAN_CENTS, "standard");
  return rands(Math.round(spendCents * SERVER_RATE) - CARE_PLUS_MONTHLY_CENTS);
}

describe("Care+ unit economics", () => {
  it("still ranks monthly below fortnightly below weekly on contribution", () => {
    // The document's headline answer. If this order ever inverts, the answer to the founder's
    // question changes and the page has to be rewritten, not patched.
    expect(contribution("weekly")).toBeGreaterThan(contribution("biweekly"));
    expect(contribution("biweekly")).toBeGreaterThan(contribution("monthly"));
  });

  it("matches the contribution figures printed in the document", () => {
    expect({ weekly: contribution("weekly") }).toEqual({ weekly: 215 });
    expect({ fortnightly: contribution("biweekly") }).toEqual({ fortnightly: 157 });
    expect({ monthly: contribution("monthly") }).toEqual({ monthly: 126 });

    expect(doc).toContain("| Weekly | **R215** |");
    expect(doc).toContain("| Fortnightly | **R157** |");
    expect(doc).toContain("| Monthly | **R126** |");
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
    expect(doc).toContain("It leaves fortnightly untouched at");
  });

  it("keeps naming the commission rate as the missing input", () => {
    // A unit-economics page that quietly drops its own caveat is worse than one with no numbers.
    expect(doc).toMatch(/commission rate.*is not\s*\n?established/s);
    expect(doc).toContain("Commission rate (c).");
  });
});
