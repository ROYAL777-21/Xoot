import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ReferralCodeCard } from "./ReferralCodeCard";

const harness = vi.hoisted(() => ({ auth: { user: null as { id: string } | null, loading: false }, read: vi.fn(), copy: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => harness.auth }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: (column: string, owner: string) => ({ maybeSingle: () => harness.read(column, owner) }) }) }) } }));
const mount = () => render(<MemoryRouter><ReferralCodeCard /></MemoryRouter>);
afterEach(cleanup);
beforeEach(() => { harness.auth = { user: null, loading: false }; harness.read.mockReset(); harness.copy.mockReset(); Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: harness.copy } }); });

it("offers sign-up entry without reading another account or inventing a code", () => {
  mount(); expect(screen.getByRole("link", { name: "Get your code" })).toHaveAttribute("href", "/auth");
  expect(harness.read).not.toHaveBeenCalled(); expect(screen.queryByRole("button", { name: "Copy invite link" })).toBeNull();
});
it("discards a previous owner's late response and shares only the current server-issued code", async () => {
  let old!: (value: unknown) => void;
  harness.read.mockImplementation((_column, owner) => owner === "owner-a" ? new Promise(resolve => { old = resolve; }) : Promise.resolve({ data: { code: "XOOT_B" }, error: null }));
  harness.auth.user = { id: "owner-a" }; const view = mount();
  harness.auth.user = { id: "owner-b" }; view.rerender(<MemoryRouter><ReferralCodeCard /></MemoryRouter>);
  await screen.findByText("XOOT_B");
  await act(async () => { old({ data: { code: "XOOT_A" }, error: null }); });
  expect(screen.queryByText("XOOT_A")).toBeNull();
  expect(harness.read.mock.calls).toEqual([["user_id", "owner-a"], ["user_id", "owner-b"]]);
  fireEvent.click(screen.getByRole("button", { name: "Copy invite link" }));
  await screen.findByText("Link copied");
  expect(harness.copy).toHaveBeenCalledWith("https://xoot.co.za/app/book?ref=XOOT_B");
  harness.auth.user = null; view.rerender(<MemoryRouter><ReferralCodeCard /></MemoryRouter>);
  expect(screen.queryByText("XOOT_B")).toBeNull();
});
it.each([null, { code: "<script>bad</script>" }])("keeps absent or malformed backend codes unshareable", async data => {
  harness.auth.user = { id: "owner-a" }; harness.read.mockResolvedValue({ data, error: null });
  mount(); await screen.findByText("Your referral code could not be loaded.");
  expect(screen.queryByRole("button", { name: "Copy invite link" })).toBeNull();
});
it("does not claim a successful copy when clipboard permission is denied", async () => {
  harness.auth.user = { id: "owner-a" }; harness.read.mockResolvedValue({ data: { code: "XOOT_A" }, error: null }); harness.copy.mockRejectedValue(new Error("Denied"));
  mount(); fireEvent.click(await screen.findByRole("button", { name: "Copy invite link" }));
  await screen.findByText(/Copy is unavailable/); expect(screen.queryByText("Link copied")).toBeNull();
});
