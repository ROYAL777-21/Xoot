import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JobChecklist } from "./JobChecklist";

const mocks = vi.hoisted(() => ({ user: { id: "owner" } as { id: string } | null, lookup: vi.fn(), session: vi.fn(), invoke: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: mocks.lookup }) }) }) }),
  auth: { getSession: mocks.session }, functions: { invoke: mocks.invoke },
} }));
const task = { id: "task", task_key: "start_work", label: "Start the visit", position: 1, completed_at: null };
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const props = { jobId: "job", bookingId: "booking" };
beforeEach(() => {
  vi.resetAllMocks(); mocks.user = { id: "owner" };
  mocks.lookup.mockResolvedValue({ data: [task], error: null });
  mocks.session.mockResolvedValue({ data: { session: { user: { id: "owner" }, access_token: "owner-token" } }, error: null });
  mocks.invoke.mockResolvedValue({ data: { ok: true, task: { ...task, completed_at: "2026-10-07" } }, error: null });
});
afterEach(cleanup);
describe("Visit checklist availability and account lifetime", () => {
  it("shows lookup failure and retries to the real tasks", async () => {
    mocks.lookup.mockResolvedValueOnce({ data: null, error: { message: "private schema detail" } });
    render(<JobChecklist {...props} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("unavailable");
    expect(screen.queryByText("private schema detail")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("button", { name: "Complete Start the visit" })).toBeEnabled();
  });
  it("distinguishes a legitimately empty checklist from a rejected lookup", async () => {
    mocks.lookup.mockResolvedValueOnce({ data: [], error: null }).mockRejectedValueOnce(new Error("network"));
    render(<JobChecklist {...props} readOnly />);
    expect(await screen.findByText(/No checklist tasks/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh checklist" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("unavailable");
  });
  it("discards a late lookup after the account changes", async () => {
    const old = deferred<{ data: typeof task[]; error: null }>();
    mocks.lookup.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ data: [], error: null });
    const view = render(<JobChecklist {...props} />);
    mocks.user = { id: "other" }; view.rerender(<JobChecklist {...props} />);
    expect(await screen.findByText(/No checklist tasks/)).toBeInTheDocument();
    await act(async () => { old.resolve({ data: [task], error: null }); });
    expect(screen.queryByRole("button", { name: "Complete Start the visit" })).not.toBeInTheDocument();
  });
  it("stops a pending toggle before transport after sign-out", async () => {
    const pending = deferred<{ data: { session: { user: { id: string }; access_token: string } }; error: null }>();
    mocks.session.mockReturnValueOnce(pending.promise);
    const view = render(<JobChecklist {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Complete Start the visit" }));
    mocks.user = null; view.rerender(<JobChecklist {...props} />);
    await act(async () => { pending.resolve({ data: { session: { user: { id: "owner" }, access_token: "old" } }, error: null }); });
    expect(screen.getByText(/Sign in to view/)).toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("requires the matching session and prevents duplicate mutations", async () => {
    mocks.session.mockResolvedValueOnce({ data: { session: { user: { id: "other" }, access_token: "other-token" } }, error: null });
    render(<JobChecklist {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Complete Start the visit" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign in again");
    expect(mocks.invoke).not.toHaveBeenCalled();
    const button = screen.getByRole("button", { name: "Complete Start the visit" });
    fireEvent.click(button); fireEvent.click(button);
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
    expect(mocks.invoke).toHaveBeenCalledWith("xooter-job-checklist", { body: { jobId: "job", taskKey: "start_work", complete: true }, headers: { Authorization: "Bearer owner-token" } });
    expect(await screen.findByRole("button", { name: "Uncheck Start the visit" })).toBeInTheDocument();
  });
  it("discards a transported toggle result after the account changes", async () => {
    const pending = deferred<{ data: { ok: boolean; task: typeof task & { completed_at: string } }; error: null }>();
    mocks.invoke.mockReturnValueOnce(pending.promise);
    const view = render(<JobChecklist {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Complete Start the visit" }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledTimes(1));
    mocks.user = { id: "other" }; view.rerender(<JobChecklist {...props} />);
    await screen.findByRole("button", { name: "Complete Start the visit" });
    await act(async () => { pending.resolve({ data: { ok: true, task: { ...task, completed_at: "old-account-result" } }, error: null }); });
    expect(screen.queryByRole("button", { name: "Uncheck Start the visit" })).not.toBeInTheDocument();
  });
  it("keeps read-only customer tasks visible without writes", async () => {
    render(<JobChecklist {...props} readOnly />);
    const button = await screen.findByRole("button", { name: "Complete Start the visit" });
    expect(button).toBeDisabled(); fireEvent.click(button);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("shows a failed mutation without marking the task completed", async () => {
    mocks.invoke.mockResolvedValueOnce({ data: null, error: new Error("inactive") });
    render(<JobChecklist {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Complete Start the visit" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be updated");
    expect(screen.getByRole("button", { name: "Complete Start the visit" })).toBeEnabled();
  });
});
