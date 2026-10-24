import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuthCallback from "./AuthCallback";

const auth = vi.hoisted(() => ({ getSession: vi.fn(), exchangeCodeForSession: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
vi.mock("@/components/SEO", () => ({ SEO: () => null }));
vi.mock("@/lib/native-auth", () => ({ enableNativeQuickUnlock: vi.fn() }));
vi.mock("@/lib/optional-capacitor", () => ({ isOptionalNativePlatform: () => false, importOptionalNativePlugin: vi.fn() }));
const signedIn = { data: { session: { user: { id: "synthetic-user" } } }, error: null };
function mount(query = "code=synthetic-code&next=%2Fapp") {
  window.history.replaceState(null, "", `/auth/callback?${query}`);
  render(<MemoryRouter initialEntries={[`/auth/callback?${query}`]}><Routes>
    <Route path="/auth/callback" element={<AuthCallback />} />
    <Route path="/app" element={<h1>Account ready</h1>} />
  </Routes></MemoryRouter>);
}
beforeEach(() => { vi.clearAllMocks(); auth.getSession.mockResolvedValue(signedIn); auth.exchangeCodeForSession.mockResolvedValue({ error: null }); });
afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });
describe("PKCE callback ownership", () => {
  it("does not consume a code already exchanged by the Supabase client", async () => {
    auth.getSession.mockImplementation(async () => { window.history.replaceState(null, "", "/auth/callback?next=%2Fapp"); return signedIn; });
    mount();
    expect(await screen.findByRole("heading", { name: "Account ready" })).toBeInTheDocument();
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it("exchanges a remaining code before accepting a session", async () => {
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null }).mockResolvedValue(signedIn);
    mount();
    expect(await screen.findByRole("heading", { name: "Account ready" })).toBeInTheDocument();
    expect(auth.exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith("synthetic-code");
  });
  it("refuses a rejected callback even when an old account session exists", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: new Error("rejected synthetic code") });
    mount();
    expect(await screen.findByRole("heading", { name: "Sign-in needs attention" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Account ready" })).not.toBeInTheDocument();
  });
  it("does not accept provider errors as a successful existing-session login", async () => {
    mount("error=access_denied&next=%2Fapp");
    expect(await screen.findByRole("heading", { name: "Sign-in needs attention" })).toBeInTheDocument();
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
