import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Profile from "./Profile";
import AccountEdit from "./AccountEdit";
import HomeEdit from "./HomeEdit";
import { blankHome } from "./profile-data";

type Query = { table: string; filters: [string, string][]; payload?: unknown; write?: "update" | "insert" };
const harness = vi.hoisted(() => ({
  auth: { user: { id: "owner-a", email: "synthetic@example.invalid" } as { id: string; email: string } | null, loading: false },
  read: vi.fn(), rpc: vi.fn(), write: vi.fn(), signOut: vi.fn(), creditRefresh: vi.fn(), concierge: vi.fn(), theme: vi.fn(),
  credit: { availableBalance: 12.34, loading: false, error: null as string | null },
  queries: [] as Query[],
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => harness.auth }));
vi.mock("@/contexts/ConciergeContext", () => ({ useConcierge: () => ({ openConcierge: harness.concierge }) }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "dark", setTheme: harness.theme }) }));
vi.mock("@/hooks/useXootCred", () => ({ useXootCred: () => ({ ...harness.credit, refresh: harness.creditRefresh }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...args: unknown[]) => harness.rpc(...args), auth: { signOut: () => harness.signOut() }, from: (table: string) => {
  const record: Query = { table, filters: [] }; harness.queries.push(record);
  const finish = () => record.write ? harness.write(record) : harness.read(record);
  const chain = { select: () => chain, eq: (field: string, value: string) => { record.filters.push([field, value]); return chain; },
    is: () => chain, order: () => chain, range: finish, maybeSingle: finish,
    update: (payload: unknown) => { record.payload = payload; record.write = "update"; return chain; },
    insert: (payload: unknown) => { record.payload = payload; record.write = "insert"; return chain; },
  }; return chain;
} } }));

