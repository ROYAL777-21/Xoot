import { useCallback, useEffect, useReducer, useRef } from "react";
import { Call, Device } from "@twilio/voice-sdk";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { callReducer, canStartCall, initialCallState, type CallState } from "@/lib/voice-call";

type UseVoiceCall = {
  state: CallState;
  durationFrom: number | null;
  start: (bookingId: string) => Promise<void>;
  hangUp: () => void;
  toggleMute: () => void;
  reset: () => void;
};
type Attempt = { ownerId: string; device: Device | null; call: Call | null };

/** Booking-bound data calls. Each async attempt owns its handles, including after cancellation. */
export function useVoiceCall(): UseVoiceCall {
  const { user } = useAuth();
  const ownerId = user?.id;
  const ownerRef = useRef(ownerId); ownerRef.current = ownerId;
  const mounted = useRef(true);
  const active = useRef<Attempt | null>(null);
  const [state, dispatch] = useReducer(callReducer, initialCallState);

  const release = useCallback((attempt: Attempt | null) => {
    if (!attempt) return;
    const call = attempt.call; const device = attempt.device;
    attempt.call = null; attempt.device = null;
    if (active.current === attempt) active.current = null;
    // A failed SDK disconnect must not prevent microphone/device teardown.
    try { call?.disconnect(); } catch { /* Best effort; destroy the owning device below. */ }
    try { device?.destroy(); } catch { /* Handles are detached and never reused. */ }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; release(active.current); };
  }, [release]);
  useEffect(() => {
    release(active.current); dispatch({ type: "reset" });
  }, [ownerId, release]);

  const start = useCallback(async (bookingId: string) => {
    if (!ownerId || !mounted.current || active.current || !canStartCall(state)) return;
    const attempt: Attempt = { ownerId, device: null, call: null };
    active.current = attempt; // Immediate lock: two taps before a React render still mint once.
    const current = () => mounted.current && active.current === attempt && ownerRef.current === attempt.ownerId;
    dispatch({ type: "request", bookingId });
    try {
      const { data, error } = await supabase.functions.invoke("twilio-token", { body: { bookingId, capability: "voice" } });
      if (!current()) { release(attempt); return; }
      if (!error && data?.configured === false) {
        dispatch({ type: "token_unavailable", missing: data.missing ?? [] }); release(attempt); return;
      }
      if (error || !data?.token) {
        dispatch({ type: "failed", error: "Could not start the call. Please try again." }); release(attempt); return;
      }
      dispatch({ type: "token_ok", identity: data.identity ?? "" });
      const device = new Device(data.token, { codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU] });
      attempt.device = device;
      device.on("error", () => {
        if (current()) dispatch({ type: "failed", error: "The call dropped. Please try again." });
        release(attempt);
      });
      const call = await device.connect({ params: { bookingId } });
      attempt.call = call;
      if (!current()) { release(attempt); return; }
      call.on("accept", () => { if (current()) dispatch({ type: "connected", at: Date.now() }); });
      const ended = () => { if (current()) dispatch({ type: "ended" }); release(attempt); };
      call.on("disconnect", ended); call.on("cancel", ended);
      call.on("error", () => {
        if (current()) dispatch({ type: "failed", error: "The call dropped. Please try again." });
        release(attempt);
      });
    } catch {
      if (current()) dispatch({ type: "failed", error: "Could not access your microphone. Check permissions and try again." });
      release(attempt);
    }
  }, [ownerId, state, release]);

  const hangUp = useCallback(() => {
    dispatch({ type: "hang_up" }); release(active.current); dispatch({ type: "ended" });
  }, [release]);
  const toggleMute = useCallback(() => {
    dispatch({ type: "mute_toggled" }); active.current?.call?.mute(!state.muted);
  }, [state.muted]);
  const reset = useCallback(() => { release(active.current); dispatch({ type: "reset" }); }, [release]);
  return { state, durationFrom: state.connectedAt, start, hangUp, toggleMute, reset };
}
