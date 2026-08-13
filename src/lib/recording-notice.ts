import { RECORDING_MODE, RECORDING_RETENTION_DAYS } from "./safety";

/**
 * The both-party notice for in-visit call recording — the wording, in one place.
 *
 * ── Why this is the blocker, and why it is a module ─────────────────────────────
 * `recording_enabled` and `transcription_enabled` are held `false` everywhere, and
 * `.semgrep/rules/xoot.yaml` fails the build on setting either `true`. `docs/voice-calling.md`
 * states the reason: **the boolean is the last step, not the first.** Under **RICA s4** a call may
 * lawfully be recorded by *a party to it*, and under **POPIA s18** the people on the call must be
 * told what is collected, why, for how long and who sees it. Without wording, flipping the flag
 * makes a recording nobody consented to.
 *
 * It is a module rather than copy pasted into a page because the notice has to appear in three
 * places that must not disagree: the terms, the booking-time disclosure, and the indicator shown
 * while recording runs. A promise made in the terms and contradicted on screen is worse than
 * either alone — it is the same failure this codebase has already shipped three times on price,
 * where the screen said one thing and the server did another.
 *
 * Retention and mode are imported, not restated, so the sentence a customer reads cannot claim
 * 30 days while `safety.ts` deletes at 14.
 *
 * ── What this does NOT do ──────────────────────────────────────────────────────
 * **It does not enable recording.** Wording is necessary and not sufficient: the notice must
 * actually be *rendered* before the flag can move, and the in-call indicator lives in the native
 * call layer, which is Release & Infrastructure's path. The Semgrep rule stays until the
 * indicator ships — see `RECORDING_NOTICE_RENDERED` below.
 *
 * ⚠️ Operational draft. `LegalLayout` already says these pages need South African legal counsel
 * before public launch, and this is the clause most worth their attention: it is the one that
 * makes a recording admissible or unlawful.
 */

/** Audio only. Video inside a private home is disproportionate under POPIA. */
export const RECORDING_NOTICE_MODE = RECORDING_MODE;

/**
 * Shown when a booking is confirmed, before any call can happen.
 *
 * Deliberately says *either party* rather than "you may": RICA s4 is party-consent, so the
 * lawful recorder is the customer or the Xooter, never Xoot recording two other people.
 */
export const BOOKING_TIME_NOTICE =
  "Either you or your Xooter may record an in-app call for safety. If a call is recorded, " +
  "both of you see a recording indicator for as long as it runs. Recordings are audio only, " +
  `are used only for safety and dispute resolution, and are deleted after ${RECORDING_RETENTION_DAYS} ` +
  "days unless attached to a report you or your Xooter opens.";

/** The label on the indicator shown for the whole time a recording runs. Short by necessity. */
export const IN_CALL_INDICATOR_LABEL = "Recording — both parties notified";

/**
 * The terms clause. Written to satisfy POPIA s18's list rather than to sound reassuring:
 * what is collected, why, who sees it, how long, and how to object.
 */
export const TERMS_CLAUSE = [
  "Either party to an in-app call may record it. Xoot does not record calls on its own initiative " +
    "and does not record calls between people who are not party to the booking.",
  "Recordings are audio only. Xoot does not record video inside a home.",
  "When a recording starts, both parties are shown an on-screen indicator that stays visible for " +
    "as long as the recording runs. A call cannot be recorded without that indicator appearing.",
  "Recordings are used only to investigate a safety incident or resolve a dispute about a booking. " +
    "They are not used for training, marketing, quality scoring, or advertising.",
  "Access is limited to the parties to the call and the Xoot staff handling a report that the " +
    "recording is attached to.",
  `Recordings are deleted after ${RECORDING_RETENTION_DAYS} days unless attached to an open report, ` +
    "in which case they are kept until that report is closed.",
  "You may object to a recording, ask for a copy of one you are party to, or ask for it to be " +
    "deleted, by contacting Xoot support. You may also complain to the Information Regulator of " +
    "South Africa.",
] as const;

/** The statute each part of the notice answers, so a reviewer can check it clause by clause. */
export const LEGAL_BASIS = {
  rica: "RICA s4 — a party to a communication may record it; the notice makes that provable.",
  popia:
    "POPIA s18 — the data subject must be told what is collected, the purpose, the recipients, " +
    "the retention period and their right to object.",
} as const;

/**
 * Whether the notice is actually on screen yet. **This is the gate, not the wording.**
 *
 * `false` until the in-call indicator is rendered by the call layer. Recording must stay disabled
 * while this is `false`, because a clause in the terms that no screen ever shows is not notice —
 * it is the thing this repo keeps calling a promise the product does not keep.
 *
 * Flipping it is Release & Infrastructure's call, in the commit that ships the indicator, and the
 * Semgrep rule comes out in that same commit rather than this one.
 */
export const RECORDING_NOTICE_RENDERED = false;
