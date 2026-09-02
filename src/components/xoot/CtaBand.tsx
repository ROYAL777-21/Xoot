import { Button } from "@/components/ui/button";
import { ArrowRight, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * The Xooter recruitment band.
 *
 * ── Restyled 2026-08-13 to the design system. Content is unchanged; the chrome is not. ─────────
 *
 * It broke four rules from `design/DESIGN-SYSTEM.md` and `design/GLASS-SYSTEM.md` at once, which
 * is why it was the first one rewritten:
 *
 *   1. "Page sections are unframed bands." It wrapped the section in
 *      `rounded-[2.5rem] gradient-warm shadow-warm` — a 40px card the width of the page. The
 *      gradient survives; being a card does not. The band now runs full-bleed and its own edges
 *      do the separating.
 *   2. "Do not place cards inside cards." Four proof tiles sat inside that card. They now sit on
 *      the band, one level deep.
 *   3. Glass "is not the default treatment for page sections, forms, repeated content cards, or
 *      dashboards" — it is for navigation, controls and overlays. The eyebrow used
 *      `backdrop-blur-sm` and every tile `backdrop-blur-md`. Both are gone. The tiles separate
 *      with a hairline border and a tonal wash, which is what `DESIGN-SYSTEM.md` asks for under
 *      Elevation: "prefer borders, tonal separation, and local shadow".
 *
 * ── And a fourth that was NOT a violation, reverted the same day ───────────────────────────────
 *
 * `DESIGN-SYSTEM.md` also says "sentence case by default" and "no negative letter spacing", so
 * the uppercase eyebrow and the heading's `tracking-tight` were stripped too. **The export
 * contradicts both.** Its own modules use `--xoot-track-label` (+0.1em, the uppercase label
 * treatment) 18 times and negative display tracking 11 times, and `SectionLabel.tsx` — ported
 * straight from the kit — renders uppercase text with the label tracking. Tailwind's
 * `tracking-widest` is 0.1em, exactly `--xoot-track-label`, so the original eyebrow was already
 * the kit's own treatment. Both are restored; `index.css` maps `tracking-tight` onto
 * `--xoot-track-display`.
 *
 * Reading a rule out of the older document and applying it against the newer export is precisely
 * what `design/README.md` warns about — and it looked like compliance while doing it.
 *
 * Radii come from the kit's own scale (`--xoot-radius-md` 20px, `--xoot-radius-pill`) rather than
 * from arbitrary values. `DESIGN-SYSTEM.md` caps cards at 8px, which the exported kit honours
 * nowhere — per `design/README.md` the export is the newer authority where the two disagree, so
 * the scale is the kit's and the .md carries an annotation rather than a silent contradiction.
 */

const proofItems = [
  { stat: "Verified", label: "Badge path" },
  { stat: "Admin", label: "Reviewed before activation" },
  { stat: "Training", label: "Required modules" },
  { stat: "Recurring", label: "Client continuity" },
];

export const CtaBand = () => (
  <section id="pro" className="gradient-warm py-20 md:py-28">
    <div className="container">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div className="text-primary-foreground">
          <span className="inline-block rounded-[var(--xoot-radius-pill)] border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-xs font-bold uppercase tracking-widest">
            Become a Xooter
          </span>
          <h2 className="mt-5 text-balance font-display text-4xl font-bold tracking-tight md:text-5xl">
            Build a stronger contractor profile.
          </h2>
          <p className="mt-4 max-w-md text-lg text-primary-foreground/85">
            Xoot helps high-quality independent contractors show experience, suburb coverage,
            reliability, repeat clients, training and trust badges.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary" className="rounded-[var(--xoot-radius-pill)] font-semibold">
              <Link to="/xooter/apply">
                Become a Xooter <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="rounded-[var(--xoot-radius-pill)] text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
            >
              <Link to="/xooter/training">
                <Smartphone className="mr-1 h-4 w-4" /> See training
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-primary-foreground">
          {proofItems.map((s) => (
            <div
              key={s.label}
              className="rounded-[var(--xoot-radius-md)] border border-primary-foreground/20 bg-primary-foreground/10 p-5"
            >
              <p className="font-display text-3xl font-bold md:text-4xl">{s.stat}</p>
              <p className="mt-1 text-sm text-primary-foreground/85">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
