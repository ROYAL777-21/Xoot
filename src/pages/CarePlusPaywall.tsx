import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Zoey } from "@/components/xoot/mascot/Zoey";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { readDraft } from "@/lib/onboarding";
import { formatRand } from "@/lib/xoot-pricing";
import {
  CARE_PLUS_MONTHLY_CENTS,
  FREE_MONTHS_AT_SIGNUP,
  PREMIUM_OUTCOMES,
  STANDARD_OUTCOMES,
  WIN_BACK_MONTHLY_CENTS,
  formatCountdown,
  isOfferLive,
  offerRemainingMs,
  savingsFor,
  startOrGetOffer,
  type WinBackOffer,
} from "@/lib/care-plus";
import { ArrowRight, Check, Clock3 } from "lucide-react";
import { TermsNotice } from "@/components/xoot/TermsNotice";

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

/*
 * One month free, not fourteen days (founder decision 2026-08-09, with R99/month and no booking
 * fee). Derived from `FREE_MONTHS_AT_SIGNUP` rather than a local constant so the button copy
 * "Join Care+ for free" and the date the card is first charged cannot drift apart — the two
 * halves of the same promise.
 *
 * Calendar months, not 30 days. "Free until 9 September" is a date a person can hold you to;
 * "free for 30 days" is one they have to compute, and the two disagree in eleven months of the
 * year. setMonth handles the short-month case by rolling forward, which errs in the customer's
 * favour rather than charging them a day early.
 */
/**
 * The discount the server actually applies, mirrored from `getCarePlusDiscount` in
 * `create-booking/index.ts`, which returns a flat 0.1 for every active member regardless of
 * cadence. `pricing-parity.test.ts` pins the two together.
 *
 * Deliberately NOT `CADENCE_DISCOUNT.weekly` (0.15). That table describes an intended tiering
 * the server does not implement, and a paywall quoting it would promise a saving members do not
 * get. When the server is aligned, this constant is what changes.
 */
const SERVER_MEMBER_DISCOUNT_RATE = 0.1;

function trialDates(now = new Date()) {
  const ends = new Date(now);
  ends.setMonth(ends.getMonth() + FREE_MONTHS_AT_SIGNUP);
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
  /*
   * What a member is actually returned at this cadence, at the rate the server actually applies.
   *
   * `premium.savedCents` uses CADENCE_DISCOUNT, which the server does not implement — so it is
   * used for nothing user-facing here. Both the number shown AND the decision to show it come
   * from `SERVER_MEMBER_DISCOUNT_RATE`, because a box gated on one rate and filled with another
   * can appear on a cadence where the honest figure is negative.
   */
  const memberReturnCents = Math.round(premium.spendCents * SERVER_MEMBER_DISCOUNT_RATE);
  const memberIsAhead = memberReturnCents > CARE_PLUS_MONTHLY_CENTS;
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
              Care+ only really pays for itself on price if someone&rsquo;s in every week. If that&rsquo;s not
              you, the free month costs you nothing to find out.
            </p>
          </div>

          <div className="rounded-2xl bg-secondary p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Care+</p>
            <p className="mt-1 flex items-baseline justify-center gap-2">
              <span className="font-display text-3xl font-bold">{formatRand(WIN_BACK_MONTHLY_CENTS)}</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </p>
            {/* No discount claim. This used to read "half the price of Care+ Premium at R199",
                which was true only while Premium was a real, purchasable tier. Care+ is one tier
                at R99 now, so there is nothing for the half to be measured against, and an
                unqualified saving would imply R99 was once higher — it never was. A false price
                representation under the CPA, and an App Store review failure. */}
            <p className="mt-1 text-xs text-muted-foreground">
              First month free, then {formatRand(CARE_PLUS_MONTHLY_CENTS)}/month. No booking fee, ever.
            </p>
          </div>

          {/* Real countdown: started once on first decline, read back from storage. */}
          {live ? (
            <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Clock3 className="size-3.5" aria-hidden="true" />
              Reserved for you for <span className="tabular-nums text-foreground">{formatCountdown(remaining)}</span>
            </p>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Take your time — Care+ stays {formatRand(CARE_PLUS_MONTHLY_CENTS)}/month.
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
              Start at {formatRand(WIN_BACK_MONTHLY_CENTS)}/month
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

        {/* Money shown as supporting evidence, never as the pitch — and only where it is actually
            true. Two corrections at the R99 repricing:

            1. The figure is the one the SERVER GIVES. `create-booking`'s getCarePlusDiscount
               returns a flat 10% for every active member and ignores cadence; `CADENCE_DISCOUNT`
               in care-plus.ts says 15% weekly. Quoting 15% would promise a return nobody receives
               — a false price representation under the CPA, and the same displayed-versus-charged
               defect this repo already shipped once on the R39 fee.
            2. "Roughly what the membership costs" was true at R199 and is not at R99. The line
               now states both numbers and lets them speak rather than characterising them.
            3. The word "discount" is gone. BRAND_GUIDE.md forbids it in user-facing copy and says
               plainly that "Care+ is not a discount plan. It is the household reliability, memory,
               priority, and loyalty layer" — so the money reads as supporting evidence and the
               sentence ends on the reason to join. */}
        {memberIsAhead ? (
          <div className="rise-in rounded-2xl bg-secondary p-4 [animation-delay:165ms]">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Booking {cadence === "weekly" ? "weekly" : "at your cadence"}, the member rate returns
              about <span className="font-semibold text-foreground">{formatRand(memberReturnCents)}</span> a
              month against {formatRand(CARE_PLUS_MONTHLY_CENTS)}, and no booking fee. The reason to join is
              the continuity, not the arithmetic.
            </p>
          </div>
        ) : (
          <div className="rise-in rounded-2xl bg-secondary p-4 [animation-delay:165ms]">
            {/* The fortnightly and monthly branch, and the one worth writing carefully.
                Fortnightly is where the numbers nearly work and do not — about R64 back against
                R99 — which makes it the cadence most likely to feel misled later. So it is said
                first and said plainly, before the reason to join. Company voice: outcomes and
                relief, never price; "member rate", never "discount". */}
            <p className="text-xs leading-relaxed text-muted-foreground">
              At your cadence the member rate returns about{" "}
              <span className="font-semibold text-foreground">{formatRand(memberReturnCents)}</span> a month, so
              Care+ won&rsquo;t cover itself on price. It covers itself the day someone walks in already
              knowing your home — and the first month is free either way.
            </p>
          </div>
        )}

        {/* Blinkist pattern: say exactly when the trial ends and when the card is charged. */}
        <div className="rise-in flex flex-col gap-2 [animation-delay:220ms]">
          <TrialRow when={`Today, ${dates.today}`} what="Full access. You're not charged for the membership." />
          <TrialRow when={`${dates.ends}`} what={`Free month ends. ${formatRand(CARE_PLUS_MONTHLY_CENTS)}/month starts, cancel any time before.`} />
          <p className="text-[0.65rem] leading-relaxed text-muted-foreground">
            You&rsquo;re still charged for the cleans themselves during the free month — only the membership is
            free. Members pay no booking fee.
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <Button size="lg" className="h-12 w-full rounded-full" onClick={() => { haptic("success"); navigate("/app"); }}>
            Join Care+ for free
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
          <button
            type="button"
            onClick={decline}
            className="mx-auto rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Not now
          </button>
          <TermsNotice action="joining Care+" className="mt-1" />
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
