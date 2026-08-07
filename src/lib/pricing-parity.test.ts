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

  it("has removed the superseded multiplier model from the booking function", () => {
    const fn = readFileSync(join(process.cwd(), "supabase/functions/create-booking/index.ts"), "utf8");
    // The old model and its unapproved figures must not come back. Matching on *usage*
    // rather than the bare word, so the comment explaining what was removed does not
    // trip its own guard.
    expect(fn).not.toMatch(/serviceMultiplier\s*[[:=]/);
    expect(fn).not.toMatch(/priceFactor\s*[:.]/);
    expect(fn).not.toMatch(/price:\s*270|price:\s*315|price:\s*390/);
    // Booking cover moved R21 -> R22 (ZD-020).
    expect(fn).not.toMatch(/bookingCoverOptIn === false \? 0 : 21/);
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
  /**
   * The booking screen does not use any of the above.
   *
   * Found 2026-08-07 while extending this file to cover the high-demand premium. `Book.tsx` —
   * the real booking flow, the screen a customer actually pays from — never imports
   * `xoot-pricing.ts`. It computes its own base with `size.price x length.priceFactor x
   * serviceMultiplier` off `price: 270 / 315 / 390`: the superseded model, byte-identical to
   * the one still deployed in production, and the exact thing the guard above forbids in
   * `create-booking`.
   *
   * So the estate splits two-and-two rather than client-versus-server:
   *
   *     xoot-pricing.ts + repo create-booking   ZD-020 ladder
   *     Book.tsx        + DEPLOYED create-booking   old multiplier model
   *
   * Today those pairs are self-consistent, so nobody is mischarged: the screen shows R315 for
   * a medium standard clean and production charges R315. **The danger is the repricing.**
   * Deploying `create-booking` alone switches the server to the ladder — R266 for that same
   * booking — while `Book.tsx` keeps showing R315. Worse in the other direction too: converting
   * `Book.tsx` first would show R266 and let production charge R315, billing a customer more
   * than they were quoted.
   *
   * Hence a tripwire rather than a fix. **`Book.tsx` and the `create-booking` deploy must move
   * in the same change.** When they do, delete this test — do not weaken it to keep it passing.
   */
  it("records that the booking screen still runs the superseded model", () => {
    const book = readFileSync(join(process.cwd(), "src/pages/app/Book.tsx"), "utf8");

    // The figures this file forbids in the server are still live in the client.
    for (const price of [270, 315, 390]) {
      expect(book, `Book.tsx no longer carries price: ${price}`).toMatch(new RegExp(`price:\\s*${price}\\b`));
    }
    expect(book).toMatch(/size\.price \* length\.priceFactor \* \(serviceMultiplier\[active\] \?\? 1\)/);

    // And it reaches the approved ladder by no route at all.
    expect(book).not.toMatch(/xoot-pricing/);

    // The multipliers match the deployed function exactly — that is why the pair is currently
    // self-consistent, and why moving one side alone breaks it.
    const multipliers = /const serviceMultiplier: Record<string, number> = \{([^}]*)\}/.exec(book);
    expect(multipliers, "serviceMultiplier is gone from Book.tsx").toBeTruthy();
    expect(Object.fromEntries(
      [...multipliers![1].matchAll(/(\w+):\s*([\d.]+)/g)].map((m) => [m[1], Number(m[2])]),
    )).toEqual({
      residential: 1, express: 0.85, airbnb: 1.15, office: 1.2, deep: 1.35, moving: 1.4, premium: 1.55,
    });
  });

  /**
   * The high-demand premium and the R21/R22 cover, both in `src/lib/operations.ts`.
   *
   * `calculateBookingQuote` is the other half of what `Book.tsx` shows, and it agrees with the
   * server on the 15% premium and the 16:00 threshold — worth pinning, since those were
   * previously uncovered. It disagrees on booking cover: R21, the pre-ZD-020 figure this file
   * already forbids in `create-booking`, where both the repo server and `xoot-pricing.ts` say
   * R22.
   *
   * Left as R21 deliberately, same reasoning as above: it matches what production charges
   * today. It moves with the deploy, not before it.
   */
  it("pins the high-demand premium against the server, and the cover figure that lags it", () => {
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

    // The lagging figure, recorded rather than fixed.
    expect(/BOOKING_COVER_PRICE_ZAR = (\d+)/.exec(ops)![1]).toBe("21");
    expect(BOOKING_COVER_CENTS).toBe(2200);
  });

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
