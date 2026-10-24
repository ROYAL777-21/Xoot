import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";

const auth = vi.hoisted(() => ({ getSession: vi.fn(), signOut: vi.fn(), onAuthStateChange: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth } }));
const sessionFor = (id: string) => ({ user: { id } }) as Session;
let changed: (event: string, value: Session | null) => void;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function Probe() {
  const { user, loading, signOut } = useAuth();
  return <><output>{loading ? "Loading" : user?.id ?? "Signed out"}</output><button onClick={() => void signOut().catch(() => { document.title = "Sign out failed"; })}>Sign out</button></>;
}
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AuthProvider><Probe /></AuthProvider></QueryClientProvider>);
  return client;
}
beforeEach(() => {
  vi.clearAllMocks(); document.title = "";
  auth.onAuthStateChange.mockImplementation(callback => { changed = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; });
  auth.getSession.mockResolvedValue({ data: { session: sessionFor("customer-a") }, error: null });
  auth.signOut.mockResolvedValue({ error: null });
});
afterEach(cleanup);
describe("real authentication state", () => {
  it("does not restore an expired initial session after a newer sign-in", async () => {
    const initial = deferred<{ data: { session: Session }; error: null }>();
    auth.getSession.mockReturnValue(initial.promise);
    mount();
    act(() => changed("SIGNED_IN", sessionFor("customer-b")));
    await act(async () => initial.resolve({ data: { session: sessionFor("customer-a") }, error: null }));
    expect(screen.getByText("customer-b")).toBeInTheDocument();
  });
  it("clears cached private rows when the account changes", async () => {
    const client = mount(); await screen.findByText("customer-a");
    client.setQueryData(["private-bookings"], [{ address: "synthetic test address" }]);
    act(() => changed("SIGNED_IN", sessionFor("customer-b")));
    expect(client.getQueryData(["private-bookings"])).toBeUndefined();
    expect(screen.getByText("customer-b")).toBeInTheDocument();
  });
  it("preserves same-account cache on a token refresh", async () => {
    const client = mount(); await screen.findByText("customer-a");
    client.setQueryData(["private-bookings"], ["own booking"]);
    act(() => changed("TOKEN_REFRESHED", sessionFor("customer-a")));
    expect(client.getQueryData(["private-bookings"])).toEqual(["own booking"]);
  });
  it("signs out the current device and clears private cache", async () => {
    const client = mount(); await screen.findByText("customer-a");
    client.setQueryData(["private-bookings"], ["own booking"]);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Signed out"));
    expect(client.getQueryData(["private-bookings"])).toBeUndefined();
  });
  it("does not pretend a failed sign-out succeeded", async () => {
    auth.signOut.mockResolvedValue({ error: new Error("offline") });
    mount(); await screen.findByText("customer-a");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(document.title).toBe("Sign out failed"));
    expect(screen.getByText("customer-a")).toBeInTheDocument();
  });
  it("does not clear a newer account when an earlier sign-out completes", async () => {
    const pending = deferred<{ error: null }>(); auth.signOut.mockReturnValue(pending.promise);
    mount(); await screen.findByText("customer-a");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    act(() => changed("SIGNED_IN", sessionFor("customer-b")));
    await act(async () => pending.resolve({ error: null }));
    expect(screen.getByText("customer-b")).toBeInTheDocument();
  });
  it("settles a rejected session read without leaving an endless loading state", async () => {
    auth.getSession.mockRejectedValue(new Error("offline")); mount();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Signed out"));
  });
});
