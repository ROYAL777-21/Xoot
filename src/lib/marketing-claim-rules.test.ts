import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import { ADD_ON_CENTS, BOOKING_COVER_CENTS, BOOKING_FEE_CENTS, HOME_SIZE_HOURS, basePrice } from "../../supabase/functions/_shared/pricing";

/**
 * Every published-facing marketing file obeys the claim rules.
 *
 * ⚠️ **Written the day ZD-037 lifted the price ban.** Until 2026-09-03 no draft could state a price
 * at all, so "is this the right number?" was not a question anyone had to ask. Now that prices are
 * permitted, the risk inverts: a draft may state a number, and under the CPA the displayed price is
 * the price. A wrong one is not untidiness.
 *
 * This scans `docs/marketing/**` — the drafts, the prompt pack, the campaign concepts — for the
 * three failure modes that are cheap to catch and expensive to ship.
 */
const MARKETING = join(process.cwd(), "docs/marketing");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((e) => {
    const full = join(dir, e);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith(".md") ? [full] : [];
  });

/**
 * Files that ANALYSE marketing rather than being marketing are excluded — they quote banned words
 * and stale numbers in order to explain them. This is the same trap that made two earlier guards in
 * this repo fail against their own explanatory prose.
 */
const ANALYSIS = new Set([
  "growth-doctrine.md", "growth-strategy-2026.md", "hormozi-corpus-findings.md",
  "hormozi-findings.md", "growth-levers-2026.md", "growth-log.md", "idea-log.md",
  "content-strategy-references.md", "personal-brand-doctrine.md", "reference-creators.md",
  "build-in-public-accounts.md", "measurement-spec.md", "automation-loops.md",
  "agent-orchestration.md", "company-social-playbook.md", "platform-playbooks.md",
  "campaign-concepts.md", "deliverable-prompts.md", "marketing-studio-briefs.md",
  "ad-matrix-and-avatars.md", "ugc-and-ads.md", "README.md", "content-calendar.md",
  "customer-ugc-pipeline.md", "founder-brand-strategy.md", "founder-brand-plan.md",
  "ai-presenter-brief.md", "xooter-hiring-ad.md", "cleaning-school-partnership-proposal.md",
  "feature-announcements.md", "creative-queue.md",
]);

const DRAFTS = walk(MARKETING).filter((f) => !ANALYSIS.has(basename(f)));

/** Every rand figure the locked table permits, in whole rands. */
const permitted = new Set<number>([
  BOOKING_FEE_CENTS / 100, ADD_ON_CENTS / 100, BOOKING_COVER_CENTS / 100, 99, 100,
]);
for (const hours of Object.values(HOME_SIZE_HOURS)) {
  const p = basePrice("residential", hours);
  if (p.ok) permitted.add(p.baseCents / 100);
}

describe("marketing drafts obey the claim rules", () => {
  it("scans a real set of files", () => {
    expect(DRAFTS.length).toBeGreaterThan(3);
  });

  it("never uses the banned vocabulary", () => {
    // BRAND_GUIDE §Copy Tone. Premium positioning is a locked brand fact, and these four words
    // undo it faster than any amount of design.
    const offenders: string[] = [];
    for (const file of DRAFTS) {
      const text = readFileSync(file, "utf8");
      /*
       * ⚠️ The ban is on POSITIONING Xoot as cheap — not on the words existing in English.
       *
       * The first version of this guard matched the bare words and produced two false positives
       * that are worth recording, because both are good copy:
       *
       *   linkedin-month-one.md   "a recruiting problem you can solve with a bigger ad budget"
       *   facebook-groups-replies "that's not a bargain, it's a problem waiting to be yours"
       *
       * The second one actively REINFORCES premium positioning by rejecting the frame. A guard
       * that fails on it would push the writer toward weaker copy — which is worse than no guard.
       *
       * So: `cheap` is banned outright (it has no innocent use here), `budget` only as a
       * positioning adjective, and `bargain` only when not being repudiated.
       */
      // `cheap` needs a commercial noun near it. "A rewrite is cheap" and "a cheaply-acquired
      // audience" are about process and strategy, not about what Xoot charges — and failing on
      // them would push writers toward vaguer prose for no compliance gain.
      const CHEAP_NEAR_COMMERCE =
        /\bcheap(er|est)?\b[^.\n]{0,60}\b(clean|cleaning|service|price|pricing|rate|booking|Xoot|Xooter)\b/i;
      const COMMERCE_NEAR_CHEAP =
        /\b(clean|cleaning|service|price|pricing|rate|booking|Xoot|Xooter)\b[^.\n]{0,60}\bcheap(er|est)?\b/i;
      const banned =
        CHEAP_NEAR_COMMERCE.test(text) || COMMERCE_NEAR_CHEAP.test(text) ||
        /\bbudget[- ](friendly|option|clean|price|conscious)\b/i.test(text) ||
        /\bon a budget\b/i.test(text) ||
        /(?<!not )(?<!never )(?<!isn.t )(?<!it.s not )\ba (?:real |genuine )?bargain\b/i.test(text);
      if (banned) offenders.push(file.replace(process.cwd() + "/", ""));
    }
    expect(offenders, "banned vocabulary in a published-facing draft").toEqual([]);
  });

  it("states no rand figure the locked table does not permit", () => {
    // ZD-037 lifted the price ban; it did not license any number. Under the CPA the displayed
    // price is the price, and this repo has shipped a screen showing one and charging another
    // three times.
    const offenders: string[] = [];
    for (const file of DRAFTS) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/R\s?(\d{2,4})\b/g)) {
        const rand = Number(m[1]);
        if (!permitted.has(rand)) {
          offenders.push(`${basename(file)}: R${rand}`);
        }
      }
    }
    expect([...new Set(offenders)], "a draft states a price not in the locked table").toEqual([]);
  });
});
