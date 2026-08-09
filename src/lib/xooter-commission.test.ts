import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  BOOST_BPS,
  BOOST_DAYS,
  COMMISSION_BANDS,
  FLOOR_RATE_BPS,
  HYSTERESIS_POINTS,
  IN_TROUBLE_SCORE,
  STARTING_RATE_BPS,
  applyBoost,
  boostIsActive,
  boostIsWorthGranting,
  boostValueFor,
  commissionBandFor,
  commissionRateBpsFor,
  formatRate,
  xooterPayoutFor,
} from "./xooter-commission";
import { calculateReliabilityScore, shouldDeprioritizeXooter } from "./trust";
import { MIN_XOOTER_PAY_HALF_DAY_CENTS, splitDiscount } from "./care-plus";

describe("commission bands", () => {
  it("starts at 35% and floors at 20%, falling monotonically with rank", () => {
    expect(STARTING_RATE_BPS).toBe(3500);
    expect(FLOOR_RATE_BPS).toBe(2000);

    // Each band must be strictly better paid and strictly harder to reach than the last.
    // Without this a schedule edit can produce a band nobody can ever enter, or one that
    // pays worse than the band below it, and neither is visible by reading the table.
    for (let i = 1; i < COMMISSION_BANDS.length; i += 1) {
      const prev = COMMISSION_BANDS[i - 1];
      const band = COMMISSION_BANDS[i];
      expect(band.rateBps).toBeLessThan(prev.rateBps);
      expect(band.minScore).toBeGreaterThan(prev.minScore);
      expect(band.minCompletedJobs).toBeGreaterThan(prev.minCompletedJobs);
    }
  });

  it("stays inside the founder's 35–30% range until a band is genuinely earned", () => {
    // The stated range is the unproven end of the ladder. Anything below 30% has to be worked for.
    const unproven = COMMISSION_BANDS.filter((b) => b.minCompletedJobs < 75);
    for (const band of unproven) {
      expect(band.rateBps).toBeGreaterThanOrEqual(3000);
      expect(band.rateBps).toBeLessThanOrEqual(3500);
    }
  });
});

describe("the day-one trap", () => {
  /**
   * `calculateReliabilityScore` starts at 100 and subtracts penalties, so a Xooter who has
   * done nothing scores perfectly. If the ladder read the score alone, approval itself would
   * grant the 20% floor for life.
   *
   * This is not hypothetical: the assertion below is written against the literal row
   * `approve-zooter` writes.
   */
  it("gives a freshly approved Xooter the starting rate, not the floor", () => {
    expect(calculateReliabilityScore({})).toBe(100);

    const rate = commissionRateBpsFor({ reliabilityScore: 100, completedJobs: 0 });
    expect(rate).toBe(STARTING_RATE_BPS);
    expect(rate).not.toBe(FLOOR_RATE_BPS);
    expect(commissionBandFor({ reliabilityScore: 100, completedJobs: 0 }).rank).toBe("new");
  });

  it("reads the same 100 out of approve-zooter that it is defending against", () => {
    // If the approval payload ever stops writing 100, the test above is defending a case that
    // no longer occurs and someone should re-derive the gate rather than trust it.
    const fn = readFileSync(
      join(process.cwd(), "supabase/functions/approve-zooter/index.ts"),
      "utf8",
    );
    expect(fn).toMatch(/reliability_score:\s*100/);
    // And it must not set a job count, so the new Xooter falls to the column default of 0.
    expect(fn).not.toMatch(/jobs_completed:/);
  });

  it("holds a perfect score at each band until the job count catches up", () => {
    const at = (completedJobs: number) => commissionBandFor({ reliabilityScore: 100, completedJobs }).rank;
    expect(at(9)).toBe("new");
    expect(at(10)).toBe("bronze");
    expect(at(24)).toBe("bronze");
    expect(at(25)).toBe("silver");
    expect(at(74)).toBe("silver");
    expect(at(75)).toBe("gold");
    expect(at(199)).toBe("gold");
    expect(at(200)).toBe("platinum");
  });

  it("holds a long-serving Xooter at the band their score supports", () => {
    // Volume alone earns nothing. 500 jobs at a Bronze score is a Bronze rate.
    expect(commissionBandFor({ reliabilityScore: 81, completedJobs: 500 }).rank).toBe("bronze");
    expect(commissionBandFor({ reliabilityScore: 94, completedJobs: 500 }).rank).toBe("gold");
  });
});

