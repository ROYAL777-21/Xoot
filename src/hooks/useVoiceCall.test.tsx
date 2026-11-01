import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVoiceCall } from "./useVoiceCall";

const f = vi.hoisted(() => ({ invoke: vi.fn(), connect: vi.fn(), devices: [] as any[], user: { id: "customer-a" } as { id: string } | null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: f.user }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: f.invoke } } }));
vi.mock("@twilio/voice-sdk", () => ({
  Call: { Codec: { Opus: "opus", PCMU: "pcmu" } },
  Device: class {
    handlers: Record<string, () => void> = {};
    destroy = vi.fn(); connect = f.connect;
    on(event: string, handler: () => void) { this.handlers[event] = handler; }
    constructor() { f.devices.push(this); }
  },
}));
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
const token = { data: { configured: true, token: "synthetic-voice-token", identity: "synthetic-identity" }, error: null };
function call() {
  const handlers: Record<string, () => void> = {};
  return { on: vi.fn((event: string, handler: () => void) => { handlers[event] = handler; }), disconnect: vi.fn(), mute: vi.fn(), handlers };
}
beforeEach(() => { f.invoke.mockReset(); f.connect.mockReset(); f.devices.length = 0; f.user = { id: "customer-a" }; });
afterEach(cleanup);

describe("voice SDK handles across asynchronous cancellation and account changes", () => {
  it("does not create a device when a token arrives after unmount", async () => {
    const pending = deferred<typeof token>(); f.invoke.mockReturnValue(pending.promise);
    const h = renderHook(useVoiceCall); let start!: Promise<void>;
    act(() => { start = h.result.current.start("booking-a"); }); h.unmount();
    await act(async () => { pending.resolve(token); await start; });
    expect(f.devices).toHaveLength(0); expect(f.connect).not.toHaveBeenCalled();
  });
  it("does not open the microphone after hanging up during token setup", async () => {
    const pending = deferred<typeof token>(); f.invoke.mockReturnValue(pending.promise);
    const h = renderHook(useVoiceCall); let start!: Promise<void>;
    act(() => { start = h.result.current.start("booking-a"); }); act(() => h.result.current.hangUp());
    await act(async () => { pending.resolve(token); await start; });
    expect(f.devices).toHaveLength(0);
  });
  it("uses an immediate lock for two taps before React rerenders", async () => {
    const pending = deferred<typeof token>(); f.invoke.mockReturnValue(pending.promise);
    const h = renderHook(useVoiceCall); let first!: Promise<void>; let second!: Promise<void>;
    act(() => { first = h.result.current.start("booking-a"); second = h.result.current.start("booking-a"); });
    expect(f.invoke).toHaveBeenCalledTimes(1);
    act(() => h.result.current.hangUp()); await act(async () => { pending.resolve(token); await Promise.all([first, second]); });
  });
  it("releases a late SDK call after unmount during connect", async () => {
    const pending = deferred<ReturnType<typeof call>>(); f.invoke.mockResolvedValue(token); f.connect.mockReturnValue(pending.promise);
    const h = renderHook(useVoiceCall); let start!: Promise<void>;
    await act(async () => { start = h.result.current.start("booking-a"); });
    expect(f.devices).toHaveLength(1); h.unmount();
    const late = call(); await act(async () => { pending.resolve(late); await start; });
    expect(late.disconnect).toHaveBeenCalled(); expect(f.devices[0].destroy).toHaveBeenCalled();
  });
  it("cancels token setup when the signed-in owner changes", async () => {
    const pending = deferred<typeof token>(); f.invoke.mockReturnValue(pending.promise);
    const h = renderHook(useVoiceCall); let start!: Promise<void>;
    act(() => { start = h.result.current.start("booking-a"); });
    f.user = { id: "customer-b" }; h.rerender();
    await act(async () => { pending.resolve(token); await start; }); expect(f.devices).toHaveLength(0);
  });
  it("does not let a late old attempt tear down a newer call", async () => {
    const oldConnect = deferred<ReturnType<typeof call>>(); const next = call();
    f.invoke.mockResolvedValue(token); f.connect.mockReturnValueOnce(oldConnect.promise).mockResolvedValueOnce(next);
    const h = renderHook(useVoiceCall); let first!: Promise<void>;
    await act(async () => { first = h.result.current.start("booking-a"); });
    act(() => { h.result.current.hangUp(); h.result.current.reset(); });
    await act(async () => { await h.result.current.start("booking-a"); });
    const old = call(); await act(async () => { oldConnect.resolve(old); await first; });
    expect(old.disconnect).toHaveBeenCalled(); expect(next.disconnect).not.toHaveBeenCalled(); expect(f.devices[1].destroy).not.toHaveBeenCalled();
  });
  it("releases the device on an SDK error", async () => {
    const connected = call(); f.invoke.mockResolvedValue(token); f.connect.mockResolvedValue(connected);
    const h = renderHook(useVoiceCall); await act(async () => { await h.result.current.start("booking-a"); });
    act(() => f.devices[0].handlers.error());
    expect(connected.disconnect).toHaveBeenCalled(); expect(f.devices[0].destroy).toHaveBeenCalled();
  });
  it("does not mint a call when signed out", async () => {
    f.user = null; const h = renderHook(useVoiceCall); await act(async () => { await h.result.current.start("booking-a"); });
    expect(f.invoke).not.toHaveBeenCalled();
  });
});
