import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Loader2, PhoneCall, ShieldAlert, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import {
  SA_EMERGENCY_NUMBER,
  SOS_PULSE_INTERVAL_MS,
  canArmSos,
} from "@/lib/safety";
import {
  initialSosState,
  sosCountdownElapsed,
  sosReducer,
  sosRemainingSeconds,
} from "@/lib/sos-session";

/**
 * The SOS control.
 *
 * Three things about this component are load-bearing, and all three are easy to undo by
 * accident:
 *
 * 1. **It renders nothing until `canArmSos()` is true.** `safety.ts` states the rule — no
 *    safety promise may be shown before the thing it promises works — and a button labelled
 *    SOS that does nothing is worse than no button. Readiness is `schema_pending` today, so
 *    this ships dark on purpose. See `blocker.md` for what advancing it requires.
 * 2. **It dials before it talks to the server.** A phone call cannot be placed from a server,
 *    and making someone in trouble wait on a round trip before the call starts would be
 *    indefensible. The alert is recorded after the dial, not before it.
 * 3. **Location is best-effort and never blocks the dial.** It starts when the countdown
 *    starts, so the five seconds do double duty; whatever has arrived by dispatch is what
 *    gets sent, and nothing waits for it.
 */

type SosButtonProps = {
  /** Attaches the alert to a visit, which is how ops gets the address. Optional by design. */
  bookingId?: string;
  className?: string;
};

type SosResponse = {
  success?: boolean;
  error?: string;
  data?: { id?: string; state?: string; addressKnown?: boolean };
};

type Fix = { latitude: number; longitude: number; accuracyM: number | null };