const identity = { full_name: "Synthetic Person", avatar_url: null, phone: "", address: "" };
const home = { ...blankHome, label: "Synthetic place", address: "100 Test Road, Test City", pet_notes: "Synthetic pet note" };
const ok = (data: unknown) => ({ data, error: null });
const denied = { data: null, error: { message: "Synthetic denial" } };
function deferred<T>() { let resolve!: (value: T) => void; return { promise: new Promise<T>(done => { resolve = done; }), resolve }; }
function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}</output>; }
function Fixture({ url = "/app/profile" }: { url?: string }) { return <MemoryRouter initialEntries={[url]}><Routes>
  <Route path="/app/profile" element={<Profile />} /><Route path="/app/profile/account" element={<AccountEdit />} />
  <Route path="/app/profile/homes/:id" element={<HomeEdit />} /><Route path="/" element={<p>Signed out destination</p>} />
</Routes><Location /></MemoryRouter>; }
beforeEach(() => {
  localStorage.clear(); harness.queries = [];
  harness.auth = { user: { id: "owner-a", email: "synthetic@example.invalid" }, loading: false };
  harness.credit = { availableBalance: 12.34, loading: false, error: null };
  for (const mock of [harness.rpc, harness.write, harness.signOut, harness.creditRefresh, harness.concierge, harness.theme]) mock.mockReset();
  harness.signOut.mockResolvedValue({ error: null });
  harness.rpc.mockImplementation((_name, args) => Promise.resolve(ok({ id: args.p_home_id, is_default: args.p_selected ?? false })));
  harness.write.mockResolvedValue(ok({ id: "owner-a" }));
  harness.read.mockReset().mockImplementation((query: Query) => Promise.resolve(ok(query.table === "profiles" ? identity : query.table === "user_subscriptions" ? [] : query.filters.some(([field]) => field === "id") ? home : [{ id: "place-a", label: home.label, address: home.address, is_default: false }])));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Profile handoff integration", () => {
  it("keeps real destinations and unsupported source rows visible, with cents preserved", async () => {
    render(<Fixture />); await screen.findByText("Synthetic Person");
    const destinations = [
      [/Synthetic Person/, "/app/profile/account"], [/Join Care\+/, "/app/plans"], [/Gift a clean/, "/app/gifts"],
      [/Synthetic place/, "/app/profile/homes/place-a"], [/Add a place/, "/app/profile/homes/new"], [/XootCred/, "/app/loyalty"],
      [/Receipts & invoices/, "/app/bookings"], [/Manage more/, "/app/properties"], [/Saved Xooters/, "/app/favorites"],
      [/XootCover/, "/app/insurance"], [/Get help/, "/app/support"], [/How Xoot works/, "/#how"], [/Privacy & your data/, "/legal/privacy"],
    ] as const;
    const links = screen.getAllByRole("link");
    for (const [name, destination] of destinations) expect(links.find(link => name.test(link.textContent ?? ""))).toHaveAttribute("href", destination);
    expect(screen.getByText("R12.34")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    for (const name of [/Payment methods/, /Refer & earn/, /Notifications/, /Connected calendars/, /Widgets/]) expect(buttons.find(button => name.test(button.textContent ?? ""))).toBeDisabled();
    expect(screen.getByLabelText(/Same Xooter/)).toBeDisabled();
    expect(screen.getByLabelText(/Remind me/)).toBeDisabled();
  });
  it("changes only supported device preferences and opens the actual Concierge", async () => {
    render(<Fixture />); await screen.findByText("Synthetic Person");
    expect(harness.theme).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText(/Dark mode/)); expect(harness.theme).toHaveBeenCalledWith("light");
    fireEvent.click(screen.getByLabelText(/Haptic feedback/)); expect(localStorage.getItem("xoot:haptics-enabled")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /Siri & Concierge/ })); expect(harness.concierge).toHaveBeenCalledOnce();
  });
  it("shows a failed credit read as unavailable and exposes a retry", async () => {
    harness.credit.error = "Synthetic failure"; render(<Fixture />); await screen.findByText("Synthetic Person");
    expect(within(screen.getByRole("link", { name: /XootCred/ })).getByText("Unavailable")).toBeInTheDocument();
    expect(screen.queryByText("R12.34")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" })); expect(harness.creditRefresh).toHaveBeenCalledOnce();
  });
  it("keeps overview read errors visible and retries to a real empty state", async () => {
    harness.read.mockResolvedValueOnce(denied); render(<Fixture />);
    await screen.findByRole("alert"); expect(screen.queryByText("No places saved yet.")).not.toBeInTheDocument();
    harness.read.mockImplementation((query: Query) => Promise.resolve(ok(query.table === "profiles" ? identity : [])));
    fireEvent.click(screen.getByRole("button", { name: "Try again" })); await screen.findByText("No places saved yet.");
  });
  it("renders only confirmed active membership dates", async () => {
    harness.read.mockImplementation((query: Query) => Promise.resolve(ok(query.table === "profiles" ? identity : query.table === "user_subscriptions" ? [{ id: "care", status: "active", started_at: "2026-01-02", next_billing_at: "2026-11-03", subscription_plans: { name: "Care+" } }] : [])));
    render(<Fixture />); await screen.findByText("Care+ membership");
    expect(screen.getByText(/Care\+ member since.*2026/)).toBeInTheDocument();
    expect(screen.getByText(/active · next billing.*2026/)).toBeInTheDocument();
    expect(screen.queryByText(/included on every visit|priority slots|R30/)).not.toBeInTheDocument();
  });
  it("hides prior identity and places during auth pending and ignores a late owner read", async () => {
    const pending = deferred<ReturnType<typeof ok>>(); harness.read.mockReturnValueOnce(pending.promise);
    const view = render(<Fixture />); harness.auth.user = { id: "owner-b", email: "b@example.invalid" }; view.rerender(<Fixture />);
    await screen.findByText("Synthetic Person");
    await act(async () => { pending.resolve(ok({ ...identity, full_name: "Old owner" })); await pending.promise; });
    expect(screen.queryByText("Old owner")).not.toBeInTheDocument();
    harness.auth.loading = true; view.rerender(<Fixture />);
    expect(screen.queryByText("Synthetic Person")).not.toBeInTheDocument(); expect(screen.queryByText("Synthetic place")).not.toBeInTheDocument();
    harness.auth = { user: null, loading: false }; view.rerender(<Fixture />); expect(screen.getByText("Sign in to view your details.")).toBeInTheDocument();
  });
  it("blocks repeat sign-outs while hiding account details, then navigates on confirmation", async () => {
    const pending = deferred<{ error: null }>(); harness.signOut.mockReturnValue(pending.promise);
    render(<Fixture />); await screen.findByText("Synthetic Person"); const button = screen.getByRole("button", { name: "Sign out" });
    fireEvent.click(button); fireEvent.click(button); expect(harness.signOut).toHaveBeenCalledOnce(); expect(screen.queryByText("Synthetic Person")).not.toBeInTheDocument();
    await act(async () => { pending.resolve({ error: null }); await pending.promise; }); await screen.findByText("Signed out destination");
  });
  it("restores the account with a clear failure if sign-out is denied", async () => {
    harness.signOut.mockResolvedValue({ error: { message: "Synthetic denial" } }); render(<Fixture />); await screen.findByText("Synthetic Person");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" })); expect(await screen.findByRole("alert")).toHaveTextContent("Sign out failed");
    expect(screen.getByText("Synthetic Person")).toBeInTheDocument();
  });
});

