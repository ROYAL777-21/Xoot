import { describe, expect, it } from "vitest";
import {
  MAX_SPLIT_PARTIES,
  MIN_SHARE_CENTS,
  organiserShareCents,
  sharesAreExact,
  splitEvenly,
  validateSplit,
} from "./fare-split";

describe("splitting a fare", () => {
  it("always sums to exactly the total, at every party size and amount", () => {
    // The property the whole feature rests on. `Math.round(total / n)` both loses and invents
    // cents depending on the remainder: losing one under-collects on every booking forever,
    // inventing one takes money from someone who did not agree to it.
    for (let parties = 1; parties <= MAX_SPLIT_PARTIES; parties += 1) {
      for (const total of [1, 2, 99, 100, 3333, 29600, 43000, 79900, 100001, 999999]) {
        const shares = splitEvenly(total, parties);
        expect(shares, `${total} between ${parties}`).toHaveLength(parties);
        expect(
          shares.reduce((sum, amount) => sum + amount, 0),
          `${total} between ${parties} did not sum to the total`,
        ).toBe(total);
        expect(shares.every((amount) => Number.isInteger(amount))).toBe(true);
        expect(shares.every((amount) => amount >= 0)).toBe(true);
      }
    }
  });

  it("distributes the remainder rather than dropping it", () => {
    // R100 between three is 3334 + 3333 + 3333. A naive round gives 3333 three times and loses a
    // cent; a naive ceil gives 3334 three times and invents two.
    expect(splitEvenly(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitEvenly(10, 4)).toEqual([3, 3, 2, 2]);
    // The R296 standard clean between two, which is the common case and happens to divide evenly.
    expect(splitEvenly(29600, 2)).toEqual([14800, 14800]);
  });

  it("is deterministic, so nobody sees a different number on a second look", () => {
    // Which payer absorbs the extra cent is arbitrary. That it is stable is not.
    expect(splitEvenly(10000, 3)).toEqual(splitEvenly(10000, 3));
    expect(splitEvenly(43000, 7)).toEqual(splitEvenly(43000, 7));
  });

  it("refuses a nonsense party size instead of returning the whole total to one person", () => {
    // The dangerous default: a bug that produces `[total]` bills one person for everything.
    expect(splitEvenly(29600, 0)).toEqual([]);
    expect(splitEvenly(29600, -2)).toEqual([]);
    expect(splitEvenly(29600, Number.NaN)).toEqual([]);
    expect(splitEvenly(Number.NaN, 3)).toEqual([]);
  });

  it("checks exactness rather than closeness", () => {
    expect(sharesAreExact([14800, 14800], 29600)).toBe(true);
    expect(sharesAreExact([14800, 14799], 29600)).toBe(false);
    expect(sharesAreExact([14800, 14801], 29600)).toBe(false);
    expect(sharesAreExact([], 29600)).toBe(false);
    // Fractional cents are not a thing money can be.
    expect(sharesAreExact([14800.5, 14799.5], 29600)).toBe(false);
    expect(sharesAreExact([-100, 29700], 29600)).toBe(false);
  });
});

describe("the organiser's share", () => {
  it("is whatever is left, so the split always sums", () => {
    // Derived rather than entered. If the organiser typed their own share too, five numbers would
    // have to agree, and the arithmetic would fail in a form instead of a function.
    expect(organiserShareCents(29600, [10000, 10000])).toBe(9600);
    expect(organiserShareCents(29600, [29600])).toBe(0);
  });

  it("is null when the others already claim more than the total", () => {
    // Must never silently become a negative share, which would read as the organiser being owed
    // money by their own booking.
    expect(organiserShareCents(29600, [20000, 20000])).toBeNull();
  });
});

describe("validating a split before it is written", () => {
  const ok = (emails: string[], amounts: number[]) =>
    emails.map((email, index) => ({ email, amountCents: amounts[index] }));

  it("accepts a well-formed split", () => {
    expect(validateSplit(ok(["a@b.com", "c@d.com"], [14800, 14800]), 29600)).toEqual({ ok: true, reason: null });
  });

  it("rejects a split that does not add up", () => {
    // The one that costs money, so it is checked here, again on the server, and again by a
    // database trigger.
    const result = validateSplit(ok(["a@b.com", "c@d.com"], [14800, 14700]), 29600);
    expect(result.ok).toBe(false);
    expect(result).toHaveProperty("reason", "The shares must add up to exactly the booking total.");
  });

  it("rejects a party of one, which is not a split", () => {
    expect(validateSplit(ok(["a@b.com"], [29600]), 29600).ok).toBe(false);
  });

  it("caps the party size", () => {
    const many = Array.from({ length: MAX_SPLIT_PARTIES + 1 }, (_, i) => `p${i}@x.com`);
    const shares = splitEvenly(29600, many.length);
    expect(validateSplit(ok(many, shares), 29600).ok).toBe(false);
  });

  it("rejects the same person twice, however they typed it", () => {
    // Two rows for one person means two invitations and two payment records for one obligation.
    const result = validateSplit(ok(["A@B.com", "a@b.com"], [14800, 14800]), 29600);
    expect(result.ok).toBe(false);
    expect(result).toHaveProperty("reason", "The same person is listed twice.");
  });

  it("rejects a share too small to be worth collecting", () => {
    const shares = [MIN_SHARE_CENTS - 1, 29600 - (MIN_SHARE_CENTS - 1)];
    expect(validateSplit(ok(["a@b.com", "c@d.com"], shares), 29600).ok).toBe(false);
  });

  it("rejects an address that is not one", () => {
    expect(validateSplit(ok(["a@b.com", "not-an-email"], [14800, 14800]), 29600).ok).toBe(false);
  });
});
