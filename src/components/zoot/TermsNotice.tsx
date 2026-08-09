import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Terms acceptance notice.
 *
 * Implicit acceptance: continuing past this point accepts the Terms and Privacy Policy.
 * For that to bind, the notice has to be genuinely visible before the action and the
 * links have to work — it cannot be hidden behind a "more" toggle, greyed to
 * illegibility, or placed below the fold. So this sits directly under the buttons it
 * refers to, at readable contrast, with both documents one tap away.
 *
 * `action` names the actual button so the sentence is true on every screen it appears
 * on. "By continuing" under a button that says "Get started" is vague; "By tapping
 * Get started" is not.
 *
 * ON THE HORIZONTAL PADDING
 *
 * The paragraph above states the requirement and, until 2026-08-09, nothing enforced it. A
 * browser screenshot of `/care-plus/join` at 390px showed the Concierge launcher — `fixed
 * bottom-4 right-4 z-50` in `XootSupportBot.tsx` — sitting on top of the words "Privacy
 * Policy". Consent text partially covered by a floating widget is precisely the "hidden" this
 * component exists to avoid, and it was happening on the paywall, which is the screen where the
 * consent matters most.
 *
 * `px-14` reserves 3.5rem each side — wider than the launcher's corner — so the text column
 * cannot run under it at any viewport. Symmetric, so the notice still reads as centred; the cost
 * is a line of wrap on narrow screens, which is the right trade for a sentence that has to be
 * legible to bind. `shoot-screens.mjs` asserts the box no longer intersects any fixed element.
 */
export function TermsNotice({ action = "continuing", className }: { action?: string; className?: string }) {
  return (
    <p
      data-terms-notice
      className={cn("px-14 text-center text-[0.68rem] leading-relaxed text-muted-foreground", className)}
    >
      By {action} you agree to our{" "}
      <Link
        to="/legal/terms"
        className="font-semibold text-foreground underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Terms
      </Link>{" "}
      and{" "}
      <Link
        to="/legal/privacy"
        className="font-semibold text-foreground underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
}
