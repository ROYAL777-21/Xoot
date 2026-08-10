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
  impliedSubtotalCents,
  nextBandValueFor,
  xooterPayoutFor,
} from "./xooter-commission";
import { calculateReliabilityScore, shouldDeprioritizeXooter } from "./trust";
import { MIN_XOOTER_HOURLY_CENTS, splitDiscount } from "./care-plus";

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

  it("keeps the founder's 35–30% range as the first three bands", () => {
    // Re-expressed 2026-08-10 against band identity rather than a job-count threshold. It used to
    // read `minCompletedJobs < 75`, which quietly encoded the old schedule: compressing the ladder
    // moved Gold to 50 jobs and the assertion started failing on a change it was never about.
    const stated = COMMISSION_BANDS.filter((b) => ["new", "bronze", "silver"].includes(b.rank));
    expect(stated).toHaveLength(3);
    for (const band of stated) {
      expect(band.rateBps).toBeGreaterThanOrEqual(3000);
      expect(band.rateBps).toBeLessThanOrEqual(3500);
    }
    // And everything past that range is genuinely below it.
    for (const band of COMMISSION_BANDS.filter((b) => ["gold", "platinum"].includes(b.rank))) {
      expect(band.rateBps).toBeLessThan(3000);
    }
  });

  it("puts the first drop within reach — 5 jobs, not 10", () => {
    // The founder's decision, and the point of the compression: 30% should be weeks away, not
    // years. At two jobs a week Bronze lands in ~2.5 weeks and Silver in ~2 months.
    const byRank = Object.fromEntries(COMMISSION_BANDS.map((b) => [b.rank, b]));
    expect(byRank.bronze.minCompletedJobs).toBe(5);
    expect(byRank.silver.minCompletedJobs).toBe(15);
    // The ends are unchanged — only the distance between them moved.
    expect(byRank.new.rateBps).toBe(3500);
    expect(byRank.platinum.rateBps).toBe(2000);
    // Reaching the floor should be a year of steady work, not two.
    expect(byRank.platinum.minCompletedJobs).toBeLessThanOrEqual(120);
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
    expect(at(4)).toBe("new");
    expect(at(5)).toBe("bronze");
    expect(at(14)).toBe("bronze");
    expect(at(15)).toBe("silver");
    expect(at(49)).toBe("silver");
    expect(at(50)).toBe("gold");
    expect(at(119)).toBe("gold");
    expect(at(120)).toBe("platinum");
  });

  it("holds a long-serving Xooter at the band their score supports", () => {
    // Volume alone earns nothing. 500 jobs at a Bronze score is a Bronze rate.
    expect(commissionBandFor({ reliabilityScore: 86, completedJobs: 500 }).rank).toBe("bronze");
    expect(commissionBandFor({ reliabilityScore: 94, completedJobs: 500 }).rank).toBe("gold");
  });
});

