import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NativePushPrompt } from "./NativePushPrompt";

const h = vi.hoisted(() => ({ auth: { user: { id: "owner-a" } as { id: string } | null, loading: false }, platform: "ios", importPlugin: vi.fn(), permission: vi.fn(), register: vi.fn(), persist: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => h.auth }));
vi.mock("@/lib/optional-capacitor", () => ({ getOptionalNativePlatform: () => h.platform, importOptionalNativePlugin: (...args: unknown[]) => h.importPlugin(...args) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ upsert: h.persist }) } }));
beforeEach(() => { h.auth = { user: { id: "owner-a" }, loading: false }; h.platform = "ios"; for (const mock of [h.importPlugin, h.permission, h.register, h.persist]) mock.mockReset(); h.importPlugin.mockResolvedValue({ PushNotifications: { requestPermissions: h.permission, register: h.register } }); });
afterEach(cleanup);
describe("unavailable legacy Capacitor alert setup", () => {
  it.each(["ios", "android"])("shows an honest unavailable status in supported %s runtime with no registration action", platform => {
    h.platform = platform; render(<NativePushPrompt />); expect(screen.getByRole("status")).toHaveTextContent("Device alert setup is unavailable in this runtime."); expect(screen.queryByRole("button")).not.toBeInTheDocument(); expect(screen.queryByRole("link")).not.toBeInTheDocument(); expect(h.importPlugin).not.toHaveBeenCalled(); expect(h.permission).not.toHaveBeenCalled(); expect(h.register).not.toHaveBeenCalled(); expect(h.persist).not.toHaveBeenCalled();
  });
  it.each(["web", "unknown"])("keeps this legacy-only entry absent in %s", platform => {
    h.platform = platform; render(<NativePushPrompt />); expect(screen.queryByRole("status")).not.toBeInTheDocument(); expect(screen.queryByRole("button")).not.toBeInTheDocument(); expect(h.importPlugin).not.toHaveBeenCalled();
  });
  it("keeps registration absent during auth pending, sign-out and A to B to A", () => {
    const view = render(<NativePushPrompt />); expect(screen.getByRole("status")).toBeInTheDocument();
    h.auth.loading = true; view.rerender(<NativePushPrompt />); expect(screen.queryByRole("status")).not.toBeInTheDocument();
    h.auth = { user: null, loading: false }; view.rerender(<NativePushPrompt />); expect(screen.queryByRole("status")).not.toBeInTheDocument();
    for (const owner of ["owner-b", "owner-a"]) { h.auth.user = { id: owner }; view.rerender(<NativePushPrompt />); expect(screen.getByRole("status")).toHaveTextContent("unavailable"); expect(screen.queryByRole("button")).not.toBeInTheDocument(); }
    expect(h.importPlugin).not.toHaveBeenCalled(); expect(h.permission).not.toHaveBeenCalled(); expect(h.register).not.toHaveBeenCalled(); expect(h.persist).not.toHaveBeenCalled();
  });
});
