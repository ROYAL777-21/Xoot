import { useEffect, useState } from "react";
import { Loader2, Mic, MicOff, PhoneCall, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import { callDurationSeconds } from "@/lib/voice-call";
import type { VisitActionGuard } from "@/components/visits/action-contract";

/**
 * In-app calling over mobile data, for a booking's two parties.
 *
 * Offered above the masked-PSTN button because it is the cheaper and less encumbered path: no
 * numbers to provision, no pool to rent, and it works on wifi. The phone route stays as the
 * fallback for someone with signal and no data.
 *
 * The eligibility gate is **not** re-derived here. The caller passes `available`, which comes from
 * the same `maskedCallAvailable` check the phone button already uses — active booking window, and
 * `canAccessSensitiveBookingData`. Two transports, one permission; a second copy of that rule
 * would drift from the first and one of them would be wrong.
 */

const mmss = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function VoiceCallPanel({ bookingId, available, isCurrent, invoke }: { bookingId: string; available: boolean } & VisitActionGuard) {
  const { state, start, hangUp, toggleMute } = useVoiceCall({ isCurrent, invoke });
  const [now, setNow] = useState(() => Date.now());

  // Ticks only while connected. A timer running behind an idle screen is a battery cost with
  // nothing on the other end of it.
  useEffect(() => {
    if (state.phase !== "connected") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  if (!available) return null;

  /**
   * Not configured is a sentence, not an error toast.
   *
   * `twilio-token` answers 200 with `{ configured: false, missing: [...] }` when its secrets are
   * absent, because "nobody has set this up" is a different thing from "your call failed". Saying
   * so plainly is also the rule `safety.ts` sets for SOS and the reason that button ships dark: an
   * affordance that cannot do what it appears to offer is worse than no affordance.
   *
   * The missing key names are deliberately not shown. This renders for clients and contractors,
   * and which of an operator's secrets are unset is not their business — the same reasoning that
   * removed `String(err)` from `twilio-token`'s catch.
   */
  if (state.phase === "unavailable") {
    return (
      <div className="mx-5 mb-5 rounded-2xl border border-border bg-muted/35 p-3 text-sm">
        <p className="font-semibold">In-app calling isn't switched on yet</p>
        <p className="text-muted-foreground">
          Use booking messages or contact support. Masked phone calls also depend on provider availability.
        </p>
      </div>
    );
  }

  const connecting = state.phase === "requesting_token" || state.phase === "connecting";
  const live = state.phase === "connected";

  return (
    <div className="px-5 pb-5">
      {state.phase === "failed" && state.error && (
        <p className="mb-2 text-sm text-muted-foreground" role="status">
          {state.error}
        </p>
      )}

      {!live ? (
        <Button
          onClick={() => start(bookingId)}
          disabled={connecting}
          className="w-full rounded-xl"
          // `aria-busy` rather than swapping the label: a screen reader announcing a changed
          // button name mid-press is more confusing than a busy state on a stable one.
          aria-busy={connecting}
        >
          {connecting ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <PhoneCall className="mr-1 h-4 w-4" />
          )}
          {connecting ? "Connecting…" : "Call over the internet"}
        </Button>
      ) : (
        <div className="rounded-2xl border border-border bg-muted/35 p-3">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="font-semibold">Call connected</p>
            {/* Tabular figures so the timer does not jitter as digits change width. */}
            <p className="font-mono text-sm tabular-nums text-muted-foreground" aria-live="off">
              {mmss(callDurationSeconds(state, now))}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={toggleMute}
              variant="outline"
              className="rounded-xl"
              aria-pressed={state.muted}
            >
              {state.muted ? <MicOff className="mr-1 h-4 w-4" /> : <Mic className="mr-1 h-4 w-4" />}
              {state.muted ? "Unmute" : "Mute"}
            </Button>
            <Button onClick={hangUp} variant="destructive" className="rounded-xl">
              <PhoneOff className="mr-1 h-4 w-4" /> End call
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
