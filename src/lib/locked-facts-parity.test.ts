import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_SIZE_HOURS, basePrice } from "../../supabase/functions/_shared/pricing";

/**
 * ZD-037 — the locked document must agree with the code that takes the money.
 *
 * ⚠️ **This guard exists because its absence cost weeks.** `locked-commercial-facts.md` carried a
 * §Current Pricing Conflict naming R270/R315/R390 as "what the code contains" and R280/R325/R400
 * as locked, while `basePrice()` actually returned R250/R296/R376. Three sets of numbers, none
 * agreeing, and no test compared any of them to any other — so the drift was invisible until
 * somebody computed it by hand.
 *
 * `pricing-parity.test.ts` pins the CLIENT against the SERVER. Nothing pinned the DOCUMENT against
 * either, and the document is what the founder reads to decide what to charge.
 */
const LOCKED = readFileSync(
  join(process.cwd(), "docs/product/locked-commercial-facts.md"),
  "utf8",
);

/** Pull "R250" out of a locked table row like `| Small home clean | **R250** for 4 hours |`. */
const lockedRand = (label: string): number | null => {
  const row = LOCKED.split("\n").find((line) => line.includes(label) && line.startsWith("|"));
  const match = row?.match(/R\s?\*{0,2}(\d[\d\s]*)/);
  return match ? Number(match[1].replace(/\s/g, "")) : null;
};

describe("ZD-037 the locked document matches the server", () => {
  const cases: [string, string][] = [
    ["Small home clean", "small"],
    ["Medium home clean", "medium"],
    ["Large home clean", "large"],
  ];

  for (const [label, sizeKey] of cases) {
    it(`${label} states what basePrice() actually charges`, () => {
      const hours = HOME_SIZE_HOURS[sizeKey];
      const priced = basePrice("residential", hours);
      expect(priced.ok).toBe(true);
      if (!priced.ok) return;

      const documented = lockedRand(label);
      expect(documented, `no rand value found in the "${label}" row`).not.toBeNull();
      // The document is in whole rands; the code is in cents.
      expect(documented! * 100).toBe(priced.baseCents);
    });

    it(`${label} states the hours the price is for`, () => {
      // A size price without its hours is half a fact: the ladder is keyed on HOURS, and the
      // "size" only chooses a default. Quoting R250 without "for 4 hours" invites a customer to
      // expect R250 for a ten-hour clean.
      const row = LOCKED.split("\n").find((l) => l.includes(label) && l.startsWith("|"));
      expect(row).toMatch(new RegExp(`for ${HOME_SIZE_HOURS[sizeKey]}\\s*hours`));
    });
  }

  it("no longer claims an open pricing conflict", () => {
    // The section is what banned prices from every marketing draft. If it comes back, the ban
    // comes back with it, and the drafts that now quote R250 become non-compliant silently.
    expect(LOCKED).not.toMatch(/##\s*Current Pricing Conflict/);
    expect(LOCKED).toMatch(/pricing conflict is CLOSED/i);
  });

  it("keeps the numbers that were wrong out of the locked table", () => {
    // R280/R325/R400 were locked and never charged; R270/R315/R390 were claimed and never
    // charged either. Either set reappearing in a table row is the drift returning.
    const tableRows = LOCKED.split("\n").filter((l) => l.startsWith("|") && /home clean/.test(l));
    const joined = tableRows.join("\n");
    for (const stale of [280, 325, 400, 270, 315, 390]) {
      expect(joined).not.toMatch(new RegExp(`R\\s?\\*{0,2}${stale}\\b`));
    }
  });

  it("still records the R47/h floor as non-negotiable", () => {
    // ZD-037 lowered the documented price. The floor is what stops a future cut going under
    // minimum wage, so it must survive every repricing.
    expect(LOCKED + readFileSync(join(process.cwd(), "docs/implementation/decision-log.md"), "utf8"))
      .toMatch(/R47\/h|R47 per booked hour|LONG_JOB_FLOOR/);
  });
});
