import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Zoey } from "@/components/zoot/mascot/Zoey";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { readDraft } from "@/lib/onboarding";
import { formatRand } from "@/lib/xoot-pricing";
import {
  PREMIUM_MONTHLY_CENTS,
  PREMIUM_OUTCOMES,
  STANDARD_OUTCOMES,
  WIN_BACK_MONTHLY_CENTS,
  STANDARD_MONTHLY_CENTS,
  formatCountdown,
  isOfferLive,
  offerRemainingMs,
  savingsFor,
  startOrGetOffer,
  type WinBackOffer,
} from "@/lib/care-plus";
import { ArrowRight, Check, Clock3 } from "lucide-react";

/**
 * Care+ paywall, sold on outcomes rather than on savings.
 *
 * The arithmetic in `care-plus.ts` is why: at R199 only a weekly booker comes out ahead
 * on discount alone. So the page leads with what the member gets — the same person every
 * time, the slot they want, a home that is remembered — and shows the money as
 * supporting evidence rather than as the pitch.
 *
 * Declining opens a genuine second offer at half the standard tier, on a countdown that
 * is started once and never restarts.
 */

const TRIAL_DAYS = 14;

function trialDates(now = new Date()) {
  const ends = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toLocaleDateString("en-ZA", { day: "numeric", month: "long" });
  return { today: fmt(now), ends: fmt(ends) };
}

