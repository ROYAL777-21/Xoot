import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { BookingCarePlusTip } from "./BookingCarePlusTip";
import { parseBookingQuoteInput, quoteBooking } from "../../../supabase/functions/_shared/booking-quote";
import { createBookingInput } from "@/lib/booking-flow";
import type { ReviewedBookingQuote } from "@/lib/booking-contract";

const reviewed = (member = false, credits = 0): ReviewedBookingQuote => ({
  ...quoteBooking(parseBookingQuoteInput({...createBookingInput("regular"),requestedCreditCents:credits}, Date.now()), {
    buyerId: "synthetic-buyer", carePlusMember: member, availableCreditCents: credits,
    referralRecord: null, completedBookingCount: 0, hasPriorRedemption: false, coverAvailable: false,
  }), fingerprint: "a".repeat(64),
});
const mount = (quote: ReviewedBookingQuote) => render(<MemoryRouter><BookingCarePlusTip quote={quote} /></MemoryRouter>);
afterEach(cleanup);

describe("Care+ booking fee guidance", () => {
  it("uses the quote fee, names the membership cost and requires confirmation without promising a new total", () => {
    const quote = reviewed(); const before = structuredClone(quote); mount(quote);
    expect(screen.getByRole("heading", { name: /Save R\s?39 on the booking fee/ })).toBeInTheDocument();
    expect(screen.getByText(/Membership is R\s?99\/month/)).toBeInTheDocument();
    expect(screen.getByText(/Benefits apply after membership confirmation/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See Care\+ benefits/ })).toHaveAttribute("target", "_blank");
    expect(quote).toEqual(before);
  });
  it("acknowledges the server-confirmed member benefit instead of selling another membership", () => {
    mount(reviewed(true));
    expect(screen.getByRole("heading", { name: "Your booking fee is waived" })).toBeInTheDocument();
    expect(screen.getByText(/already included in this reviewed quote/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(/Save R/)).not.toBeInTheDocument();
  });
  it("does not turn credit use into a promise that the cash total will fall", () => {
    const quote = reviewed(false,100_000); mount(quote); expect(quote.totalCents).toBe(5000);
    expect(screen.getByRole("heading")).toHaveTextContent(/on the booking fee/);
    expect(screen.queryByText(/total|pay only|free month|15%/i)).not.toBeInTheDocument();
  });
  it.each(["zero_fee", "missing_member", "inconsistent_fee", "duplicate_fee"])("hides unsupported savings (%s)", shape => {
    const quote = reviewed();
    if (shape === "zero_fee") { quote.bookingFeeCents = 0; quote.lines.find(line => line.id === "booking_fee")!.amountCents = 0; }
    if (shape === "missing_member") Reflect.deleteProperty(quote, "carePlusMember");
    if (shape === "inconsistent_fee") quote.bookingFeeCents = 1;
    if (shape === "duplicate_fee") quote.lines.push({id:"booking_fee",label:"Duplicate fixture",amountCents:3900});
    mount(quote); expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});