describe("slipping", () => {
  it("keeps a held band while the score stays within tolerance", () => {
    const held = { reliabilityScore: 88 - HYSTERESIS_POINTS, completedJobs: 40, currentRateBps: 3000 };
    expect(commissionBandFor(held).rank).toBe("silver");

    // One point further and the band is genuinely lost.
    expect(
      commissionBandFor({ ...held, reliabilityScore: 88 - HYSTERESIS_POINTS - 1 }).rank,
    ).toBe("bronze");
  });

  it("does not let hysteresis delay a promotion", () => {
    // Holding a worse rate must never keep someone out of a band they have earned.
    expect(commissionBandFor({ reliabilityScore: 93, completedJobs: 80, currentRateBps: 3500 }).rank)
      .toBe("gold");
  });

  it("ignores a claimed band the Xooter cannot support at all", () => {
    // A stale or wrong `currentRateBps` is not authority to keep a band. 5 jobs is below every
    // gate above New, whatever rate the row happens to carry.
    expect(commissionBandFor({ reliabilityScore: 99, completedJobs: 5, currentRateBps: 2000 }).rank)
      .toBe("new");
  });

  it("drops to the starting rate below the in-trouble threshold, hysteresis or not", () => {
    expect(shouldDeprioritizeXooter(IN_TROUBLE_SCORE - 1)).toBe(true);
    expect(shouldDeprioritizeXooter(IN_TROUBLE_SCORE)).toBe(false);

    // A Platinum Xooter in trouble is on the starting rate immediately. This is the one place
    // hysteresis deliberately does not apply — it softens band edges, not the floor of the ladder.
    const inTrouble = commissionBandFor({
      reliabilityScore: IN_TROUBLE_SCORE - 1,
      completedJobs: 400,
      currentRateBps: 2000,
    });
    expect(inTrouble.rateBps).toBe(STARTING_RATE_BPS);
  });

  it("puts a real penalised score where the ladder expects it", () => {
    // Not a synthetic number: two late arrivals, a cancellation, a complaint and an escalation,
    // scored by the function the marketplace actually uses.
    const score = calculateReliabilityScore({
      lateArrivals: 2,
      cancellations: 1,
      complaints: 1,
      escalations: 1,
      qualityAverage: 4.5,
      repeatBookings: 4,
    });
    expect(score).toBe(68);
    expect(commissionRateBpsFor({ reliabilityScore: score, completedJobs: 300 })).toBe(
      STARTING_RATE_BPS,
    );
  });
});

describe("missing data", () => {
  it("falls to the starting rate rather than guessing", () => {
    // The loud failure. A Xooter on an unexpected 35% reports it the same day; one silently
    // granted 20% is a leak nobody notices.
    expect(commissionRateBpsFor({})).toBe(STARTING_RATE_BPS);
    expect(commissionRateBpsFor({ reliabilityScore: null, completedJobs: 400 })).toBe(
      STARTING_RATE_BPS,
    );
    expect(commissionRateBpsFor({ reliabilityScore: Number.NaN, completedJobs: 400 })).toBe(
      STARTING_RATE_BPS,
    );
  });

  it("treats a missing job count as zero rather than as unlimited", () => {
    expect(commissionBandFor({ reliabilityScore: 100 }).rank).toBe("new");
  });

  it("clamps a score outside 0–100 instead of extrapolating", () => {
    expect(commissionBandFor({ reliabilityScore: 140, completedJobs: 200 }).rank).toBe("platinum");
    expect(commissionBandFor({ reliabilityScore: -20, completedJobs: 200 }).rateBps).toBe(
      STARTING_RATE_BPS,
    );
  });
});

