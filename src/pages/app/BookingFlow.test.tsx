import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fingerprintBookingQuote, parseBookingQuoteInput, quoteBooking } from "../../../supabase/functions/_shared/booking-quote";
import { BOOKING_REFERRAL_MESSAGES } from "@/lib/booking-flow";
import Book from "./Book";

const harness = vi.hoisted(() => ({
  auth: { user: { id: "buyer" } as { id: string } | null, loading: false },
  invoke: vi.fn(), roster: vi.fn(), places: [] as {id:string;label:string;address:string;is_default:boolean}[], savePlace: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => harness.auth }));
vi.mock("@/lib/xooter-directory", () => ({ loadXooterDirectory: harness.roster }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  functions: { invoke: harness.invoke },
  from: (table:string) => { let inserted:unknown; const chain = { select: () => chain, eq: () => chain,
    order: () => table === "household_profiles" ? chain : Promise.resolve({ data: [], error: null }),
    range: () => Promise.resolve({data:harness.places,error:null}),
    insert: (payload:unknown) => {inserted=payload;return chain;},
    maybeSingle: () => inserted ? harness.savePlace(inserted) : Promise.resolve({ data: null, error: null }) }; return chain; },
} }));

async function response(body: unknown) {
  const quote = quoteBooking(parseBookingQuoteInput(body, Date.now()), { buyerId: "buyer", carePlusMember: false,
    availableCreditCents: 0, referralRecord: null, completedBookingCount: 0, hasPriorRedemption: false, coverAvailable: false });
  return { data: { success: true, data: { quote: { ...quote, fingerprint: await fingerprintBookingQuote(quote, "buyer") }, bookingSubmissionAvailable: false } }, error: null };
}
function mount(url = "/app/book", variant: "app" | "website" = "app") {
  const Location = () => {
    const location = useLocation();
    return <><div hidden data-testid="current-search">{location.search}</div><div hidden data-testid="current-location">{JSON.stringify({ pathname: location.pathname, state: location.state })}</div></>;
  };
  const App = () => <MemoryRouter initialEntries={[url]}><Book variant={variant} /><Location /></MemoryRouter>;
  return { ...render(<App />), refresh: () => <App /> };
}
const next = async () => { await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Continue" })); }); };
async function toReview() {
  await next();
  fireEvent.change(screen.getByLabelText("Where do you need us?"), { target: { value: "14 Example Street, Sandton" } });
  await next(); await next();
  await screen.findByText("No approved Xooters listed yet");
  await next();
}
beforeEach(() => {
  vi.clearAllMocks(); harness.auth = { user: { id: "buyer" }, loading: false };
  harness.roster.mockResolvedValue({ xooters: [], total: 0 });
  harness.places=[]; harness.savePlace.mockImplementation(async(payload:{id:string})=>({data:{id:payload.id},error:null}));
  harness.invoke.mockImplementation(async (_name, options) => response(options.body));
});
afterEach(cleanup);

describe("handoff booking review (isolated UI fixtures)", () => {
  it("keeps the ordinary home booking single-Xooter without a crew picker", async () => {
    mount(); await next();
    expect(screen.queryByRole("group", { name: "Your crew" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Where do you need us?"), { target: { value: "14 Example Street, Sandton" } });
    await next();
    await next();
    expect(await screen.findByRole("button", { name: /Let Xoot match my Xooter/ })).toBeInTheDocument();
  });
  it("saves a new place with a stable retry ID and stays put after a denied write", async () => {
    harness.savePlace.mockResolvedValueOnce({data:null,error:{code:"42501"}});
    mount(); await next();
    fireEvent.change(screen.getByLabelText("Where do you need us?"),{target:{value:"42 Test Street, Mamelodi, Pretoria"}});
    await next();
    expect(screen.getByRole("alert")).toHaveTextContent("Your place was not saved");
    expect(screen.getByRole("heading",{name:"Tell us about your place"})).toBeInTheDocument();
    await next();
    expect(screen.getByRole("heading",{name:"When suits you?"})).toBeInTheDocument();
    expect(harness.savePlace).toHaveBeenCalledTimes(2);
    expect(harness.savePlace.mock.calls[0][0]).toEqual(harness.savePlace.mock.calls[1][0]);
    expect(harness.savePlace.mock.calls[0][0]).toMatchObject({user_id:"buyer",label:"Home",address:"42 Test Street, Mamelodi, Pretoria",is_default:false});
    expect(harness.invoke).not.toHaveBeenCalled();
  });
  it("reuses a canonical saved place without making a duplicate or asserting coverage", async () => {
    harness.places=[{id:"place-a",label:"Our place",address:"42 Test Street, Mamelodi, Pretoria",is_default:false}];
    mount(); await next();
    await screen.findByRole("option",{name:/Our place/});
    fireEvent.change(screen.getByLabelText("Your places"),{target:{value:"place-a"}});
    expect(screen.getByLabelText("Where do you need us?")).toHaveValue("42 Test Street, Mamelodi, Pretoria");
    await next(); expect(screen.getByRole("heading",{name:"When suits you?"})).toBeInTheDocument();
    expect(harness.savePlace).not.toHaveBeenCalled(); expect(harness.invoke).not.toHaveBeenCalled();
  });
  it("can continue without saving when the customer turns it off",async()=>{
    mount(); await next();
    fireEvent.change(screen.getByLabelText("Where do you need us?"),{target:{value:"42 Test Street, Mamelodi, Pretoria"}});
    fireEvent.click(screen.getByRole("checkbox",{name:/Save this place to Your places/}));
    await next();expect(screen.getByRole("heading",{name:"When suits you?"})).toBeInTheDocument();
    expect(harness.savePlace).not.toHaveBeenCalled();
  });
  it("takes the Today weekly suggestion into real frequency inputs without scheduling a visit", async () => {
    mount("/app/book?service=regular&frequency=weekly&address=14%20Example%20Street%2C%20Sandton");
    await next(); await next();
    expect(screen.getByRole("button", { name: "Once a week" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("The reviewed price is per visit. Future visits need availability confirmation.")).toBeInTheDocument();
    expect(harness.invoke).not.toHaveBeenCalled();
    await act(async () => {});
  });
  it("keeps the selected home's duration when returning to regular cleaning", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Express cleaning/ }));
    fireEvent.click(screen.getByRole("button", { name: /Regular cleaning/ })); await next();
    expect(screen.getByLabelText("Hours")).toHaveTextContent("5.5");
    await act(async () => {});
  });
  it("consumes legacy address prefills and removes them from URL/history", async () => {
    mount("/book?service=airbnb&address=14%20Example%20Street%2C%20Sandton&area=Private", "website");
    await waitFor(() => expect(screen.getByTestId("current-search").textContent).toBe("?service=airbnb"));
    expect(screen.getByTestId("current-search")).not.toHaveTextContent("address"); await next();
    expect(screen.getByLabelText("Street address")).toHaveValue("14 Example Street, Sandton");
    await act(async () => {});
  });
  it("uses the website's cards/date strip and lets guests review their selections before signing in", async () => {
    harness.auth.user = null; mount("/book", "website");
    expect(screen.getByRole("heading", { name: "What needs doing?" })).toBeInTheDocument();
    expect(screen.getByLabelText("Booking progress")).toHaveTextContent("Your place");
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Regular cleaning/ })); await next();
    fireEvent.change(screen.getByLabelText("Street address"), { target: { value: "14 Example Street, Sandton" } });
    expect(screen.queryByLabelText("Suburb")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View interactive area map" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Xoot confirms actual service coverage/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Medium 2–3 bedrooms" })).toHaveAttribute("aria-pressed", "true"); await next();
    expect(screen.getByLabelText("Upcoming dates").children).toHaveLength(14); await next();
    await screen.findByText("No approved Xooters listed yet");
    expect(screen.queryByRole("button", { name: "2 Xooters" })).not.toBeInTheDocument(); await next();
    expect(screen.getByText("14 Example Street, Sandton")).toBeInTheDocument();
    expect(harness.invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(JSON.parse(screen.getByTestId("current-location").textContent!)).toEqual({ pathname: "/auth", state: { from: { pathname: "/book", search: "?service=regular" } } });
  });
  it("returns to time selection when reducing the website crew makes the selected visit too late", async () => {
    mount("/book?service=airbnb", "website"); await next();
    fireEvent.change(screen.getByLabelText("Street address"), { target: { value: "14 Example Street, Sandton" } });
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "More hours" }));
    await next(); await next();
    await screen.findByText("No approved Xooters listed yet");
    fireEvent.click(screen.getByRole("button", { name: "2 Xooters" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "14:00" })); await next();
    fireEvent.click(screen.getByRole("button", { name: "1 Xooter" })); await next();
    expect(screen.getByRole("heading", { name: "When suits you?" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("finish by 17:00");
    expect(screen.queryByRole("button", { name: "14:00" })).not.toBeInTheDocument();
    expect(harness.invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "11:00" })); await next(); await next();
    await screen.findByLabelText("Reviewed quote");
    expect(harness.invoke).toHaveBeenCalledWith("get-booking-quote", { body: expect.objectContaining({ crewSize: 1, time: "11:00", hours: 5.5 }) });
  }, 15_000); // This regression traverses the full form twice, including time/crew reselection.
  it("adapts property-specific options while retaining the requested service for an explicit correction", async () => {
    mount(); await next();
    fireEvent.change(screen.getByLabelText("Where do you need us?"), { target: { value: "14 Example Street, Sandton" } });
    fireEvent.click(screen.getByRole("button", { name: "Airbnb" }));
    expect(screen.getByLabelText("Linen handling")).toHaveValue("none");
    expect(screen.getByRole("option", { name: /switch to Airbnb first/ })).toBeDisabled(); await next();
    expect(screen.queryByRole("button", { name: "16:00" })).not.toBeInTheDocument(); await next();
    await screen.findByText("No approved Xooters listed yet"); await next();
    await screen.findByLabelText("Reviewed quote");
    expect(harness.invoke).toHaveBeenCalledWith("get-booking-quote", { body: expect.objectContaining({ service: "regular", propertyType: "airbnb", linen: "none" }) });
    expect(screen.getByRole("checkbox", { name: /I accept airbnb cleaning/i })).not.toBeChecked();
  });
  it("uses the original seven service tiles and rejects unavailable services", async () => {
    mount();
    await act(async () => {});
    expect(screen.getByText("Xoot")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Laundry & ironing/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Xoot Lux/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Regular cleaning/ })).toHaveAttribute("aria-pressed", "true");
    expect(harness.invoke).not.toHaveBeenCalled();
  });
  it("requests a real quote, renders its total and never sends a new crew price to the legacy writer", async () => {
    mount("/app/book?service=airbnb"); await next();
    fireEvent.change(screen.getByLabelText("Where do you need us?"), { target: { value: "14 Example Street, Sandton" } });
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "More hours" }));
    fireEvent.click(screen.getByRole("button", { name: "2 Xooters" })); await next(); await next();
    await screen.findByText("No approved Xooters listed yet"); await next();
    await screen.findByLabelText("Reviewed quote");
    expect(harness.invoke).toHaveBeenCalledWith("get-booking-quote", { body: expect.objectContaining({ service: "airbnb", hours: 5.5, crewSize: 2, coverRequested: false }) });
    expect(screen.getByText(/^R\s?393$/)).toBeInTheDocument();
    expect(screen.getByText(/^R\s?432$/)).toBeInTheDocument();
    expect(screen.getByText("Online confirmation is not available yet")).toBeInTheDocument();
    expect(harness.invoke.mock.calls.every(([name]) => name === "get-booking-quote")).toBe(true);
  });
  it("shows corrected service/total and requires explicit, fresh acceptance", async () => {
    mount(); await next();
    fireEvent.change(screen.getByLabelText("Where do you need us?"), { target: { value: "14 Example Street, Sandton" } });
    fireEvent.click(screen.getByRole("button", { name: "Office" })); await next(); await next();
    await screen.findByText("No approved Xooters listed yet"); await next();
    const acceptance = await screen.findByRole("checkbox", { name: /I accept office cleaning/ });
    expect(acceptance).not.toBeChecked(); fireEvent.click(acceptance); expect(acceptance).toBeChecked();
    fireEvent.change(screen.getByLabelText("A friend’s invite?"), { target: { value: "FRIEND" } });
    expect(screen.queryByRole("checkbox", { name: /I accept/ })).not.toBeInTheDocument();
    expect(await screen.findByRole("checkbox", { name: /I accept/ })).not.toBeChecked();
    expect(screen.getByText(BOOKING_REFERRAL_MESSAGES.unknown_code)).toBeInTheDocument();
  });
  it("shows an error without any estimated price after a failed quote and can retry", async () => {
    harness.invoke.mockRejectedValueOnce(new Error("Offline")); mount(); await toReview();
    expect(await screen.findByRole("button", { name: "Try quote again" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Reviewed quote")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try quote again" }));
    expect(await screen.findByLabelText("Reviewed quote")).toBeInTheDocument();
  });
  it.each(["own_code", "already_used", "not_a_first_booking"] as const)("renders the server's %s explanation", async status => {
    harness.invoke.mockImplementation(async (_name, options) => {
      const result = await response(options.body); result.data.data.quote.referral = { code: "FRIEND", status }; return result;
    });
    mount(); await toReview();
    expect(await screen.findByText(BOOKING_REFERRAL_MESSAGES[status])).toBeInTheDocument();
  });
  it("ignores a late response after the customer changes the quote inputs", async () => {
    let resolveOld!: (value: Awaited<ReturnType<typeof response>>) => void;
    harness.invoke.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    mount(); await toReview();
    await waitFor(() => expect(harness.invoke).toHaveBeenCalledTimes(1));
    const oldBody = harness.invoke.mock.calls[0][1].body;
    fireEvent.change(screen.getByLabelText("A friend’s invite?"), { target: { value: "FRIEND" } });
    await screen.findByLabelText("Reviewed quote");
    await act(async () => resolveOld(await response(oldBody)));
    expect(screen.getByText(BOOKING_REFERRAL_MESSAGES.unknown_code)).toBeInTheDocument();
  });
  it("drops private input and quote consent when the account changes", async () => {
    const view = mount(); await toReview(); await screen.findByLabelText("Reviewed quote");
    harness.auth.user = { id: "buyer-two" }; view.rerender(view.refresh());
    expect(screen.getByText("What do you need done?")).toBeInTheDocument(); await next();
    expect(screen.getByLabelText("Where do you need us?")).toHaveValue("");
    expect(screen.queryByLabelText("Reviewed quote")).not.toBeInTheDocument();
  });
  it("carries a shared invite into the server quote without deciding eligibility", async () => {
    mount("/app/book?ref=XOOT_FRIEND"); await toReview();
    expect(screen.getByLabelText("A friend’s invite?")).toHaveValue("XOOT_FRIEND");
    await waitFor(() => expect(harness.invoke).toHaveBeenCalledWith("get-booking-quote", expect.objectContaining({ body: expect.objectContaining({ referralCode: "XOOT_FRIEND" }) })));
    expect(screen.getByText(BOOKING_REFERRAL_MESSAGES.unknown_code)).toBeInTheDocument();
  });
  it.each(["ABC", "%3Cscript%3E", "A".repeat(33)])("ignores a malformed invite link (%s) so the ordinary quote still loads", async code => {
    mount(`/app/book?ref=${code}`); await toReview();
    expect(screen.getByLabelText("A friend’s invite?")).toHaveValue("");
    expect(await screen.findByLabelText("Reviewed quote")).toBeInTheDocument();
    expect(harness.invoke).toHaveBeenCalledWith("get-booking-quote", expect.objectContaining({ body: expect.objectContaining({ referralCode: "" }) }));
  });
  it("offers no account benefits while authentication is loading", () => {
    harness.auth.loading = true; mount();
    expect(screen.getByRole("status")).toHaveTextContent("Loading your account");
    expect(harness.invoke).not.toHaveBeenCalled();
  });
});
