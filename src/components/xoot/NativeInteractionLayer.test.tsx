import { useEffect } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NativeInteractionLayer } from "./NativeInteractionLayer";
import { NativePushPrompt } from "@/components/notifications/NativePushPrompt";

type AppUrlCallback = (event: { url?: string }) => void;
const h = vi.hoisted(() => ({ auth: { user: { id: "owner-a" } as { id: string } | null, loading: false }, importPlugin: vi.fn(), launch: vi.fn(), appListener: vi.fn(), pushListener: vi.fn(), permission: vi.fn(), register: vi.fn(), persist: vi.fn(), remove: vi.fn(), callbacks: [] as AppUrlCallback[], paths: [] as string[] }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => h.auth }));
vi.mock("@/lib/optional-capacitor", () => ({ getOptionalNativePlatform: () => "ios", importOptionalNativePlugin: (...args: unknown[]) => h.importPlugin(...args) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ upsert: h.persist }) } }));
function Location() { const location = useLocation(); const path = location.pathname + location.search; useEffect(() => { h.paths.push(path); }, [path]); return <output data-testid="location">{path}</output>; }
const fixture = () => <MemoryRouter initialEntries={["/app"]}><NativeInteractionLayer /><NativePushPrompt /><Location /><input aria-label="Synthetic field" /><button type="button">Synthetic outside button</button></MemoryRouter>;
function deferred<T>() { let resolve!: (value: T) => void; return { promise: new Promise<T>(done => { resolve = done; }), resolve }; }
const app = () => ({ App: { getLaunchUrl: h.launch, addListener: h.appListener } });
beforeEach(() => {
  h.auth = { user: { id: "owner-a" }, loading: false }; h.callbacks = []; h.paths = [];
  for (const mock of [h.importPlugin, h.launch, h.appListener, h.pushListener, h.permission, h.register, h.persist, h.remove]) mock.mockReset();
  h.launch.mockResolvedValue(null); h.remove.mockResolvedValue(undefined);
  h.appListener.mockImplementation((_event: string, callback: AppUrlCallback) => { h.callbacks.push(callback); return Promise.resolve({ remove: h.remove }); });
  h.importPlugin.mockImplementation((specifier: string) => Promise.resolve(specifier === "@capacitor/app" ? app() : { PushNotifications: { addListener: h.pushListener, requestPermissions: h.permission, register: h.register } }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("actual NativeInteractionLayer app URL connection with legacy push disabled", () => {
  it("never imports/registers a global push listener or an alert registration action across auth changes", async () => {
    const view = render(fixture()); await waitFor(() => expect(h.appListener).toHaveBeenCalledOnce()); expect(screen.getByText("Device alert setup is unavailable in this runtime.")).toHaveTextContent("unavailable");
    for (const auth of [{ user: { id: "owner-a" }, loading: true }, { user: null, loading: false }, { user: { id: "owner-b" }, loading: false }, { user: { id: "owner-a" }, loading: false }]) { h.auth = auth; view.rerender(fixture()); expect(screen.queryByRole("button", { name: /app alerts|register|enable/i })).not.toBeInTheDocument(); }
    expect(h.importPlugin.mock.calls.every(([specifier]) => specifier === "@capacitor/app")).toBe(true); expect(h.pushListener).not.toHaveBeenCalled(); expect(h.permission).not.toHaveBeenCalled(); expect(h.register).not.toHaveBeenCalled(); expect(h.persist).not.toHaveBeenCalled();
  });
  it("preserves signed-out launch auth callbacks, ordinary app links and one route effect per app event", async () => {
    h.auth = { user: null, loading: false }; h.launch.mockResolvedValueOnce({ url: "xoot://auth/callback?code=synthetic-code" });
    render(fixture()); await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/auth/callback?code=synthetic-code")); await waitFor(() => expect(h.callbacks.length).toBeGreaterThan(0));
    act(() => h.callbacks[h.callbacks.length - 1]({ url: "xoot://app/bookings" })); await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/app/bookings")); expect(h.paths.filter(path => path === "/app/bookings")).toHaveLength(1);
    await waitFor(() => expect(h.callbacks.length).toBeGreaterThan(1)); act(() => h.callbacks[h.callbacks.length - 1]({ url: "xoot://auth/reset?token=synthetic-token" })); await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/auth/reset?token=synthetic-token")); expect(h.pushListener).not.toHaveBeenCalled();
  });
  it("preserves custom native-route events and prevents retained app/event callbacks from navigating after cleanup", async () => {
    const add = vi.spyOn(window, "addEventListener"); const view = render(fixture()); await waitFor(() => expect(h.callbacks).toHaveLength(1)); const appCallback = h.callbacks[0];
    const customCallback = add.mock.calls.find(([event]) => event === "xoot:native-route")![1] as EventListener;
    act(() => window.dispatchEvent(new CustomEvent("xoot:native-route", { detail: { path: "/app/profile" } }))); await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/app/profile"));
    view.unmount(); await act(async () => {}); const before = [...h.paths];
    act(() => { appCallback({ url: "xoot://app/bookings" }); customCallback(new CustomEvent("xoot:native-route", { detail: "/app/bookings" })); window.dispatchEvent(new CustomEvent("xoot:native-route", { detail: "/app/bookings" })); });
    expect(h.paths).toEqual(before); expect(h.remove).toHaveBeenCalled();
  });
  it("does not start app URL work when plugin import finishes after cleanup", async () => {
    const pending = deferred<ReturnType<typeof app>>(); h.importPlugin.mockReturnValue(pending.promise); const view = render(fixture()); view.unmount(); await act(async () => pending.resolve(app())); expect(h.launch).not.toHaveBeenCalled(); expect(h.appListener).not.toHaveBeenCalled();
  });
  it("ignores a late launch result and does not create its app listener after cleanup", async () => {
    const pending = deferred<{ url: string }>(); h.launch.mockReturnValue(pending.promise); const view = render(fixture()); await waitFor(() => expect(h.launch).toHaveBeenCalledOnce()); view.unmount(); const before = [...h.paths];
    await act(async () => pending.resolve({ url: "xoot://auth/callback?code=synthetic-late" })); expect(h.appListener).not.toHaveBeenCalled(); expect(h.paths).toEqual(before);
  });
  it("removes a handle returned late and guards its retained callback", async () => {
    const pending = deferred<{ remove: typeof h.remove }>(); let retained!: AppUrlCallback; h.appListener.mockImplementation((_event: string, callback: AppUrlCallback) => { retained = callback; return pending.promise; });
    const view = render(fixture()); await waitFor(() => expect(h.appListener).toHaveBeenCalledOnce()); view.unmount(); const before = [...h.paths]; await act(async () => pending.resolve({ remove: h.remove })); act(() => retained({ url: "xoot://app/bookings" })); expect(h.remove).toHaveBeenCalledOnce(); expect(h.paths).toEqual(before);
  });
  it("preserves viewport keyboard state, outside-field blur and viewport cleanup", async () => {
    const viewport = Object.assign(new EventTarget(), { height: window.innerHeight - 200, offsetTop: 0 }); const remove = vi.spyOn(viewport, "removeEventListener"); vi.stubGlobal("visualViewport", viewport);
    const view = render(fixture()); await waitFor(() => expect(h.appListener).toHaveBeenCalledOnce()); expect(document.body.dataset.keyboardOpen).toBe("true"); expect(document.documentElement.style.getPropertyValue("--keyboard-offset")).toBe("200px");
    viewport.height = window.innerHeight; act(() => viewport.dispatchEvent(new Event("resize"))); expect(document.body.dataset.keyboardOpen).toBe("false");
    const input = screen.getByRole("textbox", { name: "Synthetic field" }); input.focus(); expect(document.activeElement).toBe(input); fireEvent.pointerDown(screen.getByRole("button", { name: "Synthetic outside button" })); expect(document.activeElement).not.toBe(input);
    view.unmount(); expect(remove.mock.calls.map(([event]) => event)).toEqual(["resize", "scroll"]); expect(document.body.dataset.keyboardOpen).toBe("false"); expect(document.documentElement.dataset.nativePlatform).toBeUndefined();
  });

  it("keeps text fields focused and editable during window scroll and iOS keyboard viewport changes", async () => {
    const viewport = Object.assign(new EventTarget(), { height: window.innerHeight - 180, offsetTop: 0 });
    vi.stubGlobal("visualViewport", viewport);
    render(fixture());
    await waitFor(() => expect(h.appListener).toHaveBeenCalledOnce());
    const input = screen.getByRole("textbox", { name: "Synthetic field" }) as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);
    fireEvent.scroll(window);
    act(() => viewport.dispatchEvent(new Event("scroll")));
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: "Typeable on mobile" } });
    expect(input.value).toBe("Typeable on mobile");
    expect(document.activeElement).toBe(input);
  });
});
