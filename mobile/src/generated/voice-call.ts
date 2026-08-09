// GENERATED FILE — DO NOT EDIT.
// Copied from src/lib/voice-call.ts by scripts/build/sync-shared-native.mjs.
// Edit the source and run `npm run shared:sync`.

/**
 * The in-app voice call lifecycle, as a pure state machine.
 *
 * This is calling over mobile data, the way WhatsApp does it — WebRTC between two app clients,
 * meeting in a Twilio conference. It is **not** the masked-PSTN path in `create-masked-call`,
 * which dials real numbers through Twilio Proxy. The two exist for different reasons: this one
 * needs no phone numbers and no number pool, and works wherever there is data; that one is the
 * fallback for a user with signal but no data allowance.
 *
 * Kept free of timers, DOM, network and the Twilio SDK on purpose, for the reason
 * `sos-session.ts` gives about safety features and applies here too: a call that silently fails
 * to connect looks identical to a call nobody answered. Every rule below is one a test can pin
 * without a browser, a microphone or a Twilio account. The hook owns the SDK and the clock;
 * this file owns the rules.
 *
 * The server half already exists and is not re-derived here:
 *   - `twilio-token` mints a scoped access token, and checks the caller is a booking participant
 *   - `twilio-voice-twiml` answers with `<Dial><Conference>`, so both parties meet in a room
 *     rather than either seeing the other's identity
 */

export type CallPhase =
  /** Nothing in progress. */
  | "idle"
  /**
   * Asking the server for a token.
   *
   * Separate from `connecting` because it is the phase that can fail for reasons the user can
   * act on — not a booking participant, or the feature is not configured — where `connecting`
   * fails for reasons they cannot.
   */
  | "requesting_token"
  /** Token in hand, Twilio is establishing the media session. */
  | "connecting"
  /** Two-way audio. The only phase where anyone is actually talking. */
  | "connected"
  /** Local hang-up requested; waiting for the SDK to confirm. */
  | "disconnecting"
  /** Call is over, for any ordinary reason including the far side hanging up. */
  | "ended"
  /**
   * The feature is switched off or missing its Twilio secrets.
   *
   * Deliberately its own phase rather than a flavour of `failed`. `twilio-token` answers
   * `{ configured: false, missing: [...] }` with a **200**, because "not set up" is a
   * configuration state, not an error the user caused. The UI must say so plainly instead of
   * showing a call button that cannot work — the same rule `safety.ts` sets for SOS: no
   * capability may be offered before the thing behind it works.
   */
  | "unavailable"
  /** Something went wrong. `error` carries a message safe to show. */
  | "failed";

export type CallState = {
  phase: CallPhase;
  /** The booking this call belongs to. Every token is scoped to one. */
  bookingId: string | null;
  /** Twilio identity for this leg, echoed from the token response. Useful in logs. */
  identity: string | null;
  /** When two-way audio began, for the duration timer. Null until `connected`. */
  connectedAt: number | null;
  /** Whether the local microphone is muted. Survives reconnects within a call. */
  muted: boolean;
  /** Which secrets the server reported missing, when `phase` is `unavailable`. */
  missingConfig: string[];
  /** Safe to display. Never carries provider detail — see the note in `twilio-token`. */
  error: string | null;
};

export type CallEvent =
  | { type: "request"; bookingId: string }
  | { type: "token_ok"; identity: string }
  | { type: "token_unavailable"; missing: string[] }
  | { type: "connected"; at: number }
  | { type: "mute_toggled" }
  | { type: "hang_up" }
  | { type: "ended" }
  | { type: "failed"; error: string }
  | { type: "reset" };

export const initialCallState: CallState = {
  phase: "idle",
  bookingId: null,
  identity: null,
  connectedAt: null,
  muted: false,
  missingConfig: [],
  error: null,
};

/** Phases where the SDK holds resources that must be released before leaving the screen. */
export const callIsLive = (state: CallState) =>
  state.phase === "connecting" || state.phase === "connected" || state.phase === "disconnecting";

/** Whether a new call may be started. Guards against double-dialling from an impatient tap. */
export const canStartCall = (state: CallState) =>
  state.phase === "idle" || state.phase === "ended" || state.phase === "failed";

/**
 * Whole seconds of two-way audio so far.
 *
 * Measured from `connectedAt`, not from when the button was pressed: a caller should not be shown
 * a timer that was already running while the call was still ringing.
 */
export const callDurationSeconds = (state: CallState, now: number) =>
  state.connectedAt === null ? 0 : Math.max(0, Math.floor((now - state.connectedAt) / 1000));

export function callReducer(state: CallState, event: CallEvent): CallState {
  switch (event.type) {
    case "request":
      // Ignored rather than restarted mid-call. A second tap while connecting must not tear down
      // the session the first tap is still establishing.
      if (!canStartCall(state)) return state;
      return {
        ...initialCallState,
        phase: "requesting_token",
        bookingId: event.bookingId,
      };

    case "token_ok":
      if (state.phase !== "requesting_token") return state;
      return { ...state, phase: "connecting", identity: event.identity };

    case "token_unavailable":
      if (state.phase !== "requesting_token") return state;
      return { ...state, phase: "unavailable", missingConfig: event.missing };

    case "connected":
      // Only from `connecting`. A late `connected` after hang-up must not revive a dead call.
      if (state.phase !== "connecting") return state;
      return { ...state, phase: "connected", connectedAt: event.at };

    case "mute_toggled":
      // Allowed while connecting so a user who taps mute early is not ignored; the hook applies
      // it to the SDK once media exists.
      if (state.phase !== "connected" && state.phase !== "connecting") return state;
      return { ...state, muted: !state.muted };

    case "hang_up":
      if (!callIsLive(state)) return state;
      return { ...state, phase: "disconnecting" };

    case "ended":
      // Reachable from any live phase, because the far side can hang up at any point — including
      // while we are still connecting.
      if (!callIsLive(state)) return state;
      return { ...state, phase: "ended" };

    case "failed":
      // Deliberately reachable from every phase except a finished one. A failure arriving after
      // the call already ended is noise, not news.
      if (state.phase === "ended" || state.phase === "idle") return state;
      return { ...state, phase: "failed", error: event.error };

    case "reset":
      return initialCallState;

    default: {
      // Exhaustiveness: adding an event without handling it is a compile error, not a silent
      // no-op discovered by a user whose call did nothing.
      const unreachable: never = event;
      return unreachable;
    }
  }
}
