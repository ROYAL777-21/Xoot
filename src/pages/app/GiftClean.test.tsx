import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GiftOrderError, quoteGift } from "@/lib/gift-order";
import GiftClean from "./GiftClean";

const harness = vi.hoisted(() => ({
  auth: {
    user: { id: "purchaser-a", user_metadata: { full_name: "Sender A" } } as {
      id: string;
      user_metadata: { full_name: string };
    } | null,
    loading: false,
  },
  navigate: vi.fn(),
  loadQuote: vi.fn(),
  saveOrder: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => harness.auth }));
vi.mock("react-router-dom", async (load) => ({
  ...(await load<typeof import("react-router-dom")>()),
  useNavigate: () => harness.navigate,
}));
vi.mock("@/lib/gift-order", async (load) => ({
  ...(await load<typeof import("@/lib/gift-order")>()),
  loadGiftQuote: harness.loadQuote,
  saveGiftOrder: harness.saveOrder,
}));

function mount(url = "/gifts") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const App = () => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <GiftClean />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { ...render(<App />), refresh: () => <App /> };
}
async function personalise() {
  fireEvent.click(
    screen.getByRole("button", { name: "Continue" }),
  );
  fireEvent.change(screen.getByLabelText("Their name"), {
    target: { value: "Recipient A" },
  });
  fireEvent.change(screen.getByLabelText("Their email"), {
    target: { value: "recipient@example.test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Save gift request" }),
    ).toBeEnabled(),
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  harness.auth = {
    user: { id: "purchaser-a", user_metadata: { full_name: "Sender A" } },
    loading: false,
  };
  harness.loadQuote.mockImplementation(async (service, count) => ({
    quote: quoteGift(service, count),
    checkout_available: false,
  }));
});
afterEach(cleanup);

describe("gift request journey (isolated UI test data)", () => {
  it("preserves selected moving service and quantity through the sign-in handoff", () => {
    harness.auth.user = null;
    mount("/gifts?service=moving&visits=6");
    fireEvent.click(
      screen.getByRole("button", { name: "Sign in to continue" }),
    );
    expect(harness.navigate).toHaveBeenCalledWith("/auth", {
      state: {
        from: { pathname: "/gifts", search: "?service=moving&visits=6" },
      },
    });
    expect(harness.saveOrder).not.toHaveBeenCalled();
  });

  it("does not allow a request using the displayed estimate after the server quote fails", async () => {
    harness.loadQuote.mockRejectedValue(new Error("Offline"));
    mount();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue" }),
    );
    fireEvent.change(screen.getByLabelText("Their name"), {
      target: { value: "Recipient A" },
    });
    fireEvent.change(screen.getByLabelText("Their email"), {
      target: { value: "recipient@example.test" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Review" }),
    );
    await screen.findByText(/The gift quote could not be confirmed/);
    expect(
      screen.getByRole("button", { name: "Save gift request" }),
    ).toBeDisabled();
    expect(harness.saveOrder).not.toHaveBeenCalled();
  });

  it("shows a changed server price and requires another click, reusing the retry key", async () => {
    const original = quoteGift("regular", 3);
    const revised = {
      ...original,
      version: "next-version",
      basePerVisitCents: original.basePerVisitCents + 100,
      perVisitCents: original.perVisitCents + 100,
      totalCents: original.totalCents + 300,
    };
    harness.loadQuote
      .mockResolvedValueOnce({ quote: original, checkout_available: false })
      .mockResolvedValue({ quote: revised, checkout_available: false });
    harness.saveOrder
      .mockRejectedValueOnce(
        new GiftOrderError(
          "The gift price changed. Review the revised total before saving.",
          revised,
        ),
      )
      .mockResolvedValueOnce({
        order_id: "gift-1",
        status: "pending_payment",
        quote: revised,
      });
    mount();
    await personalise();
    fireEvent.click(screen.getByRole("button", { name: "Save gift request" }));
    await screen.findByText("R1 008");
    expect(harness.saveOrder).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Save gift request" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save gift request" }));
    await screen.findByRole("heading", { name: "Gift request saved" });
    expect(harness.saveOrder.mock.calls[1][1]).toEqual(revised);
    expect(harness.saveOrder.mock.calls[1][2]).toBe(
      harness.saveOrder.mock.calls[0][2],
    );
    expect(screen.getByText(/Payment is pending/)).toBeInTheDocument();
  });

  it("clears the previous account’s recipient and personalisation when the account changes", () => {
    const mounted = mount();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue" }),
    );
    fireEvent.change(screen.getByLabelText("Their name"), {
      target: { value: "Private recipient" },
    });
    harness.auth.user = {
      id: "purchaser-b",
      user_metadata: { full_name: "Sender B" },
    };
    mounted.rerender(mounted.refresh());
    expect(
      screen.queryByDisplayValue("Private recipient"),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue" }),
    );
    expect(screen.getByLabelText("Their name")).toHaveValue("");
    expect(screen.getByLabelText("Your name")).toHaveValue("Sender B");
  });

  it("does not mislabel a cancelled replay as pending payment", async () => {
    harness.saveOrder.mockResolvedValue({
      order_id: "gift-cancelled",
      status: "cancelled",
      quote: quoteGift("regular", 3),
      replayed: true,
    });
    mount();
    await personalise();
    fireEvent.click(screen.getByRole("button", { name: "Save gift request" }));
    await screen.findByText("Status: Cancelled");
    expect(screen.queryByText(/Payment is pending/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(harness.navigate).toHaveBeenCalledWith("/#gift");
  });
});
