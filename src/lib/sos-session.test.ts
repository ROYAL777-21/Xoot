import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SOS_COUNTDOWN_MS } from "./safety";
import {
  type SosEvent,
  type SosState,
  initialSosState,
  sosCancelIsFree,
  sosCountdownElapsed,
  sosReducer,
  sosRemainingSeconds,
} from "./sos-session";

/**
 * The rules that decide whether this feature helps someone or quietly fails them.
 *
 * Written against the reducer rather than the component because these are the properties
 * worth guaranteeing, and a render test would assert the same things through three layers of
 * indirection while catching fewer of them.
 */

const run = (events: SosEvent[], from: SosState = initialSosState) =>
  events.reduce(sosReducer, from);

const T0 = 1_000_000;
/** Any moment after the countdown has run out. */
const AFTER = T0 + SOS_COUNTDOWN_MS;

describe("arming and the countdown", () => {
  it("starts counting from the press, not from zero", () => {
    const state = run([{ type: "arm", now: T0 }]);
    expect(state.phase).toBe("counting");
    expect(state.armedAt).toBe(T0);
  });

  it("does not dispatch before the countdown is up", () => {
    const state = run([
      { type: "arm", now: T0 },
      { type: "tick", now: T0 + SOS_COUNTDOWN_MS - 1 },
    ]);
    expect(state.phase).toBe("counting");
  });

  it("dispatches the moment it is", () => {
    const state = run([
      { type: "arm", now: T0 },
      { type: "tick", now: AFTER },
    ]);
    expect(state.phase).toBe("dispatching");
  });

  it("ignores a second press rather than restarting the countdown", () => {
    // A frightened user pressing twice must not buy the situation another five seconds.
    const state = run([
      { type: "arm", now: T0 },
      { type: "arm", now: T0 + 3_000 },
    ]);
    expect(state.armedAt).toBe(T0);
    expect(sosRemainingSeconds(state, T0 + 4_000)).toBe(1);
  });

  it("counts down in whole seconds and floors at zero", () => {
    const state = run([{ type: "arm", now: T0 }]);
    expect(sosRemainingSeconds(state, T0)).toBe(5);
    expect(sosRemainingSeconds(state, T0 + 4_500)).toBe(1);
    expect(sosRemainingSeconds(state, AFTER + 10_000)).toBe(0);
  });

  it("reports no countdown when nothing is armed", () => {
    expect(sosRemainingSeconds(initialSosState, T0)).toBe(0);
    expect(sosCountdownElapsed(initialSosState, AFTER)).toBe(false);
  });
});

describe("cancelling", () => {
  it("is one tap while counting, because nothing has been sent yet", () => {
    const counting = run([{ type: "arm", now: T0 }]);
    expect(sosCancelIsFree(counting)).toBe(true);
    expect(sosReducer(counting, { type: "cancel" }).phase).toBe("cancelled");
  });

  /**
   * The property this whole file exists for.
   *
   * `raise-sos-alert` had the mirror-image bug: it derived "still in the countdown" from
   * elapsed time against a row created at dispatch, so the PIN was not required for five
   * seconds after the alert went out. The person most motivated to cancel may be the person
   * the alert is about, and they are holding the phone.
   */
  it("stops being free the instant the alert goes out", () => {
    for (const phase of ["dispatching", "dispatched"] as const) {
      const state: SosState = { ...initialSosState, phase, armedAt: T0 };
      expect(sosCancelIsFree(state), `${phase} must not be free`).toBe(false);
      // And a bare cancel must not stand the alert down.
      expect(sosReducer(state, { type: "cancel" }).phase).toBe(phase);
    }
  });

  it("does not become free again just because time passes", () => {
    // The window is the phase, not the clock. An elapsed-time rule would reopen here.
    const dispatched: SosState = { ...initialSosState, phase: "dispatched", armedAt: T0 };
    expect(sosCancelIsFree(dispatched)).toBe(false);
    expect(sosReducer(dispatched, { type: "cancel" }).phase).toBe("dispatched");
  });

  it("stands down only once the server has confirmed the PIN", () => {
    const dispatched: SosState = { ...initialSosState, phase: "dispatched", alertId: "a1" };
    expect(sosReducer(dispatched, { type: "cancelConfirmed" }).phase).toBe("cancelled");
  });

  it("will not confirm a cancel for an alert that never dispatched", () => {
    const counting = run([{ type: "arm", now: T0 }]);
    expect(sosReducer(counting, { type: "cancelConfirmed" }).phase).toBe("counting");
  });

  it("lets a cancelled alert be armed again", () => {
    const state = run([
      { type: "arm", now: T0 },
      { type: "cancel" },
      { type: "arm", now: T0 + 60_000 },
    ]);
    expect(state.phase).toBe("counting");
    expect(state.armedAt).toBe(T0 + 60_000);
  });
});

