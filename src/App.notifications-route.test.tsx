import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const auth = vi.hoisted(() => ({ user: { id: "synthetic-owner" } as { id: string } | null, loading: false }));
vi.mock("@/contexts/AuthContext", () => ({ AuthProvider: ({ children }: { children: ReactNode }) => children, useAuth: () => auth }));
vi.mock("@/contexts/ConciergeContext", () => ({ ConciergeProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/lib/analytics", () => ({ XootAnalyticsProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/xoot/AppLaunch", () => ({ AppLaunch: () => null }));
vi.mock("@/components/xoot/NativeInteractionLayer", () => ({ NativeInteractionLayer: () => null }));
vi.mock("@/components/xoot/XootSupportBot", () => ({ XootSupportBot: () => null }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/components/ui/toaster", () => ({ Toaster: () => null }));
vi.mock("./pages/app/NotificationsFeed", () => ({ default: () => <h1>Synthetic feed destination</h1> }));
vi.mock("./pages/Auth", () => ({ default: () => <h1>Synthetic sign-in destination</h1> }));
beforeEach(() => {
  auth.user = { id: "synthetic-owner" }; auth.loading = false; window.history.replaceState({}, "", "/app/notifications");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal("requestIdleCallback", () => 1); vi.stubGlobal("cancelIdleCallback", () => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("notifications route registration", () => {
  it("loads the authenticated route inside AppShell without duplicate Home navigation", async () => {
    render(<App />); expect(await screen.findByRole("heading", { name: "Synthetic feed destination" })).toBeInTheDocument();
    expect(document.querySelector(".xoot-app-shell")).toBeInTheDocument(); expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
  it("keeps the feed out of auth-pending and redirects signed-out visitors to sign-in", async () => {
    auth.loading = true; const view = render(<App />); expect(screen.queryByRole("heading", { name: "Synthetic feed destination" })).not.toBeInTheDocument();
    auth.user = null; auth.loading = false; view.rerender(<App />); expect(await screen.findByRole("heading", { name: "Synthetic sign-in destination" })).toBeInTheDocument(); expect(window.location.pathname).toBe("/auth");
  });
});
