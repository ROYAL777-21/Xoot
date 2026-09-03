import { Droplet, Shirt, SprayCan } from "lucide-react";

/**
 * "Xoot, as an object" — ported from the 2026-09-03 handoff
 * (`design/handoff-2026-09-03/xoot/site/SiteExtra.jsx` → `Merch`).
 *
 * The handoff's copy is kept, and it is worth saying why it needed no correction: it labels
 * itself **"Coming soon"** and **"Not on sale yet"** in the section head. It is already
 * written in the tense the rest of this site had to be argued into.
 *
 * ── The one thing not ported, and it is not cosmetic ──────────────────────────────────
 * The handoff pairs this with an email capture — `useState('')`, `setJoined(true)`, and
 * nothing else. The address goes nowhere. There is no table, no Edge Function and no
 * consent record behind it, so the form would take a person's email, tell them they had
 * joined a list, and discard it.
 *
 * That is a functional defect rather than a wording one, and under POPIA an email address is
 * personal information: collecting it needs a stated purpose and a real record, not a
 * `useState`. **A form that discards its input is worse than no form**, because the person
 * believes they are on the list and finds out they never were when the launch email does not
 * arrive.
 *
 * So the section ships as the showcase it already is. Wiring the waitlist needs a
 * `merch_waitlist` table with RLS and a purpose statement — noted in
 * `docs/implementation/design-port-plan.md`, and it needs the production database password
 * that is still outstanding.
 */

const MERCH = [
  {
    icon: SprayCan,
    name: "Xoot room spray",
    detail: "The scent a Xooter leaves behind. Three notes, made in Joburg, no synthetic musk.",
    tag: "Home",
    wash: "var(--xoot-sage-wash)",
    ink: "var(--xoot-sage-ink)",
  },
  {
    icon: Shirt,
    name: "Xooter attire",
    detail: "What Xooters arrive in — hard-wearing, breathable, and recognisable at the gate.",
    tag: "For Xooters",
    wash: "var(--xoot-violet-100)",
    ink: "var(--xoot-violet-700)",
  },
  {
    icon: Droplet,
    name: "Surface kit",
    detail: "The products used on premium finishes. Marble, brass and treated wood safe.",
    tag: "Home",
    wash: "var(--xoot-mist-wash)",
    ink: "var(--xoot-mist-ink)",
  },
] as const;

export const Merch = () => {
  return (
    <section id="merch" className="bg-muted/30 py-16 sm:py-20">
      <div className="container">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Coming soon
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Xoot, as an object.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Room sprays, Xooter attire and the surface kit our Xooters actually use. Not on sale
            yet.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MERCH.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.name}
                className="flex h-full flex-col rounded-3xl border border-border bg-card p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="grid h-14 w-14 place-items-center rounded-2xl"
                    style={{ background: item.wash, color: item.ink }}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {item.tag}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-xl font-bold tracking-tight">{item.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