export default function CarePlusPaywall() {
  const navigate = useNavigate();
  const answers = useMemo(() => readDraft(), []);
  const cadence = answers?.cadence ?? "weekly";
  const [declined, setDeclined] = useState(false);
  const [offer, setOffer] = useState<WinBackOffer | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const dates = trialDates();
  const premium = savingsFor(cadence, 29600, "premium");
  const winBack = savingsFor(cadence, 29600, "standard");

  // Tick only while a live countdown is on screen.
  useEffect(() => {
    if (!declined || !isOfferLive(offer, now)) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [declined, offer, now]);

  const decline = () => {
    haptic("selection");
    setOffer(startOrGetOffer());
    setNow(Date.now());
    setDeclined(true);
  };

  const remaining = offerRemainingMs(offer, now);
  const live = isOfferLive(offer, now);

  if (declined) {
    return (
      <div className="flex min-h-dvh flex-col justify-center bg-secondary px-6 py-8">
        <SEO title="One more thing" description="A second Care+ option before you go." canonical="/care-plus/offer" noIndex />

        <div className="rise-in mx-auto flex w-full max-w-sm flex-col gap-4 rounded-[1.75rem] bg-card p-6 shadow-[0_20px_50px_-24px_hsl(var(--foreground)/0.4)]">
          <div className="flex justify-center">
            <Zoey pose="think" size={92} />
          </div>

          <div className="text-center">
            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-balance">
              Then let&rsquo;s try something smaller.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              R199 only really pays for itself if someone&rsquo;s in every week. If that&rsquo;s not you, this one
              probably is.
            </p>
          </div>

          <div className="rounded-2xl bg-secondary p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Care+ Standard</p>
            <p className="mt-1 flex items-baseline justify-center gap-2">
              <span className="font-display text-3xl font-bold">{formatRand(WIN_BACK_MONTHLY_CENTS)}</span>
              <span className="text-sm text-muted-foreground line-through">{formatRand(STANDARD_MONTHLY_CENTS)}</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Half price, for as long as you stay a member.</p>
          </div>

          {/* Real countdown: started once on first decline, read back from storage. */}
          {live ? (
            <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Clock3 className="size-3.5" aria-hidden="true" />
              Offer holds for <span className="tabular-nums text-foreground">{formatCountdown(remaining)}</span>
            </p>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              This offer has expired — Care+ Standard is {formatRand(STANDARD_MONTHLY_CENTS)}/month.
            </p>
          )}

          <ul className="flex flex-col gap-2">
            {STANDARD_OUTCOMES.map((o) => (
              <li key={o.title} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="text-sm">
                  <span className="font-semibold">{o.title}</span>
                  <span className="block text-xs text-muted-foreground">{o.body}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            <Button size="lg" className="h-12 w-full rounded-full" onClick={() => { haptic("success"); navigate("/app"); }}>
              {live ? `Start at ${formatRand(WIN_BACK_MONTHLY_CENTS)}/month` : `Join at ${formatRand(STANDARD_MONTHLY_CENTS)}/month`}
            </Button>
            <button
              type="button"
              onClick={() => { haptic("selection"); navigate("/app"); }}
              className="mx-auto rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              No thanks — book without a membership
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
      <SEO title="Care+" description="The same Xooter every time, the slot you want, a home that's remembered." canonical="/care-plus/join" noIndex />

      <div className="flex items-center justify-center pt-8 pb-4">
        <Zoey pose="celebrate" size={104} />
      </div>

      <div className="flex flex-1 flex-col gap-5 rounded-t-[1.75rem] bg-card px-6 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Care+</p>
          <h1 className="rise-in mt-1 font-display text-[1.7rem] font-bold leading-[1.1] tracking-tight text-balance">
            Stop re-explaining your home.
          </h1>
          <p className="rise-in mt-2 text-sm leading-relaxed text-muted-foreground [animation-delay:55ms]">
            The same person, the hours you want, everything remembered between visits.
          </p>
        </div>

        <ul className="rise-in flex flex-col gap-3 [animation-delay:110ms]">
          {PREMIUM_OUTCOMES.map((o) => (
            <li key={o.title} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/10">
                <Check className="size-3.5 text-primary" strokeWidth={3} aria-hidden="true" />
              </span>
              <span className="text-sm">
                <span className="font-semibold">{o.title}</span>
                <span className="block text-xs leading-relaxed text-muted-foreground">{o.body}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Money shown as supporting evidence, never as the pitch — and only where it is
            actually true. At anything less than weekly the honest line is different. */}
        {premium.netCents > -2000 ? (
          <div className="rise-in rounded-2xl bg-secondary p-4 [animation-delay:165ms]">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Booking {cadence === "weekly" ? "weekly" : "at your cadence"}, the{" "}
              {Math.round(premium.discountRate * 100)}% member discount saves you about{" "}
              <span className="font-semibold text-foreground">{formatRand(premium.savedCents)}</span> a month —
              roughly what the membership costs. You&rsquo;re paying for the continuity, not the discount.
            </p>
          </div>
        ) : (
          <div className="rise-in rounded-2xl bg-secondary p-4 [animation-delay:165ms]">
            <p className="text-xs leading-relaxed text-muted-foreground">
              At your current cadence the {Math.round(premium.discountRate * 100)}% discount saves about{" "}
              <span className="font-semibold text-foreground">{formatRand(premium.savedCents)}</span> a month, so this
              tier won&rsquo;t pay for itself on price alone. It&rsquo;s worth it if the continuity is.
            </p>
          </div>
        )}

        {/* Blinkist pattern: say exactly when the trial ends and when the card is charged. */}
        <div className="rise-in flex flex-col gap-2 [animation-delay:220ms]">
          <TrialRow when={`Today, ${dates.today}`} what="Full access. You're not charged for the membership." />
          <TrialRow when={`${dates.ends}`} what={`Trial ends. ${formatRand(PREMIUM_MONTHLY_CENTS)}/month starts, cancel any time before.`} />
          <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
            You&rsquo;re still charged for the cleans themselves during the trial — only the membership is free.
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <Button size="lg" className="h-12 w-full rounded-full" onClick={() => { haptic("success"); navigate("/app"); }}>
            Start {TRIAL_DAYS} days free
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
          <button
            type="button"
            onClick={decline}
            className="mx-auto rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

function TrialRow({ when, what }: { when: string; what: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
      <span className="text-xs">
        <span className={cn("font-semibold")}>{when}</span>
        <span className="block text-muted-foreground">{what}</span>
      </span>
    </div>
  );
}
