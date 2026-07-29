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
 */
export function TermsNotice({ action = "continuing", className }: { action?: string; className?: string }) {
  return (
    <p className={cn("text-center text-[0.68rem] leading-relaxed text-muted-foreground", className)}>
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
