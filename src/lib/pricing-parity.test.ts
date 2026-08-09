import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hoursFor, quote, isPriced, ADD_ON_CENTS, BOOKING_COVER_CENTS, LINEN_ON_SITE_CENTS, ONE_TIME_SERVICE_FEE_CENTS } from "./xoot-pricing";
import { CADENCE_DISCOUNT } from "./care-plus";
import {
  COMMISSION_BANDS,
  HYSTERESIS_POINTS,
  IN_TROUBLE_SCORE,
  STARTING_RATE_BPS,
} from "./xooter-commission";

/**
 * The client ladders (src/lib/xoot-pricing.ts) and the server ladders
 * (supabase/functions/_shared/pricing.ts) are deliberately duplicated — edge functions
 * run on Deno and cannot import from src/.
 *
 * Duplicated money tables drift. This test reads the server file as text and asserts
 * every rung matches, so a change to one without the other fails here rather than
 * showing a customer one price and charging them another.
 */

const serverSrc = readFileSync(
  join(process.cwd(), "supabase/functions/_shared/pricing.ts"),
  "utf8",
);

/** Pull `"4.5": r(266)` pairs out of a named ladder in the server file. */
function serverLadder(name: string): Record<string, number> {
  const start = serverSrc.indexOf(`const ${name}: Ladder = {`);
  if (start === -1) throw new Error(`server ladder ${name} not found`);
  const end = serverSrc.indexOf("};", start);
  const body = serverSrc.slice(start, end);
  const out: Record<string, number> = {};
  for (const m of body.matchAll(/"([\d.]+)":\s*r\((\d+)\)/g)) {
    out[m[1]] = Number(m[2]) * 100;
  }
  return out;
}

const PAIRS: [string, Parameters<typeof quote>[0]["service"]][] = [
  ["REGULAR", "regular"],
  ["OFFICE", "office"],
  ["EXPRESS", "express"],
  ["AIRBNB", "airbnb"],
  ["MOVING", "moving"],
];

