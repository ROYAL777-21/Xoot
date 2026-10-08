import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Today from "./Today";
import type { TodayBooking } from "@/lib/today-handoff";

const harness = vi.hoisted(() => ({
  auth: { user: { id: "one" } as { id: string } | null, loading: false },
  profile: vi.fn(), bookings: vi.fn(), refresh: vi.fn(),
  wallet: { availableBalance: 0, loading: false, error: null as string | null },
  reads: [] as { table: string; account?: string; columns?: string; order: string[] }[],
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => harness.auth }));
vi.mock("@/hooks/useXootCred", () => ({ useXootCred: () => ({ ...harness.wallet, refresh: harness.refresh }) }));
vi.mock("@/components/notifications/NotificationBell", () => ({ NotificationBell: () => <button aria-label="Notifications" /> }));
vi.mock("@/components/xoot/ConciergeOmnibox", () => ({ ConciergeOmnibox: ({ onAction }: { onAction: () => void }) => <><input aria-label="Search Xoot" /><button onClick={onAction}>Open result</button></> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  const read: (typeof harness.reads)[number] = { table, order: [] };
  harness.reads.push(read);
  const chain = {
    select: (columns: string) => { read.columns = columns; return chain; },
    eq: (_field: string, value: string) => { read.account = value; return chain; },
    order: (column: string) => { read.order.push(column); return chain; },
    range: (from: number, to: number) => harness.bookings(read.account, from, to),
    maybeSingle: () => harness.profile(read.account),
  };
  if (table !== "profiles" && table !== "bookings") throw new Error(`Unexpected table ${table}`);
  return chain;
} } }));

