import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

/**
 * The contractor recruitment band.
 *
 * Restyled 2026-08-13, same two corrections as `CtaBand`: it wrapped the section in
 * `rounded-4xl gradient-warm shadow-warm` — a page-width card, where `design/DESIGN-SYSTEM.md`
 * asks for unframed bands — and put `backdrop-blur-sm` on the eyebrow, where `GLASS-SYSTEM.md`
 * reserves glass for navigation, controls and overlays rather than content.
 *
 * The gradient moves to the section itself, so the band's own edges do the separating and the
 * outer `bg-secondary/40 border-y` wrapper is no longer needed — it existed only to give the
 * floating card something to float on.
 *
 * The uppercase-and-tracking treatment is deliberately NOT stripped here. That rule in
 * `DESIGN-SYSTEM.md` is superseded by the export, which uses `--xoot-track-label` for exactly
 * this kind of eyebrow — see the note in `CtaBand.tsx`, where applying the older rule was a
 * mistake that had to be reverted.
 */

export const BecomeXooter = () => {
  return (
    <section id="become-xooter" className="gradient-warm py-20 text-primary-foreground md:py-28">
      <div className="container">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1">
            <Sparkles className="h-3 w-3" />
            <span className="text-xs font-semibold">Join the Xoot marketplace</span>
          </div>
          <h2 className="mb-5 text-balance font-display text-4xl font-bold tracking-tight md:text-5xl">
            For independent contractors who want premium work standards.
          </h2>
          <p className="mb-8 max-w-xl text-lg opacity-95">
            Apply with your experience, references, transport, supplies, suburb coverage, pet
            comfort and trust documents. Activation requires verification and training.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary" className="rounded-full font-semibold">
              <Link to="/xooter/apply">Apply now</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="rounded-full text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link to="/xooter/training">View training</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