describe("slipping", () => {
  it("keeps a held band while the score stays within tolerance", () => {
    const held = { reliabilityScore: 88 - HYSTERESIS_POINTS, completedJobs: 40, currentRateBps: 3000 };
    expect(commissionBandFor(held).rank).toBe("silver");

    // One point further and the band is genuinely lost. 84 is below Bronze's 85 gate too, so the
    // Xooter lands on New — which is the honest answer: the score no longer supports any band.
    expect(
      commissionBandFor({ ...held, reliabilityScore: 88 - HYSTERESIS_POINTS - 1 }).rank,
    ).toBe("new");
  });

  it("does not let hysteresis delay a promotion", () => {
    // Holding a worse rate must never keep someone out of a band they have earned.
    expect(commissionBandFor({ reliabilityScore: 93, completedJobs: 80, currentRateBps: 3500 }).rank)
      .toBe("gold");
  });

  it("ignores a claimed band the Xooter cannot support at all", () => {
    // A stale or wrong `currentRateBps` is not authority to keep a band. 5 jobs is below every
    // gate above New, whatever rate the row happens to carry.
    expect(commissionBandFor({ reliabilityScore: 99, completedJobs: 4, currentRateBps: 2000 }).rank)
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

  it("keeps every band clear of the hourly floor on the standard clean", () => {
    // Rewritten 2026-08-10, when the floor became hourly. On a 5.5-hour R296 clean the floor is
    // 5.5 x R35 = R192.50, and the Care+ share is R11.84. Even a new Xooter at 35% (R192.40) is
    // within ten cents of the floor, so the guard does what it is for: it takes nothing from them
    // and Xoot absorbs the whole discount.
    const subtotal = 29600;
    const hours = 5.5;
    const discountCents = Math.round(subtotal * 0.1);
    const floor = Math.round(hours * MIN_XOOTER_HOURLY_CENTS);

    const platinum = xooterPayoutFor(subtotal, FLOOR_RATE_BPS);
    const split = splitDiscount(discountCents, platinum.xooterPayCents, hours);
    expect(split.flooredBy).toBe(0);
    expect(platinum.xooterPayCents - split.xooterCents).toBeGreaterThanOrEqual(floor);
    expect(split.xootCents + split.xooterCents).toBe(discountCents);

    // A new Xooter is already below the hourly floor by ten cents, so nothing is taken from them.
    const newcomer = xooterPayoutFor(subtotal, STARTING_RATE_BPS);
    expect(newcomer.xooterPayCents).toBe(19240);
    expect(newcomer.xooterPayCents).toBeLessThan(floor);
    const newSplit = splitDiscount(discountCents, newcomer.xooterPayCents, hours);
    expect(newSplit.xooterCents).toBe(0);
    expect(newSplit.xootCents).toBe(discountCents);
  });

  /**
   * The conflict this file found, and how the founder resolved it (2026-08-10).
   *
   * `CarePlusApply` tells households "Minimum pay enforced: R220 (half) / R300 (full)", and
   * `care-plus.ts` had imported those into `splitDiscount` as a per-booking floor. They never held:
   * on the standard R296 clean a new Xooter earns R192.40 at 35%, so the floor sat above the
   * ordinary job and the guard never fired.
   *
   * **The founder kept 35% commission.** So the placement figures were the thing misfiled — they
   * are day rates for a household hiring a domestic worker for standing days, not a floor for a
   * 5.5-hour clean — and the per-booking floor became hourly: R35/h, the same `hourly_rate`
   * `approve-zooter` writes onto every Xooter it activates.
   *
   * What that decision does NOT settle is kept in `care-plus.test.ts`: the ladder is sub-linear in
   * hours, so a 10-hour regular clean returns R27.95/h at 35% and R34.40/h even at the floor.
   */
  it("records the resolved floor, and that the placement figures are no longer cited for bookings", () => {
    const MEDIUM_CLEAN_CENTS = 29600;
    const HOURS = 5.5;
    const payAt = (rateBps: number) => xooterPayoutFor(MEDIUM_CLEAN_CENTS, rateBps).xooterPayCents;

    // The hourly floor for the standard clean, and where each band sits against it.
    const floor = Math.round(HOURS * MIN_XOOTER_HOURLY_CENTS);
    expect(floor).toBe(19250);
    expect(payAt(3500)).toBe(19240); // ten cents under, at the starting rate
    expect(payAt(2000)).toBe(23680); // comfortably over at the ladder floor

    // The placement day rates must no longer be used to floor a booking.
    const carePlus = readFileSync(join(process.cwd(), "src/lib/care-plus.ts"), "utf8");
    expect(carePlus).toMatch(/const floor = Math\.round\(Math\.max\(0, hours\) \* MIN_XOOTER_HOURLY_CENTS\)/);
    expect(carePlus).not.toMatch(/hours >= 6 \? MIN_XOOTER_PAY_FULL_DAY_CENTS/);

    // And the household-facing claim still stands where it belongs — on the placement form.
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

describe("what the next band is worth in rands", () => {
  it("reverses a payout back to the subtotal it came from, to within a cent or two", () => {
    // This is what lets the Earnings page quote a real figure instead of inventing a typical week.
    //
    // ⚠️ It is NOT exact, and the test says so rather than asserting a lie it would have to keep
    // massaging. `xooterPayoutFor` rounds the commission to whole cents and subtracts, so the pay
    // figure has already lost the fraction — R799 at 32.5% pays 53932c, and 53932 reverses to
    // 79899c, one cent short. The error is bounded by 1/(1 − rate) cents, so at most ~2c per row.
    //
    // Harmless here and worth being precise about why: the page reverses a **month's** aggregate
    // and quotes the result to the nearest rand, so a 2-cent basis error cannot move the number
    // shown. It would matter if this were ever used to reconcile an individual payout, which is
    // what this comment exists to stop someone doing.
    for (const rateBps of COMMISSION_BANDS.map((b) => b.rateBps)) {
      for (const subtotal of [29600, 43000, 79900, 120000]) {
        const pay = xooterPayoutFor(subtotal, rateBps).xooterPayCents;
        expect(Math.abs(impliedSubtotalCents(pay, rateBps) - subtotal)).toBeLessThanOrEqual(2);
      }
    }
  });

  it("refuses to invent a basis it does not have", () => {
    // A Xooter with nothing in the window gets no figure at all. Zero in, zero out — never a
    // projection dressed as a measurement, which is the defect the fake 96% tier was made of.
    expect(impliedSubtotalCents(0, 3500)).toBe(0);
    expect(impliedSubtotalCents(-100, 3500)).toBe(0);
    expect(impliedSubtotalCents(Number.NaN, 3500)).toBe(0);
    // A 100% rate has no inverse. Not reachable through the ladder, but the guard is cheap.
    expect(impliedSubtotalCents(10000, 10000)).toBe(0);
  });

  it("prices New → Bronze on a month of standard cleans", () => {
    // Eight R296 cleans in 30 days — roughly two a week, the pace the ladder was compressed for.
    const monthlySubtotal = 29600 * 8;
    const gain = nextBandValueFor(monthlySubtotal, 3500, 3250);

    // 2.5 points of R2,368 of work.
    expect(gain.extraCents).toBe(5920);
    expect(gain.pointsOfJob).toBe(2.5);
    // And the rise in what they actually take home is larger than the points, always.
    expect(gain.earningsPercent).toBeGreaterThan(gain.pointsOfJob);
    expect(gain.earningsPercent).toBe(3.8);
  });

  it("is the same arithmetic as a boost, because they are the same operation", () => {
    // Two implementations of "what does a better rate pay" would eventually disagree about a rand.
    const subtotal = 29600 * 8;
    expect(nextBandValueFor(subtotal, 3500, 3000)).toEqual(boostValueFor(subtotal, 3500, BOOST_BPS));
  });

  it("never quotes a negative reward", () => {
    // "Reach Gold and lose R44" is not a sentence this surface exists to produce. A caller passing
    // a worse or equal rate gets nothing, not a minus sign.
    expect(nextBandValueFor(100000, 2500, 3500).extraCents).toBe(0);
    expect(nextBandValueFor(100000, 2000, 2000).extraCents).toBe(0);
  });

  it("shows Platinum nothing, because there is nothing above it", () => {
    // The Earnings page finds the next band by rate; at the floor there is none, and the figure
    // must not fall back to something invented.
    const platinum = COMMISSION_BANDS[COMMISSION_BANDS.length - 1];
    expect(platinum.rateBps).toBe(FLOOR_RATE_BPS);
    expect(COMMISSION_BANDS.find((b) => b.rateBps < platinum.rateBps)).toBeUndefined();
  });

  it("the Earnings page reverses at the band rate, not the boosted one", () => {
    // A boost is temporary and most of the history was struck without it, so reversing at the
    // boosted rate would overstate the subtotal — and the reward quoted on top of it.
    const page = readFileSync(join(process.cwd(), "src/pages/zooter/Earnings.tsx"), "utf8");
    expect(page).toMatch(/impliedSubtotalCents\(last30NetCents, band\.rateBps\)/);
    expect(page).not.toMatch(/impliedSubtotalCents\(last30NetCents, effectiveRateBps\)/);
    // And it renders nothing when there is no basis.
    expect(page).toMatch(/nextBandGainCents > 0 &&/);
  });
});

describe("formatting", () => {
  it("prints rates the way a Xooter would read them", () => {
    expect(formatRate(3500)).toBe("35%");
    expect(formatRate(3250)).toBe("32.5%");
    expect(formatRate(2000)).toBe("20%");
  });
});