export const SosButton = ({ bookingId, className }: SosButtonProps) => {
  const [state, dispatch] = useReducer(sosReducer, initialSosState);
  const [now, setNow] = useState(() => Date.now());
  const [pin, setPin] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Held in a ref rather than state: it is read once at dispatch and must never cause a
  // re-render mid-countdown.
  const fixRef = useRef<Fix | null>(null);
  const dispatchedRef = useRef(false);

  /** Ticks the clock while counting, and pulses once a second so it can be felt not watched. */
  useEffect(() => {
    if (state.phase !== "counting") return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      haptic("warning");
    }, SOS_PULSE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [state.phase]);

  /** Separate, faster tick so the countdown crosses zero promptly rather than up to a second late. */
  useEffect(() => {
    if (state.phase !== "counting") return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [state.phase]);

  useEffect(() => {
    if (sosCountdownElapsed(state, now)) dispatch({ type: "tick", now });
  }, [state, now]);

  const arm = useCallback(() => {
    haptic("warning");
    dispatchedRef.current = false;
    fixRef.current = null;
    setCancelError("");
    setPin("");

    // Kicked off with the countdown, not at dispatch, so there is a real chance of a fix by
    // the time it is needed. Failure is silent and expected — a denied permission must not
    // stop an emergency.
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fixRef.current = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyM: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
          };
        },
        () => {},
        { enableHighAccuracy: true, timeout: 4_500, maximumAge: 30_000 },
      );
    }

    dispatch({ type: "arm", now: Date.now() });
  }, []);

  /** Dial, then record. Guarded so a re-render cannot fire it twice. */
  useEffect(() => {
    if (state.phase !== "dispatching" || dispatchedRef.current) return;
    dispatchedRef.current = true;

    // First, and without awaiting anything.
    try {
      window.location.href = `tel:${SA_EMERGENCY_NUMBER}`;
      dispatch({ type: "dialled" });
    } catch {
      // A handset that cannot dial is still worth raising the alert for.
    }

    const fix = fixRef.current;
    void supabase.functions
      .invoke("raise-sos-alert", {
        body: {
          action: "dispatch",
          bookingId,
          latitude: fix?.latitude,
          longitude: fix?.longitude,
          accuracyM: fix?.accuracyM,
          dialled: SA_EMERGENCY_NUMBER,
          silent: true,
        },
      })
      .then(({ data, error }) => {
        const result = data as SosResponse | null;
        if (error || result?.success === false || !result?.data?.id) {
          dispatch({
            type: "recordFailed",
            message: result?.error ?? "Xoot could not be reached",
          });
          return;
        }
        dispatch({ type: "recorded", alertId: result.data.id });
      })
      .catch(() => dispatch({ type: "recordFailed", message: "Xoot could not be reached" }));
  }, [state.phase, bookingId]);

  const cancelDuringCountdown = () => {
    haptic("selection");
    dispatch({ type: "cancel" });
  };

  const cancelAfterDispatch = async () => {
    setCancelError("");
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("raise-sos-alert", {
        body: { action: "cancel", alertId: state.alertId, pin },
      });
      const result = data as SosResponse | null;
      if (error || result?.success === false) {
        // Deliberately the server's message: "pin incorrect" and "alert is not open" are
        // different situations and the user needs to know which one they are in.
        setCancelError(result?.error ?? "That did not work. The alert is still active.");
        haptic("warning");
        return;
      }
      dispatch({ type: "cancelConfirmed" });
      haptic("success");
    } catch {
      setCancelError("That did not work. The alert is still active.");
    } finally {
      setCancelling(false);
    }
  };

  // The gate. Everything above is inert until readiness reaches "live".
  if (!canArmSos()) return null;

  const seconds = sosRemainingSeconds(state, now);

  if (state.phase === "idle" || state.phase === "cancelled") {
    return (
      <div className={cn("space-y-2", className)}>
        <Button
          type="button"
          onClick={arm}
          variant="destructive"
          className="h-16 w-full rounded-2xl text-lg font-semibold"
        >
          <ShieldAlert className="mr-2 size-6" aria-hidden />
          Emergency
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Dials {SA_EMERGENCY_NUMBER} and sends your location and booking to Xoot.
        </p>
        {state.phase === "cancelled" && (
          <p className="text-center text-xs font-medium text-muted-foreground">Alert cancelled.</p>
        )}
      </div>
    );
  }

  if (state.phase === "counting") {
    return (
      <div className={cn("space-y-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4", className)}>
        <p className="text-center text-sm font-medium">
          Calling {SA_EMERGENCY_NUMBER} in
          <span className="mx-1 text-2xl font-bold tabular-nums">{seconds}</span>
          {seconds === 1 ? "second" : "seconds"}
        </p>
        <Button
          type="button"
          onClick={cancelDuringCountdown}
          variant="outline"
          className="h-14 w-full rounded-2xl text-base font-semibold"
        >
          <X className="mr-2 size-5" aria-hidden />
          Cancel
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Cancel now and nothing is sent. After the call starts you will need your safety PIN.
        </p>
      </div>
    );
  }

  // dispatching / dispatched / failed all show the alert as live, because it is: the dial has
  // been placed. They differ only in what Xoot knows.
  return (
    <div className={cn("space-y-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-4", className)}>
      <p className="flex items-center justify-center gap-2 text-sm font-semibold">
        <PhoneCall className="size-5" aria-hidden />
        {state.dialled ? `Calling ${SA_EMERGENCY_NUMBER}` : "Emergency alert raised"}
      </p>

      {state.phase === "dispatching" && (
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" aria-hidden />
          Sending your details to Xoot…
        </p>
      )}

      {state.phase === "dispatched" && (
        <p className="text-center text-xs text-muted-foreground">
          Xoot has your location and booking details.
        </p>
      )}

      {state.phase === "failed" && (
        // The honest version of a half-failure. Telling someone already on the phone to an
        // operator that "the alert failed" invites them to hang up and start again.
        <p className="text-center text-xs font-medium text-destructive">
          {state.dialled
            ? `You are being connected to ${SA_EMERGENCY_NUMBER}. Xoot could not be reached, so stay on the call and describe where you are.`
            : "The alert could not be sent. Dial 112 directly."}
        </p>
      )}

      {state.phase === "dispatched" && (
        <div className="space-y-2 border-t border-destructive/20 pt-3">
          <label className="block text-xs text-muted-foreground" htmlFor="sos-cancel-pin">
            False alarm? Enter your safety PIN to stand it down.
          </label>
          <div className="flex gap-2">
            <input
              id="sos-cancel-pin"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="off"
              className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-center tracking-[0.4em]"
              placeholder="••••"
            />
            <Button
              type="button"
              onClick={cancelAfterDispatch}
              disabled={cancelling || pin.length < 4}
              variant="outline"
              className="h-11 rounded-xl"
            >
              {cancelling ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Stand down"}
            </Button>
          </div>
          {cancelError && <p className="text-xs font-medium text-destructive">{cancelError}</p>}
        </div>
      )}
    </div>
  );
};
