import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";
import Plans from "@/pages/app/Plans";

const planFixture = vi.hoisted(() => ({ mode: "unavailable" as "loading" | "unavailable" | "populated" }));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ signOut: vi.fn() }) }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
vi.mock("@/hooks/useXootCred", () => ({ useXootCred: () => ({ availableBalance: 0, loading: false, error: null }) }));
vi.mock("@/hooks/useHouseholdOperatingLayer", () => ({ useHouseholdOperatingLayer: () => ({ homeMemory: null, readyModes: [] }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => {
  const query = {
    select: () => query, order: () => query, limit: () => query,
    maybeSingle: () => planFixture.mode === "loading" ? new Promise(() => {}) : Promise.resolve({
      data: planFixture.mode === "populated" ? { id: "test-plan", name: "Care+", cadence: "monthly", monthly_price: 99 } : null,
      error: null,
    }),
  };
  return query;
} } }));
afterEach(cleanup);
const at = (route: string) => render(<MemoryRouter initialEntries={[route]}><AppShell><h1>Actual child screen</h1></AppShell></MemoryRouter>);

describe("source app navigation", () => {
  it("exposes the four destinations and separate Book action, with one selected page", () => {
    at("/app");
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(nav).getAllByRole("link").map(link => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Home", "/app"], ["Visits", "/app/bookings"], ["Rewards", "/app/loyalty"], ["You", "/app/profile"],
    ]);
    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Book a visit" })).toHaveAttribute("href", "/app/book");
    fireEvent.click(within(nav).getByRole("link", { name: "Visits" }));
    expect(within(nav).getByRole("link", { name: "Visits" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });
  it.each(["/app/book", "/app/bookings/synthetic-visit"])("keeps the bottom dock out of %s", route => {
    at(route);
    expect(screen.getByRole("heading", { name: "Actual child screen" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
  });
  it("lets the Profile screen own account destinations and sign-out", () => {
    at("/app/profile");
    expect(screen.queryByRole("navigation", { name: "Account destinations" })).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
  });
  it.each(["/app/notifications", "/app/widgets", "/app/calendar", "/app/properties", "/app/profile/account", "/app/profile/homes/new", "/app/profile/homes/synthetic-home"])("allows the screen to own the back link at %s", route => {
    at(route);
    expect(screen.queryByRole("navigation", { name: "Page navigation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
  });
  it.each(["/app/properties/accounts", "/app/properties/airbnb", "/app/properties/office", "/app/favorites", "/app/plans", "/app/insurance", "/app/support"])("returns to You from %s", route => {
    at(route);
    const nav = screen.getByRole("navigation", { name: "Page navigation" });
    fireEvent.click(within(nav).getByRole("link", { name: "You" }));
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
  });
  it.each(["loading", "unavailable", "populated"] as const)("keeps You reachable through the actual Care+ %s branch", async mode => {
    planFixture.mode = mode;
    render(<MemoryRouter initialEntries={["/app/plans"]}><AppShell><Routes>
      <Route path="/app/plans" element={<Plans />} />
      <Route path="/app/profile" element={<h1>You destination</h1>} />
    </Routes></AppShell></MemoryRouter>);
    if (mode === "unavailable") await screen.findByText("No Care+ plan available.");
    if (mode === "populated") await screen.findByRole("heading", { name: "Care+ keeps your home ready." });
    fireEvent.click(within(screen.getByRole("navigation", { name: "Page navigation" })).getByRole("link", { name: "You" }));
    expect(screen.getByRole("heading", { name: "You destination" })).toBeInTheDocument();
  });
});