describe("client/server pricing parity", () => {
  it.each(PAIRS)("%s matches between client and server", (serverName, service) => {
    const server = serverLadder(serverName);
    const clientHours = hoursFor(service);

    expect(Object.keys(server).map(Number).sort((a, b) => a - b)).toEqual(clientHours);

    for (const h of clientHours) {
      const q = quote({ service, hours: h, bookingCover: false });
      if (!isPriced(q)) throw new Error(`client refused ${service} at ${h}h`);
      expect({ h, cents: q.baseCents }).toEqual({ h, cents: server[String(h)] });
    }
  });

  it("agrees on the add-on, cover and linen constants", () => {
    const serverConst = (name: string) => {
      const m = serverSrc.match(new RegExp(`export const ${name} = r\\((\\d+)\\)`));
      if (!m) throw new Error(`server constant ${name} not found`);
      return Number(m[1]) * 100;
    };
    expect(serverConst("ADD_ON_CENTS")).toBe(ADD_ON_CENTS);
    expect(serverConst("BOOKING_COVER_CENTS")).toBe(BOOKING_COVER_CENTS);
    expect(serverConst("LINEN_ON_SITE_CENTS")).toBe(LINEN_ON_SITE_CENTS);
  });

  /**
   * Every function that writes a `bookings` row, not just the one the app happens to call.
   *
   * This originally checked `create-booking` alone and passed for a day while
   * `create-booking-request` — deployed, authenticated, and writing real bookings — still ran
   * its own private copy of `homeSizes R270/R315/R390 x serviceMultiplier` with cover R21. It
   * survived the ZD-020 repricing because it imports no shared pricing and no client code calls
   * it, so nothing anywhere failed. A guard aimed at one file cannot catch that; the list is
   * what matters.
   */
  const BOOKING_WRITERS = [
    "supabase/functions/create-booking/index.ts",
    "supabase/functions/create-booking-request/index.ts",
  ];

  it.each(BOOKING_WRITERS)("%s has no superseded multiplier model", (path) => {
    const fn = readFileSync(join(process.cwd(), path), "utf8");
    // The old model and its unapproved figures must not come back. Matching on *usage*
    // rather than the bare word, so the comment explaining what was removed does not
    // trip its own guard.
    expect(fn).not.toMatch(/serviceMultiplier\[/);
    expect(fn).not.toMatch(/priceFactor\s*[:.]/);
    expect(fn).not.toMatch(/price:\s*270|price:\s*315|price:\s*390/);
    // Booking cover moved R21 -> R22 (ZD-020).
    expect(fn).not.toMatch(/bookingCoverOptIn === false \? 0 : 21/);
    // And it must price off the shared ladder rather than anything of its own.
    expect(fn).toMatch(/from "\.\.\/_shared\/pricing\.ts"/);
    expect(fn).toMatch(/basePrice\(serviceType,/);
  });

  /**
   * The booking screen prices off the ladder, and holds no copy of the rule.
   *
   * This replaces a tripwire that asserted the opposite. `Book.tsx` used to compute
   * `size.price x length.priceFactor x serviceMultiplier` off `270 / 315 / 390` — the
   * superseded model — which agreed with *deployed* production and disagreed with this repo.
   * The tripwire existed so neither side could move alone. They have now moved together, so
   * per its own instruction it is deleted rather than weakened, and replaced by the assertion
   * that matters going forward: the screen must not grow a second pricing model again.
   */
  it("prices the booking screen off the ladder, with no private copy of the model", () => {
    const book = readFileSync(join(process.cwd(), "src/pages/app/Book.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    // It goes through the shared quote, and translates service and hours the way the server does.
    expect(book).toMatch(/from "@\/lib\/xoot-pricing"/);
    expect(book).toMatch(/priceQuote\(\{/);
    expect(book).toMatch(/resolveHours\(\{/);
    expect(book).toMatch(/SERVICE_ALIASES\[active\]/);

    // And the superseded model is gone from live code, not merely unused.
    expect(book).not.toMatch(/size\.price/);
    expect(book).not.toMatch(/option\.priceFactor/);
    expect(book).not.toMatch(/serviceMultiplier\[/);
  });

  /**
   * The high-demand premium and the booking-cover figure, both in `src/lib/operations.ts`.
   *
   * `calculateBookingQuote` is the other half of what `Book.tsx` shows, and it agrees with the
   * server on the 15% premium and the 16:00 threshold — worth pinning, since those were
   * previously uncovered.
   *
   * The cover figure no longer lags: `operations.ts` was R21, the pre-ZD-020 amount, and moved
   * to R22 with the booking-screen repricing so all three sources now agree.
   */
  it("pins the high-demand premium and the cover figure against the server", () => {
    const fn = readFileSync(join(process.cwd(), "supabase/functions/create-booking/index.ts"), "utf8");
    const ops = readFileSync(join(process.cwd(), "src/lib/operations.ts"), "utf8");

    // Rate and threshold must agree across client and server.
    const serverRate = /isHighDemandSlot\(time\) \? Math\.round\(subtotalCents \* ([\d.]+)\)/.exec(fn);
    const clientRate = /HIGH_DEMAND_SLOT_RATE = ([\d.]+)/.exec(ops);
    expect(serverRate, "server no longer computes a high-demand premium").toBeTruthy();
    expect(clientRate, "client no longer defines HIGH_DEMAND_SLOT_RATE").toBeTruthy();
    expect(clientRate![1]).toBe(serverRate![1]);

    const hourOf = (src: string) => /hour >= (\d+)|\[0\] \?\? 0\) >= (\d+)/.exec(src);
    expect(hourOf(fn)![2] ?? hourOf(fn)![1]).toBe(hourOf(ops)![1] ?? hourOf(ops)![2]);

    // Charged on the subtotal, so the premium never applies to booking cover on either side.
    expect(fn).toMatch(/Math\.round\(subtotalCents \* [\d.]+\)/);
    expect(ops).toMatch(/Math\.round\(subtotal \* HIGH_DEMAND_RATE\)/);

    // The Care+ discount is likewise a rate on the subtotal. The client models no equivalent,
    // so this only pins the server's figure against silent change.
    const carePlus = /if \(data\.next_billing_at[\s\S]{0,120}return ([\d.]+);/.exec(fn);
    expect(carePlus, "server no longer returns a Care+ discount rate").toBeTruthy();
    expect(Number(carePlus![1])).toBe(0.1);
    expect(fn).toMatch(/carePlusDiscount = Math\.round\(subtotal \* carePlusDiscountRate\)/);

    // All three sources agree on booking cover now: server, xoot-pricing and operations.
    expect(/BOOKING_COVER_PRICE_ZAR = (\d+)/.exec(ops)![1]).toBe("22");
    expect(BOOKING_COVER_CENTS).toBe(2200);
    expect(Number(/export const BOOKING_COVER_CENTS = r\((\d+)\)/.exec(serverSrc)![1]) * 100).toBe(
      BOOKING_COVER_CENTS,
    );
  });

  /**
   * The fee the client used to omit, now closed.
   *
   * This assertion used to record a deliberate divergence: `create-booking` added
   * ONE_TIME_SERVICE_FEE_CENTS on one-time bookings and `quote()` had no concept of it, so the
   * client under-quoted by R39. That was not an internal disagreement — `BookingConfirm.tsx`
   * prices from `quote()`, so it was the last screen before payment showing a total the server
   * would then exceed. Under the Consumer Protection Act the displayed price is the price.
   *
   * The old test said it would fail the moment someone wired the fee in, and pointed at this
   * work. It did exactly that. Kept as an equality check so the two implementations cannot
   * drift apart again, in either direction.
   */
  it("charges the one-time service fee identically on client and server", () => {
    const match = /export const ONE_TIME_SERVICE_FEE_CENTS = r\((\d+)\)/.exec(serverSrc);
    expect(match, "server no longer defines ONE_TIME_SERVICE_FEE_CENTS").toBeTruthy();
    expect(Number(match![1]) * 100).toBe(ONE_TIME_SERVICE_FEE_CENTS);
    expect(ONE_TIME_SERVICE_FEE_CENTS).toBe(3900);

    // One-time: the fee is charged, and it is part of the total the customer is shown.
    const oneTime = quote({ service: "regular", hours: 6, addOns: 1, bookingCover: true });
    if (!isPriced(oneTime)) throw new Error("expected a price");
    expect(oneTime.serviceFeeCents).toBe(ONE_TIME_SERVICE_FEE_CENTS);
    expect(oneTime.totalCents).toBe(
      oneTime.baseCents + oneTime.addOnsCents + oneTime.linenCents + oneTime.coverCents +
        ONE_TIME_SERVICE_FEE_CENTS,
    );

    // Recurring: waived, matching `frequency === "one_time" ? fee : 0` on the server.
    const repeat = quote({ service: "regular", hours: 6, addOns: 1, bookingCover: true, frequency: "repeat" });
    if (!isPriced(repeat)) throw new Error("expected a price");
    expect(repeat.serviceFeeCents).toBe(0);
    expect(repeat.totalCents).toBe(oneTime.totalCents - ONE_TIME_SERVICE_FEE_CENTS);
  });

  /**
   * Omitting `frequency` must not under-quote.
   *
   * The default is the whole safety property here: a caller that forgets the field over-states by
   * R39 rather than under-stating, and only one of those shows a customer a total they are later
   * charged past.
   */
  it("defaults to charging the fee when frequency is not supplied", () => {
    const implicit = quote({ service: "regular", hours: 6 });
    const explicit = quote({ service: "regular", hours: 6, frequency: "one_time" });
    if (!isPriced(implicit) || !isPriced(explicit)) throw new Error("expected a price");
    expect(implicit.totalCents).toBe(explicit.totalCents);
    expect(implicit.serviceFeeCents).toBe(ONE_TIME_SERVICE_FEE_CENTS);
  });

  /**
   * Care+ members pay no booking fee — founder decision 2026-08-09, alongside R99/month and one
   * month free.
   *
   * This is the half of that decision that can go wrong quietly. The paywall now promises "no
   * booking fee, ever" in writing; if `create-booking` still adds R39, the promise is a false
   * price representation under the CPA and the customer is charged past a total they agreed to.
   * That is the same defect this repo already shipped once, when `quote()` had no concept of the
   * fee and `BookingConfirm` under-stated by R39.
   *
   * Asserted against the server source, not a copy of the rule, so the two cannot drift.
   */
  it("waives the fee for Care+ members, and the server agrees", () => {
    const member = quote({ service: "regular", hours: 6, frequency: "one_time", carePlusMember: true });
    const nonMember = quote({ service: "regular", hours: 6, frequency: "one_time" });
    if (!isPriced(member) || !isPriced(nonMember)) throw new Error("expected a price");

    expect(member.serviceFeeCents).toBe(0);
    expect(member.totalCents).toBe(nonMember.totalCents - ONE_TIME_SERVICE_FEE_CENTS);

    // A member booking recurring pays nothing either — membership wins before frequency.
    const recurringMember = quote({ service: "regular", hours: 6, frequency: "repeat", carePlusMember: true });
    if (!isPriced(recurringMember)) throw new Error("expected a price");
    expect(recurringMember.serviceFeeCents).toBe(0);

    // The server's rule, read from its source. `isCarePlusMember` comes from the same lookup
    // that decides the discount, so a member cannot receive the discount and still be charged
    // the fee — the combination that would be hardest to spot in a receipt.
    const serverSrc = readFileSync(join(process.cwd(), "supabase/functions/create-booking/index.ts"), "utf8");
    expect(serverSrc).toMatch(/const isCarePlusMember = carePlusDiscountRate > 0;/);
    expect(serverSrc).toMatch(
      /isCarePlusMember \|\| frequency !== "one_time" \? 0 : ONE_TIME_SERVICE_FEE_CENTS/,
    );
  });

  /**
   * The commission ladder, which decides what a person is paid.
   *
   * This is the newest duplicated table and the one with the worst failure mode. A drifted price
   * ladder shows a customer the wrong number; a drifted commission ladder pays a Xooter the wrong
   * amount, and they have no way to check it. So the whole band table is compared row by row
   * rather than spot-checked, and the behavioural rules are asserted against the server's own
   * resolver rather than a description of it.
   */
  it("agrees on every commission band between client and server", () => {
    const start = serverSrc.indexOf("export const COMMISSION_BANDS");
    expect(start, "server no longer defines COMMISSION_BANDS").toBeGreaterThan(-1);
    const body = serverSrc.slice(start, serverSrc.indexOf("];", start));

    const serverBands = [...body.matchAll(
      /\{\s*rank:\s*"(\w+)",\s*minScore:\s*(\d+),\s*minCompletedJobs:\s*(\d+),\s*rateBps:\s*(\d+)\s*\}/g,
    )].map((m) => ({
      rank: m[1],
      minScore: Number(m[2]),
      minCompletedJobs: Number(m[3]),
      rateBps: Number(m[4]),
    }));

    expect(serverBands).toEqual(
      COMMISSION_BANDS.map(({ rank, minScore, minCompletedJobs, rateBps }) => ({
        rank,
        minScore,
        minCompletedJobs,
        rateBps,
      })),
    );
  });

  it("agrees on the commission thresholds that are not in the band table", () => {
    const serverNum = (name: string) => {
      const m = serverSrc.match(new RegExp(`export const ${name} = (\\d+)`));
      if (!m) throw new Error(`server constant ${name} not found`);
      return Number(m[1]);
    };
    expect(serverNum("STARTING_RATE_BPS")).toBe(STARTING_RATE_BPS);
    expect(serverNum("HYSTERESIS_POINTS")).toBe(HYSTERESIS_POINTS);
    expect(serverNum("IN_TROUBLE_SCORE")).toBe(IN_TROUBLE_SCORE);
  });

  /**
   * The rules, not just the numbers.
   *
   * A band table can match while the code reading it disagrees — the day-one trap is exactly
   * that shape, since it lives in the resolver and not in any constant. These assert the three
   * behaviours that decide pay, read out of the server source.
   */
  it("keeps the server resolver's three pay rules intact", () => {
    // 1. Missing score falls to the starting rate, not to a guess.
    expect(serverSrc).toMatch(
      /if \(typeof reliabilityScore !== "number"[\s\S]{0,80}return STARTING_RATE_BPS;/,
    );
    // 2. Below the in-trouble threshold is the starting rate, with no hysteresis reprieve.
    expect(serverSrc).toMatch(/if \(score < IN_TROUBLE_SCORE\) return STARTING_RATE_BPS;/);
    // 3. A band requires the job count as well as the score — the day-one trap.
    expect(serverSrc).toMatch(/jobs >= band\.minCompletedJobs && score >= band\.minScore/);
    // And commission is charged on the subtotal, never the total.
    expect(serverSrc).toMatch(/xooterPayout\(subtotalCents: number/);
  });

  /**
   * The rate is struck once and stored, never recomputed at payout.
   *
   * This is the property that makes the ladder trustworthy rather than arbitrary. A rank moves;
   * a Xooter who accepted a job at 30% and picked up a late arrival the following week must not
   * be paid at 35% for work already agreed and already done. On a R296 clean the two ends of
   * the ladder are R44.40 apart, and the Xooter has no way to audit a number that changed after
   * the fact.
   *
   * Both stamping points are asserted, because a booking can be created with a Xooter chosen or
   * with nobody chosen, and only one of those two paths is obvious.
   */
  it("strikes the commission rate once, at whichever point the Xooter becomes known", () => {
    const create = readFileSync(
      join(process.cwd(), "supabase/functions/create-booking/index.ts"),
      "utf8",
    );
    const respond = readFileSync(
      join(process.cwd(), "supabase/functions/respond-zooter-job/index.ts"),
      "utf8",
    );

    // Booking time: the rate comes from the assigned Xooter's own rank, per booking row, and is
    // null when nobody is assigned rather than defaulted to something that reads as agreed.
    expect(create).toMatch(/commission_rate_bps: zooterId \? commissionRates\.get\(zooterId\)/);
    expect(create).toMatch(/reliabilityScore: row\.reliability_score/);
    expect(create).toMatch(/completedJobs: row\.jobs_completed/);

    // Acceptance time: only when the booking was created unassigned. The `.is(..., null)` guard
    // is what stops an accept from overwriting a rate already struck at booking time.
    expect(respond).toMatch(/if \(nextState === "accepted"\)/);
    expect(respond).toMatch(/\.is\("commission_rate_bps", null\)/);
    expect(respond).toMatch(/select\("id,reliability_score,jobs_completed"\)/);

    // Neither may reach for the schedule directly; both go through the shared resolver.
    for (const src of [create, respond]) {
      expect(src).toMatch(/commissionRateBps/);
      expect(src).not.toMatch(/rateBps:\s*3500/);
    }
  });

  it("keeps the migration's stored-rate column honest about being nullable", () => {
    const migration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260809120000_booking_commission_rate.sql"),
      "utf8",
    );
    // No default and no NOT NULL: an absence means "no Xooter has accepted yet", and that is a
    // state the schema has to be able to express.
    expect(migration).toMatch(/add column if not exists commission_rate_bps integer;/);
    expect(migration).not.toMatch(/commission_rate_bps integer[^;]*(not null|default)/i);
    // A typo of 35 or 3500000 still fails loudly, while tuning the schedule needs no migration.
    expect(migration).toMatch(/between 500 and 5000/);
    for (const band of COMMISSION_BANDS) {
      expect(band.rateBps).toBeGreaterThanOrEqual(500);
      expect(band.rateBps).toBeLessThanOrEqual(5000);
    }
  });

  /**
   * The divergence this change did NOT fix, recorded so it is not mistaken for agreement.
   *
   * `care-plus.ts` describes cadence-tiered discounts — 15% weekly, 10% fortnightly, 5% monthly —
   * and `create-booking`'s `getCarePlusDiscount` returns a flat **0.1** for every active member,
   * ignoring cadence entirely. Any surface quoting 15% to a weekly member would be quoting a
   * discount the server does not give.
   *
   * Not fixed here because it changes what members are charged, which is the founder's call and
   * not a side effect of a copy change. Pinned so the day someone aligns them, this test tells
   * them the client half exists.
   */
  it("records that the server discount is flat, not cadence-tiered", () => {
    const serverSrc = readFileSync(join(process.cwd(), "supabase/functions/create-booking/index.ts"), "utf8");
    expect(serverSrc, "server no longer returns a flat Care+ rate — align CADENCE_DISCOUNT")
      .toMatch(/const getCarePlusDiscount[\s\S]{0,400}return 0\.1;/);
    expect(CADENCE_DISCOUNT.weekly).toBe(0.15);
    expect(CADENCE_DISCOUNT.weekly).not.toBe(0.1);
  });
});
