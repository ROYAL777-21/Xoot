import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hoursFor, quote, isPriced, ADD_ON_CENTS, BOOKING_COVER_CENTS, LINEN_ON_SITE_CENTS } from "./xoot-pricing";

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
   * The one fee the client does not model.
   *
   * `create-booking` adds ONE_TIME_SERVICE_FEE_CENTS to the total when frequency is
   * "one_time"; `quote()` has no concept of it, so the client under-quotes a one-time
   * booking by that amount. The module header already warns that the server wins on
   * anything charging money, but a total revealed to a customer and then exceeded is a
   * different problem from an internal disagreement.
   *
   * This asserts the divergence deliberately rather than hiding it: if someone adds the
   * fee to the client, this fails and points them at wiring it into `quote()` and closing
   * the blocker.md entry. If the server changes the amount, it fails too.
   */
  it("records the one-time service fee as a known client/server divergence", () => {
    const match = /export const ONE_TIME_SERVICE_FEE_CENTS = r\((\d+)\)/.exec(serverSrc);
    expect(match, "server no longer defines ONE_TIME_SERVICE_FEE_CENTS").toBeTruthy();
    expect(Number(match![1]) * 100).toBe(3900);

    // The client total is exactly base + add-ons + linen + cover. No service fee.
    const priced = quote({ service: "regular", hours: 6, addOns: 1, bookingCover: true });
    if (!isPriced(priced)) throw new Error("expected a price");
    expect(priced.totalCents).toBe(
      priced.baseCents + priced.addOnsCents + priced.linenCents + priced.coverCents,
    );
  });
});
