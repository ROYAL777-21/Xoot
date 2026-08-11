/**
 * Safety constants — SOS and visit recording.
 *
 * Shared with the native app through `mobile/src/generated/` so the countdown the user sees
 * and the window the server enforces cannot drift apart. A safety feature whose client and
 * server disagree about timing is worse than one that does not exist, because it has been
 * relied on.
 */

/**
 * Countdown before an armed SOS dispatches, in milliseconds.
 *
 * Five seconds, per the founder's instruction, and it is the right number: long enough to undo
 * a pocket trigger, short enough that someone in trouble is not counting. Uber uses a
 * comparable window.
 */
export const SOS_COUNTDOWN_MS = 5_000;

/** Haptic pulse interval during the countdown. One per second, so it can be felt not watched. */
export const SOS_PULSE_INTERVAL_MS = 1_000;

/**
 * South African emergency number to dial from a mobile handset.
 *
 * 112 rather than 10111. It routes to an emergency call centre from any network, works with no
 * airtime and no SIM credit, and does not require the caller to know which service they need —
 * all three matter when the person dialling is not in a position to choose.
 */
export const SA_EMERGENCY_NUMBER = "112";

/**
 * Dialling is not the alert. The dial reaches a call centre that will ask where you are; the
 * silent alert carries the address, the booking and both identities to Xoot ops at the same
 * moment, for the case where the caller cannot speak.
 */
export const SOS_SENDS_SILENT_ALERT = true;

/**
 * Audible siren is opt-in, not default.
 *
 * An alarm announces to whoever is present that help has been called, which de-escalates some
 * situations and escalates others. That is the user's judgement to make in the moment, not a
 * default to impose on them.
 */
export const SOS_AUDIBLE_BY_DEFAULT = false;

/**
 * Cancelling after dispatch needs the account PIN.
 *
 * During the countdown, cancelling is one tap — false triggers must be cheap to undo. Once
 * dispatched, the threat model inverts: the person most motivated to cancel may be the person
 * the alert is about.
 */
export const SOS_CANCEL_REQUIRES_PIN_AFTER_DISPATCH = true;

/** Recording is audio only. Video inside a private home is disproportionate under POPIA. */
export const RECORDING_MODE = "audio" as const;

/** Days an unattached recording survives before the retention job deletes it. */
export const RECORDING_RETENTION_DAYS = 30;

/**
 * Both parties are told at booking that either may record, and again by an on-screen indicator
 * while recording runs. RICA s4 permits a party to a communication to record it; the notice is
 * what keeps that lawful in a shared space and provable afterwards.
 */
export const RECORDING_REQUIRES_BOTH_PARTY_NOTICE = true;

/**
 * Readiness gate, same pattern as `TIP_READINESS` in `./tipping.ts`.
 *
 * `schema_pending` — tables exist, nothing is wired.
 * `server_ready`   — Edge Functions live; the app may arm SOS and record.
 * `live`           — emergency dialling and the ops alert path are both verified end to end.
 *
 * No safety promise may be shown to a user before the thing it promises works. This is the
 * Consumer Protection Act point, but it is also the obvious one: a button labelled SOS that
 * does nothing is worse than no button.
 */
export type SafetyReadiness = "schema_pending" | "server_ready" | "live";
export const SAFETY_READINESS: SafetyReadiness = "schema_pending";

/**
 * Both take the readiness as a parameter rather than closing over the constant.
 *
 * Not style: TypeScript narrows `const x: Union = "literal"` to the literal at the comparison
 * site, so `SAFETY_READINESS === "live"` is a compile error today — the native typecheck
 * rejected exactly that. Taking the union as an argument keeps it honest, and lets the tests
 * exercise every state instead of only the one currently shipped.
 */
export const canArmSos = (readiness: SafetyReadiness = SAFETY_READINESS) => readiness === "live";

export const canRecordVisit = (readiness: SafetyReadiness = SAFETY_READINESS) =>
  readiness !== "schema_pending";

/**
 * Whether a cancel at this moment is free or needs the PIN.
 *
 * Takes elapsed time rather than reading a clock, so it is testable and so the caller decides
 * what "now" means — the same reason the splash choreography is a pure function of time.
 */
export function sosCancelNeedsPin(elapsedMs: number): boolean {
  if (!SOS_CANCEL_REQUIRES_PIN_AFTER_DISPATCH) return false;
  return elapsedMs >= SOS_COUNTDOWN_MS;
}

/** Whole seconds left on the countdown, floored at zero. */
export function sosSecondsRemaining(elapsedMs: number): number {
  return Math.max(0, Math.ceil((SOS_COUNTDOWN_MS - elapsedMs) / 1000));
}
