import { describe, expect, it } from "vitest";
import {
  callDurationSeconds,
  callIsLive,
  callReducer,
  canStartCall,
  initialCallState,
  type CallEvent,
  type CallState,
} from "./voice-call";

/**
 * The rules that matter are the ones about events arriving in the wrong order, because that is
 * what a real network does and what no amount of manual testing reliably reproduces. A late
 * `connected` after a hang-up, a `failed` after the call already ended, a second tap while the
 * first is still connecting — each of those is a real sequence, and each has a wrong behaviour
 * that looks fine in a demo.
 */

const run = (events: CallEvent[], from: CallState = initialCallState) =>
  events.reduce(callReducer, from);

describe("voice call lifecycle", () => {
  it("walks the ordinary path from tap to two-way audio", () => {
    const s = run([
      { type: "request", bookingId: "b1" },
      { type: "token_ok", identity: "xoot_abc_voice" },
      { type: "connected", at: 1_000 },
    ]);
    expect(s.phase).toBe("connected");
    expect(s.bookingId).toBe("b1");
    expect(s.identity).toBe("xoot_abc_voice");
    expect(s.connectedAt).toBe(1_000);
  });

  it("treats a missing Twilio configuration as its own state, not a failure", () => {
    // `twilio-token` answers 200 with { configured: false, missing: [...] }. The UI has to say
    // "not set up" rather than "something went wrong", because those need different responses
    // from different people.
    const s = run([
      { type: "request", bookingId: "b1" },
      { type: "token_unavailable", missing: ["TWILIO_ACCOUNT_SID", "TWILIO_VOICE_APP_SID"] },
    ]);
    expect(s.phase).toBe("unavailable");
    expect(s.missingConfig).toEqual(["TWILIO_ACCOUNT_SID", "TWILIO_VOICE_APP_SID"]);
    expect(s.error).toBeNull();
  });

  it("ignores a second tap while the first call is still connecting", () => {
    // Double-dialling would tear down the session the first tap is establishing, and the user
    // would see a call that failed for no reason they can perceive.
    const connecting = run([
      { type: "request", bookingId: "b1" },
      { type: "token_ok", identity: "id" },
    ]);
    const after = callReducer(connecting, { type: "request", bookingId: "b2" });
    expect(after).toBe(connecting);
    expect(after.bookingId).toBe("b1");
  });

  it("does not revive a dead call when `connected` arrives after hang-up", () => {
    // The SDK can emit `connected` for media that was already in flight when we hung up.
    const s = run([
      { type: "request", bookingId: "b1" },
      { type: "token_ok", identity: "id" },
      { type: "hang_up" },
      { type: "connected", at: 5_000 },
    ]);
    expect(s.phase).toBe("disconnecting");
    expect(s.connectedAt).toBeNull();
  });

  it("lets the far side end a call that never finished connecting", () => {
    const s = run([
      { type: "request", bookingId: "b1" },
      { type: "token_ok", identity: "id" },
      { type: "ended" },
    ]);
    expect(s.phase).toBe("ended");
  });

  it("ignores a failure that arrives after the call already ended", () => {
    // Teardown routinely produces errors nobody needs to see. Showing one turns a normal
    // goodbye into an apparent fault.
    const ended = run([
      { type: "request", bookingId: "b1" },
      { type: "token_ok", identity: "id" },
      { type: "connected", at: 1_000 },
      { type: "ended" },
    ]);
    const after = callReducer(ended, { type: "failed", error: "ICE disconnected" });
    expect(after).toBe(ended);
    expect(after.error).toBeNull();
  });

  it("keeps mute across the connecting boundary", () => {
    // Tapping mute while it is still ringing is a real thing people do, and being ignored is
    // worse than the alternative: they believe they are muted and speak.
    const s = run([
      { type: "request", bookingId: "b1" },
      { type: "token_ok", identity: "id" },
      { type: "mute_toggled" },
      { type: "connected", at: 1_000 },
    ]);
    expect(s.muted).toBe(true);
    expect(s.phase).toBe("connected");
  });

  it("does not toggle mute when there is no call", () => {
    expect(callReducer(initialCallState, { type: "mute_toggled" }).muted).toBe(false);
  });

  it("times from the moment audio connected, not from the tap", () => {
    const s = run([
      { type: "request", bookingId: "b1" },
      { type: "token_ok", identity: "id" },
      { type: "connected", at: 10_000 },
    ]);
    expect(callDurationSeconds(s, 10_000)).toBe(0);
    expect(callDurationSeconds(s, 13_500)).toBe(3);
    // A clock that jumps backwards must not produce a negative duration.
    expect(callDurationSeconds(s, 9_000)).toBe(0);
    expect(callDurationSeconds(initialCallState, 99_999)).toBe(0);
  });

  it("knows which phases hold SDK resources", () => {
    // `callIsLive` is what the hook uses to decide whether leaving the screen must tear the
    // session down. Getting it wrong leaks a microphone.
    const live = (events: CallEvent[]) => callIsLive(run(events));
    expect(live([{ type: "request", bookingId: "b" }])).toBe(false);
    expect(live([{ type: "request", bookingId: "b" }, { type: "token_ok", identity: "i" }])).toBe(true);
    expect(
      live([
        { type: "request", bookingId: "b" },
        { type: "token_ok", identity: "i" },
        { type: "connected", at: 1 },
      ]),
    ).toBe(true);
    expect(
      live([
        { type: "request", bookingId: "b" },
        { type: "token_ok", identity: "i" },
        { type: "connected", at: 1 },
        { type: "ended" },
      ]),
    ).toBe(false);
  });

  it("allows a new call only once the previous one is finished", () => {
    expect(canStartCall(initialCallState)).toBe(true);
    expect(canStartCall(run([{ type: "request", bookingId: "b" }]))).toBe(false);

    const failed = run([
      { type: "request", bookingId: "b" },
      { type: "failed", error: "network" },
    ]);
    expect(canStartCall(failed)).toBe(true);

    // `unavailable` is not retryable by tapping again: nothing the user does adds a secret.
    const unavailable = run([
      { type: "request", bookingId: "b" },
      { type: "token_unavailable", missing: ["TWILIO_ACCOUNT_SID"] },
    ]);
    expect(canStartCall(unavailable)).toBe(false);
  });

  it("clears everything on reset so a stale error cannot follow into the next call", () => {
    const failed = run([
      { type: "request", bookingId: "b1" },
      { type: "failed", error: "mic permission denied" },
    ]);
    expect(callReducer(failed, { type: "reset" })).toEqual(initialCallState);
  });
});
