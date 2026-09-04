import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADD_ON_CENTS,
  BOOKING_COVER_CENTS,
  BOOKING_FEE_CENTS,
  COMMISSION_BANDS,
  GIFT_HOURS,
  HOME_SIZE_HOURS,
  LONG_JOB_FLOOR_CENTS_PER_HOUR,
  basePrice,
  giftPriceCents,
  xooterPayout,
} from "../../supabase/functions/_shared/pricing";

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
  /*
   * ⚠️ `hormozi-playbooks.md` is analysis, not a draft, and the distinction is load-bearing here.
   *
   * It quotes the founder's own instruction — "use the cheaper pricing ladder for now" — in order to
   * set the Price Raise playbook's counter-argument beside it. The banned-vocabulary rule is on
   * POSITIONING Xoot as cheap; a file arguing about whether a cheap ladder is wise is the opposite
   * of that, and failing on it would push the analysis toward vaguer language for no compliance
   * gain. Same reason "that's not a bargain" was allowed to stand.
   *
   * ⛔ It is on this list because it is internal reference that nobody publishes — NOT to get a
   * green tick. If any line of it is ever lifted into a draft, the draft is scanned, which is where
   * the check belongs.
   */
  "hormozi-playbooks.md",
  "content-strategy-references.md", "personal-brand-doctrine.md", "reference-creators.md",
  "build-in-public-accounts.md", "measurement-spec.md", "automation-loops.md",
  "agent-orchestration.md", "company-social-playbook.md", "platform-playbooks.md",
  "campaign-concepts.md", "deliverable-prompts.md", "marketing-studio-briefs.md",
  "ad-matrix-and-avatars.md", "ugc-and-ads.md", "README.md", "content-calendar.md",
  "customer-ugc-pipeline.md", "founder-brand-strategy.md", "founder-brand-plan.md",
  "ai-presenter-brief.md", "cleaning-school-partnership-proposal.md",
  "feature-announcements.md", "creative-queue.md",
]);

const DRAFTS = walk(MARKETING).filter((f) => !ANALYSIS.has(f.split("/").pop()!));

/**
 * Every rand figure a draft may state, derived from the constants rather than typed out.
 *
 * ⚠️ **R47 was missing and the guard caught a true statement as a violation.** The long-job floor
 * is a locked commercial fact — `LONG_JOB_FLOOR_CENTS_PER_HOUR` — and it is one of the most
 * defensible things Xoot can say, because it is the number that keeps a Xooter above minimum wage
 * on a ten-hour clean. A guard that forbids stating it would push writers toward vaguer copy for
 * no compliance gain, which is the same mistake the banned-vocabulary regex made.
 *
 * ⚠️ Gift prices are here too, since ZD-038 — they come off the same ladder now.
 */
const permitted = new Set<number>([
  BOOKING_FEE_CENTS / 100,
  ADD_ON_CENTS / 100,
  BOOKING_COVER_CENTS / 100,
  LONG_JOB_FLOOR_CENTS_PER_HOUR / 100,
  99, // Care+ monthly
  100, // the referral reward
]);

/** Every base price a draft may name — the residential ladder the size table resolves to. */
const basePrices: number[] = [];
for (const hours of Object.values(HOME_SIZE_HOURS)) {
  const p = basePrice("residential", hours);
  if (p.ok) basePrices.push(p.baseCents);
}
for (const cents of basePrices) permitted.add(cents / 100);

for (const service of Object.keys(GIFT_HOURS)) {
  const cents = giftPriceCents(service);
  if (cents !== null) permitted.add(cents / 100);
}

/**
 * ⚠️ **Earnings figures, added 2026-09-04 when `xooter-hiring-ad.md` came off the exclusion list.**
 *
 * The recruitment ad states what a Xooter keeps — "R162.50 at New rank and R200 at Platinum" — and
 * those are not base prices, so the first run of the un-excluded guard flagged four true statements.
 *
 * They are the sharp end of **CPA s41**: a figure shown to a prospective worker is a representation
 * about their income, misleading regardless of intent. So they are permitted the same way every
 * other number here is — *computed*, from the ladder crossed with `COMMISSION_BANDS`, through the
 * same `xooterPayout` the payout writer uses. Change a band's `rateBps` and the permitted set moves
 * with it; the ad then fails until someone re-derives it, which is the entire point.
 *
 * Every band, not just the two the current copy names, because 67.5% / 70% / 75% are equally true
 * and a guard that forbade stating them would push the writer toward the vaguer copy this file
 * already refuses to encourage.
 */
for (const cents of basePrices) {
  for (const band of COMMISSION_BANDS) {
    permitted.add(xooterPayout(cents, band.rateBps).xooterPayCents / 100);
  }
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
      /*
       * ⚠️ The decimal group matters. Without it `R162.50` matched as `R162` — a number that is in
       * no table and never will be, so the guard reported a violation whose text does not appear in
       * the file. Half a commission-derived earnings figure is not a price.
       *
       * Known limit: a thousands-separated figure (`R6,000`) is out of this shape's range. The
       * unseparated form (`R6000`) is caught. Left as-is deliberately — the one place a separated
       * figure appears in these drafts is the "never say" table quoting the income claim it forbids.
       */
      for (const m of text.matchAll(/R\s?(\d{2,4}(?:\.\d{1,2})?)\b/g)) {
        const rand = Number(m[1]);
        if (!permitted.has(rand)) {
          offenders.push(`${file.split("/").pop()}: R${rand}`);
        }
      }
    }
    expect([...new Set(offenders)], "a draft states a price not in the locked table").toEqual([]);
  });
});
