import { BadgeCheck, Search, Sparkles } from "lucide-react";

/*
 * Restyled and re-copied to the 2026-09-03 handoff
 * (`design/handoff-2026-09-03/xoot/site/SiteBody.jsx`).
 *
 * ⚠️ The copy here is the handoff's VERBATIM, on the founder's instruction of 2026-09-05: port
 * the design's words as written and flag what is unbacked, rather than rewriting each claim as
 * it is reached. Two lines below are registered as PENDING in
 * `docs/product/handoff-claim-review.md` and are held by `handoff-claim-review.test.ts`:
 *
 *   · HIW-01 "About a minute."         — no measurement backs it
 *   · HIW-02 "background-checked"      — the approved wording is "Admin-reviewed vetting"
 *
 * Neither ships to a customer until the founder rules, because the release gate in that test
 * fails while any ruling is outstanding. Do not silence it by editing the ledger.
 *
 * Shape, type and layout are the kit's. The step tile is `bg-brand` — the handoff draws it in
 * raw violet-500, and `bg-brand` is the audited violet-600 that carries white at 4.5:1. This is
 * emphasis, not a large surface, so ZD-034's ink rule does not apply and ZD-032's "violet
 * emphasis" does.
 */
const steps = [
  {
    n: "01",
    icon: Search,
    title: "Tell us about the place",
    desc: "Service, address, how long, and anything a Xooter should know before they arrive. About a minute.",
  },
  {
    n: "02",
    icon: BadgeCheck,
    title: "Pick a Xooter, or let us",
    desc: 'Every Xooter is background-checked and rated after each visit. "Any of them is fine" is a real answer.',
  },
  {
    n: "03",
    icon: Sparkles,
    title: "Track and review",
    desc: "Follow the arrival timeline, keep messages on-platform, upload proof where required, and rate the job.",
  },
];

export const HowItWorks = () => {
  return (
    <section id="how" className="bg-secondary/45 py-[clamp(52px,7.5vw,96px)]">
      <div className="container">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] items-start gap-[clamp(28px,5vw,72px)]">
          {/*
           * Sticky only while the copy sits BESIDE the steps. Stacked, it would pin the heading
           * over the list as the steps scrolled past underneath it — the handoff makes the same
           * point in its own comment and gates it on a width hook. `lg:` is the same gate.
           */}
          <div className="lg:sticky lg:top-[110px]">
            <p className="xoot-label mb-3 text-muted-foreground">How Xoot works</p>
            <h2 className="mb-5 text-balance font-display text-[length:var(--xoot-display-2)] font-medium leading-[1.1] tracking-tight">
              Book with the details that protect quality.
            </h2>
            <p className="max-w-[440px] text-[length:var(--xoot-body-lg)] leading-[1.5] text-muted-foreground">
              Xoot keeps service details, household preferences, payment status, contractor updates and support follow-ups in one place.
            </p>
          </div>

          <ol className="m-0 flex list-none flex-col gap-4 p-0">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.n}
                  className="flex items-start gap-5 rounded-3xl border border-border bg-card p-6 shadow-card md:p-7"
                >
                  <span className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-2xl bg-brand">
                    <Icon className="h-[23px] w-[23px] text-brand-foreground" strokeWidth={2} />
                  </span>
                  <div>
                    <div className="mb-1.5 flex items-baseline gap-3">
                      <span className="xoot-label text-muted-foreground">{s.n}</span>
                      <h3 className="font-display text-[length:var(--xoot-title-1)] font-medium tracking-tight">
                        {s.title}
                      </h3>
                    </div>
                    <p className="text-[length:var(--xoot-body)] leading-[1.55] text-muted-foreground">
                      {s.desc}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
};
