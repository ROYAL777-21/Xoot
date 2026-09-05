import { Check, Minus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  CARE_PLUS_MONTHLY_CENTS,
  CARE_PLUS_WELCOME_CREDIT_CENTS,
  FREE_MONTHS_AT_SIGNUP,
  PREMIUM_OUTCOMES,
  STANDARD_OUTCOMES,
} from "@/lib/care-plus";
import { formatZAR } from "@/lib/format";
import { BOOKING_FEE_CENTS } from "@/lib/xoot-pricing";

/**
 * The Care+ band — design position 3, ported from `xoot/site/SiteFoot.jsx:36-145`.
 *
 * ⚠️ **Four of the design's own claims are deliberately not here.** The handoff is the source of
 * truth for how this looks; it is not the source of truth for what Xoot can promise, and reading it
 * against `Xoot Legal.dc.html` and `care-plus.ts` turned up four statements the product cannot keep.
 * Each is recorded below at the point where it would otherwise have gone in, because the next person
 * to "finish" this section will reach for exactly these.
 *
 * ⛔ **No rand figure is typed.** Every number is computed from the constants that also drive the
 * server. `locked-facts-parity`, `pricing-parity` and `gift-pricing-parity` all exist because this
 * repo has shipped a screen showing one price and charging another **three times**.
 */

/** Rand, from cents, with no decimals — every figure here is a whole rand by construction. */
const rand = (cents: number) => formatZAR(cents / 100);

/*
 * ── The arithmetic, done once ───────────────────────────────────────────────────
 *
 * ✅ **The break-even leads, and that is a deliberate choice against the design.** The handoff shows
 * the best case — four visits a month, fees saved, a net gain. True, but only for a weekly booker.
 *
 * `care-plus.ts` is blunt about the other end: a once-a-month booker is **R45 down**, and its header
 * says *"the copy must keep saying so. They are buying the outcomes… not a saving. Claiming savings
 * a monthly member does not get is a false price representation under the Consumer Protection Act,
 * and it is also just untrue."*
 *
 * So the band states the threshold instead of the best case. It is the honest number and the more
 * persuasive one: `hormozi-corpus-findings.md` records that **Perceived Likelihood**, not Dream
 * Outcome, is the binding term in this market — a figure the reader can check on their own fingers
 * moves it, and a headline saving they cannot reproduce does the opposite.
 */
const BREAK_EVEN_VISITS = Math.ceil(CARE_PLUS_MONTHLY_CENTS / BOOKING_FEE_CENTS);
const EXAMPLE_VISITS = 4;
const feesSavedCents = EXAMPLE_VISITS * BOOKING_FEE_CENTS;
const netAtExampleCents = feesSavedCents - CARE_PLUS_MONTHLY_CENTS;

/*
 * Benefits come from `care-plus.ts`'s exported arrays rather than being restated here, so the band
 * and the paywall cannot drift into describing the same membership differently.
 *
 * ⛔ **Where the two arrays disagree, the hedged form wins.** `PREMIUM_OUTCOMES` says "The same
 * person every time"; `STANDARD_OUTCOMES` says "Your favourite, **when they're free** — we'll try
 * for the same Xooter each visit." The live product is one tier at R99 with, per the founder
 * decision, "every outcome included" — so both arrays apply and the pair contradicts itself.
 *
 * `launch-protocol.md` gate 5 is open: there are no activated Xooters. Promising a specific person
 * every week from a roster that does not yet exist is a representation Xoot cannot keep, and under
 * **CPA s41** intent is not the test. So the continuity promise is taken in its hedged form and the
 * absolute one is dropped.
 */
const CONTINUITY = STANDARD_OUTCOMES[0];
const OUTCOMES = [
  CONTINUITY,
  ...PREMIUM_OUTCOMES.filter((o) => o.title !== "The same person every time"),
  ...STANDARD_OUTCOMES.slice(1),
];

/*
 * ── The comparison grid ─────────────────────────────────────────────────────────
 *
 * The design's own comment on this table is right and is kept: *"Free is listed as genuinely
 * capable, because it is. A comparison that cripples the free column reads as a threat rather than
 * an offer."*
 *
 * ⛔ **Two rows from the design are missing on purpose.**
 *
 * 1. **"XootCover included"** — `design/handoff-2026-09-03/Xoot Legal.dc.html` states, in its own
 *    drafting constraints, that *"XootCover is described as intended cover with Genric, **not as
 *    cover in force, because it is not placed yet**."* `locked-commercial-facts.md` agrees: Booking
 *    Cover is *"optional and only preselected when legally and commercially approved."* Two of the
 *    three sources say the cover does not exist yet, so a ✓ in both columns would be a claim about
 *    an insurance product that has not been placed — the worst class of claim to get wrong.
 *
 * 2. **"Free rescheduling"** — it appears in the design's `CARE_COMPARE` and **nowhere in this
 *    codebase**. There is no rescheduling rule to point at, free or otherwise.
 */