describe("dispatch, and what happens when half of it works", () => {
  it("remembers the dial independently of the alert", () => {
    const state = run([
      { type: "arm", now: T0 },
      { type: "tick", now: AFTER },
      { type: "dialled" },
    ]);
    expect(state.dialled).toBe(true);
    expect(state.phase).toBe("dispatching");
  });

  /**
   * The case the UI must not get wrong: the call connected, the record did not.
   *
   * Telling someone already talking to an emergency operator that "the alert failed" invites
   * them to hang up and try again. `dialled` survives the failure so the screen can say what
   * is actually true — you are through to 112, Xoot does not have your details.
   */
  it("keeps the dial on the record when the alert cannot be saved", () => {
    const state = run([
      { type: "arm", now: T0 },
      { type: "tick", now: AFTER },
      { type: "dialled" },
      { type: "recordFailed", message: "too many alerts" },
    ]);
    expect(state.phase).toBe("failed");
    expect(state.dialled).toBe(true);
    expect(state.error).toBe("too many alerts");
  });

  it("records the alert id so the cancel path has something to name", () => {
    const state = run([
      { type: "arm", now: T0 },
      { type: "tick", now: AFTER },
      { type: "recorded", alertId: "alert-1" },
    ]);
    expect(state.phase).toBe("dispatched");
    expect(state.alertId).toBe("alert-1");
    expect(state.error).toBeNull();
  });

  it("ignores a response that arrives after the user stood the alert down", () => {
    // A slow POST resolving against a cancelled session would resurrect the alert.
    const cancelled = run([
      { type: "arm", now: T0 },
      { type: "cancel" },
    ]);
    expect(sosReducer(cancelled, { type: "recorded", alertId: "late" }).phase).toBe("cancelled");
    expect(sosReducer(cancelled, { type: "recordFailed", message: "late" }).phase).toBe("cancelled");
  });

  it("can be armed again after a failure", () => {
    const failed: SosState = { ...initialSosState, phase: "failed", error: "network" };
    const state = sosReducer(failed, { type: "arm", now: T0 });
    expect(state.phase).toBe("counting");
    // And the previous failure must not follow it into the new attempt.
    expect(state.error).toBeNull();
    expect(state.dialled).toBe(false);
  });

  it("resets to a clean slate", () => {
    const state = run([
      { type: "arm", now: T0 },
      { type: "tick", now: AFTER },
      { type: "dialled" },
      { type: "reset" },
    ]);
    expect(state).toEqual(initialSosState);
  });
});

/**
 * The three properties of `SosButton` that a render test would not usefully catch.
 *
 * Read as source text, the same technique `pricing-parity` and `server-authority` use.
 * Comments are stripped first so a rule explained in prose cannot satisfy a test looking
 * for the rule.
 */
describe("the SOS control", () => {
  const button = readFileSync(join(process.cwd(), "src/components/xoot/SosButton.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("renders nothing until the whole path is verified", () => {
    // safety.ts: no safety promise may be shown before the thing it promises works.
    expect(button).toMatch(/if \(!canArmSos\(\)\) return null;/);
  });

  it("dials before it calls the server, not after", () => {
    const dialAt = button.indexOf(`window.location.href = \`tel:`);
    const invokeAt = button.indexOf(`invoke("raise-sos-alert"`);
    expect(dialAt, "the emergency dial is gone").toBeGreaterThan(-1);
    expect(invokeAt).toBeGreaterThan(-1);
    // Waiting on a round trip before the call starts would be indefensible.
    expect(dialAt).toBeLessThan(invokeAt);
    // And the dial must not be awaited.
    expect(button).not.toMatch(/await[\s\S]{0,40}window\.location\.href/);
  });

  it("never blocks the dial on a location fix", () => {
    // The fix is read from a ref at dispatch; nothing awaits geolocation.
    expect(button).toMatch(/getCurrentPosition/);
    expect(button).not.toMatch(/await[\s\S]{0,60}getCurrentPosition/);
    expect(button).toMatch(/timeout: \d/);
  });

  /**
   * A control nothing renders is a control nobody has.
   *
   * The gate means this ships invisible, which makes it exactly the kind of thing that gets
   * built and then never wired up — and the omission would only surface on the day readiness
   * flips to "live" and still nothing appears.
   */
  it("is actually on the screen where a visit happens", () => {
    const detail = readFileSync(join(process.cwd(), "src/pages/app/BookingDetail.tsx"), "utf8");
    expect(detail).toMatch(/import \{ SosButton \}/);
    expect(detail).toMatch(/<SosButton bookingId=\{id\}/);

    // Before the visit cards; the source layout replaced the legacy map/grid.
    const sosAt = detail.indexOf("<SosButton");
    const gridAt = detail.indexOf('className="xoot-detail-content"');
    expect(sosAt).toBeGreaterThan(-1);
    expect(sosAt).toBeLessThan(gridAt);

    // And only while someone is on the way to, or inside, the home.
    expect(detail).toMatch(/const activeVisit = Boolean\(canonicalStatus && \["en_route", "in_progress"\]/);
  });

  it("asks for the PIN only where the server would", () => {
    // The stand-down form belongs to `dispatched`, which is exactly where the server now
    // requires the PIN. Offering it during the countdown would teach the wrong habit.
    expect(button).toMatch(/action: "cancel"[\s\S]{0,80}pin/);
    expect(button).toMatch(/state\.phase === "dispatched" && \(/);
  });
});
