import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Merch } from "./Merch";

describe("Merch", () => {
  it("collects no personal information, because nothing exists to store it in", () => {
    // The handoff pairs this section with an email capture whose only destination is
    // `useState`. Under POPIA an email address is personal information and needs a stated
    // purpose and a real record. A form that accepts an address, says "you're on the list"
    // and discards it is worse than no form: the person finds out at launch.
    //
    // This guard is the reason the omission survives a later "we forgot the signup" pass.
    const { container } = render(<Merch />);
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("input")).toBeNull();
    expect(container.querySelector('[type="email"]')).toBeNull();
  });

  it("says plainly that none of it is for sale", () => {
    // The section head is the whole compliance story: three products that do not exist yet,
    // labelled as such. Losing either line turns a showcase into an offer.
    render(<Merch />);
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    expect(screen.getByText(/not on sale yet/i)).toBeInTheDocument();
  });

  it("shows no price, and offers no way to buy", () => {
    render(<Merch />);
    const copy = document.body.textContent ?? "";
    expect(copy).not.toMatch(/R\s?\d/);
    expect(copy).not.toMatch(/\bbuy\b/i);
    expect(copy).not.toMatch(/add to (bag|cart|basket)/i);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
