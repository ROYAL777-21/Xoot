import { describe, expect, it } from "vitest";
import {
  MAX_TIP_CENTS,
  TIP_GOES_ENTIRELY_TO_XOOTER,
  TIP_VISIBLE_TO_XOOTER,
  TIP_PRESETS_CENTS,
  TIP_READINESS,
  TIP_STEP_CENTS,
  buildTipRow,
  canOfferTip,
  formatCustomTipInput,
  isWritableTip,
  parseCustomTipCents,
  tipAssurance,
  totalWithTip,
} from "./tipping";

describe("tipping", () => {
  it("offers rand amounts, never percentages", () => {
    // Percentage tipping scales the gesture with the booking size, so the same
    // thank-you costs nearly double on a ten-hour clean as on a four-hour one. If
    // someone reintroduces percentages these stop being whole rand values.
    for (const preset of TIP_PRESETS_CENTS) {
      expect(preset % TIP_STEP_CENTS).toBe(0);
      expect(preset).toBeGreaterThan(0);
    }
    expect([...TIP_PRESETS_CENTS]).toEqual([...TIP_PRESETS_CENTS].sort((a, b) => a - b));
  });

  it("treats every non-amount as no tip", () => {
    // One "no tip" value, not a mix of null, 0 and "". The second representation is
    // the one somebody forgets to check before writing to the database.
    for (const input of ["", "   ", "abc", "0", "00", "R", "."]) {
      expect(parseCustomTipCents(input)).toBeNull();
    }
  });

  it("refuses input it would have to guess at rather than reinterpreting it", () => {
    // Stripping every non-digit is the obvious implementation and it silently turns a
    // negative into a charge and a fractional rand into a bigger one. Both are refused.
    expect(parseCustomTipCents("-20")).toBeNull();
    expect(parseCustomTipCents("1.5")).toBeNull();
    expect(parseCustomTipCents("20e3")).toBeNull();
    // Formatting that does not change the value is still fine.
    expect(parseCustomTipCents("R1,000")).toBe(100000);
  });

  it("reads a typed amount as whole rands", () => {
    expect(parseCustomTipCents("20")).toBe(2000);
    expect(parseCustomTipCents("7")).toBe(700);
    // Stray formatting a customer might type or paste.
    expect(parseCustomTipCents("R45")).toBe(4500);
    expect(parseCustomTipCents("1 0 0")).toBe(10000);
  });

  it("caps a mis-keyed amount instead of charging it", () => {
    // The failure this prevents: a field labelled in rands receiving "5000" against an
    // R300 clean, with the statement as the first the customer hears of it.
    expect(parseCustomTipCents("999999")).toBe(MAX_TIP_CENTS);
    expect(parseCustomTipCents(String(MAX_TIP_CENTS))).toBe(MAX_TIP_CENTS);
    // Capping must be visible in the field, not silent.
    expect(formatCustomTipInput(parseCustomTipCents("999999"))).toBe("1000");
  });

  it("round-trips through the input field", () => {
    for (const cents of [...TIP_PRESETS_CENTS, 700, MAX_TIP_CENTS]) {
      expect(parseCustomTipCents(formatCustomTipInput(cents))).toBe(cents);
    }
    expect(formatCustomTipInput(null)).toBe("");
  });

  it("refuses to write anything the database should not hold", () => {
    expect(isWritableTip(null)).toBe(true);
    for (const preset of TIP_PRESETS_CENTS) expect(isWritableTip(preset)).toBe(true);

    expect(isWritableTip(0)).toBe(false);
    expect(isWritableTip(-2000)).toBe(false);
    expect(isWritableTip(2050)).toBe(false);
    expect(isWritableTip(20.5)).toBe(false);
    expect(isWritableTip(MAX_TIP_CENTS + TIP_STEP_CENTS)).toBe(false);
    expect(isWritableTip(Number.NaN)).toBe(false);
  });

  it("never states where the money goes before that is decided", () => {
    // "100% goes to your Xooter" is a representation about price under the Consumer
    // Protection Act, and it is trivially checkable by the Xooters on the other side.
    // The founder confirmed no cut on 2026-07-30, but the claim still may not appear
    // until a tip actually settles — a promise about a payout that does not run yet is
    // no more true for being well intentioned.
    const copy = tipAssurance();
    if (!TIP_GOES_ENTIRELY_TO_XOOTER || TIP_READINESS !== "settled") {
      expect(copy).not.toMatch(/every rand|100%|all of it|goes to your/i);
    }
    // And it may not imply money has moved while there is no settlement path.
    if (TIP_READINESS !== "settled") {
      expect(copy).not.toMatch(/charged now|paid now|charged immediately/i);
    }
    expect(copy).toMatch(/optional/i);
  });

  it("adds the tip to the booking total without touching the booking price", () => {
    expect(totalWithTip(29600, 3000)).toBe(32600);
    expect(totalWithTip(29600, null)).toBe(29600);
    // Integer cents throughout — a float here becomes a rounding dispute on a statement.
    expect(Number.isInteger(totalWithTip(29600, 2000))).toBe(true);
  });

  it("does not offer a tip while there is nothing behind it", () => {
    // The card is hidden until the migration lands, because a tip row that fails on
    // every submit is worse than no tip row at all.
    expect(canOfferTip()).toBe(TIP_READINESS !== "schema_pending");
    // And the strong claim is unlocked only by full settlement, never by capture.
    if (TIP_READINESS !== "settled") {
      expect(tipAssurance()).not.toMatch(/every rand|100%/i);
    }
  });

  it("keeps the tip away from the Xooter until settlement", () => {
    // Founder, 2026-07-30: a Xooter must not see the tip before the customer
    // relationship is closed out. This is enforced in the database — the constant
    // records which gate the policies implement, and a change here without a matching
    // migration is the drift worth catching.
    expect(TIP_VISIBLE_TO_XOOTER).toBe("after_settlement");
  });

  it("never lets a client session set the column that hides the tip", () => {
    // `settled_at` is the visibility gate. A customer able to set it could reveal their
    // own tip early; the row builder must not offer it at all, and the database trigger
    // reverts it regardless.
    const row = buildTipRow({ bookingId: "b1", userId: "u1", xooterId: "z1", cents: 3000 });
    expect(row).toEqual({ booking_id: "b1", user_id: "u1", xooter_id: "z1", amount_cents: 3000 });
    expect(Object.keys(row!)).not.toContain("settled_at");
  });

  it("builds no row when there is no tip to write", () => {
    for (const cents of [null, 0, -100, 2050, MAX_TIP_CENTS + 100]) {
      expect(buildTipRow({ bookingId: "b1", userId: "u1", xooterId: "z1", cents })).toBeNull();
    }
    // An unassigned booking still accepts a tip; the payout resolves the Xooter later.
    expect(buildTipRow({ bookingId: "b1", userId: "u1", xooterId: null, cents: 2000 })?.xooter_id).toBeNull();
  });
});
