import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RequireRole } from "./RequireRole";
const state = vi.hoisted(() => ({ user: { id: "admin-a" } as { id: string } | null, session: { access_token: "synthetic-session-a" }, query: vi.fn(), assurance: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: state.user, session: state.session, loading: false }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { mfa: { getAuthenticatorAssuranceLevel: state.assurance } }, from: () => { const builder = { select: () => builder, eq: () => builder, maybeSingle: state.query }; return builder; } } }));
function view() { return <MemoryRouter initialEntries={["/admin/ops"]}><Routes><Route path="/admin/ops" element={<RequireRole role="admin"><p>Private admin area</p></RequireRole>} /><Route path="/app" element={<p>Customer home</p>} /><Route path="/auth" element={<p>Sign in required</p>} /></Routes></MemoryRouter>; }
beforeEach(() => { vi.resetAllMocks(); state.user = { id: "admin-a" }; state.session = { access_token: "synthetic-session-a" }; state.assurance.mockResolvedValue({ data: { currentLevel: "aal2" }, error: null }); });
afterEach(cleanup);
describe("role isolation", () => {
  it("does not mount any admin page with a first-factor-only session", async () => {
    state.query.mockResolvedValue({ data: { role: "admin" }, error: null });
    state.assurance.mockResolvedValue({ data: { currentLevel: "aal1" }, error: null });
    render(view()); await screen.findByText("Sign in required");
    expect(screen.queryByText("Private admin area")).not.toBeInTheDocument();
  });
  it("hides the previous admin immediately while the new account is checked", async () => {
    let resolve!: (result: { data: null; error: null }) => void;
    state.query.mockResolvedValueOnce({ data: { role: "admin" }, error: null }).mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const rendered = render(view()); await screen.findByText("Private admin area");
    state.user = { id: "customer-b" }; rendered.rerender(view());
    expect(screen.queryByText("Private admin area")).not.toBeInTheDocument();
    await act(async () => resolve({ data: null, error: null }));
    await screen.findByText("Customer home");
  });
  it("denies a failed role query", async () => {
    state.query.mockRejectedValue(new Error("offline")); render(view());
    await screen.findByText("Customer home"); expect(screen.queryByText("Private admin area")).not.toBeInTheDocument();
  });
  it("rechecks assurance immediately when the same account's session changes", async () => {
    let resolve!: (result: { data: { role: string }; error: null }) => void;
    state.query.mockResolvedValueOnce({ data: { role: "admin" }, error: null }).mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const rendered = render(view()); await screen.findByText("Private admin area");
    state.assurance.mockResolvedValue({ data: { currentLevel: "aal1" }, error: null });
    state.session = { access_token: "synthetic-session-b" }; rendered.rerender(view());
    expect(screen.queryByText("Private admin area")).not.toBeInTheDocument();
    await act(async () => resolve({ data: { role: "admin" }, error: null }));
    await screen.findByText("Sign in required");
  });
  it("never queries roles for a signed-out visitor", async () => {
    state.user = null; render(view()); await screen.findByText("Sign in required");
    expect(state.query).not.toHaveBeenCalled();
  });
});
