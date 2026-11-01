import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Widgets from "./Widgets";
const h = vi.hoisted(() => ({ auth: { user: { id: "owner-a" } as { id: string } | null, loading: false }, read: vi.fn(), select: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => h.auth }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => {
  let owner: string; let statuses: string[] = [];
  const q = { select: (fields: string) => { h.select(fields); return q; }, eq: (_key: string, value: string) => { owner = value; return q; }, gte: () => q,
    in: (_key: string, values: string[]) => { statuses = values; return q; }, order: () => q, limit: () => q,
    maybeSingle: async () => { const result = await h.read(owner); return result.data && !statuses.includes(result.data.status) ? { ...result, data: null } : result; } };
  return q;
} } }));
const fixture = (service: string, status = "contractor_accepted") => ({ data: { id: "11111111-1111-4111-8111-111111111111", service, status, scheduled_at: "2026-12-01T08:00:00Z" }, error: null });
afterEach(cleanup);
beforeEach(() => { h.auth = { user: { id: "owner-a" }, loading: false }; h.read.mockReset(); h.select.mockReset(); });
it("reads only a booking summary for its owner and never claims a fabricated ETA", async () => {
  h.read.mockResolvedValue(fixture("Office")); render(<MemoryRouter><Widgets /></MemoryRouter>);
  await screen.findByText("Office"); expect(h.read).toHaveBeenCalledWith("owner-a");
  expect(h.select).toHaveBeenCalledWith("id,service,scheduled_at,status");
  expect(screen.getByRole("link", { name: "Open visit status" })).toHaveAttribute("href", "/app/bookings/11111111-1111-4111-8111-111111111111");
  expect(screen.getByText(/Desktop OS widgets are not available/)).toBeInTheDocument();
});
it("discards an old account's delayed visit and clears the summary on sign-out", async () => {
  let finish!: (value: unknown) => void;
  h.read.mockImplementation(owner => owner === "owner-a" ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(fixture("Airbnb")));
  const view = render(<MemoryRouter><Widgets /></MemoryRouter>);
  h.auth.user = { id: "owner-b" }; view.rerender(<MemoryRouter><Widgets /></MemoryRouter>);
  await screen.findByText("Airbnb"); await act(async () => { finish(fixture("Private old account service")); });
  expect(screen.queryByText("Private old account service")).toBeNull();
  h.auth.user = null; view.rerender(<MemoryRouter><Widgets /></MemoryRouter>);
  expect(screen.queryByText("Airbnb")).toBeNull();
});
it.each(["payment_confirmed", "reassigned", "replacement_required", "replacement_offered", "pending_payment"])("keeps an upcoming %s visit visible through the database status filter", async status => {
  h.read.mockResolvedValue(fixture("Residential", status)); render(<MemoryRouter><Widgets /></MemoryRouter>);
  expect(await screen.findByRole("link", { name: "Open visit status" })).toBeInTheDocument();
  expect(screen.queryByText(/No upcoming visit yet/)).toBeNull();
});
it.each(["draft", "cancelled", "completed", "rated"])("does not present a %s record as an upcoming visit", async status => {
  h.read.mockResolvedValue(fixture("Residential", status)); render(<MemoryRouter><Widgets /></MemoryRouter>);
  expect(await screen.findByText(/No upcoming visit yet/)).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Open visit status" })).toBeNull();
});