describe("Account and place editors", () => {
  it("keeps the dock above a changing visual viewport and preserves form submission", async () => {
    const viewport = Object.assign(new EventTarget(), { height: window.innerHeight, offsetTop: 0 });
    vi.stubGlobal("visualViewport", viewport);
    render(<Fixture url="/app/profile/account" />); await screen.findByLabelText("Your name");
    const save = screen.getByRole("button", { name: "Save changes" });
    const dock = save.parentElement?.parentElement;
    expect(within(dock as HTMLElement).getAllByRole("button")).toEqual([save]);
    expect(within(dock as HTMLElement).queryByRole("link")).not.toBeInTheDocument();
    expect(dock?.style.bottom).toBe("0px");
    act(() => { viewport.height -= 250; viewport.dispatchEvent(new Event("resize")); });
    expect(dock?.style.bottom).toBe("250px");
    expect(save.closest("form")).not.toBeNull();
    act(() => { viewport.height = window.innerHeight; viewport.dispatchEvent(new Event("resize")); });
    expect(dock?.style.bottom).toBe("0px");
    fireEvent.click(save); await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(/^\/app\/profile$/));
  });
  it("validates actual account inputs, retains rejected changes and returns only after a confirmed save", async () => {
    render(<Fixture url="/app/profile/account" />); const name = await screen.findByLabelText("Your name");
    expect(screen.getByLabelText(/Email/)).toHaveAttribute("readonly"); expect(screen.getByRole("button", { name: "Change photo" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: /Preferred language/ })).toBeDisabled();
    fireEvent.change(name, { target: { value: "A" } }); fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter your full name"); expect(harness.write).not.toHaveBeenCalled();
    fireEvent.change(name, { target: { value: "Updated Synthetic Person" } }); harness.write.mockResolvedValueOnce(ok(null));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" })); await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("not saved"));
    expect(name).toHaveValue("Updated Synthetic Person"); expect(screen.getByTestId("location")).toHaveTextContent("/app/profile/account");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" })); await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(/^\/app\/profile$/));
    expect(harness.write.mock.calls[1][0]).toMatchObject({ filters: [["id", "owner-a"]], payload: { full_name: "Updated Synthetic Person" } });
  });
  it("blocks duplicate account saves and ignores a confirmation after an account switch", async () => {
    const pending = deferred<ReturnType<typeof ok>>(); harness.write.mockReturnValueOnce(pending.promise);
    const view = render(<Fixture url="/app/profile/account" />); await screen.findByLabelText("Your name");
    const button = screen.getByRole("button", { name: "Save changes" }); fireEvent.click(button); fireEvent.click(button);
    expect(harness.write).toHaveBeenCalledOnce(); expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    harness.auth.user = { id: "owner-b", email: "b@example.invalid" }; view.rerender(<Fixture url="/app/profile/account" />);
    await screen.findByDisplayValue("b@example.invalid");
    await act(async () => { pending.resolve(ok({ id: "owner-a" })); await pending.promise; });
    expect(screen.getByTestId("location")).toHaveTextContent("/app/profile/account"); expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("creates places from validated inputs and the auth owner without reading private place data", async () => {
    render(<Fixture url="/app/profile/homes/new" />);
    const name = await screen.findByLabelText("Place name"); expect(harness.read).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save this place" })); expect(await screen.findByRole("alert")).toHaveTextContent("Name this place"); expect(harness.write).not.toHaveBeenCalled();
    fireEvent.change(name, { target: { value: "New Synthetic place" } }); fireEvent.change(screen.getByLabelText("Address"), { target: { value: home.address } });
    fireEvent.change(screen.getByLabelText("Pets"), { target: { value: "Synthetic pet" } }); fireEvent.click(screen.getByRole("button", { name: "Save this place" }));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(/^\/app\/profile$/));
    expect(harness.rpc.mock.calls[0]).toEqual(["save_home", expect.objectContaining({ p_expected_owner: "owner-a", p_selected: null, p_details: expect.objectContaining({label: "New Synthetic place", pet_notes: "Synthetic pet"}) })]);
  });
  it("preserves home fields, reports denied updates and allows cancel without another write", async () => {
    harness.rpc.mockResolvedValueOnce(denied); harness.read.mockResolvedValueOnce(ok({ ...home, is_default: true })); render(<Fixture url="/app/profile/homes/place-a" />);
    expect(await screen.findByLabelText("Pets")).toHaveValue("Synthetic pet note");
    expect(screen.getByLabelText(/Default place/)).toBeEnabled();
    expect(screen.getByLabelText(/Default place/)).toBeChecked();
    expect(screen.getByRole("combobox", { name: /What is it/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Gate code"), { target: { value: "synthetic-code" } }); fireEvent.click(screen.getByRole("button", { name: "Save this place" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("not saved"); expect(screen.getByLabelText("Gate code")).toHaveValue("synthetic-code");
    expect(harness.rpc.mock.calls[0][1]).toMatchObject({ p_expected_owner: "owner-a", p_home_id: "place-a", p_selected: null, p_details: { pet_notes: "Synthetic pet note", gate_code: "synthetic-code" } });
    expect(harness.rpc.mock.calls[0][1].p_details).not.toHaveProperty("is_default");
    fireEvent.click(screen.getByRole("link", { name: "Back to You" })); await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(/^\/app\/profile$/)); expect(harness.rpc).toHaveBeenCalledOnce();
  });
});


describe("Atomic default-home control", () => {
  it("commits the checkbox selection and details once, waiting for the server before returning", async () => {
    const pending = deferred<ReturnType<typeof ok>>(); harness.rpc.mockReturnValueOnce(pending.promise);
    render(<Fixture url="/app/profile/homes/place-a" />);
    const control = await screen.findByRole("switch", { name: /Default place/ });
    expect(control).toHaveAttribute("type", "checkbox");
    control.focus(); expect(control).toHaveFocus(); fireEvent.click(control);
    fireEvent.change(screen.getByLabelText("Place name"), { target: { value: "Office" } });
    const save = screen.getByRole("button", { name: "Save this place" }); fireEvent.click(save); fireEvent.click(save);
    expect(harness.rpc).toHaveBeenCalledOnce(); expect(control).toBeDisabled();
    expect(harness.rpc.mock.calls[0][1]).toMatchObject({ p_home_id: "place-a", p_expected_owner: "owner-a", p_selected: true, p_details: { label: "Office" } });
    expect(screen.getByTestId("location")).toHaveTextContent("/app/profile/homes/place-a");
    await act(async () => { pending.resolve(ok({ id: "place-a", is_default: true })); await pending.promise; });
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(/^\/app\/profile$/));
  });
  it("retains a new home's draft and UUID when the RPC is undelivered, then retries honestly", async () => {
    harness.rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST202" } });
    render(<Fixture url="/app/profile/homes/new" />);
    fireEvent.change(await screen.findByLabelText("Place name"), { target: { value: "Office" } });
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: home.address } });
    fireEvent.click(screen.getByRole("switch", { name: /Default place/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save this place" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("confirmation was lost");
    expect(screen.getByLabelText("Place name")).toHaveValue("Office");
    expect(screen.getByTestId("location")).toHaveTextContent("/app/profile/homes/new");
    fireEvent.click(screen.getByRole("button", { name: "Save this place" }));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(/^\/app\/profile$/));
    expect(harness.rpc.mock.calls[0]).toEqual(harness.rpc.mock.calls[1]);
  });
  it.each([true, false])("ignores a stale default %s reply across an account transition", async success => {
    const pending = deferred<ReturnType<typeof ok>>(); harness.rpc.mockReturnValueOnce(pending.promise);
    const view = render(<Fixture url="/app/profile/homes/place-a" />);
    fireEvent.click(await screen.findByRole("switch", { name: /Default place/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save this place" }));
    harness.auth.loading = true; view.rerender(<Fixture url="/app/profile/homes/place-a" />);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    harness.auth = { user: {id:"owner-b",email:"b@example.invalid"}, loading:false };
    view.rerender(<Fixture url="/app/profile/homes/place-a" />);
    await screen.findByRole("switch", { name: /Default place/ });
    await act(async () => { pending.resolve(success ? ok({ id:"place-a",is_default:true }) : denied); await pending.promise; });
    expect(screen.getByTestId("location")).toHaveTextContent("/app/profile/homes/place-a");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /Default place/ })).not.toBeChecked();
  });
});