describe("payout", () => {
  it("commissions the subtotal, so cover and the service fee never move a Xooter's pay", () => {
    const subtotal = 29600;
    const { commissionCents, xooterPayCents } = xooterPayoutFor(subtotal, 3000);
    expect(commissionCents).toBe(8880);
    expect(xooterPayCents).toBe(20720);
    expect(commissionCents + xooterPayCents).toBe(subtotal);
  });

  it("pays a ranked Xooter more for the identical job", () => {
    const newcomer = xooterPayoutFor(29600, STARTING_RATE_BPS);
    const platinum = xooterPayoutFor(29600, FLOOR_RATE_BPS);
    expect(platinum.xooterPayCents).toBeGreaterThan(newcomer.xooterPayCents);
    // R44.40 more on a single R296 clean — the ladder has to be worth noticing to work.
    expect(platinum.xooterPayCents - newcomer.xooterPayCents).toBe(4440);
  });

  it("stays in whole cents at every band", () => {
    for (const band of COMMISSION_BANDS) {
      const { commissionCents, xooterPayCents } = xooterPayoutFor(29600, band.rateBps);
      expect(Number.isInteger(commissionCents)).toBe(true);
      expect(Number.isInteger(xooterPayCents)).toBe(true);
      expect(commissionCents + xooterPayCents).toBe(29600);
    }
  });

  it("lets a ranked Xooter absorb the Care+ share without breaching the pay floor", () => {
    // The interaction nobody had looked at, because commission was not in the code. A ranked
    // Xooter earns enough per job that the Care+ discount share can be taken in full.
    const subtotal = 29600;
    const discountCents = Math.round(subtotal * 0.1);

    const platinum = xooterPayoutFor(subtotal, FLOOR_RATE_BPS);
    const split = splitDiscount(discountCents, platinum.xooterPayCents, 5);
    expect(split.flooredBy).toBe(0);
    expect(platinum.xooterPayCents - split.xooterCents).toBeGreaterThanOrEqual(
      MIN_XOOTER_PAY_HALF_DAY_CENTS,
    );
    expect(split.xootCents + split.xooterCents).toBe(discountCents);

    // At Gold the floor starts to bite: only R2 of the R11.84 share can be taken, and Xoot
    // carries the rest. This is the direction the economics page has to account for.
    const gold = xooterPayoutFor(subtotal, 2500);
    const goldSplit = splitDiscount(discountCents, gold.xooterPayCents, 5);
    expect(goldSplit.flooredBy).toBeGreaterThan(0);
    expect(gold.xooterPayCents - goldSplit.xooterCents).toBe(MIN_XOOTER_PAY_HALF_DAY_CENTS);
  });

  /**
   * ⚠️ A CONFLICT THIS FILE FOUND AND CANNOT RESOLVE. Founder decision required.
   *
   * `CarePlusApply.tsx` tells households, in writing: *"Minimum pay enforced: R220 (half) /
   * R300 (full) for dignified work."* `care-plus.ts` imported those two numbers into
   * `splitDiscount` as a per-booking floor.
   *
   * They do not survive contact with the commission ladder. On the standard R296 medium clean
   * (5.5h regular), a Xooter earns R192.40 at the 35% starting rate — below the R220 the
   * product calls a minimum, **before any Care+ discount is applied at all**. `splitDiscount`
   * degrades safely (it takes nothing rather than going further below), so nothing is broken;
   * the floor is simply unreachable at the bottom of the ladder.
   *
   * Two readings, and they lead to different fixes:
   *
   * 1. **The floor is a placement figure, misfiled.** `CarePlusApply` is a *household hiring a
   *    domestic worker* for standing days (07:00–16:00, chosen weekdays) at a `daily_pay_rate`.
   *    A full working day is not a 5.5-hour clean, and `hours >= 6 ? full : half` maps one onto
   *    the other. On this reading, per-booking work needs its own floor and R220/R300 should
   *    stop being cited here.
   * 2. **The floor is real for all Xoot work.** Then 35% is incompatible with the regular
   *    ladder, and either the ladder rises or the starting band falls.
   *
   * Note the corroboration for reading 1: `approve-zooter` writes `hourly_rate: 35`, and 65% of
   * R296 over 5.5 hours is exactly R35/hour. The 35% band and the hourly rate already in the
   * database agree with each other. It is the R220 that is the outlier.
   *
   * Pinned rather than papered over, so the day someone changes a rate or a ladder rung, this
   * says what it does to the pay floor.
   */
  it("records that the R220 floor is unreachable below Gold on the standard clean", () => {
    const MEDIUM_CLEAN_CENTS = 29600;
    const payAt = (rateBps: number) => xooterPayoutFor(MEDIUM_CLEAN_CENTS, rateBps).xooterPayCents;

    // Below the floor at the two bands most Xooters start in.
    expect(payAt(3500)).toBe(19240);
    expect(payAt(3000)).toBe(20720);
    expect(payAt(3500)).toBeLessThan(MIN_XOOTER_PAY_HALF_DAY_CENTS);
    expect(payAt(3000)).toBeLessThan(MIN_XOOTER_PAY_HALF_DAY_CENTS);

    // Clear only once the ladder has been climbed.
    expect(payAt(2500)).toBeGreaterThanOrEqual(MIN_XOOTER_PAY_HALF_DAY_CENTS);
    expect(payAt(2000)).toBeGreaterThanOrEqual(MIN_XOOTER_PAY_HALF_DAY_CENTS);

    // The exact break-even, so a ladder or rate change moves a number here rather than passing
    // quietly: R220 on a R296 clean needs the commission at or under 25.67%.
    const breakEvenBps = (1 - MIN_XOOTER_PAY_HALF_DAY_CENTS / MEDIUM_CLEAN_CENTS) * 10000;
    expect(Math.round(breakEvenBps)).toBe(2568);

    // And the claim is still on screen, so this is not a stale worry.
    const apply = readFileSync(join(process.cwd(), "src/pages/care/CarePlusApply.tsx"), "utf8");
    expect(apply).toContain("Minimum pay enforced: R220 (half) / R300 (full)");
  });
});