const COMPARE: { label: string; free: string | boolean; member: string | boolean }[] = [
  { label: "Book, track and chat", free: true, member: true },
  { label: "Booking fee, every visit", free: rand(BOOKING_FEE_CENTS), member: "None" },
  { label: "Welcome add-on credit", free: "—", member: `${rand(CARE_PLUS_WELCOME_CREDIT_CENTS)} to start` },
  { label: "Your favourite Xooter requested first", free: false, member: true },
  { label: "Priority on early and weekend slots", free: false, member: true },
  { label: "Support without the queue", free: false, member: true },
];

/*
 * ⚠️ **The text beside the icon is required, not decoration.**
 *
 * `design/ICONOGRAPHY.md`: *"Status icons always include text."* `design/DESIGN-SYSTEM.md` adds
 * that *"numbers and status labels must not rely on colour alone"*, and `ACCESSIBILITY.md` that
 * *"status [is] never conveyed by colour, motion, sound, or haptic alone."*
 *
 * The first version of this cell rendered a bare tick with an `aria-label`. That satisfies a screen
 * reader and fails everyone reading the column with their eyes — including anyone who cannot
 * separate a green tick from a grey dash. Three separate governance documents say so, and all three
 * were read *after* this component shipped.
 */
const Cell = ({ value }: { value: string | boolean }) => {
  if (typeof value === "boolean") {
    const Icon = value ? Check : Minus;
    return (
      <span className="inline-flex items-center gap-1.5">
        <Icon
          aria-hidden="true"
          className={`h-4 w-4 ${value ? "text-[var(--xoot-careplus-600)]" : "text-muted-foreground/50"}`}
        />
        <span className={`text-sm ${value ? "font-semibold" : "text-muted-foreground"}`}>
          {value ? "Yes" : "No"}
        </span>
      </span>
    );
  }
  return <span className="text-sm font-semibold">{value}</span>;
};

export const CarePlusBand = () => (
  <section id="care-plus-band" className="py-16 md:py-24">
    <div className="container">
      <div
        className="rounded-[2.5rem] p-8 md:p-12 lg:p-14"
        style={{
          background: "var(--xoot-careplus-50)",
          boxShadow: "inset 0 0 0 1px var(--xoot-careplus-100)",
        }}
      >
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <span
              className="mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold"
              style={{ background: "var(--xoot-surface-card)", color: "var(--xoot-careplus-600)" }}
            >
              Care+ membership
            </span>

            <h2 className="font-display text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">
              For homes that would rather not think about it.
            </h2>

            <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
              Care+ is {rand(CARE_PLUS_MONTHLY_CENTS)} a month
              {FREE_MONTHS_AT_SIGNUP > 0 ? ", and the first month is free" : ""}. It takes the{" "}
              {rand(BOOKING_FEE_CENTS)} booking fee off every visit you book.
            </p>

            {/*
              The break-even, stated plainly. See the note above BREAK_EVEN_VISITS: this is the
              number `care-plus.ts` says the copy must keep saying, and it is the one a reader can
              check for themselves.
            */}
            <div
              className="mt-7 rounded-3xl p-5"
              style={{ background: "var(--xoot-surface-card)" }}
            >
              <p className="text-sm leading-relaxed">
                <strong className="font-semibold">
                  From your {BREAK_EVEN_VISITS === 3 ? "third" : `${BREAK_EVEN_VISITS}th`} booking in
                  a month, the waived fees cover the membership on their own.
                </strong>{" "}
                At {EXAMPLE_VISITS} visits that is {rand(feesSavedCents)} of fees against{" "}
                {rand(CARE_PLUS_MONTHLY_CENTS)} — {rand(netAtExampleCents)} ahead.
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                Book less often than that and Care+ costs you more than it saves. It is worth having
                for what it does to the visits themselves, not as a discount — so here is the number
                rather than a headline.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/care-plus">See what Care+ includes</Link>
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {OUTCOMES.map((outcome) => (
                <div
                  key={outcome.title}
                  className="rounded-2xl p-4"
                  style={{ background: "var(--xoot-surface-card)" }}
                >
                  <p className="text-sm font-bold">{outcome.title}</p>
                  <p className="mt-1 text-sm leading-snug text-muted-foreground">{outcome.body}</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-2xl" style={{ background: "var(--xoot-surface-card)" }}>
              <table className="w-full min-w-[22rem] text-left">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      What you get
                    </th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Free
                    </th>
                    <th
                      className="p-4 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--xoot-careplus-600)" }}
                    >
                      Care+
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((row) => (
                    <tr key={row.label} className="border-b border-border/40 last:border-0">
                      <td className="p-4 text-sm">{row.label}</td>
                      <td className="p-4"><Cell value={row.free} /></td>
                      <td className="p-4"><Cell value={row.member} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
