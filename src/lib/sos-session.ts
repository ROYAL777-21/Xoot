/**
 * The SOS lifecycle, as a pure state machine.
 *
 * Kept free of timers, DOM and network on purpose. Every rule below is one a test can pin
 * exactly, which matters more here than anywhere else in the app: the failure mode of a
 * safety feature is silence, and silence is what an integration test is worst at noticing.
 * The hook that drives this owns the clock and the side effects; this file owns the rules.
 *
 * Timing constants come from `./safety.ts`, which is synced to the native app through
 * `mobile/src/generated/`. Nothing here redefines them.
 */

import { SOS_COUNTDOWN_MS, sosSecondsRemaining } from "./safety";

export type SosPhase =
  /** Nothing armed. */
  | "idle"
  /** Countdown running. **No server row exists yet**, which is what makes cancel free. */
  | "counting"
  /** Countdown elapsed: dialling, and recording the alert. */
  | "dispatching"
  /** The server holds the alert. Cancelling from here costs the PIN. */
  | "dispatched"
  /** Cancelled, before or after dispatch. */
  | "cancelled"
  /** The alert could not be recorded. Check `dialled` before deciding what to tell the user. */
  | "failed";

export type SosState = {
  phase: SosPhase;
  /** When the trigger was pressed. The countdown is measured from here. */
  armedAt: number | null;
  /** Server id, once the alert is durable. */
  alertId: string | null;
  /**
   * Whether the emergency number has actually been dialled.
   *
   * Tracked separately from `phase` because the two come apart in the case that matters: the
   * dial succeeds and the alert POST fails. The user is on the phone to an emergency call
   * centre and the app must not tell them nothing happened.
   */
  dialled: boolean;
  error: string | null;
};

export type SosEvent =
  | { type: "arm"; now: number }
  | { type: "tick"; now: number }
  /** Free cancel. Legal only while counting — see `sosReducer`. */
  | { type: "cancel" }
  | { type: "dialled" }
  | { type: "recorded"; alertId: string }
  | { type: "recordFailed"; message: string }
  /** The server accepted a post-dispatch cancel, PIN and all. */
  | { type: "cancelConfirmed" }
  | { type: "reset" };

export const initialSosState: SosState = {
  phase: "idle",
  armedAt: null,
  alertId: null,
  dialled: false,
  error: null,
};

/**
 * Whether the countdown has run out at `now`.
 *
 * A separate export because the hook needs to ask without dispatching, and because a rule
 * this important should be readable on its own line.
 */
export const sosCountdownElapsed = (state: SosState, now: number) =>
  state.phase === "counting" && state.armedAt !== null && now - state.armedAt >= SOS_COUNTDOWN_MS;

/** Seconds still on the clock, for display. Zero unless counting. */
export const sosRemainingSeconds = (state: SosState, now: number) =>
  state.phase === "counting" && state.armedAt !== null
    ? sosSecondsRemaining(now - state.armedAt)
    : 0;

/**
 * Whether a cancel right now can be done with one tap.
 *
 * Deliberately **not** a function of elapsed time. The free window is the countdown, and the
 * countdown is over the moment we leave `counting` — `raise-sos-alert` had the equivalent bug
 * (deriving it from elapsed time against a row created at dispatch) and it handed out a
 * PIN-free cancel for five seconds after dispatch. The client states the same rule the server
 * now states: free while counting, PIN afterwards.
 */
export const sosCancelIsFree = (state: SosState) => state.phase === "counting";

export function sosReducer(state: SosState, event: SosEvent): SosState {
  switch (event.type) {
    case "arm":
      // Re-arming something already running would restart the countdown, which is the last
      // thing a panicking user needs from a second press.
      if (state.phase !== "idle" && state.phase !== "cancelled" && state.phase !== "failed") {
        return state;
      }
      return { ...initialSosState, phase: "counting", armedAt: event.now };

    case "tick":
      return sosCountdownElapsed(state, event.now) ? { ...state, phase: "dispatching" } : state;

    case "cancel":
      // Only free while counting. From `dispatching` or `dispatched` this is a no-op, so a
      // stray tap cannot stand down an alert that has already gone out; the caller must go
      // through the PIN path and finish with `cancelConfirmed`.
      return state.phase === "counting" ? { ...state, phase: "cancelled", armedAt: null } : state;

    case "dialled":
      return { ...state, dialled: true };

    case "recorded":
      // Reachable only from `dispatching`. Anything else means a late response to an alert
      // the user has already stood down, and honouring it would resurrect it.
      return state.phase === "dispatching"
        ? { ...state, phase: "dispatched", alertId: event.alertId, error: null }
        : state;

    case "recordFailed":
      // `dialled` is preserved. This is the state where the phone call went through and the
      // record did not, and the UI has to say so rather than report a clean failure.
      return state.phase === "dispatching"
        ? { ...state, phase: "failed", error: event.message }
        : state;

    case "cancelConfirmed":
      return state.phase === "dispatched" ? { ...state, phase: "cancelled" } : state;

    case "reset":
      return initialSosState;

    default:
      return state;
  }
}
