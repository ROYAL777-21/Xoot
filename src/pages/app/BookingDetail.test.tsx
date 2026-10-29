import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BookingDetail from "./BookingDetail";

const h = vi.hoisted(() => ({
  user: { id: "customer-a" },
  booking: { id: "visit-a", user_id: "customer-a", service_type: "residential", service: "residential",
    status: "draft", payment_status: "pending", price: 250, scheduled_at: "2026-11-02T07:00:00Z",
    duration_hours: 4, crew_size: 1, xooter_id: null as string | null, updated_at: "2026-10-28T10:00:00Z" },
  payment: { id: "payment-a", amount: 289, status: "pending", currency: "ZAR", payment_kind: "booking" },
  blockNewAccount: false,
  ops: vi.fn(), success: vi.fn(),
}));
vi.mock("@/lib/ops-workflow", () => ({ invokeOpsWorkflow: h.ops }));
vi.mock("sonner", () => ({ toast: { success: h.success, error: vi.fn(), warning: vi.fn() } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: h.user }) }));
vi.mock("@/components/xoot/BookingChat", () => ({ BookingChat: () => <div>Booking messages</div> }));
vi.mock("@/components/xoot/VoiceCallPanel", () => ({ VoiceCallPanel: () => null }));
vi.mock("@/components/xoot/LiveJobJourney", () => ({ LiveJobJourney: () => <div>Live journey</div> }));
vi.mock("@/components/xoot/WorkerRoadEstimate", () => ({ WorkerRoadEstimate: () => null }));
vi.mock("@/components/xoot/FareSplitPanel", () => ({ FareSplitPanel: () => null }));
vi.mock("@/components/PayFastCheckout", () => ({ PayFastCheckout: ({ label }: { label: string }) => <button>{label}</button> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const filters: Record<string, unknown> = {};
    const answer = () => {
      if (table === "bookings" && h.blockNewAccount && h.user.id !== "customer-a") return new Promise(() => {});
      let data: unknown = table === "bookings" ? { ...h.booking } :
        table === "payment_records" ? { ...h.payment } :
        ["messages", "booking_status_events", "booking_completion_photos"].includes(table) ? [] : null;
      if (table === "payment_records" && filters.status && filters.status !== h.payment.status) data = null;
      return Promise.resolve({ data, error: null });
    };
    const q = { select: () => q, is: () => q, eq: (key: string, value: unknown) => { filters[key] = value; return q; },
      order: () => q, limit: () => q, maybeSingle: answer,
      then: (resolve: (value: unknown) => unknown) => answer().then(resolve) };
    return q;
  },
  channel: () => { const q = { on: () => q, subscribe: () => q }; return q; }, removeChannel: vi.fn(),
} }));
beforeEach(() => {
  h.user = { id: "customer-a" }; h.blockNewAccount = false;
  h.booking.id = "visit-a"; h.booking.user_id = "customer-a"; h.booking.xooter_id = null;
  h.booking.status = "draft"; h.booking.payment_status = "pending";
  h.payment.status = "pending";
  h.ops.mockReset(); h.success.mockReset();
});
afterEach(cleanup);
const SwitchFixture = () => { const go = useNavigate(); return <button onClick={() => go("/app/bookings/visit-b")}>Next visit fixture</button>; };
const App = ({ returned = true }: { returned?: boolean }) => <MemoryRouter initialEntries={[
  `/app/bookings/visit-a${returned ? "?payment=return" : ""}`,
]}><Routes><Route path="/app/bookings/:id" element={<><BookingDetail /><SwitchFixture /></>} /></Routes></MemoryRouter>;

describe("handoff visit detail uses actual booking/payment data", () => {
  it.each([false, true])("clears unsent private notes after the next visit has loaded (account switch=%s)", async switchAccount => {
    h.booking.status = "completed"; h.payment.status = "paid";
    render(<App returned={false} />);
    await screen.findByRole("heading", { name: "Regular cleaning" });
    fireEvent.change(screen.getByPlaceholderText("Anything the team should know?"), { target: { value: "First visit private review" } });
    fireEvent.change(screen.getByPlaceholderText("Briefly describe what happened"), { target: { value: "First visit private incident" } });
    h.booking.id = "visit-b";
    if (switchAccount) { h.user = { id: "customer-b" }; h.booking.user_id = "customer-b"; }
    fireEvent.click(screen.getByRole("button", { name: "Next visit fixture" }));
    await screen.findByRole("heading", { name: "Regular cleaning" });
    expect(screen.getByPlaceholderText("Anything the team should know?")).toHaveValue("");
    expect(screen.getByPlaceholderText("Briefly describe what happened")).toHaveValue("");
  });
  it("ignores an old visit's asynchronous submission after opening another visit", async () => {
    h.booking.xooter_id = "isolated-fixture-xooter";
    let finish!: () => void;
    h.ops.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    render(<App returned={false} />);
    await screen.findByRole("heading", { name: "Regular cleaning" });
    fireEvent.change(screen.getByPlaceholderText("Briefly describe what happened"), { target: { value: "First visit only" } });
    fireEvent.click(screen.getByRole("button", { name: "Send to Trust & Safety" }));
    h.booking.id = "visit-b";
    fireEvent.click(screen.getByRole("button", { name: "Next visit fixture" }));
    await screen.findByRole("heading", { name: "Regular cleaning" });
    fireEvent.change(screen.getByPlaceholderText("Briefly describe what happened"), { target: { value: "Second visit only" } });
    await act(async () => finish());
    expect(screen.getByPlaceholderText("Briefly describe what happened")).toHaveValue("Second visit only");
    expect(h.success).not.toHaveBeenCalledWith("Incident sent to Trust & Safety");
  });
  it("shows the stored R289 payment total rather than presenting its R250 service base as the total", async () => {
    render(<App returned={false} />);
    await screen.findByRole("button", { name: "Pay R289" });
    expect(screen.queryByText("R250")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Regular cleaning" })).toBeInTheDocument();
    expect(screen.queryByText(/Live location is not available/)).not.toBeInTheDocument();
  });
  it("does not treat the PayFast return URL as a paid receipt", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Checking your payment" })).toBeInTheDocument();
    expect(screen.queryByText("Payment received")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh payment status" })).toBeInTheDocument();
  });
  it("updates from a real saved payment state without claiming a Xooter is confirmed", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Checking your payment" });
    h.payment.status = "paid"; h.booking.payment_status = "paid"; h.booking.status = "awaiting_assignment";
    fireEvent.click(screen.getByRole("button", { name: "Refresh payment status" }));
    expect(await screen.findByRole("heading", { name: "Finding your Xooter" })).toBeInTheDocument();
    expect(screen.getByText("Payment received")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pay R289" })).not.toBeInTheDocument();
    expect(screen.queryByText("R250")).not.toBeInTheDocument();
  });
  it("hides the prior account's visit immediately while another account's request is pending", async () => {
    const view = render(<App returned={false} />);
    await screen.findByRole("button", { name: "Pay R289" });
    h.blockNewAccount = true; h.user = { id: "customer-b" };
    view.rerender(<App returned={false} />);
    expect(screen.queryByRole("button", { name: "Pay R289" })).not.toBeInTheDocument();
  });
});
