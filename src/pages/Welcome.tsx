import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Zoey } from "@/components/zoot/mascot/Zoey";
import { AppleLogo, GoogleLogo } from "@/components/zoot/ProviderLogos";
import { haptic } from "@/lib/haptics";
import { TermsNotice } from "@/components/zoot/TermsNotice";
import { Mail, Phone } from "lucide-react";

/**
 * First-run welcome — Direction A.
 *
 * Split layout: an illustrated half carrying Zoey and the flowers, and a card that
 * rises over it holding the copy and the four ways in. Nothing here authenticates;
 * every route leads into the existing hardened /auth flow, which already owns rate
 * limiting, lockout, OAuth and OTP.
 */

/** Line-art bloom. Drawn rather than dropped in, per the direction's restraint. */
function Flower({ className, tone = "primary" }: { className?: string; tone?: "primary" | "ink" }) {
  const stroke = tone === "primary" ? "hsl(var(--primary))" : "hsl(var(--foreground))";
  return (
    <svg className={className} viewBox="0 0 100 120" fill="none" stroke={stroke} strokeWidth="1.6" aria-hidden="true">
      <path d="M50 118V56" strokeLinecap="round" />
      <path d="M50 74c-14 0-24-8-24-18" strokeLinecap="round" />
      <path d="M50 88c14 0 24-8 24-18" strokeLinecap="round" />
      <circle cx="50" cy="40" r="9" />
      <circle cx="50" cy="24" r="9" />
      <circle cx="35" cy="34" r="9" />
      <circle cx="65" cy="34" r="9" />
      <circle cx="41" cy="50" r="9" />
      <circle cx="59" cy="50" r="9" />
    </svg>
  );
}

const WAYS_IN = [
  { key: "phone", label: "Continue with phone", icon: Phone, to: "/auth?method=phone", primary: true },
  { key: "email", label: "Continue with Email", icon: Mail, to: "/auth?method=email", primary: false },
] as const;

export default function Welcome() {
  const navigate = useNavigate();

  const go = (to: string) => {
    haptic("selection");
    navigate(to);
  };

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden bg-secondary">
      <SEO
        title="Welcome to Xoot"
        description="Set up your home once and booking a trusted Xooter takes a single tap after that."
        canonical="/welcome"
        noIndex
      />

      {/* Illustrated half. Zoey is centred in the space rather than pinned to the top,
          so the composition holds on both a short iPhone SE and a tall Pro Max. */}
      <div className="relative flex min-h-[34dvh] flex-1 items-center justify-center overflow-hidden">
        <Flower className="absolute -left-5 bottom-0 w-28 opacity-50 origin-bottom motion-safe:animate-[sway_6s_ease-in-out_infinite]" />
        <Flower
          tone="ink"
          className="absolute -right-3 bottom-4 w-20 opacity-30 origin-bottom motion-safe:animate-[sway_6s_ease-in-out_infinite] [animation-delay:-2s]"
        />
        <Zoey pose="wave" size={168} className="relative -translate-y-2" />
      </div>

      {/* Card. pb accounts for the home indicator and keeps the last row clear of the
          floating concierge button, which sits bottom-right on every screen. */}
      <div className="relative z-10 -mt-7 flex flex-col gap-2.5 rounded-t-[1.75rem] bg-card px-6 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-14px_40px_-24px_hsl(var(--foreground)/0.35)]">
        {/* Progress — four steps, this is the first. */}
        <div className="flex gap-1" role="progressbar" aria-valuenow={1} aria-valuemin={1} aria-valuemax={4} aria-label="Step 1 of 4">
          <span className="h-[3px] flex-1 rounded-full bg-primary" />
          <span className="h-[3px] flex-1 rounded-full bg-muted" />
          <span className="h-[3px] flex-1 rounded-full bg-muted" />
          <span className="h-[3px] flex-1 rounded-full bg-muted" />
        </div>

        <h1 className="rise-in font-display text-[1.7rem] font-bold leading-[1.1] tracking-tight text-balance">
          Let&rsquo;s handle your home.
        </h1>

        <p className="rise-in text-[0.8rem] leading-relaxed text-muted-foreground [animation-delay:55ms]">
          Set it up once. Your hours, your add-ons, your Xooter &mdash; remembered. Booking after this is a
          single confirmation.
        </p>

        <p className="rise-in flex items-center gap-1.5 text-[0.65rem] text-muted-foreground [animation-delay:110ms]">
          <span className="size-1.5 shrink-0 rounded-full bg-success motion-safe:animate-pulse" aria-hidden="true" />
          142 homes cleaned in Sandton this month
        </p>

        <div className="rise-in mt-4 flex flex-col gap-2 [animation-delay:165ms]">
          {WAYS_IN.map((w) => (
            <Button
              key={w.key}
              size="lg"
              variant={w.primary ? "default" : "outline"}
              className="h-12 w-full rounded-full text-sm font-semibold"
              onClick={() => go(w.to)}
            >
              <w.icon className="size-4" aria-hidden="true" />
              {w.label}
            </Button>
          ))}

          {/* Right-padded so the last button never sits under the floating concierge
              button. Icon-only, so each carries an explicit accessible name. */}
          <div className="flex gap-2 pr-16">
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-full"
              onClick={() => go("/auth?provider=apple")}
              aria-label="Continue with Apple"
            >
              <AppleLogo className="size-[1.15rem]" />
            </Button>
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-full"
              onClick={() => go("/auth?provider=google")}
              aria-label="Continue with Google"
            >
              <GoogleLogo className="size-[1.15rem]" />
            </Button>
          </div>

          {/* Implicit acceptance: it must be visible before the action it refers to,
              not tucked away, or it does not bind. */}
          <TermsNotice action="continuing" className="mt-3" />
        </div>
      </div>
    </div>
  );
}
