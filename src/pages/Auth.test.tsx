import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Auth from "./Auth";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
const auth = vi.hoisted(() => ({ signUp: vi.fn(), signInWithPassword: vi.fn(), resend: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ isSupabaseConfigured: true, supabaseConfigErrorMessage: "", supabase: { auth } }));
vi.mock("@/components/SEO", () => ({ SEO: () => null }));
// Decorative flower geometry is checked in the real browser, separately from auth behavior.
vi.mock("@/components/xoot/HeroArtwork", () => ({ HandoffFlowerField: () => null }));
vi.mock("@/lib/native-auth", () => ({ isNativeAuthPlatform: () => false, getNativeQuickUnlockEnabled: async () => false, enableNativeQuickUnlock: vi.fn(), clearNativeQuickUnlock: vi.fn() }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => true }));
beforeEach(() => { vi.clearAllMocks(); auth.signUp.mockResolvedValue({ data: { session: null }, error: null }); auth.resend.mockResolvedValue({ error: null }); auth.signInWithOtp.mockResolvedValue({ error: null }); auth.verifyOtp.mockResolvedValue({ error: null }); });
afterEach(cleanup);
describe("account entry copy", () => {
  it("helps correct gmail.vom before sending any account email", async () => {
    await act(async () => { render(<MemoryRouter initialEntries={["/auth?mode=signin"]}><Auth /></MemoryRouter>); });
    fireEvent.change(screen.getByLabelText("Your email"), { target: { value: "customer@gmail.vom" } });
    expect(screen.getByRole("button", { name: "Send one-time code" })).toBeDisabled();
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Use customer@gmail.com" }));
    expect(screen.getByLabelText("Your email")).toHaveValue("customer@gmail.com");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send one-time code" })); });
    expect(auth.signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({ email: "customer@gmail.com" }));
  });
  async function submitSignup() {
    await act(async () => { render(<MemoryRouter initialEntries={["/auth"]}><Auth /></MemoryRouter>); });
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Synthetic Customer" } });
    fireEvent.change(screen.getByLabelText("Your email"), { target: { value: " New.User@example.test " } });
    fireEvent.change(screen.getByLabelText("Password", { exact: true, selector: "input" }), { target: { value: "Synthetic123!" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Get started" })); });
  }
  it("keeps a new account on confirmation and verifies the email code before entering Xoot", async () => {
    await submitSignup();
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: "new.user@example.test", password: "Synthetic123!" }));
    expect(screen.getByRole("heading", { name: "Confirm your email" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Password", { exact: true, selector: "input" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email code")).toHaveAttribute("placeholder", "000000");
    fireEvent.change(screen.getByLabelText("Email code"), { target: { value: "123456" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Create my account" })); });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: "new.user@example.test", token: "123456", type: "email" });
  });
  it("resends signup confirmation without switching to existing-user OTP or another signup", async () => {
    await submitSignup();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send a new code" })); });
    expect(auth.resend).toHaveBeenCalledWith({ type: "signup", email: "new.user@example.test", options: { emailRedirectTo: expect.stringContaining("/auth/callback?next=") } });
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
    expect(auth.signUp).toHaveBeenCalledTimes(1);
  });
  it("offers existing-account sign-in from confirmation without claiming an account exists", async () => {
    await submitSignup();
    fireEvent.click(screen.getByRole("button", { name: "Already have an account? Sign in" }));
    expect(screen.getByRole("heading", { name: "Continue with email" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your email")).toHaveValue("new.user@example.test");
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send one-time code" })); });
    expect(auth.signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({ email: "new.user@example.test", options: expect.objectContaining({ shouldCreateUser: false }) }));
  });
  it("recovers an unconfirmed password sign-in without disabling confirmation", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { code: "email_not_confirmed" } });
    await act(async () => { render(<MemoryRouter initialEntries={["/auth?mode=password"]}><Auth /></MemoryRouter>); });
    fireEvent.change(screen.getByLabelText("Your email"), { target: { value: "synthetic@example.test" } });
    fireEvent.change(screen.getByLabelText("Password", { exact: true, selector: "input" }), { target: { value: "Synthetic123!" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /^Continue$/ })); });
    expect(screen.getByRole("heading", { name: "Confirm your email" })).toBeInTheDocument();
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(auth.resend).not.toHaveBeenCalled();
  });
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
