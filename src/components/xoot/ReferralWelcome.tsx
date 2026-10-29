import { useState, useEffect } from "react";
import { Gift, X } from "lucide-react";
import { REFERRAL_REWARD_CENTS } from "@/lib/referral-display";
import { formatRand } from "@/lib/xoot-pricing";

export interface ReferralWelcomeProps {
  onBook: () => void;
}

export function ReferralWelcome({ onBook }: ReferralWelcomeProps) {
  const [refCode, setRefCode] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("ref");
      if (code) {
        setRefCode(code.toUpperCase());
        localStorage.setItem("xoot_pending_ref", code.toUpperCase());
      } else {
        const stored = localStorage.getItem("xoot_pending_ref");
        if (stored) setRefCode(stored);
      }
    } catch {
      // Ignore in non-browser or sandbox environments
    }
  }, []);

  if (!refCode || dismissed) return null;

  return (
    <aside
      aria-label="Referral reward notification"
      className="bg-primary text-primary-foreground px-4 py-2.5 sm:py-3 shadow-md relative z-40 transition-all animate-in fade-in slide-in-from-top-2"
    >
      <div className="container max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-full bg-white/20 grid place-items-center shrink-0">
            <Gift className="h-4 w-4 text-white" />
          </div>
          <p className="text-xs sm:text-sm font-medium leading-tight truncate">
            <strong>{formatRand(REFERRAL_REWARD_CENTS)} referral gift unlocked:</strong> Use code <code className="bg-white/20 px-1.5 py-0.5 rounded font-mono font-bold">{refCode}</code> for {formatRand(REFERRAL_REWARD_CENTS)} off your first booking.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onBook}
            className="px-3.5 py-1.5 rounded-lg bg-white text-primary text-xs font-bold shadow-sm hover:bg-white/90 transition-colors"
          >
            Claim discount
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 rounded-full text-white/80 hover:text-white transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
