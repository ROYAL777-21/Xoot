import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hoursFor, quote, isPriced, ADD_ON_CENTS, BOOKING_COVER_CENTS, LINEN_ON_SITE_CENTS, BOOKING_FEE_CENTS, MULTI_XOOTER_SERVICES, serviceAllowsMultipleXooters } from "./xoot-pricing";
import { CADENCE_DISCOUNT } from "./care-plus";
import { GRADED_SLOT_PRICING, SLOT_PREMIUM_CURVE } from "./operations";
import {
  BOOST_BPS,
  COMMISSION_BANDS,
  FLOOR_RATE_BPS,
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
    const serverRate = /const HIGH_DEMAND_SLOT_RATE = ([\d.]+)/.exec(fn);
    const clientRate = /HIGH_DEMAND_SLOT_RATE = ([\d.]+)/.exec(ops);
    expect(serverRate, "server no longer defines HIGH_DEMAND_SLOT_RATE").toBeTruthy();
    expect(clientRate, "client no longer defines HIGH_DEMAND_SLOT_RATE").toBeTruthy();
    expect(clientRate![1]).toBe(serverRate![1]);

    const hourOf = (src: string) => /hour >= (\d+)|\[0\] \?\? 0\) >= (\d+)/.exec(src);
    expect(hourOf(fn)![2] ?? hourOf(fn)![1]).toBe(hourOf(ops)![1] ?? hourOf(ops)![2]);

    // Charged on the subtotal, so the premium never applies to booking cover on either side.
    expect(fn).toMatch(/Math\.round\(subtotalCents \* slotPremiumRate\(time\)\)/);
    expect(ops).toMatch(/Math\.round\(subtotal \* slotPremiumRate\(time\)\)/);

    // The Care+ discount is likewise a rate on the subtotal. The client models no equivalent,
    // so this only pins the server's figure against silent change. The rate now lives in
    // `_shared/care-plus-membership.ts`, which both booking writers read.
    const membershipSrc = readFileSync(
      join(process.cwd(), "supabase/functions/_shared/care-plus-membership.ts"),
      "utf8",
    );
    const carePlus = /if \(data\.next_billing_at[\s\S]{0,200}return ([\d.]+);/.exec(membershipSrc);
    expect(carePlus, "server no longer returns a Care+ discount rate").toBeTruthy();
    expect(Number(carePlus![1])).toBe(0.1);
    // Applied identically by both writers — same base, same rounding.
    for (const path of BOOKING_WRITERS) {
      const writer = readFileSync(join(process.cwd(), path), "utf8");
      expect(writer, `${path} must apply the Care+ discount to the subtotal`).toMatch(
        /carePlusDiscount = Math\.round\(subtotal \* carePlusDiscountRate\)/,
      );
    }

    // All three sources agree on booking cover now: server, xoot-pricing and operations.
    expect(/BOOKING_COVER_PRICE_ZAR = (\d+)/.exec(ops)![1]).toBe("22");
    expect(BOOKING_COVER_CENTS).toBe(2200);
    expect(Number(/export const BOOKING_COVER_CENTS = r\((\d+)\)/.exec(serverSrc)![1]) * 100).toBe(
      BOOKING_COVER_CENTS,
    );
  });

  /**
   * The booking fee: R39 on every booking, waived only for Care+ members.
   *
   * Founder decision 2026-08-12, superseding ZD-007's one-time rule. This assertion has now
   * recorded three different states of the world — first a deliberate divergence (the server
   * charged the fee and `quote()` had no concept of it, so `BookingConfirm` under-quoted by R39
   * on the last screen before payment), then the one-time rule agreed on both sides, and now
   * this. Kept as an equality check so the two implementations cannot drift apart again in
   * either direction.
   */
  it("charges the booking fee identically on client and server", () => {
    const match = /export const BOOKING_FEE_CENTS = r\((\d+)\)/.exec(serverSrc);
    expect(match, "server no longer defines BOOKING_FEE_CENTS").toBeTruthy();
    expect(Number(match![1]) * 100).toBe(BOOKING_FEE_CENTS);
    expect(BOOKING_FEE_CENTS).toBe(3900);

    const oneTime = quote({ service: "regular", hours: 6, addOns: 1, bookingCover: true });
    if (!isPriced(oneTime)) throw new Error("expected a price");
    expect(oneTime.serviceFeeCents).toBe(BOOKING_FEE_CENTS);
    expect(oneTime.totalCents).toBe(
      oneTime.baseCents + oneTime.addOnsCents + oneTime.linenCents + oneTime.coverCents +
        BOOKING_FEE_CENTS,
    );

    /*
     * Recurring is charged too, and this is the assertion that matters most.
     *
     * It would have failed under every previous version of this codebase. A fortnightly
     * non-member now pays the fee every fortnight — 26 times a year — which is the founder's
     * stated rule and the thing that makes Care+ at R99/month pay for itself. If someone
     * "restores" the recurring waiver, this line is what stops it.
     */
    const repeat = quote({ service: "regular", hours: 6, addOns: 1, bookingCover: true, frequency: "repeat" });
    if (!isPriced(repeat)) throw new Error("expected a price");
    expect(repeat.serviceFeeCents).toBe(BOOKING_FEE_CENTS);
    expect(repeat.totalCents).toBe(oneTime.totalCents);
  });

  /**
   * Omitting `carePlusMember` must not under-quote.
   *
   * The default is the whole safety property here: a caller that forgets the field over-states by
   * R39 rather than under-stating, and only one of those shows a customer a total they are later
   * charged past. `BookingConfirm` and `Book` both resolve membership asynchronously, so they
   * genuinely do render as non-member for a moment — the number can only fall from there.
   */
  it("defaults to charging the fee when membership is not supplied", () => {
    const implicit = quote({ service: "regular", hours: 6 });
    const explicit = quote({ service: "regular", hours: 6, carePlusMember: false });
    if (!isPriced(implicit) || !isPriced(explicit)) throw new Error("expected a price");
    expect(implicit.totalCents).toBe(explicit.totalCents);
    expect(implicit.serviceFeeCents).toBe(BOOKING_FEE_CENTS);
  });

  /**
   * Care+ members pay no booking fee — founder decision 2026-08-09, extended 2026-08-12 to cover
   * every booking rather than only one-time ones.
   *
   * This is the half of that decision that can go wrong quietly. The paywall promises "no booking
   * fee, ever" in writing, and `docs/care-plus-paywall-copy.md` goes further — "on every booking,
   * not just your first". If a booking writer still adds R39, the promise is a false price
   * representation under the CPA and the customer is charged past a total they agreed to.
   *
   * Asserted against both server sources, not a copy of the rule, so they cannot drift.
   */
  it("waives the fee for Care+ members, and both booking writers agree", () => {
    const member = quote({ service: "regular", hours: 6, carePlusMember: true });
    const nonMember = quote({ service: "regular", hours: 6 });
    if (!isPriced(member) || !isPriced(nonMember)) throw new Error("expected a price");

    expect(member.serviceFeeCents).toBe(0);
    expect(member.totalCents).toBe(nonMember.totalCents - BOOKING_FEE_CENTS);

    // Recurring makes no difference in either direction. Membership is the only gate.
    const recurringMember = quote({ service: "regular", hours: 6, frequency: "repeat", carePlusMember: true });
    if (!isPriced(recurringMember)) throw new Error("expected a price");
    expect(recurringMember.serviceFeeCents).toBe(0);

    /*
     * Both writers, because until 2026-08-12 only one of them knew Care+ existed.
     * `create-booking-request` charged every member the fee and skipped the 10% discount, and
     * nothing failed because no client calls it — it is deployed and authenticated all the same.
     * Asserting the shared import is what stops one being fixed and the other forgotten.
     */
    for (const path of BOOKING_WRITERS) {
      const src = readFileSync(join(process.cwd(), path), "utf8");
      expect(src, `${path} must read membership from the shared helper`).toMatch(
        /from "\.\.\/_shared\/care-plus-membership\.ts"/,
      );
      expect(src, `${path} must derive membership from the discount lookup`).toMatch(
        /const isCarePlusMember = memberOf\(carePlusDiscountRate\);/,
      );
      // The single-condition shape is the property, not just a correct total today. A second
      // term here means the superseded one-time rule has crept back in.
      expect(src, `${path} must gate the fee on membership alone`).toMatch(
        /const serviceFeeCents = isCarePlusMember \? 0 : BOOKING_FEE_CENTS;/,
      );
    }
  });

  /**
   * Which services take more than one Xooter — the same question in three places.
   *
   * Until 2026-08-09 there were three answers. `xoot-pricing.ts` said `{airbnb, office, moving}`,
   * and `create-booking` and `Book.tsx` both said `{airbnb, office, deep, moving, premium}`.
   * `deep` and `premium` alias to `regular`, which is single-Xooter, so `quote()` refused, the
   * booking screen's `discountedBase` fell to 0, and a 5.5-hour Deep clean with three Xooters
   * displayed **R61** while the server charged **R860**.
   *
   * That is the third time this codebase has shown one price and charged another, and under the
   * Consumer Protection Act the displayed price is the price. So all three are pinned here, and
   * `Book.tsx` is asserted to hold no list of its own — a matching copy is still a copy, and the
   * copies are what drifted.
   */
  it("agrees on which services take more than one Xooter", () => {
    const fn = readFileSync(
      join(process.cwd(), "supabase/functions/create-booking/index.ts"),
      "utf8",
    );

    const serverSet = /const multiWorkerServices = new Set\(\[([^\]]*)\]\)/.exec(fn);
    expect(serverSet, "server no longer defines multiWorkerServices").toBeTruthy();
    const serverServices = [...serverSet![1].matchAll(/"(\w+)"/g)].map((m) => m[1]).sort();

    expect(serverServices).toEqual([...MULTI_XOOTER_SERVICES].sort());

    // The alias layer is what made the old divergence look harmless, so it is asserted too:
    // every service the server accepts must survive aliasing into a multi-Xooter ServiceId.
    for (const service of serverServices) {
      expect({ service, multi: serviceAllowsMultipleXooters(service) }).toEqual({
        service,
        multi: true,
      });
    }

    // And the two that caused it must answer false through the raw vocabulary the UI uses.
    for (const service of ["deep", "premium", "residential", "regular", "express"]) {
      expect({ service, multi: serviceAllowsMultipleXooters(service) }).toEqual({
        service,
        multi: false,
      });
    }
  });

  it("keeps Book.tsx asking the pricing module instead of keeping its own list", () => {
    const book = readFileSync(join(process.cwd(), "src/pages/app/Book.tsx"), "utf8");
    expect(book).toMatch(/allowsMultipleWorkers = serviceAllowsMultipleXooters/);
    // The literal list that caused the R799 gap must not come back, here or anywhere in the file.
    expect(book).not.toMatch(/\["airbnb",\s*"office",\s*"deep"/);
  });

  /**
   * The screen and the server must agree on the total for a multi-Xooter booking, not just on
   * who is eligible. This is the assertion that would have caught the R61-versus-R860 gap.
   */
  it("prices a multi-Xooter booking the same way the server does", () => {
    // Server: base x (1 - 10% at 3+) x workerCount, on the aliased ladder.
    const hours = 6;
    const workers = 3;
    const q = quote({ service: "office", hours, xooterCount: workers, bookingCover: false, addOns: 0 });
    if (!isPriced(q)) throw new Error("client refused a booking the server accepts");

    const rung = serverLadder("OFFICE")[String(hours)];
    const serverBaseCents = Math.round(rung * 0.9) * workers;
    expect(q.baseCents).toBe(serverBaseCents);
    expect(q.discountRate).toBe(0.1);

    // And a service the server refuses must be refused here too, rather than priced at zero.
    const refused = quote({ service: "regular", hours, xooterCount: workers });
    expect(isPriced(refused)).toBe(false);
  });

  /**
   * Graded slot pricing, and the flag holding it off.
   *
   * The flag is the dangerous part. A pricing model half-enabled — live on the server, off in the
   * quote — charges a customer past a total they agreed, which is the defect this repo already
   * shipped once with the R39 fee. So the boolean and the curve are both pinned across the two
   * files, and the flag's value is asserted rather than merely compared: turning it on is a
   * founder decision, and this test is where that decision has to be made explicitly.
   */
  it("holds graded slot pricing off, identically on client and server", () => {
    const fn = readFileSync(
      join(process.cwd(), "supabase/functions/create-booking/index.ts"),
      "utf8",
    );
    const ops = readFileSync(join(process.cwd(), "src/lib/operations.ts"), "utf8");

    const flagOf = (src: string) => /GRADED_SLOT_PRICING = (true|false)/.exec(src)?.[1];
    expect(flagOf(fn), "server no longer defines GRADED_SLOT_PRICING").toBeTruthy();
    expect(flagOf(ops)).toBe(flagOf(fn));
    // If this fails because someone enabled the curve, that is the intended conversation: update
    // this expectation in the same commit, deliberately.
    expect(flagOf(ops)).toBe("false");
    expect(GRADED_SLOT_PRICING).toBe(false);

    const curveOf = (src: string) => {
      const start = src.indexOf("SLOT_PREMIUM_CURVE");
      const body = src.slice(start, src.indexOf("};", start));
      return Object.fromEntries(
        [...body.matchAll(/"(\d\d:\d\d)":\s*([\d.]+)/g)].map((m) => [m[1], Number(m[2])]),
      );
    };
    expect(curveOf(fn)).toEqual(curveOf(ops));
    expect(curveOf(ops)).toEqual(SLOT_PREMIUM_CURVE);

    // Both sides choose the model in one function, so the flag cannot be honoured in the quote
    // and forgotten in the receipt.
    for (const src of [fn, ops]) {
      expect(src).toMatch(/if \(GRADED_SLOT_PRICING\) return SLOT_PREMIUM_CURVE\[time\] \?\? 0;/);
    }
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

  /**
   * The boost, and the clamp that makes the 20% floor mean something.
   *
   * Client and server both reduce a rate and both clamp. If only one clamped, a boosted Platinum
   * Xooter would be paid at 15% by whichever side forgot — and since the rate is stamped by the
   * server, the client would be showing a number the booking does not carry.
   */
  it("agrees on the earnings boost and its floor clamp", () => {
    const serverNum = (name: string) => {
      const m = serverSrc.match(new RegExp(`export const ${name} = (\\d+)`));
      if (!m) throw new Error(`server constant ${name} not found`);
      return Number(m[1]);
    };
    expect(serverNum("BOOST_BPS")).toBe(BOOST_BPS);
    expect(serverNum("FLOOR_RATE_BPS")).toBe(FLOOR_RATE_BPS);

    // Both sides clamp at the floor, in the same shape.
    expect(serverSrc).toMatch(
      /Math\.max\(FLOOR_RATE_BPS, rateBps - Math\.max\(0, boostBps\)\)/,
    );

    // And the boost window is filtered in SQL, so an expired boost cannot be applied by a caller
    // that forgot to check the dates.
    expect(serverSrc).toMatch(/\.lte\("starts_at", nowIso\)/);
    expect(serverSrc).toMatch(/\.gt\("ends_at", nowIso\)/);
  });

  /**
   * The boost lookup must fail loudly, not just safely.
   *
   * Returning 0 when the table is unreachable is the right fallback — a booking is struck at the
   * earned rate rather than an invented one. But if the functions ship before the migration, every
   * boost silently does nothing and a Xooter promised 5% more does not get it. That combination —
   * a real failure, a reasonable fallback, and no signal — is exactly how rate limiting stayed
   * broken for the life of this project.
   */
  it("logs when the boost lookup fails instead of swallowing it", () => {
    expect(serverSrc).toMatch(/const \{ data, error \} = await supa\s*\n?\s*\.from\("xooter_commission_boosts"\)/);
    expect(serverSrc).toMatch(/if \(error\) \{[\s\S]{0,200}console\.error\(/);
    expect(serverSrc).toMatch(/treating as no boost/);
  });

  it("applies the boost at both points where a rate is struck", () => {
    for (const path of [
      "supabase/functions/create-booking/index.ts",
      "supabase/functions/respond-zooter-job/index.ts",
    ]) {
      const src = readFileSync(join(process.cwd(), path), "utf8");
      expect(src, `${path} does not read an active boost`).toMatch(/activeBoostBpsFor\(supa,/);
      expect(src, `${path} does not apply the boost`).toMatch(
        /boost > 0 \? applyBoost\(earned, boost\) : earned/,
      );
    }
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
   * and the server's `getCarePlusDiscount` returns a flat **0.1** for every active member,
   * ignoring cadence entirely. Any surface quoting 15% to a weekly member would be quoting a
   * discount the server does not give.
   *
   * Not fixed here because it changes what members are charged, which is the founder's call and
   * not a side effect of a copy change. Pinned so the day someone aligns them, this test tells
   * them the client half exists.
   *
   * Read from `_shared/care-plus-membership.ts` since 2026-08-12: the helper was lifted out of
   * `create-booking` so `create-booking-request` could stop pricing members as non-members. One
   * file to align now rather than two.
   */
  it("records that the server discount is flat, not cadence-tiered", () => {
    const serverSrc = readFileSync(join(process.cwd(), "supabase/functions/_shared/care-plus-membership.ts"), "utf8");
    expect(serverSrc, "server no longer returns a flat Care+ rate — align CADENCE_DISCOUNT")
      .toMatch(/const getCarePlusDiscount[\s\S]{0,600}return 0\.1;/);
    expect(CADENCE_DISCOUNT.weekly).toBe(0.15);
    expect(CADENCE_DISCOUNT.weekly).not.toBe(0.1);
  });
});
