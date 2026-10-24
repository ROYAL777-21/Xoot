import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Auth from "./Auth";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
const auth = vi.hoisted(() => ({ signInWithOtp: vi.fn(), verifyOtp: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ isSupabaseConfigured: true, supabaseConfigErrorMessage: "", supabase: { auth } }));
vi.mock("@/components/SEO", () => ({ SEO: () => null }));
// Decorative flower geometry is checked in the real browser, separately from auth behavior.
vi.mock("@/components/xoot/HeroArtwork", () => ({ HandoffFlowerField: () => null }));
vi.mock("@/lib/native-auth", () => ({ isNativeAuthPlatform: () => false, getNativeQuickUnlockEnabled: async () => false, enableNativeQuickUnlock: vi.fn(), clearNativeQuickUnlock: vi.fn() }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); auth.signInWithOtp.mockResolvedValue({ error: null }); auth.verifyOtp.mockResolvedValue({ error: null }); });
afterEach(cleanup);
describe("account entry copy", () => {
  it("opens a fresh visit at the existing sign-up screen", async () => {
    await act(async () => { render(<MemoryRouter initialEntries={["/auth"]}><Auth /></MemoryRouter>); });
    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
    expect(screen.getByText("Let's get your home sorted.")).toBeInTheDocument();
    expect(screen.queryByText("Welcome back")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Been here before? Pick up where you left off" }));
    expect(screen.getByRole("heading", { name: "Continue with email" })).toBeInTheDocument();
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "First time here? Start fresh" }));
    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
  });
  it("lets returning customers open a direct sign-in link", async () => {
    await act(async () => { render(<MemoryRouter initialEntries={["/auth?mode=signin"]}><Auth /></MemoryRouter>); });
    expect(screen.getByRole("heading", { name: "Continue with email" })).toBeInTheDocument();
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });
  it.each(["123456", "12345678"])("passes the complete email code %s to Supabase", async (code) => {
    await act(async () => { render(<MemoryRouter initialEntries={["/auth?mode=signin"]}><Auth /></MemoryRouter>); });
    fireEvent.change(screen.getByLabelText("Your email"), { target: { value: "synthetic@example.test" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send one-time code" })); });
    const input = await screen.findByLabelText("Email code");
    expect(input).toHaveAttribute("placeholder", "000000");
    fireEvent.change(input, { target: { value: code } });
    expect(input).toHaveValue(code);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Sign me in" })); });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: "synthetic@example.test", token: code, type: "email" });
  });
});
