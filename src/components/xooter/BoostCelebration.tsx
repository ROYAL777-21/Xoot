import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Zoey } from "@/components/xoot/mascot/Zoey";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import {
  type XooterBoost,
  boostCopy,
  boostToCelebrate,
  markCelebrated,
} from "@/lib/xooter-boost-announcement";

/**
 * The card a Xooter sees once, when a 14-day earnings boost lands.
 *
 * ── Why a card and not a toast ───────────────────────────────────────────────────
 * A toast is for something that happened to the app. This is a reward, and it is about the
 * person's pay — it should stop them, be readable, and be dismissed on purpose. Once dismissed it
 * does not come back: `markCelebrated` records the boost id, so the celebration is an event rather
 * than a banner that nags for a fortnight. The boost itself stays visible in the earnings surface;
 * this is only the moment it is announced.
 *
 * ── The claim on the card ────────────────────────────────────────────────────────
 * "You keep 5% more of every job" — exactly true, and checkable against a payout. The tempting
 * phrasing, "your earnings are up 5%", understates it: 35% → 30% is a **7.7%** rise in what the
 * Xooter takes home. Under-promising on a pay screen is not the safe direction; it teaches people
 * the numbers here are approximate. The wording lives in `xooter-boost-announcement.ts` where it
 * is tested against the arithmetic.
 *
 * ── Motion ───────────────────────────────────────────────────────────────────────
 * `xoot-pop` on the card and Zoey's `celebrate` pose carry the celebration. Both are already
 * reduced-motion safe: `--xoot-dur-*` is zeroed under `prefers-reduced-motion` in `index.css`, and
 * `Zoey` calls `useReducedMotion` internally and goes still. So there is no separate branch here —
 * one that could rot — and nothing spins for someone who asked it not to.
 */
export function BoostCelebration({
  boosts,
  currentRateBps,
  exampleSubtotalCents,
  className,
}: {
  boosts: XooterBoost[] | null | undefined;
  /** The Xooter's rate before the boost, so the card can show the actual movement. */
  currentRateBps: number;
  /** A real job value, if one is to hand. Omitted rather than invented. */
  exampleSubtotalCents?: number;
  className?: string;
}) {
  const [boost, setBoost] = useState<XooterBoost | null>(null);

  useEffect(() => {
    // Resolved in an effect, not during render: `boostToCelebrate` reads localStorage, and doing
    // that in the render path makes the component behave differently under SSR and hydration.
    setBoost(boostToCelebrate(boosts));
  }, [boosts]);

  if (!boost) return null;

  const copy = boostCopy(boost, currentRateBps, exampleSubtotalCents);

  const dismiss = () => {
    haptic("success");
    markCelebrated(boost.id);
    setBoost(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="boost-headline"
        data-boost-celebration
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "relative w-full max-w-sm overflow-hidden rounded-3xl bg-card p-6 text-center shadow-warm",
          "animate-[xoot-pop_var(--xoot-dur-slow,420ms)_var(--xoot-ease-out,cubic-bezier(0.2,0.8,0.2,1))_both]",
          className,
        )}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-1 grid place-items-center">
          <Zoey pose="celebrate" size={112} />
        </div>

        <h2 id="boost-headline" className="font-display text-2xl font-bold leading-tight">
          {copy.headline}
        </h2>

        {/* The claim, given the weight on the card that it has in the Xooter's pay. */}
        <p className="mt-3 font-display text-3xl font-bold text-primary">{copy.keepLine}</p>
        <p className="mt-1 text-sm font-medium text-muted-foreground">{copy.windowLine}</p>

        <div className="mt-5 flex items-center justify-center gap-3 rounded-2xl bg-muted/60 px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your rate
          </span>
          <span className="font-display text-lg font-bold tabular-nums">{copy.rateLine}</span>
        </div>

        {copy.exampleLine && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy.exampleLine}</p>
        )}

        {boost.reason && (
          // Why they got it. A reward with no reason attached reads as a lottery, and the reason
          // is required on the row precisely so it can be shown here.
          <p className="mt-4 rounded-2xl border border-border/60 px-4 py-3 text-sm italic leading-relaxed text-foreground">
            &ldquo;{boost.reason}&rdquo;
          </p>
        )}

        <Button onClick={dismiss} className="mt-6 h-12 w-full rounded-2xl text-base font-semibold">
          Thanks
        </Button>
      </div>
    </div>
  );
}
