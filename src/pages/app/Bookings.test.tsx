import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Bookings from "./Bookings";

const harness = vi.hoisted(() => ({
  auth: { user: { id: "customer-a" } as { id: string } | null, loading: false },
  bookings: vi.fn(), profiles: vi.fn(), reviews: vi.fn(), payments: vi.fn(),
  reads: [] as { table: string; columns?: string; owner?: string; order: string[] }[],
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => harness.auth }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const read: (typeof harness.reads)[number] = { table, order: [] };
    harness.reads.push(read);
    const query = {
      select: (columns: string) => { read.columns = columns; return query; },
      eq: (column: string, value: string) => { if (column === "user_id") read.owner = value; return query; },
      order: (column: string) => { read.order.push(column); return query; },
      range: (from: number, to: number) => (table === "bookings" ? harness.bookings : table === "post_job_reviews" ? harness.reviews : harness.payments)(read.owner, from, to),
      in: (_column: string, ids: string[]) => table === "booking_xooter_profiles" ? harness.profiles(ids) : query,
    };
    return query;
  },
} }));

// Synthetic test records only; the production screen has no seeded people or bookings.
const visit = (overrides: Record<string, unknown> = {}) => ({
  id: "visit-1", xooter_id: null, service: "cleaning", service_type: "regular", status: "awaiting_assignment",
  scheduled_at: "2026-09-30T06:00:00Z", duration_hours: 4, price: 371, payment_status: "pending",
  ...overrides,
});
const ok = (data: unknown[]) => ({ data, error: null });
const failure = { data: null, error: { message: "synthetic read failure" } };
function deferred() {
  let resolve!: (result: ReturnType<typeof ok> | typeof failure) => void;
  return { promise: new Promise<ReturnType<typeof ok> | typeof failure>(done => { resolve = done; }), resolve: (value: Parameters<typeof resolve>[0]) => resolve(value) };
}
const app = () => <MemoryRouter><Bookings /></MemoryRouter>;
async function selectTab(name: string) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0, ctrlKey: false });
  await waitFor(() => expect(screen.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true"));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  // Sunday in UTC, but already Monday 28 September in Johannesburg.
  vi.setSystemTime(new Date("2026-09-27T23:00:00Z"));
  harness.auth = { user: { id: "customer-a" }, loading: false };
  harness.reads = [];
  harness.bookings.mockReset().mockResolvedValue(ok([]));
  harness.profiles.mockReset().mockResolvedValue(ok([]));
  harness.reviews.mockReset().mockResolvedValue(ok([]));
  harness.payments.mockReset().mockResolvedValue(ok([]));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("handoff Visits with real account reads", () => {
  it("distinguishes loading, valid absence, read failure and retry", async () => {
    const pending = deferred();
    harness.bookings.mockReturnValueOnce(pending.promise);
    render(app());
    expect(screen.getByRole("status")).toHaveTextContent("Loading visits");
    await act(async () => pending.resolve(failure));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
    expect(screen.queryByText("No upcoming visits.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("status")).toHaveTextContent("Loading visits");
    await screen.findByText("No upcoming visits.");
    expect(screen.getByRole("link", { name: "Book a visit" })).toHaveAttribute("href", "/app/book");
    await selectTab("Past");
    expect(screen.getByText("No past visits yet.")).toBeInTheDocument();
  });

  it("groups in Johannesburg weeks, preserves unknown states and orders upcoming dates", async () => {
    harness.bookings.mockResolvedValue(ok([
      visit({ id: "next", service_type: "office", scheduled_at: "2026-10-05T06:00:00Z" }),
      visit({ id: "later-today", scheduled_at: "2026-09-28T13:00:00Z", status: "new_manual_review" }),
      visit({ id: "early-today", service_type: "express", scheduled_at: "2026-09-27T22:30:00Z", status: "confirmed" }),
      visit({ id: "earlier", service_type: "moving", scheduled_at: "2026-09-24T06:00:00Z" }),
      visit({ id: "unknown-date", service_type: "legacy_service", scheduled_at: "not-a-date" }),
    ]));
    render(app());
    await screen.findByText("This week (2)");
    expect(screen.getByText("Next week (1)")).toBeInTheDocument();
    expect(screen.getByText("Earlier (1)")).toBeInTheDocument();
    expect(screen.getByText("Date to confirm (1)")).toBeInTheDocument();
    expect(screen.getByText("new manual review")).toBeInTheDocument();
    expect(screen.getByText("Xooter confirmed")).toBeInTheDocument();
    const links = within(screen.getByRole("tabpanel")).getAllByRole("link");
    expect(links.map(link => link.getAttribute("href"))).toEqual([
      "/app/bookings/earlier", "/app/bookings/early-today", "/app/bookings/later-today", "/app/bookings/next", "/app/bookings/unknown-date",
    ]);
    expect(links[1]).toHaveAccessibleName(/00:30/);
  });

  it("loads later booking pages and never displays a partial list when a page fails", async () => {
    const firstPage = Array.from({ length: 500 }, (_, i) => visit({ id: `synthetic-${i}` }));
    harness.bookings.mockImplementation((_owner: string, from: number) => Promise.resolve(from === 0 ? ok(firstPage) : failure));
    render(app());
    await screen.findByRole("alert");
    expect(screen.queryByRole("link", { name: /Open Regular/ })).not.toBeInTheDocument();
    harness.bookings.mockImplementation((_owner: string, from: number) => Promise.resolve(ok(from === 0 ? firstPage : [visit({ id: "last", service_type: "airbnb" })])));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("This week (501)");
    expect(screen.getByRole("link", { name: /Open Airbnb/ })).toHaveAttribute("href", "/app/bookings/last");
    const bookingReads = harness.reads.filter(read => read.table === "bookings");
    expect(bookingReads.every(read => read.owner === "customer-a" && read.order.join() === "scheduled_at,id")).toBe(true);
    expect(bookingReads.every(read => !read.columns?.includes("address") && read.columns !== "*")).toBe(true);
    expect(harness.profiles.mock.calls.every(([ids]) => ids.length <= 50)).toBe(true);
  });

  it("shows only the assigned Xooter, verified payment and the customer's real rating", async () => {
    harness.bookings.mockResolvedValue(ok([
      visit({ id: "paid", xooter_id: "helper-a", service_type: "airbnb", status: "completed", price: 393.25, payment_status: "paid" }),
      visit({ id: "unpaid", xooter_id: "helper-a", status: "cancelled", price: 371, payment_status: "pending" }),
    ]));
    harness.profiles.mockResolvedValue(ok([
      { booking_id: "paid", id: "helper-a", name: "Test Helper", photo_url: null, verified: true },
      { booking_id: "unpaid", id: "different-helper", name: "Wrong Helper", photo_url: null, verified: true },
    ]));
    harness.reviews.mockResolvedValue(ok([{ booking_id: "paid", rating: 4 }]));
    harness.payments.mockResolvedValue(ok([{ id: "payment-1", booking_id: "paid", amount: 432.25, currency: "ZAR", status: "paid", payment_kind: "booking" }]));
    render(app());
    await screen.findByText("No upcoming visits.");
    await selectTab("Past");
    expect(screen.getByText(/You paid R432[,.]25/)).toBeInTheDocument();
    expect(screen.queryByText(/paid R393|paid R371/)).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Your rating: 4 out of 5" })).toBeInTheDocument();
    expect(screen.getByText("Test Helper")).toBeInTheDocument();
    expect(screen.getByText("1 visit together")).toBeInTheDocument();
    expect(screen.queryByText("Wrong Helper")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book Airbnb cleaning again" })).toHaveAttribute("href", "/app/book?service=airbnb");
    expect(screen.getByRole("link", { name: "Open visit to message Test Helper" })).toHaveAttribute("href", "/app/bookings/paid");
    expect(harness.reads.find(read => read.table === "post_job_reviews")?.owner).toBe("customer-a");
    expect(harness.reads.find(read => read.table === "payment_records")?.owner).toBe("customer-a");
  });

  it("does not turn missing profiles or ratings into fabricated people or five stars", async () => {
    harness.bookings.mockResolvedValue(ok([visit({ status: "rated", service_type: "laundry", payment_status: "paid" })]));
    render(app());
    await screen.findByText("No upcoming visits.");
    await selectTab("Past");
    expect(screen.getByText("Xooter details unavailable for this visit")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /rating/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Rebook/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/paid R/)).not.toBeInTheDocument();
  });

  it("normalises stored legacy service types and falls back only when the service type is absent", async () => {
    harness.bookings.mockResolvedValue(ok([
      visit({ id: "old-residential", service_type: "residential" }),
      visit({ id: "old-airbnb", service_type: null, service: "airbnb" }),
    ]));
    render(app());
    expect(await screen.findByRole("link", { name: /Open Regular cleaning/ })).toHaveAttribute("href", "/app/bookings/old-residential");
    expect(screen.getByRole("link", { name: /Open Airbnb cleaning/ })).toHaveAttribute("href", "/app/bookings/old-airbnb");
    expect(screen.queryByText(/^cleaning$/)).not.toBeInTheDocument();
  });

  it("totals the customer's confirmed booking payments across pages, excluding tips and unpaid attempts", async () => {
    harness.bookings.mockResolvedValue(ok([visit({ id: "paid", status: "completed", price: 999, payment_status: "paid" })]));
    const payment = { id: "payment-1", booking_id: "paid", amount: 21.25, currency: "ZAR", status: "paid", payment_kind: "booking" };
    const first = [payment, ...Array.from({ length: 499 }, (_, i) => ({ ...payment, id: `unrelated-payment-${i}`, booking_id: "another-visit" }))];
    harness.payments.mockImplementation((_owner: string, from: number) => Promise.resolve(ok(from === 0 ? first : [
      payment, // Concurrent insertion can shift the page boundary; a row still counts once.
      { ...payment, id: "payment-2", amount: 12.5, status: "admin_confirmed" },
      { ...payment, id: "unpaid-attempt", amount: 200, status: "pending" },
      { ...payment, id: "tip", amount: 100, payment_kind: "tip" },
    ])));
    render(app());
    await screen.findByText("No upcoming visits.");
    await selectTab("Past");
    expect(screen.getByText(/You paid R33[,.]75/)).toBeInTheDocument();
    expect(screen.queryByText(/paid R999/)).not.toBeInTheDocument();
    expect(harness.payments).toHaveBeenCalledWith("customer-a", 500, 999);
  });

  it("does not show a partial payment amount when a later payment page fails", async () => {
    harness.bookings.mockResolvedValue(ok([visit({ status: "completed", payment_status: "paid" })]));
    const first = Array.from({ length: 500 }, (_, i) => ({ id: `payment-${i}`, booking_id: "visit-1", amount: 1, currency: "ZAR", status: "paid", payment_kind: "booking" }));
    harness.payments.mockImplementation((_owner: string, from: number) => Promise.resolve(from === 0 ? ok(first) : failure));
    render(app());
    await screen.findByRole("alert");
    await selectTab("Past");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/paid R/)).not.toBeInTheDocument();
  });

  it.each([{ amount: 5, currency: "USD" }, { amount: Number.NaN, currency: "ZAR" }, { amount: -5, currency: "ZAR" }])("does not label a mixed-currency or malformed record as a Rand payment: %j", async (invalid) => {
    harness.bookings.mockResolvedValue(ok([visit({ status: "completed", payment_status: "paid" })]));
    harness.payments.mockResolvedValue(ok([
      { id: "valid", booking_id: "visit-1", amount: 20, currency: "ZAR", status: "paid", payment_kind: "booking" },
      { id: "invalid", booking_id: "visit-1", ...invalid, status: "paid", payment_kind: "booking" },
    ]));
    render(app());
    await screen.findByText("No upcoming visits.");
    await selectTab("Past");
    expect(screen.queryByText(/paid R/)).not.toBeInTheDocument();
  });

  it("hides former-account visits immediately on switch and ignores their delayed responses", async () => {
    const old = deferred();
    harness.bookings.mockImplementation((owner: string) => owner === "customer-a" ? old.promise : Promise.resolve(ok([])));
    const { rerender } = render(app());
    harness.auth.user = { id: "customer-b" };
    rerender(app());
    await screen.findByText("No upcoming visits.");
    await act(async () => old.resolve(ok([visit({ id: "old-account" })])));
    expect(screen.queryByRole("link", { name: /Open Regular/ })).not.toBeInTheDocument();
    harness.auth.user = null;
    rerender(app());
    expect(screen.getByRole("status")).toHaveTextContent("Sign in to see your visits.");
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("hides a settled former-account list during authentication changes", async () => {
    harness.bookings.mockResolvedValue(ok([visit()]));
    const { rerender } = render(app());
    await screen.findByRole("link", { name: /Open Regular/ });
    harness.auth.loading = true;
    rerender(app());
    expect(screen.getByRole("status")).toHaveTextContent("Loading your account");
    expect(screen.queryByRole("link", { name: /Open Regular/ })).not.toBeInTheDocument();
  });

  it("uses keyboard-operable tabs with the active panel correctly labelled", async () => {
    render(app());
    await screen.findByText("No upcoming visits.");
    const upcoming = screen.getByRole("tab", { name: "Upcoming" });
    upcoming.focus();
    fireEvent.keyDown(upcoming, { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByRole("tab", { name: "Past" })).toHaveFocus());
    expect(screen.getByRole("tabpanel", { name: "Past" })).toBeInTheDocument();
    expect(upcoming).toHaveAttribute("tabindex", "-1");
  });
});
