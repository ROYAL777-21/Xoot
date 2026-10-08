import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useConfirmedSave, useProfileResource } from "./useProfileResource";

const harness = vi.hoisted(() => ({ auth: { user: { id: "owner-a" } as { id: string } | null, loading: false } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => harness.auth }));
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
beforeEach(() => { harness.auth = { user: { id: "owner-a" }, loading: false }; });
afterEach(cleanup);

describe("account-keyed Profile resources", () => {
  it("keeps a read failure visible and retries", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("denied")).mockResolvedValueOnce("account-a");
    const { result } = renderHook(() => useProfileResource(load));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.data).toBeNull();
    await act(async () => { await result.current.refresh(); });
    expect(result.current.data).toBe("account-a");
  });
  it("hides the previous account synchronously and ignores late reads", async () => {
    const a = deferred<string>(); const b = deferred<string>();
    const load = vi.fn((owner: string) => owner === "owner-a" ? a.promise : b.promise);
    const { result, rerender } = renderHook(() => useProfileResource(load));
    harness.auth.user = { id: "owner-b" }; rerender();
    expect(result.current.data).toBeNull();
    await act(async () => { a.resolve("old account"); await a.promise; });
    expect(result.current.data).toBeNull();
    await act(async () => { b.resolve("new account"); await b.promise; });
    expect(result.current.data).toBe("new account");
    harness.auth.loading = true; rerender();
    expect(result.current.data).toBeNull();
    harness.auth = { user: null, loading: false }; rerender();
    expect(result.current.data).toBeNull();
  });
  it("invalidates a prior save guard even when an owner returns", async () => {
    const load = vi.fn().mockResolvedValue("loaded");
    const { result, rerender } = renderHook(() => useProfileResource(load));
    await waitFor(() => expect(result.current.data).toBe("loaded"));
    const oldGuard = result.current.isCurrent;
    harness.auth.user = { id: "owner-b" }; rerender();
    harness.auth.user = { id: "owner-a" }; rerender();
    expect(oldGuard()).toBe(false);
  });
  it("does not start a stale refresh after the owner changes", async () => {
    const load = vi.fn().mockResolvedValue("loaded");
    const { result, rerender } = renderHook(() => useProfileResource(load));
    await waitFor(() => expect(result.current.data).toBe("loaded"));
    const oldRefresh = result.current.refresh;
    harness.auth.user = { id: "owner-b" }; rerender();
    await waitFor(() => expect(result.current.data).toBe("loaded"));
    load.mockClear();
    await act(async () => { await oldRefresh(); });
    expect(load).not.toHaveBeenCalled();
    expect(result.current.data).toBe("loaded");
  });
  it("suppresses late refreshes and late writes after unmount", async () => {
    const pending = deferred<string>();
    const load = vi.fn(() => pending.promise);
    const saved = vi.fn();
    const { result, unmount } = renderHook(() => { const resource = useProfileResource(load); return { resource, save: useConfirmedSave(resource.isCurrent) }; });
    let writing!: Promise<void>;
    act(() => { writing = result.current.save.submit(() => pending.promise, saved); });
    unmount();
    await act(async () => { pending.resolve("old"); await writing; });
    expect(saved).not.toHaveBeenCalled();
  });
  it("blocks duplicate submissions and suppresses a response after account changes", async () => {
    const load = vi.fn().mockResolvedValue("loaded");
    const pending = deferred<string>(); const write = vi.fn(() => pending.promise); const saved = vi.fn();
    const { result, rerender } = renderHook(() => { const resource = useProfileResource(load); return { resource, save: useConfirmedSave(resource.isCurrent) }; });
    let writing!: Promise<void>;
    act(() => { writing = result.current.save.submit(write, saved); void result.current.save.submit(write, saved); });
    expect(write).toHaveBeenCalledTimes(1);
    harness.auth.user = { id: "owner-b" }; rerender();
    expect(result.current.save.saving).toBe(false);
    await act(async () => { pending.resolve("saved old account"); await writing; });
    expect(saved).not.toHaveBeenCalled();
  });
});
