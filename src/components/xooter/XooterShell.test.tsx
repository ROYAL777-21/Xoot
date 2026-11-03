import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { XooterShell } from "./XooterShell";

const fixture = vi.hoisted(() => ({
  user: { id: "synthetic-owner-a", email: "worker-a@example.test" },
  signOut: vi.fn(), toast: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: fixture.user, signOut: fixture.signOut }) }));
vi.mock("sonner", () => ({ toast: { error: fixture.toast } }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
const Location = () => <p>Current page: {useLocation().pathname}</p>;
const Shell = ({ updates = false }: { updates?: boolean }) => <XooterShell updatesAvailable={updates}><Location /></XooterShell>;
const at = (path = "/xooter", updates = false) => render(<MemoryRouter initialEntries={[path]}><Shell updates={updates} /></MemoryRouter>);
const disclosure = () => screen.getByText("You", { selector: "summary span" }).closest("details") as HTMLDetailsElement;
beforeEach(() => { fixture.user = { id: "synthetic-owner-a", email: "worker-a@example.test" }; fixture.signOut.mockReset(); fixture.toast.mockReset(); });
afterEach(cleanup);

describe("handoff Xooter navigation", () => {
  it("keeps all six existing desktop destinations and one active page", () => {
    at("/xooter/jobs/synthetic-visit");
    const nav = screen.getByRole("navigation", { name: "Xooter workspace" });
    expect(within(nav).getAllByRole("link").map(link => link.getAttribute("href"))).toEqual([
      "/xooter", "/xooter/jobs", "/xooter/training", "/xooter/earnings", "/xooter/kyc", "/xooter/profile",
    ]);
    expect(within(nav).getByRole("link", { name: "Jobs" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });
  it("gives mobile workers direct work tabs and account/verification/sign-out access", () => {
    at("/xooter/earnings");
    const nav = screen.getByRole("navigation", { name: "Xooter tabs" });
    expect(within(nav).getAllByRole("link").filter(link => !link.closest("details")).map(link => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Home", "/xooter"], ["Jobs", "/xooter/jobs"], ["Training", "/xooter/training"], ["Earnings", "/xooter/earnings"],
    ]);
    expect(within(nav).getByRole("link", { name: "Earnings" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(disclosure().querySelector("summary")!);
    expect(disclosure().open).toBe(true);
    const account = screen.getByRole("navigation", { name: "Your Xooter account" });
    expect(within(account).getByRole("link", { name: "Verification" })).toHaveAttribute("href", "/xooter/kyc");
    expect(within(account).getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/xooter/profile");
    expect(within(account).getByRole("button", { name: "Sign out" })).toBeEnabled();
    fireEvent.click(within(account).getByRole("link", { name: "Profile" }));
    expect(screen.getByText("Current page: /xooter/profile")).toBeInTheDocument();
    expect(disclosure().open).toBe(false);
  });
  it("keeps the unshipped Updates route absent unless the integrating release enables it", () => {
    at();
    expect(screen.queryByRole("link", { name: "Your updates" })).not.toBeInTheDocument();
  });
  it("preserves the notification destination when its real route is enabled", () => {
    at("/xooter/updates", true);
    expect(within(screen.getByRole("navigation", { name: "Xooter workspace" })).getByRole("link", { name: "Your updates" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(disclosure().querySelector("summary")!);
    expect(within(screen.getByRole("navigation", { name: "Your Xooter account" })).getByRole("link", { name: "Your updates" })).toHaveAttribute("href", "/xooter/updates");
    expect(disclosure().querySelector("summary")).toHaveAttribute("aria-current", "page");
  });
  it("closes account UI and removes the previous identity immediately on account change", () => {
    const view = at(); fireEvent.click(disclosure().querySelector("summary")!);
    expect(disclosure().open).toBe(true);
    fixture.user = { id: "synthetic-owner-b", email: "worker-b@example.test" };
    view.rerender(<MemoryRouter initialEntries={["/xooter"]}><Shell /></MemoryRouter>);
    expect(disclosure().open).toBe(false);
    expect(screen.queryByText("worker-a@example.test")).not.toBeInTheDocument();
  });
  it("does not redirect a newly signed-in owner when an earlier owner's sign-out finishes", async () => {
    let complete!: () => void;
    fixture.signOut.mockImplementation(() => new Promise<void>(resolve => { complete = resolve; }));
    const view = at("/xooter/jobs");fireEvent.click(disclosure().querySelector("summary")!);
    fireEvent.click(within(screen.getByRole("navigation", { name: "Your Xooter account" })).getByRole("button", { name: "Sign out" }));
    expect(fixture.signOut).toHaveBeenCalledTimes(1);
    fixture.user = { id: "synthetic-owner-b", email: "worker-b@example.test" };
    view.rerender(<MemoryRouter initialEntries={["/xooter/jobs"]}><Shell /></MemoryRouter>);
    await act(async () => complete());
    expect(screen.getByText("Current page: /xooter/jobs")).toBeInTheDocument();
  });
  it("reports failed sign-out without navigating or exposing a private diagnostic", async () => {
    fixture.signOut.mockRejectedValue(Error("synthetic private provider detail"));
    at("/xooter/jobs");fireEvent.click(disclosure().querySelector("summary")!);
    await act(async () => fireEvent.click(within(screen.getByRole("navigation", { name: "Your Xooter account" })).getByRole("button", { name: "Sign out" })));
    expect(fixture.toast).toHaveBeenCalledWith("Sign out failed. Please try again.");
    expect(screen.getByText("Current page: /xooter/jobs")).toBeInTheDocument();
  });
});
