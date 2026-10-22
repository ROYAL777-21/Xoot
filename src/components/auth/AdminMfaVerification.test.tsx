import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminMfaVerification } from "./AdminMfaVerification";

const state = vi.hoisted(() => ({
  user: { id: "founder-test" }, navigate: vi.fn(), getUser: vi.fn(),
  mfa: { getAuthenticatorAssuranceLevel: vi.fn(), listFactors: vi.fn(), enroll: vi.fn(), unenroll: vi.fn(), challenge: vi.fn(), verify: vi.fn() },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => state.navigate }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { mfa: state.mfa, getUser: state.getUser } } }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => true }));
const assurance = (level: string) => ({ data: { currentLevel: level }, error: null });
beforeEach(() => {
  vi.resetAllMocks(); state.user = { id: "founder-test" };
  state.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue(assurance("aal1"));
  state.mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: "verified", status: "verified" }], all: [] }, error: null });
  state.mfa.challenge.mockResolvedValue({ data: { id: "challenge-test" }, error: null });
  state.mfa.verify.mockResolvedValue({ error: null });
  state.getUser.mockResolvedValue({ data: { user: state.user }, error: null });
});
afterEach(cleanup);
async function submit() {
  await screen.findByLabelText("Authenticator code");
  fireEvent.change(screen.getByLabelText("Authenticator code"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "Verify and continue" }));
}
describe("admin authenticator verification", () => {
  it("requires actual aal2 before returning to admin", async () => {
    render(<AdminMfaVerification redirectTo="/admin/ops" />); await submit();
    await screen.findByRole("alert");
    expect(state.navigate).not.toHaveBeenCalled();
    expect(state.mfa.verify).toHaveBeenCalledWith({ factorId: "verified", challengeId: "challenge-test", code: "123456" });
  });
  it("continues only after the current owner has verified aal2", async () => {
    state.mfa.getAuthenticatorAssuranceLevel.mockResolvedValueOnce(assurance("aal1")).mockResolvedValueOnce(assurance("aal2"));
    render(<AdminMfaVerification redirectTo="/admin/ops" />); await submit();
    await waitFor(() => expect(state.navigate).toHaveBeenCalledWith("/admin/ops", { replace: true }));
    expect(screen.getByLabelText("Authenticator code")).toHaveValue("");
  });
  it("rejects a different account even if verification returned aal2", async () => {
    state.mfa.getAuthenticatorAssuranceLevel.mockResolvedValueOnce(assurance("aal1")).mockResolvedValueOnce(assurance("aal2"));
    state.getUser.mockResolvedValue({ data: { user: { id: "someone-else" } }, error: null });
    render(<AdminMfaVerification redirectTo="/admin/ops" />); await submit();
    await screen.findByRole("alert"); expect(state.navigate).not.toHaveBeenCalled();
  });
  it("does not enroll, replace or remove a verified authenticator on page load", async () => {
    render(<AdminMfaVerification redirectTo="/admin/ops" />);
    await screen.findByLabelText("Authenticator code");
    expect(state.mfa.enroll).not.toHaveBeenCalled(); expect(state.mfa.unenroll).not.toHaveBeenCalled();
  });
  it("restarts only unfinished TOTP setup after the owner requests it", async () => {
    state.mfa.listFactors.mockResolvedValue({ data: { totp: [], all: [
      { id: "unfinished", factor_type: "totp", status: "unverified" },
      { id: "phone", factor_type: "phone", status: "verified" },
    ] }, error: null });
    state.mfa.unenroll.mockResolvedValue({ error: null });
    state.mfa.enroll.mockResolvedValue({ data: { id: "new-factor", totp: { qr_code: "data:image/svg+xml,test-only" } }, error: null });
    render(<AdminMfaVerification redirectTo="/admin/ops" />);
    fireEvent.click(await screen.findByRole("button", { name: "Restart unfinished setup" }));
    await screen.findByAltText("Private authenticator setup QR code");
    expect(state.mfa.unenroll).toHaveBeenCalledTimes(1);
    expect(state.mfa.unenroll).toHaveBeenCalledWith({ factorId: "unfinished" });
  });
  it("does not submit a code after the owner leaves during a challenge", async () => {
    let resolve!: (value: unknown) => void;
    state.mfa.challenge.mockReturnValue(new Promise(done => { resolve = done; }));
    const view = render(<AdminMfaVerification redirectTo="/admin/ops" />); await submit();
    view.unmount();
    await act(async () => resolve({ data: { id: "late" }, error: null }));
    expect(state.mfa.verify).not.toHaveBeenCalled(); expect(state.navigate).not.toHaveBeenCalled();
  });
});
