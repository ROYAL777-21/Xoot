import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Reviews } from "./Reviews";
import { customerReviews } from "@/content/customer-reviews";

afterEach(cleanup);
describe("Approved customer reviews", () => {
  it("renders the supplied words, names and individual ratings as text", () => {
    render(<Reviews />);
    for (const review of customerReviews) {
      expect(screen.getByText(review.quote)).toBeInTheDocument();
      expect(screen.getByText(review.name)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("img", { name: "5 out of 5 stars" })).toHaveLength(8);
    expect(screen.getByText("Customer experiences shared with permission.")).toBeInTheDocument();
  });
  it("does not invent booking verification, an aggregate score or Xooter testimonials", () => {
    render(<Reviews />);
    expect(screen.queryByText(/verified booking|5\.0|60 reviews|Published reviews are coming/i)).not.toBeInTheDocument();
    expect(screen.getByText("Xooter stories are coming. Only feedback shared with permission will appear here.")).toBeInTheDocument();
    expect(screen.queryByText(/Concierge|welcome add-on credit|Care\+ reminders/i)).not.toBeInTheDocument();
  });
});
