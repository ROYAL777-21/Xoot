import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getHapticsEnabled, haptic, setHapticsEnabled } from "./haptics";
const harness = vi.hoisted(() => ({ plugin: vi.fn() }));
vi.mock("@/lib/optional-capacitor", () => ({ importOptionalNativePlugin: () => harness.plugin() }));
beforeEach(() => { localStorage.clear(); harness.plugin.mockReset().mockResolvedValue(null); vi.stubGlobal("matchMedia", () => ({ matches: false })); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("device haptic preference", () => {
  it("defaults enabled, persists a disabled preference and suppresses dispatch", () => {
    expect(getHapticsEnabled()).toBe(true);
    expect(setHapticsEnabled(false)).toBe(true);
    expect(getHapticsEnabled()).toBe(false);
    expect(haptic("success")).toBe(false);
    expect(harness.plugin).not.toHaveBeenCalled();
    expect(setHapticsEnabled(true)).toBe(true);
    expect(getHapticsEnabled()).toBe(true);
  });
  it("respects reduced motion as well as enabled preference", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(haptic()).toBe(false);
    expect(harness.plugin).not.toHaveBeenCalled();
  });
  it("dispatches a real supported native haptic when enabled", async () => {
    const selectionChanged = vi.fn().mockResolvedValue(undefined);
    harness.plugin.mockResolvedValue({ Haptics: { selectionChanged } });
    expect(haptic()).toBe(true);
    await vi.waitFor(() => expect(selectionChanged).toHaveBeenCalledOnce());
  });
  it("does not dispatch a plugin that resolves after feedback is disabled", async () => {
    let resolve!: (value: unknown) => void;
    harness.plugin.mockReturnValue(new Promise(done => { resolve = done; }));
    const selectionChanged = vi.fn();
    haptic(); setHapticsEnabled(false);
    resolve({ Haptics: { selectionChanged } });
    await Promise.resolve(); await Promise.resolve();
    expect(selectionChanged).not.toHaveBeenCalled();
  });
  it("reports blocked storage without claiming a persisted setting", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(setHapticsEnabled(false)).toBe(false);
    expect(getHapticsEnabled()).toBe(true);
  });
});
