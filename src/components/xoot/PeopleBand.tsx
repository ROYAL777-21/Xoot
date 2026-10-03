import { BadgeCheck, CalendarClock, MessageSquare, Truck } from "lucide-react";

/**
 * "Who turns up" — ported from the 2026-09-03 handoff
 * (`design/handoff-2026-09-03/xoot/site/SiteBody.jsx` → `PeopleBand`).
 *
 * ── Two of the four cards were rewritten, and the reason is not stylistic ─────────────
 * The handoff's copy promises things this product has not agreed to. Under the CPA a
 * misleading representation is misleading regardless of intent, and **zero bookings have
 * completed**, so nothing here may describe an outcome — only a capability that exists in
 * the code today.
 *
 *   · "Every Xooter is **vetted**" -> the admin review. `SafetyTrust.tsx` carries the long
 *     version of why: naming or implying a third-party screening bureau asserts a commercial
 *     relationship nothing in this repo evidences. The approved claim is that an admin
 *     reviews ID, proof of address and references before activation, which is a real gate.
 *
 *   · "Guest-ready, **on time**" and "turnovers timed to your checkout, so the next guest
 *     walks into a clean place" -> a bookable morning window. There is no on-time guarantee
 *     anywhere in `locked-commercial-facts.md`, and a timing promise with no SLA behind it is
 *     the most expensive sentence on a marketing page.
 *
 *   · "A real person **answers when it matters**" -> the channels that exist. Grepped before
 *     rewriting: there are **no support hours, no response time and no SLA** anywhere in the
 *     locked facts. Chat and in-app calling are real; someone answering is not yet a promise
 *     anyone can keep.
 *
 * The first card ("ID-checked, reference-checked") was already better than the section's own
 * headline and is kept close to as written — it is specific and checkable, which is exactly
 * what the September rewording asked for.
 *
 * ── On the illustrations ──────────────────────────────────────────────────────────────
 * The handoff draws a different `XootCharacter` per card. That system is not ported yet, so
 * each card carries a tinted medallion in the character's own garment colour — sage, violet,
 * honey, blush — which are the kit's tint tokens, landed in Phase 1. The colour rhythm is the
 * design's; the figures are a later step, and swapping them in changes nothing else here.
 */

const PEOPLE = [
  {
    icon: BadgeCheck,
    title: "Checked before they start",
    body: "An admin reviews every Xooter's ID, proof of address and references before they can take a booking.",
    wash: "var(--xoot-sage-wash)",
    ink: "var(--xoot-sage-ink)",
  },
  {
    icon: Truck,
    title: "You, doing nothing",
    body: "The app carries arrival status, so you are not watching a window waiting for a knock.",
    wash: "var(--xoot-lilac-wash)",
    ink: "var(--xoot-lilac-ink)",
  },
  {
    icon: CalendarClock,
    title: "Built around a turnover",
    body: "Airbnb turnovers book into a morning window, so you can place one between a checkout and the next check-in.",
    wash: "var(--xoot-honey-wash)",
    ink: "var(--xoot-honey-ink)",
  },
  {
    icon: MessageSquare,
    title: "Someone to talk to",
    body: "Message or call about a booking from inside the app, without handing over your own number.",
    wash: "var(--xoot-blush-wash)",
    ink: "var(--xoot-blush-ink)",
  },
] as const;

const XootCharacter = ({ ink, wash, pose }: { ink: string; wash: string; pose: number }) => (
  <svg viewBox="0 0 96 96" className="h-20 w-20" aria-hidden="true">
    <circle cx="48" cy="48" r="42" fill={wash} />
    <path d={`M30 ${67 - pose}c2-13 10-20 18-20s16 7 18 ${20 + pose}`} fill={ink} opacity=".92" />
    <circle cx="48" cy="34" r="14" fill="hsl(var(--background))" stroke={ink} strokeWidth="3" />
    <path d="M39 31c4-5 14-5 18 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    <circle cx="43" cy="36" r="1.8" fill={ink} /><circle cx="53" cy="36" r="1.8" fill={ink} />
    <path d="M43 42c3 3 7 3 10 0" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    <path d="M25 68c8-5 13-7 23-7s15 2 23 7" fill="none" stroke="hsl(var(--background))" strokeWidth="3" strokeLinecap="round" opacity=".8" />
  </svg>
);

export const PeopleBand = () => {
  return (
    <section className="py-16 sm:py-20">
      <div className="container">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Who turns up
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Real people, checked first.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            An admin reviews every Xooter before they can take their first booking.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PEOPLE.map((person, index) => {
            return (
              <div
                key={person.title}
                className="flex h-full flex-col items-center gap-4 rounded-3xl border border-border bg-card p-6 text-center"
              >
                <span
                  className="grid h-20 w-20 place-items-center rounded-full transition-transform duration-300 hover:-translate-y-1 hover:rotate-2"
                  style={{ background: person.wash, color: person.ink }}
                >
                  <XootCharacter ink={person.ink} wash={person.wash} pose={index % 2} />
                </span>
                <h3 className="font-display text-lg font-bold tracking-tight">{person.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{person.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
