import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TrustMechanisms } from "./TrustMechanisms";

const show = (page = false) => render(<MemoryRouter><TrustMechanisms page={page} /></MemoryRouter>);

describe("TrustMechanisms", () => {
  it("marks each unverified mechanism unavailable", () => {
    show();
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(6);
    for (const card of cards) expect(within(card).getByText("Not available yet")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Live now|Built and deployed|Screenshots blocked/);
    expect(screen.getByText(/Bookings are not open yet/)).toBeInTheDocument();
  });
  it("keeps emergencies and screening truthful", () => {
    show();
    expect(screen.getByText("Do not rely on Xoot for emergency assistance.")).toBeInTheDocument();
    expect(screen.getByText("There are no approved Xooters available to book yet.")).toBeInTheDocument();
    expect(screen.getByText(/No software can stop another phone/)).toBeInTheDocument();
    expect(screen.getByText("Withdrawal during a visit is not available yet.")).toBeInTheDocument();
  });
  it("uses one page heading on the actual destination and preserves policy links", () => {
    show(true);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Letting someone into your home");
    expect(screen.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/legal/privacy");
    expect(screen.getByRole("link", { name: "POPIA notice" })).toHaveAttribute("href", "/legal/popia");
    expect(screen.queryByRole("link", { name: "Trust centre" })).not.toBeInTheDocument();
  });
});
