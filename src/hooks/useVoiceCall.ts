import { useCallback, useEffect, useReducer, useRef } from "react";
import { Call, Device } from "@twilio/voice-sdk";
import { supabase } from "@/integrations/supabase/client";
import {
  callIsLive,
  callReducer,
  canStartCall,
  initialCallState,
  type CallState,
} from "@/lib/voice-call";

/**
 * Binds the Twilio Voice SDK to the pure lifecycle in `lib/voice-call.ts`.
 *
 * Everything hard to test lives here and nothing else does: the SDK handle, the microphone, the
 * teardown. The rules — what a late `connected` means, whether a second tap starts a second call
 * — are in the reducer, under test, because those are the parts that break in ways a demo does
 * not reveal.
 *
 * Calling happens over data. `twilio-voice-twiml` answers with `<Dial><Conference>`, so both
 * parties join a room; neither is dialled at a phone number and neither learns the other's. That
 * is what makes this work on wifi with no number pool to provision, and it is a different
 * mechanism from `create-masked-call`, which masks real PSTN numbers through Twilio Proxy.
 */

type UseVoiceCall = {
  state: CallState;
  /** Null until two-way audio; the caller renders its own timer from this. */
  durationFrom: number | null;
  start: (bookingId: string) => Promise<void>;
  hangUp: () => void;
  toggleMute: () => void;
  /** Clears a finished or failed call so the button is usable again. */
  reset: () => void;
};

export function useVoiceCall(): UseVoiceCall {
  const [state, dispatch] = useReducer(callReducer, initialCallState);

  // Refs, not state: these are handles to release, and re-rendering on them would be noise.
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  // Read inside the unmount cleanup, which closes over the first render's `state` otherwise and
  // would fail to tear down a call that started later.
  const liveRef = useRef(false);
  liveRef.current = callIsLive(state);

  /** Release the microphone and the signalling socket. Safe to call twice. */
  const teardown = useCallback(() => {
    callRef.current?.disconnect();
    callRef.current = null;
    deviceRef.current?.destroy();
    deviceRef.current = null;
  }, []);

  useEffect(() => {
    // Leaving the screen mid-call must not leave the microphone open. The browser keeps the
    // recording indicator lit and the other party keeps hearing the room.
    return () => {
      if (liveRef.current) teardown();
    };
  }, [teardown]);

  const start = useCallback(
    async (bookingId: string) => {
      if (!canStartCall(state)) return;
      dispatch({ type: "request", bookingId });

      try {
        const { data, error } = await supabase.functions.invoke("twilio-token", {
          body: { bookingId, capability: "voice" },
        });

        // A 200 carrying `configured: false` is the documented "not set up yet" answer, not a
        // failure — the endpoint returns it with the list of secrets that are missing.
        if (!error && data && data.configured === false) {
          dispatch({ type: "token_unavailable", missing: data.missing ?? [] });
          return;
        }
        if (error || !data?.token) {
          // Deliberately generic. `twilio-token` had a defect where its catch returned
          // `String(err)`, which echoed which secrets were set to any caller; do not
          // reintroduce that shape on the client.
          dispatch({ type: "failed", error: "Could not start the call. Please try again." });
          return;
        }

        dispatch({ type: "token_ok", identity: data.identity ?? "" });

        const device = new Device(data.token, {
          // Opus over the default PCMU: this is a data call, and bandwidth is the constraint
          // that matters on a South African mobile connection.
          codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        });
        deviceRef.current = device;
        device.on("error", () =>
          dispatch({ type: "failed", error: "The call dropped. Please try again." }),
        );

        // `bookingId` reaches `twilio-voice-twiml` as a parameter, which is how it resolves
        // which conference room the two parties should meet in.
        const call = await device.connect({ params: { bookingId } });
        callRef.current = call;

        call.on("accept", () => dispatch({ type: "connected", at: Date.now() }));
        call.on("disconnect", () => {
          dispatch({ type: "ended" });
          teardown();
        });
        call.on("cancel", () => {
          dispatch({ type: "ended" });
          teardown();
        });
        call.on("error", () => {
          dispatch({ type: "failed", error: "The call dropped. Please try again." });
          teardown();
        });
      } catch {
        // Overwhelmingly the microphone permission prompt being dismissed, which is worth naming
        // because it is the one cause the user can actually do something about.
        dispatch({
          type: "failed",
          error: "Could not access your microphone. Check permissions and try again.",
        });
        teardown();
      }
    },
    [state, teardown],
  );

  const hangUp = useCallback(() => {
    dispatch({ type: "hang_up" });
    teardown();
    dispatch({ type: "ended" });
  }, [teardown]);

  const toggleMute = useCallback(() => {
    // Reducer first so the button responds even before media exists; the SDK is told what the
    // resulting state is rather than asked to flip its own.
    dispatch({ type: "mute_toggled" });
    callRef.current?.mute(!state.muted);
  }, [state.muted]);

  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  return { state, durationFrom: state.connectedAt, start, hangUp, toggleMute, reset };
}
