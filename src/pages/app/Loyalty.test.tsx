import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Loyalty from "./Loyalty";
import Plans from "./Plans";

const harness = vi.hoisted(() => ({
  auth: { user: { id: "a" } as { id: string } | null, loading: false },
  loyalty: vi.fn(), ledger: vi.fn(), redeem: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => harness.auth }));
vi.mock("@/lib/ops-workflow", () => ({ invokeOpsWorkflow: harness.redeem }));
vi.mock("@/hooks/useHouseholdOperatingLayer", () => ({ useHouseholdOperatingLayer: () => ({ homeMemory: null, readyModes: [] }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    let account = "";
    const single = () => table === "loyalty_points" ? harness.loyalty(account) : Promise.resolve({
      data: table === "subscription_plans" ? { id: "synthetic-plan", name: "Care+", cadence: "monthly", monthly_price: 149 } : null,
      error: null,
    });
    const query = {
      select: () => query, order: () => query, limit: () => query, in: () => query,
      eq: (_column: string, value: string) => { account = value; return query; },
      single, maybeSingle: single,
      range: (from: number) => harness.ledger(account, from),
    };
    return query;
  },
} }));

const credit = { id: "credit", amount: 10.25, direction: "credit", status: "available", reason: "refund", created_at: "2026-09-01T00:00:00Z" };
const loyalty = { points: 789, free_credits: 3, total_bookings: 31 };
function deferred() {
  let resolve!: (value: { data: typeof loyalty | null; error: { message: string } | null }) => void;
  return { promise: new Promise<{ data: typeof loyalty | null; error: { message: string } | null }>(done => { resolve = done; }), resolve: (value: Parameters<typeof resolve>[0]) => resolve(value) };
}
beforeEach(() => {
  harness.auth = { user: { id: "a" }, loading: false };
  harness.loyalty.mockReset().mockResolvedValue({ data: loyalty, error: null });
  harness.ledger.mockReset().mockResolvedValue({ data: [credit], error: null });
  harness.redeem.mockReset();
});
afterEach(cleanup);

describe("wallet consumers", () => {
  it("does not consume a free-clean credit through the unfinished redemption endpoint", async () => {
    render(<Loyalty />);
    await screen.findByText("789");
    const redeem = screen.getByRole("button", { name: "Redeem a free clean" });
    expect(redeem).toBeDisabled();
    expect(screen.getByText("Free-clean redemption is not available yet.")).toBeInTheDocument();
    fireEvent.click(redeem);
    expect(harness.redeem).not.toHaveBeenCalled();
  });
  it("does not label a failed second page as an available or pending zero balance", async () => {
    harness.ledger.mockImplementation((_account: string, from: number) => Promise.resolve(from === 0
      ? { data: Array.from({ length: 500 }, (_, i) => ({ ...credit, id: `credit-${i}` })), error: null }
      : { data: null, error: { message: "synthetic page failure" } }));
    render(<Loyalty />);
    await screen.findByText("XootCred could not be refreshed. Try again shortly.");
    for (const label of ["Available XootCred", "Pending XootCred"])
      expect(screen.getByText(label).parentElement).toHaveTextContent("Unavailable");
    harness.ledger.mockResolvedValue({ data: [credit], error: null });
    fireEvent.click(screen.getByRole("button", { name: "Retry XootCred" }));
    await waitFor(() => expect(screen.getByText("Available XootCred").parentElement).toHaveTextContent(/R10[,.]25/));
  });

  it("shows membership wallet failure as unavailable", async () => {
    harness.ledger.mockResolvedValue({ data: null, error: { message: "synthetic failure" } });
    render(<Plans />);
    expect(await screen.findByText(/Current XootCred balance: Unavailable/)).toBeInTheDocument();
    expect(screen.queryByText(/Current XootCred balance: R0/)).not.toBeInTheDocument();
  });

  it("hides prior-account points and redemption during a switch, error and logout", async () => {
    const next = deferred();
    harness.loyalty.mockImplementation((account: string) => account === "a"
      ? Promise.resolve({ data: loyalty, error: null }) : next.promise);
    const { rerender } = render(<Loyalty />);
    await screen.findByText("789");
    harness.auth.user = { id: "b" };
    rerender(<Loyalty />);
    expect(screen.queryByText("789")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Redeem a free clean" })).not.toBeInTheDocument();
    await act(async () => next.resolve({ data: null, error: { message: "synthetic read failure" } }));
    expect(await screen.findByText("Your rewards could not be refreshed. Try again shortly.")).toBeInTheDocument();
    expect(screen.queryByText("789")).not.toBeInTheDocument();
    harness.auth.user = null;
    rerender(<Loyalty />);
    expect(screen.getByText("Sign in to see your rewards")).toBeInTheDocument();
  });

  it("does not restore a former account when its delayed response arrives", async () => {
    const old = deferred();
    harness.loyalty.mockImplementation((account: string) => account === "a" ? old.promise
      : Promise.resolve({ data: { points: 42, free_credits: 0, total_bookings: 1 }, error: null }));
    const { rerender } = render(<Loyalty />);
    harness.auth.user = { id: "b" };
    rerender(<Loyalty />);
    await screen.findByText("42");
    await act(async () => old.resolve({ data: loyalty, error: null }));
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.queryByText("789")).not.toBeInTheDocument();
  });
});