describe("the 14-day earnings boost", () => {
  const MEDIUM_CLEAN_CENTS = 29600;

  it("takes a new Xooter from 35% to 30%", () => {
    expect(BOOST_BPS).toBe(500);
    expect(BOOST_DAYS).toBe(14);
    expect(applyBoost(STARTING_RATE_BPS)).toBe(3000);
  });

  it("keeps the copy honest: 5 points of the job, 7.7% more earned", () => {
    // The founder's phrasing was "revenue boosted by 5%", which understates it. Both numbers are
    // pinned here so the announcement copy cannot drift from what a Xooter actually receives.
    const value = boostValueFor(MEDIUM_CLEAN_CENTS, STARTING_RATE_BPS);
    expect(value.pointsOfJob).toBe(5);
    expect(value.earningsPercent).toBe(7.7);
    expect(value.extraCents).toBe(1480); // R192.40 -> R207.20

    // The claim that is exactly true is the one about the job, not the one about earnings.
    expect(value.earningsPercent).toBeGreaterThan(value.pointsOfJob);
  });

  it("never takes Xoot below the confirmed 20% floor", () => {
    // The founder decision. A Platinum Xooter is already at the floor and gains nothing.
    expect(applyBoost(FLOOR_RATE_BPS)).toBe(FLOOR_RATE_BPS);
    expect(applyBoost(2500)).toBe(2000);
    // Even an oversized boost cannot breach it.
    expect(applyBoost(STARTING_RATE_BPS, 9999)).toBe(FLOOR_RATE_BPS);
    for (const band of COMMISSION_BANDS) {
      expect(applyBoost(band.rateBps)).toBeGreaterThanOrEqual(FLOOR_RATE_BPS);
    }
  });

  it("tells ops when a boost would be worth nothing", () => {
    // Granting a reward the recipient cannot detect is worse than granting none, because they
    // were told they had one.
    expect(boostIsWorthGranting(STARTING_RATE_BPS)).toBe(true);
    expect(boostIsWorthGranting(2500)).toBe(true);
    expect(boostIsWorthGranting(FLOOR_RATE_BPS)).toBe(false);
  });

  it("opens and closes on its own window", () => {
    const startsAt = "2026-08-09T00:00:00Z";
    const endsAt = "2026-08-23T00:00:00Z"; // 14 days
    const boost = { startsAt, endsAt };

    expect(boostIsActive(boost, new Date("2026-08-08T23:59:59Z"))).toBe(false);
    expect(boostIsActive(boost, new Date(startsAt))).toBe(true);
    expect(boostIsActive(boost, new Date("2026-08-16T12:00:00Z"))).toBe(true);
    // Half-open: the instant it ends, it is over. No off-by-one day of free boost.
    expect(boostIsActive(boost, new Date(endsAt))).toBe(false);
    expect(boostIsActive(null)).toBe(false);
    expect(boostIsActive({ startsAt: "nonsense", endsAt })).toBe(false);

    const days = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 86400000;
    expect(days).toBe(BOOST_DAYS);
  });

  it("is time-boxed in the migration, so it expires without anyone remembering", () => {
    const migration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260809210000_xooter_commission_boosts.sql"),
      "utf8",
    );
    expect(migration).toMatch(/ends_at timestamptz not null default \(now\(\) \+ interval '14 days'\)/);
    expect(migration).toMatch(/bps integer not null default 500/);
    // A reason is required: a reward with no stated reason is indistinguishable from a mistake.
    expect(migration).toMatch(/reason text not null/);
    // And no client may write its own pay.
    expect(migration).toMatch(/revoke insert, update, delete on public\.xooter_commission_boosts/);
  });
});

describe("formatting", () => {
  it("prints rates the way a Xooter would read them", () => {
    expect(formatRate(3500)).toBe("35%");
    expect(formatRate(3250)).toBe("32.5%");
    expect(formatRate(2000)).toBe("20%");
  });
});