const ok = (data: unknown) => ({ data, error: null });
const failure = { data: null, error: new Error("Synthetic test read failure") };
const visit = (overrides: Partial<TodayBooking> = {}): TodayBooking => ({ id: "first", service: "cleaning", service_type: "residential", status: "assigned", scheduled_at: "2026-09-30T06:00:00Z", ...overrides });
function deferred() {
  let resolve!: (value: ReturnType<typeof ok> | typeof failure) => void;
  return { promise: new Promise<ReturnType<typeof ok> | typeof failure>(done => { resolve = done; }), resolve: (value: Parameters<typeof resolve>[0]) => resolve(value) };
}
function Location() { const location = useLocation(); return <output hidden data-testid="location">{location.pathname + location.search}</output>; }
function Fixture({ url = "/app" }: { url?: string }) { return <MemoryRouter initialEntries={[url]}><Routes><Route path="/app" element={<Today />} /><Route path="/app/book" element={<p>Booking flow</p>} /></Routes><Location /></MemoryRouter>; }
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-30T07:00:00Z"));
  harness.auth = { user: { id: "one" }, loading: false };
  harness.reads = []; harness.refresh.mockReset();
  harness.wallet = { availableBalance: 0, loading: false, error: null };
  harness.profile.mockReset().mockImplementation((account: string) => Promise.resolve(ok({ full_name: account === "one" ? "Lebo Test" : "Amina Test", address: null })));
  harness.bookings.mockReset().mockResolvedValue(ok([]));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("Today handoff with account-bound inputs", () => {
  it("does not offer to book an already past calendar day", async () => {
    render(<Fixture />); await screen.findByText("Good morning, Lebo");
    const selected = screen.getByRole("tab", { selected: true });
    act(() => selected.focus()); fireEvent.keyDown(selected, { key: "ArrowLeft" });
    await waitFor(() => expect(screen.getByRole("tab", { selected: true })).toHaveAccessibleName("Tuesday, 29 September"));
    expect(screen.getAllByText("No visits recorded for this time.")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "Book a morning visit" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link").every(link => !link.getAttribute("href")?.includes("date=2026-09-29"))).toBe(true);
  });
  it("changes Johannesburg dates with keyboard tabs and opens a real visit", async () => {
    harness.bookings.mockResolvedValue(ok([visit(), visit({ id: "second", service_type: "office", scheduled_at: "2026-09-30T22:30:00Z" }), visit({ id: "cancelled", status: "cancelled" })]));
    render(<Fixture />);
    expect(await screen.findByRole("link", { name: /Open Regular cleaning visit/ })).toHaveAttribute("href", "/app/bookings/first");
    const selected = screen.getByRole("tab", { selected: true });
    expect(selected).toHaveAccessibleName("Wednesday, 30 September");
    act(() => selected.focus()); fireEvent.keyDown(selected, { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByRole("tab", { selected: true })).toHaveAccessibleName(/Thursday, 0?1 October/));
    expect(screen.getByRole("link", { name: /Open Office cleaning visit at 00:30/ })).toHaveAttribute("href", "/app/bookings/second");
    expect(screen.queryByRole("link", { name: /Open Regular cleaning visit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /done|complete/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Your afternoon is free" })).toHaveAttribute("href", "/app/book?date=2026-10-01");
  });
  it("distinguishes loading, read failure, retry and a genuinely empty schedule", async () => {
    const pending = deferred(); harness.profile.mockReturnValueOnce(pending.promise);
    render(<Fixture />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading your day");
    expect(screen.queryByText("Your afternoon is free")).not.toBeInTheDocument();
    await act(async () => pending.resolve(failure));
    expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("What can we take off your plate?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Regular cleaning" })).toHaveAttribute("href", "/app/book?service=regular");
    expect(screen.getByRole("link", { name: "Set up a weekly visit" })).toHaveAttribute("href", "/app/book?service=regular&frequency=weekly");
    expect(screen.queryByText(/R30 is already|free add-on|weeks looked after|Nomsa/)).not.toBeInTheDocument();
  });
  it("reads every ordered page and refuses a partial schedule", async () => {
    const page = Array.from({ length: 500 }, (_, i) => visit({ id: `synthetic-${i}`, scheduled_at: "2026-09-28T06:00:00Z" }));
    harness.bookings.mockImplementation((_owner: string, from: number) => Promise.resolve(from === 0 ? ok(page) : failure));
    render(<Fixture />);
    await screen.findByRole("alert");
    expect(screen.queryByText("What can we take off your plate?")).not.toBeInTheDocument();
    harness.bookings.mockImplementation((_owner: string, from: number) => Promise.resolve(ok(from === 0 ? page : [page[0], visit()])));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("link", { name: /Open Regular cleaning visit/ });
    expect(screen.getByText("Morning (1)")).toBeInTheDocument();
    const reads = harness.reads.filter(read => read.table === "bookings");
    expect(reads.every(read => read.account === "one" && read.order.join() === "scheduled_at,id")).toBe(true);
    expect(reads.every(read => read.columns === "id,service,service_type,scheduled_at,status")).toBe(true);
  });
  it("hides old accounts immediately and ignores their delayed reads, auth-pending and logout", async () => {
    const pending = deferred(); harness.bookings.mockReturnValueOnce(pending.promise);
    const view = render(<Fixture />);
    await waitFor(() => expect(harness.bookings).toHaveBeenCalled());
    harness.auth.user = { id: "two" }; view.rerender(<Fixture />);
    expect(screen.queryByText("Good morning, Lebo")).not.toBeInTheDocument();
    await screen.findByText("Good morning, Amina");
    await act(async () => pending.resolve(ok([visit()])));
    expect(screen.queryByRole("link", { name: /Open Regular cleaning visit/ })).not.toBeInTheDocument();
    harness.auth.loading = true; view.rerender(<Fixture />);
    expect(screen.queryByText("Good morning, Amina")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading your account");
    harness.auth = { user: null, loading: false }; view.rerender(<Fixture />);
    expect(screen.getByRole("status")).toHaveTextContent("Sign in");
  });
  it("only offers service rebooking after an actual completed visit", async () => {
    harness.bookings.mockResolvedValue(ok([visit({ id: "past", status: "completed", scheduled_at: "2026-09-20T06:00:00Z", service_type: "airbnb" })]));
    render(<Fixture />);
    expect(await screen.findByRole("link", { name: "Rebook" })).toHaveAttribute("href", "/app/book?service=airbnb");
    expect(screen.queryByText("What can we take off your plate?")).not.toBeInTheDocument();
    expect(screen.getByText("Airbnb cleaning · Choose your next date")).toBeInTheDocument();
    expect(screen.queryByText(/Nomsa|paid|free clean/i)).not.toBeInTheDocument();
  });
  it("dismisses real suggestions and hides credit when its reader fails", async () => {
    harness.wallet.availableBalance = 120.25;
    const view = render(<Fixture />);
    const credit = await screen.findByRole("link", { name: /R\s*120[,.]25 XootCred to use/ });
    expect(credit).toHaveAttribute("href", "/app/loyalty");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Add your home address" }));
    expect(screen.queryByRole("link", { name: "Add your home address" })).not.toBeInTheDocument();
    harness.wallet.error = "offline"; view.rerender(<Fixture />);
    expect(screen.queryByRole("link", { name: /XootCred to use/ })).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("status")).getByRole("button", { name: "Try again" }));
    expect(harness.refresh).toHaveBeenCalledOnce();
  });
  it("opens accessible search, closes on Escape and returns focus to the trigger", async () => {
    render(<Fixture />); await screen.findByText("Good morning, Lebo");
    const trigger = screen.getByRole("button", { name: "Search" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Search Xoot" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger); fireEvent.click(screen.getByRole("button", { name: "Open result" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("hands legacy booking inputs to the existing consuming booking flow", () => {
    render(<Fixture url="/app?service=airbnb&address=14%20Example%20Street&role=admin" />);
    expect(screen.getByText("Booking flow")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/app/book?service=airbnb&address=14+Example+Street");
    expect(harness.profile).not.toHaveBeenCalled();
  });
});
