import { beforeEach, describe, expect, it } from "vitest";

import {
  type XooterBoost,
  boostCopy,
  boostToCelebrate,
  daysRemaining,
  markCelebrated,
} from "./xooter-boost-announcement";
import { STARTING_RATE_BPS, FLOOR_RATE_BPS } from "./xooter-commission";

const NOW = new Date("2026-08-10T12:00:00Z");

const boost = (over: Partial<XooterBoost> = {}): XooterBoost => ({
  id: "boost-1",
  bps: 500,
  startsAt: "2026-08-10T00:00:00Z",
  endsAt: "2026-08-24T00:00:00Z",
  ...over,
});

describe("choosing a boost to celebrate", () => {
  beforeEach(() => window.localStorage.clear());

  it("celebrates an active boost once, and never again", () => {
    // The property that makes this a reward rather than a banner. A card that reappears for
    // fourteen days stops reading as good news.
    expect(boostToCelebrate([boost()], NOW)?.id).toBe("boost-1");
    markCelebrated("boost-1");
    expect(boostToCelebrate([boost()], NOW)).toBeNull();
  });

  it("ignores boosts that have not started or have expired", () => {
    expect(boostToCelebrate([boost({ startsAt: "2026-08-11T00:00:00Z" })], NOW)).toBeNull();
    expect(boostToCelebrate([boost({ endsAt: "2026-08-10T11:59:00Z" })], NOW)).toBeNull();
  });

  it("announces the boost that pays most when a Xooter holds two", () => {
    const chosen = boostToCelebrate(
      [boost({ id: "small", bps: 300 }), boost({ id: "big", bps: 800 })],
      NOW,
    );
    expect(chosen?.id).toBe("big");
  });

  it("handles no boosts without throwing", () => {
    expect(boostToCelebrate([], NOW)).toBeNull();
    expect(boostToCelebrate(null, NOW)).toBeNull();
    expect(boostToCelebrate(undefined, NOW)).toBeNull();
  });

  it("does not lose the record when storage holds nonsense", () => {
    window.localStorage.setItem("xoot.xooter.boost.celebrated", "not json");
    // Unreadable storage means "not yet seen": the card shows again, which is the annoying
    // failure rather than the one that hides a reward someone was told about.
    expect(boostToCelebrate([boost()], NOW)?.id).toBe("boost-1");
    markCelebrated("boost-1");
    expect(boostToCelebrate([boost()], NOW)).toBeNull();
  });

  it("marks idempotently", () => {
    markCelebrated("boost-1");
    markCelebrated("boost-1");
    const raw = window.localStorage.getItem("xoot.xooter.boost.celebrated");
    expect(JSON.parse(raw!)).toEqual(["boost-1"]);
  });
});

describe("days remaining", () => {
  it("rounds up, so a boost with hours left still reads as a day", () => {
    expect(daysRemaining(boost({ endsAt: "2026-08-10T14:00:00Z" }), NOW)).toBe(1);
    expect(daysRemaining(boost({ endsAt: "2026-08-24T12:00:00Z" }), NOW)).toBe(14);
    expect(daysRemaining(boost({ endsAt: "2026-08-09T12:00:00Z" }), NOW)).toBe(0);
  });
});

describe("the copy on the card", () => {
  beforeEach(() => window.localStorage.clear());

  it("makes the exactly-true claim, not the understated one", () => {
    // 35% -> 30% is five percentage points of the job and a 7.7% rise in earnings. The card must
    // say the first. Saying "earnings up 5%" would understate what the Xooter actually receives,
    // and a pay surface that under-promises teaches people its numbers are approximate.
    const copy = boostCopy(boost(), STARTING_RATE_BPS, 29600, NOW);
    expect(copy.keepLine).toBe("You keep 5% more of every job.");
    expect(copy.keepLine).not.toMatch(/earnings/i);
    expect(copy.rateLine).toBe("35% → 30%");
    expect(copy.windowLine).toBe("For the next 14 days.");
    // R192.40 -> R207.20 on the standard clean.
    expect(copy.exampleLine).toBe("On a R296 job that's R15 more in your pocket.");
  });

  it("quotes no example when no real job value is supplied", () => {
    // The alternative is inventing a "typical job" nobody agreed to.
    expect(boostCopy(boost(), STARTING_RATE_BPS, undefined, NOW).exampleLine).toBeNull();
  });

  it("tells the truth to a Xooter already at the floor", () => {
    // Clamped at 20%, so the movement is genuinely zero. The card must not claim 5%.
    const copy = boostCopy(boost(), FLOOR_RATE_BPS, 29600, NOW);
    expect(copy.keepLine).toBe("You keep 0% more of every job.");
    expect(copy.rateLine).toBe("20% → 20%");
    // Which is exactly why `boostIsWorthGranting` exists — ops should never issue this one.
  });

  it("switches to the singular on the last day", () => {
    const copy = boostCopy(boost({ endsAt: "2026-08-10T20:00:00Z" }), STARTING_RATE_BPS, undefined, NOW);
    expect(copy.windowLine).toBe("For 1 more day.");
  });
});

describe("the Earnings page tells Xooters the rate they are actually paid", () => {
  /**
   * This screen used to keep its own table — `TIER_SHARE = { new: 65, established: 80,
   * veteran: 96 }` — and told a Xooter "You currently keep {tierShare}% of every booking". At 100
   * jobs that promised **96%**, a 4% commission, against a confirmed 20% floor. The real ladder
   * gives 75% at 75 jobs and 80% at 200.
   *
   * A wrong price shown to a customer is a consumer-protection problem. A wrong *pay* rate shown
   * to a worker is worse: they cannot check it against anything until payday, and they may have
   * chased a threshold that did not exist. It also progressed on job count alone, coaching people
   * away from the reliability score the rate actually turns on.
   */
  it("reads the ladder rather than a private tier table", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const page = readFileSync(join(process.cwd(), "src/pages/zooter/Earnings.tsx"), "utf8");
    const live = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

    expect(live).toMatch(/commissionBandFor\(\{ reliabilityScore, completedJobs \}\)/);
    // The table and its numbers must not return as live code.
    expect(live).not.toMatch(/TIER_SHARE/);
    expect(live).not.toMatch(/veteran:\s*96/);
    // And the share shown is derived from the rate, not written down separately.
    expect(live).toMatch(/const tierShare = \(10000 - effectiveRateBps\) \/ 100/);
  });

  it("never displays a share better than the commission floor allows", async () => {
    const { COMMISSION_BANDS, FLOOR_RATE_BPS } = await import("./xooter-commission");
    const bestShare = Math.max(...COMMISSION_BANDS.map((b) => (10000 - b.rateBps) / 100));
    expect(bestShare).toBe((10000 - FLOOR_RATE_BPS) / 100);
    expect(bestShare).toBe(80);
    // The old table's 96 is not reachable from any band.
    expect(bestShare).toBeLessThan(96);
  });
});
