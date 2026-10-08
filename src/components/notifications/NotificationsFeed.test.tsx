import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NotificationsFeed from "@/pages/app/NotificationsFeed";
import { NotificationBell } from "./NotificationBell";
import { AppShell } from "@/components/xoot/AppShell";
import { formatNotificationTime, formatNotificationTimestamp, markAllNotificationsRead } from "./notification-data";

type RecordRow = { id: string; user_id: string; title: string; body: string; read: boolean; kind: string; link: string | null; created_at: string };
type Query = { fields?: string; options?: { head?: boolean; count?: string }; filters: [string, unknown][]; orders: [string, { ascending: boolean }][]; limit?: number; cursor?: string; write?: unknown; single?: boolean };
const h = vi.hoisted(() => ({ auth: { user: { id: "owner-a" } as { id: string } | null, loading: false }, records: [] as RecordRow[], queries: [] as Query[], execute: vi.fn(), channels: [] as { name: string; events: { event: string; filter: string; callback: () => void }[] }[], remove: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => h.auth }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
vi.mock("@/lib/native-notifications", () => ({ getNativePushCapability: () => ({ available: false, platform: "web" }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => {
    const q: Query = { filters: [], orders: [] }; h.queries.push(q);
    const chain = {
      select: (fields: string, options?: Query["options"]) => { q.fields = fields; q.options = options ?? q.options; return chain; },
      eq: (field: string, value: unknown) => { q.filters.push([field, value]); return chain; },
      order: (field: string, options: { ascending: boolean }) => { q.orders.push([field, options]); return chain; },
      limit: (limit: number) => { q.limit = limit; return chain; },
      or: (cursor: string) => { q.cursor = cursor; return chain; },
      update: (write: unknown, options: Query["options"]) => { q.write = write; q.options = options; return chain; },
      maybeSingle: () => { q.single = true; return h.execute(q); },
      then: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) => Promise.resolve(h.execute(q)).then(resolve, reject),
    }; return chain;
  },
  channel: (name: string) => {
    const record = { name, events: [] as { event: string; filter: string; callback: () => void }[] }; h.channels.push(record);
    const channel = { on: (_type: string, options: { event: string; filter: string }, callback: () => void) => { record.events.push({ ...options, callback }); return channel; }, subscribe: () => channel }; return channel;
  },
  removeChannel: (...args: unknown[]) => h.remove(...args),
} }));
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const row = (n: number, changes: Partial<RecordRow> = {}): RecordRow => ({ id: id(n), user_id: "owner-a", title: `Synthetic notification ${n}`, body: `Synthetic body ${n}`, read: false, kind: "booking_confirmed", link: null, created_at: "2026-09-01T12:00:00+00:00", ...changes });
const denied = { data: null, error: { message: "Synthetic denial must not be displayed" }, count: null };
function adapter(q: Query) {
  let matches = h.records.filter(record => q.filters.every(([key, value]) => record[key as keyof RecordRow] === value));
  if (q.write) {
    const count = matches.length;
    matches.forEach(record => Object.assign(record, q.write));
    return { data: q.single ? matches[0] ? { id: matches[0].id } : null : null, count, error: null };
  }
  if (q.options?.head) return { data: null, count: matches.length, error: null };
  matches.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  if (q.cursor) {
    const beforeDate = q.cursor.match(/^created_at.lt.([^,]+),/)![1];
    const beforeId = q.cursor.match(/id.lt.([^)]*)/)![1];
    matches = matches.filter(record => record.created_at < beforeDate || record.created_at === beforeDate && record.id < beforeId);
  }
  return { data: matches.slice(0, q.limit), count: null, error: null };
}
function deferred<T>() { let resolve!: (value: T) => void; return { promise: new Promise<T>(done => { resolve = done; }), resolve }; }
function Location() { return <output data-testid="location">{useLocation().pathname}</output>; }
function Fixture({ bell = false }: { bell?: boolean }) { return <MemoryRouter initialEntries={[bell ? "/app" : "/app/notifications"]}><Routes><Route path="/app" element={<AppShell>{bell ? <NotificationBell /> : <h1>Home destination</h1>}</AppShell>} /><Route path="/app/notifications" element={<AppShell><NotificationsFeed /></AppShell>} /><Route path="/app/bookings" element={<h1>Visits destination</h1>} /></Routes><Location /></MemoryRouter>; }
beforeEach(() => { h.auth = { user: { id: "owner-a" }, loading: false }; h.records = [row(1)]; h.queries = []; h.channels = []; h.remove.mockReset(); h.execute.mockReset().mockImplementation(adapter); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const ready = () => screen.findByRole("button", { name: /^Synthetic notification 1(?:, unread)?$/ });

describe("real notifications feed boundaries with isolated synthetic adapter", () => {
  it("uses an exact whole-history count on Home without selecting notification bodies, and opens the feed", async () => {
    h.records = Array.from({ length: 45 }, (_, index) => row(index + 1)); h.records.push(row(90, { user_id: "owner-b" }));
    render(<Fixture bell />);
    const entry = screen.getByRole("link", { name: "Notifications" });
    await waitFor(() => expect(entry).toHaveAccessibleDescription("45 unread notifications"));
    expect(entry).toHaveAccessibleName("Notifications");
    const dot = entry.querySelector(".xoot-notifications-unread");
    expect(dot).toHaveAttribute("aria-hidden", "true"); expect(dot).toBeEmptyDOMElement();
    expect(h.queries).toHaveLength(1); expect(h.queries[0]).toMatchObject({ fields: "id", options: { head: true, count: "exact" }, filters: [["user_id", "owner-a"], ["read", false]] });
    fireEvent.click(screen.getByRole("link", { name: "Notifications" }));
    expect(await screen.findByText("45 new")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Synthetic notification/ })).toHaveLength(20);
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/app");
    expect(screen.queryByRole("navigation", { name: "Page navigation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
  });
  it("paginates by stable date and id so a newly inserted first record cannot duplicate or skip older records", async () => {
    h.records = Array.from({ length: 45 }, (_, index) => row(index + 1)); render(<Fixture />);
    await screen.findByText("45 new"); h.records.push(row(46));
    fireEvent.click(screen.getByRole("button", { name: "Load older notifications" })); await screen.findByText("Synthetic notification 6");
    const queries = h.queries.filter(q => q.limit); expect(queries[0].orders).toEqual([["created_at", { ascending: false }], ["id", { ascending: false }]]);
    expect(queries[1].cursor).toContain(`id.lt.${id(26)}`);
    fireEvent.click(screen.getByRole("button", { name: "Load older notifications" })); await ready();
    const cards = screen.getAllByRole("button", { name: /Synthetic notification/ }); expect(cards).toHaveLength(45);
    expect(new Set(cards.map(card => card.textContent)).size).toBe(45); expect(screen.queryByRole("button", { name: "Load older notifications" })).not.toBeInTheDocument();
  });
  it("keeps loaded records on a later page failure and retries the same cursor", async () => {
    h.records = Array.from({ length: 21 }, (_, index) => row(index + 1)); render(<Fixture />); await screen.findByText("21 new");
    h.execute.mockImplementation(q => q.cursor ? denied : adapter(q)); fireEvent.click(screen.getByRole("button", { name: "Load older notifications" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Older notifications could not be loaded");
    expect(screen.getAllByRole("button", { name: /Synthetic notification/ })).toHaveLength(20);
    expect(screen.queryByText("No notifications yet.")).not.toBeInTheDocument();
    h.execute.mockImplementation(adapter); fireEvent.click(screen.getByRole("button", { name: "Retry older notifications" })); await ready();
  });
  it.each(["page", "count"])("distinguishes a failed %s query from empty and retries", async failure => {
    h.records = []; h.execute.mockImplementation(q => failure === "count" ? q.options?.head ? denied : adapter(q) : q.limit ? denied : adapter(q));
    render(<Fixture />); await screen.findByRole("alert"); expect(screen.queryByText("All caught up")).not.toBeInTheDocument(); expect(screen.queryByText("No notifications yet.")).not.toBeInTheDocument();
    h.execute.mockImplementation(adapter); fireEvent.click(screen.getByRole("button", { name: "Try again" })); expect(await screen.findByText("No notifications yet.")).toBeInTheDocument(); expect(screen.getByText("All caught up")).toBeInTheDocument();
  });
  it("confirms a single owner/id read before navigating and blocks repeat clicks", async () => {
    h.records = [row(1, { link: "/app/bookings" })]; const pending = deferred<ReturnType<typeof adapter>>();
    h.execute.mockImplementation(q => q.write ? pending.promise : adapter(q)); render(<Fixture />); const card = await ready();
    fireEvent.click(card); fireEvent.click(card); expect(h.queries.filter(q => q.write)).toHaveLength(1); expect(screen.getByTestId("location")).toHaveTextContent("/app/notifications");
    expect(h.queries.find(q => q.write)).toMatchObject({ write: { read: true }, fields: "id", filters: [["user_id", "owner-a"], ["id", id(1)]], single: true });
    await act(async () => { pending.resolve({ data: { id: id(1) }, error: null, count: 1 }); }); expect(await screen.findByText("Visits destination")).toBeInTheDocument();
  });
  it.each(["denied", "missing", "wrong-id"])("keeps a %s read action honest without navigating", async mode => {
    h.records = [row(1, { link: "/app/bookings" })]; h.execute.mockImplementation(q => q.write ? mode === "denied" ? denied : { data: mode === "missing" ? null : { id: id(2) }, error: null, count: 0 } : adapter(q));
    render(<Fixture />); fireEvent.click(await ready()); expect(await screen.findByRole("alert")).toHaveTextContent("could not be marked read"); expect(screen.getByTestId("location")).toHaveTextContent("/app/notifications"); expect(screen.getByRole("button", { name: /Synthetic notification 1, unread/ })).toBeInTheDocument();
  });
  it.each([null, "https://evil.invalid/app/bookings", "javascript:alert(1)"])("marks a notification with destination %s read without unsafe navigation", async link => {
    h.records = [row(1, { link })]; render(<Fixture />); fireEvent.click(await ready()); await screen.findByText("All caught up"); expect(screen.getByTestId("location")).toHaveTextContent("/app/notifications"); expect(screen.getByRole("button", { name: "Synthetic notification 1" })).toHaveClass("is-read");
  });
  it("marks all with one owner-qualified read-only update and handles zero remaining unread rows", async () => {
    h.records = [row(1), row(2, { user_id: "owner-b" })]; render(<Fixture />); await ready(); h.records[0].read = true;
    fireEvent.click(screen.getByRole("button", { name: "Mark all read" })); await screen.findByText("All caught up");
    const writes = h.queries.filter(q => q.write); expect(writes).toHaveLength(1); expect(writes[0]).toMatchObject({ write: { read: true }, options: { count: "exact" }, filters: [["user_id", "owner-a"], ["read", false]] }); expect(h.records[1].read).toBe(false);
  });
  it("does not hide a mark-all denial or a missing confirmation", async () => {
    render(<Fixture />); await ready(); h.execute.mockImplementation(q => q.write ? denied : adapter(q)); fireEvent.click(screen.getByRole("button", { name: "Mark all read" })); await screen.findByRole("alert"); expect(screen.getByText("1 new")).toBeInTheDocument();
    await expect(markAllNotificationsRead("owner-a")).rejects.toThrow("could not be marked read");
  });
  it("blocks concurrent mark-all and card clicks, and rejects a write without an exact confirmation count", async () => {
    const pending = deferred<ReturnType<typeof adapter>>(); h.execute.mockImplementation(q => q.write ? pending.promise : adapter(q));
    render(<Fixture />); const card = await ready(); const all = screen.getByRole("button", { name: "Mark all read" });
    fireEvent.click(all); fireEvent.click(all); fireEvent.click(card); expect(h.queries.filter(q => q.write)).toHaveLength(1);
    await act(async () => pending.resolve({ data: null, count: null, error: null })); await screen.findByRole("alert"); expect(screen.getByText("1 new")).toBeInTheDocument();
  });
  it("keeps refresh requests bounded when count fails before an outstanding page returns", async () => {
    const pending = deferred<ReturnType<typeof adapter>>(); h.execute.mockImplementation(q => q.options?.head ? denied : pending.promise);
    render(<Fixture />); expect(screen.getByText("Loading notifications…")).toHaveAttribute("role", "status");
    act(() => h.channels[0].events[0].callback()); await act(async () => { await new Promise(done => setTimeout(done, 175)); }); expect(h.queries).toHaveLength(2);
    h.execute.mockImplementation(adapter); await act(async () => pending.resolve(adapter(h.queries[1])));
    await ready(); expect(h.queries).toHaveLength(4);
  });
  it("uses the source Back action to return to Home", async () => {
    render(<Fixture />); await ready(); fireEvent.click(screen.getByRole("link", { name: "Back to Home" })); expect(await screen.findByText("Home destination")).toBeInTheDocument();
  });
  it("hides prior data during auth-pending, sign-out and A to B to A, ignoring the first A response", async () => {
    const pending = deferred<ReturnType<typeof adapter>>(); h.execute.mockImplementationOnce(() => pending.promise);
    const view = render(<Fixture />); h.auth = { user: { id: "owner-b" }, loading: false }; h.records.push(row(2, { user_id: "owner-b" })); view.rerender(<Fixture />); await screen.findByText("Synthetic notification 2");
    h.auth = { user: { id: "owner-a" }, loading: false }; view.rerender(<Fixture />); await ready();
    await act(async () => { pending.resolve({ data: null, error: null, count: 700 }); }); expect(screen.queryByText("700 new")).not.toBeInTheDocument();
    h.auth.loading = true; view.rerender(<Fixture />); expect(screen.queryByText("Synthetic notification 1")).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Mark all read" })).not.toBeInTheDocument();
    h.auth = { user: null, loading: false }; view.rerender(<Fixture />); expect(screen.getByText("Sign in to view notifications.")).toBeInTheDocument();
    expect(h.queries.every(q => q.filters.some(([key, owner]) => key === "user_id" && ["owner-a", "owner-b"].includes(owner as string)))).toBe(true);
  });
  it("ignores a late write confirmation after account switches including A to B to A", async () => {
    h.records = [row(1, { link: "/app/bookings" })]; const pending = deferred<ReturnType<typeof adapter>>(); h.execute.mockImplementation(q => q.write ? pending.promise : adapter(q));
    const view = render(<Fixture />); fireEvent.click(await ready()); h.auth.user = { id: "owner-b" }; view.rerender(<Fixture />); await screen.findByText("No notifications yet."); h.auth.user = { id: "owner-a" }; view.rerender(<Fixture />); await ready();
    await act(async () => { pending.resolve({ data: { id: id(1) }, error: null, count: 1 }); }); expect(screen.getByTestId("location")).toHaveTextContent("/app/notifications");
  });
  it("subscribes to owner-filtered INSERT and UPDATE, coalesces refresh races and cleans up on unmount", async () => {
    const view = render(<Fixture />); await ready(); expect(h.channels[0].events.map(event => [event.event, event.filter])).toEqual([["INSERT", "user_id=eq.owner-a"], ["UPDATE", "user_id=eq.owner-a"]]);
    const pending = deferred<ReturnType<typeof adapter>>(); h.execute.mockImplementationOnce(() => pending.promise);
    act(() => { h.channels[0].events[0].callback(); h.channels[0].events[1].callback(); });
    await waitFor(() => expect(h.queries).toHaveLength(4)); act(() => { h.channels[0].events[1].callback(); });
    await act(async () => { await new Promise(done => setTimeout(done, 175)); }); expect(h.queries).toHaveLength(4);
    await act(async () => { pending.resolve({ data: null, error: null, count: 1 }); }); await waitFor(() => expect(h.queries).toHaveLength(6));
    view.unmount(); expect(h.remove).toHaveBeenCalledOnce(); const queryCount = h.queries.length; act(() => h.channels[0].events[0].callback()); await act(async () => { await new Promise(done => setTimeout(done, 175)); }); expect(h.queries).toHaveLength(queryCount);
  });
  it("does not query or subscribe while authentication is pending", () => {
    h.auth.loading = true; render(<Fixture bell />); expect(h.queries).toHaveLength(0); expect(h.channels).toHaveLength(0); expect(screen.getByRole("link", { name: "Notifications" })).toHaveAccessibleDescription("");
  });
  it("clears the bell's actual accessible count during auth-pending, sign-out and account transitions", async () => {
    const view = render(<Fixture bell />); const entry = screen.getByRole("link", { name: "Notifications" });
    await waitFor(() => expect(entry).toHaveAccessibleDescription("1 unread notifications"));
    h.auth.loading = true; view.rerender(<Fixture bell />); expect(entry).toHaveAccessibleName("Notifications"); expect(entry).toHaveAccessibleDescription(""); expect(screen.queryByText("1 unread notifications")).not.toBeInTheDocument();
    h.auth = { user: null, loading: false }; view.rerender(<Fixture bell />); expect(entry).toHaveAccessibleDescription("");
    const pending = deferred<ReturnType<typeof adapter>>(); h.execute.mockImplementationOnce(() => pending.promise);
    h.auth.user = { id: "owner-b" }; view.rerender(<Fixture bell />); expect(entry).toHaveAccessibleDescription("");
    h.auth.user = { id: "owner-a" }; view.rerender(<Fixture bell />); await waitFor(() => expect(entry).toHaveAccessibleDescription("1 unread notifications"));
    await act(async () => pending.resolve({ data: null, count: 99, error: null })); expect(entry).toHaveAccessibleDescription("1 unread notifications"); expect(screen.queryByText("99 unread notifications")).not.toBeInTheDocument();
  });
  it("removes stale accessible count after a failed refresh, preserving the link name", async () => {
    render(<Fixture bell />); const entry = screen.getByRole("link", { name: "Notifications" }); await waitFor(() => expect(entry).toHaveAccessibleDescription("1 unread notifications"));
    h.execute.mockResolvedValue(denied); act(() => h.channels[0].events[1].callback());
    await waitFor(() => expect(entry).toHaveAccessibleDescription("")); expect(entry).toHaveAccessibleName("Notifications"); expect(entry.querySelector(".xoot-notifications-unread")).not.toBeInTheDocument(); expect(screen.queryByText("1 unread notifications")).not.toBeInTheDocument();
  });
  it("exposes an exact zero count as the link description while keeping the decorative dot absent", async () => {
    h.records = [row(1, { read: true })]; render(<Fixture bell />); const entry = screen.getByRole("link", { name: "Notifications" }); await waitFor(() => expect(entry).toHaveAccessibleDescription("0 unread notifications")); expect(entry).toHaveAccessibleName("Notifications"); expect(entry.querySelector(".xoot-notifications-unread")).not.toBeInTheDocument();
  });
  it("formats actual dates in Johannesburg and handles invalid dates without inventing a relative time", () => {
    const now = Date.parse("2026-10-01T12:00:00Z");
    expect(formatNotificationTimestamp("2026-09-01T12:00:00Z")).toMatch(/14:00/); expect(formatNotificationTime("broken", now)).toBe("Time unavailable");
    expect(formatNotificationTime("2026-10-01T11:59:40Z", now)).toBe("Just now");
    expect(formatNotificationTime("2026-10-01T11:58:00Z", now)).toBe("2 min ago");
    expect(formatNotificationTime("2026-10-01T10:00:00Z", now)).toBe("2 h ago");
    expect(formatNotificationTime("2026-09-30T10:00:00Z", now)).toBe("Yesterday");
    expect(formatNotificationTime("2026-09-29T10:00:00Z", now)).toBe("2 days ago");
    expect(formatNotificationTime("2026-09-01T12:00:00Z", now)).toMatch(/Sept/);
    expect(formatNotificationTime("2025-09-01T12:00:00Z", now)).toMatch(/2025/);
    expect(formatNotificationTime("2026-10-01T12:00:20Z", now)).toBe("In <1 min");
    expect(formatNotificationTime("2026-10-01T12:02:00Z", now)).toBe("In 2 min");
    expect(formatNotificationTime("2026-10-01T14:00:00Z", now)).toBe("In 2 h");
    expect(formatNotificationTime("2026-10-03T12:00:00Z", now)).toBe("In 2 days");
  });
  it("ages actual visible times once per minute, preserves their full accessible timestamp and cleans up the timer", async () => {
    const now = Date.parse("2026-10-01T12:00:00Z"); const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    const interval = vi.spyOn(window, "setInterval"), clear = vi.spyOn(window, "clearInterval");
    h.records = [row(1, { created_at: "2026-10-01T11:58:00Z" })]; const view = render(<Fixture />); await ready();
    expect(screen.getByText("2 min ago")).toHaveAttribute("title", formatNotificationTimestamp(h.records[0].created_at));
    const callback = interval.mock.calls.find(call => call[1] === 60_000)![0] as () => void;
    clock.mockReturnValue(now + 60_000); act(() => callback()); expect(screen.getByText("3 min ago")).toBeInTheDocument();
    const timer = interval.mock.results.find((_, index) => interval.mock.calls[index][1] === 60_000)!.value;
    view.unmount(); expect(clear).toHaveBeenCalledWith(timer);
  });
});
