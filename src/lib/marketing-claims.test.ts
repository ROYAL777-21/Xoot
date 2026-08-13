import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

/**
 * ── Every rand figure on the public site must come from a constant ─────────────────────────────
 *
 * The public pages are where the company makes promises to people who have not signed anything
 * yet. Under the Consumer Protection Act the displayed price is the price, and `CLAUDE.md` puts
 * it plainly: over-stating is survivable, under-stating is not. This repo has shipped a screen
 * showing one price and charging another three times.
 *
 * The defect is never "someone typed the wrong number". It is that a number was typed at all, so
 * there were two copies, and only one of them got updated.
 *
 * ── The specific thing that prompted this ──────────────────────────────────────────────────────
 *
 * The design kit (`design/Xoot_App.html`) asserts *"Prices are the locked commercial values"* and
 * then encodes the pre-ZD-026 fee rule — `serviceFeeRecurring: 0`, "waived on anything recurring".
 * `locked-commercial-facts.md:44` struck that through and `xoot-pricing.ts` charges the R39 on
 * every booking unless the customer is Care+. Porting the kit's screens as drawn would display R0
 * against a server charging R39.
 *
 * The kit is going to be ported screen by screen. This is the thing that says no each time.
 *
 * ── What it found on its first run ─────────────────────────────────────────────────────────────
 *
 * 11 hardcoded rand figures, all real:
 *
 *   · `CarePlusApply.tsx` wrote 220 and 300 by hand in FIVE places — the input's `min`, two
 *     validation branches, a toast, and the sentence telling the household what the floor is —
 *     while `care-plus.ts` exported `PLACEMENT_MIN_HALF_DAY_CENTS` and said in its own docstring
 *     that the constants "stay here, correctly labelled, for `CarePlusApply` to cite". They are
 *     pinned to the national minimum wage, which rises ~5% every March; `care-plus.test.ts`
 *     already fails on `NMW_REVIEW_BY` so the constant cannot go stale, but nothing connected
 *     that to the page enforcing and advertising the figure.
 *   · The R30 welcome credit appeared in a marketing page and in the membership TERMS, with
 *     nothing keeping them equal.
 *   · A "Non-refundable admin fee: R399" that exists in no constant and in no locked-facts entry.
 *
 * Planted and confirmed 2026-08-13: reverting any one of those to a literal fails this file.
 */

/**
 * The public surface — everything reachable without signing in.
 *
 * `/app`, `/xooter` and `/admin` are deliberately absent. They are the next pass, and adding them
 * before their figures are wired to constants would mean a red suite nobody can act on, which is
 * how a guard gets switched off instead of satisfied.
 */
const PUBLIC_GLOBS = [
  "src/components/xoot",
  "src/pages/care",
  "src/pages/legal",
  "src/pages/CarePlusPaywall.tsx",
  "src/pages/Index.tsx",
  "src/pages/Welcome.tsx",
  "src/pages/Onboarding.tsx",
  "src/pages/Blog.tsx",
  "src/pages/BlogPost.tsx",
];

/**
 * Deliberate exceptions. Each needs a reason, and the reason has to survive being read aloud to
 * someone who just found the number wrong on a live page.
 */
const ALLOWED: { fragment: string; because: string }[] = [
  {
    fragment: "Half day R250-R300 / Full day R300-R400",
    because:
      "Third-party market guidance, not a Xoot price. It tells a household what domestic work " +
      "pays in the wider market so they can set a rate; Xoot neither charges nor pays it, and " +
      "there is no constant it could drift from. The ENFORCED floors beside it are read from " +
      "PLACEMENT_MIN_HALF_DAY_CENTS and PLACEMENT_MIN_FULL_DAY_CENTS.",
  },
];

/** Comments are stripped first: the reasoning around a price is not a price. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const publicFiles = () =>
  execSync(`git ls-files ${PUBLIC_GLOBS.join(" ")}`, { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));

describe("public pages never hardcode a rand figure", () => {
  it("scans a public surface that actually exists", () => {
    // A glob that matches nothing passes every assertion below while checking nothing — the
    // failure mode this repo has hit three times.
    const files = publicFiles();
    expect(files.length).toBeGreaterThan(15);
    expect(files).toContain("src/pages/care/CarePlusApply.tsx");
  });

  it("finds no rand literal outside a comment", () => {
    const offences: string[] = [];

    for (const file of publicFiles()) {
      const source = stripComments(readFileSync(file, "utf8"));

      source.split("\n").forEach((line, i) => {
        if (ALLOWED.some((a) => line.includes(a.fragment))) return;
        for (const match of line.matchAll(/R\s?\d[\d\s.,]*/g)) {
          offences.push(`${file}:${i + 1}  ${match[0].trim()}  —  ${line.trim().slice(0, 90)}`);
        }
      });
    }

    expect(
      offences,
      "Rand figures on the public site must be rendered from a constant — formatRand(X_CENTS) — " +
        "not typed as text. Import from src/lib/xoot-pricing.ts or src/lib/care-plus.ts. If the " +
        "figure genuinely is not a Xoot price, add it to ALLOWED above with a reason.\n\n" +
        offences.join("\n"),
    ).toEqual([]);
  });

  /**
   * The allowlist is the part that rots. An entry whose text has since been edited stops matching
   * anything and silently becomes permission for nothing — or worse, someone assumes it is still
   * covering the line it names.
   */
  it("has no stale allowlist entries", () => {
    const all = publicFiles().map((f) => readFileSync(f, "utf8")).join("\n");
    const stale = ALLOWED.filter((a) => !all.includes(a.fragment)).map((a) => a.fragment);
    expect(stale, "these ALLOWED fragments no longer appear anywhere — delete them").toEqual([]);
  });
});
