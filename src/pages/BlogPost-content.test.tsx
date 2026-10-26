import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import BlogPost from "./BlogPost";

vi.mock("@/components/xoot/Navbar", () => ({ Navbar: () => null }));
vi.mock("@/components/xoot/Footer", () => ({ Footer: () => null }));
vi.mock("@/components/SEO", () => ({ SEO: () => null }));
afterEach(cleanup);

const openArticle = (slug: string) => render(<MemoryRouter initialEntries={[`/articles/${slug}`]}><Routes><Route path="/articles/:slug" element={<BlogPost />} /></Routes></MemoryRouter>);

describe("practical Journal guides", () => {
  it("renders a usable handover checklist with an honest informational next step", () => {
    openArticle("after-clean-checklist-johannesburg");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("How to check a clean without doing it twice");
    expect(screen.getAllByRole("listitem").some(item => item.textContent === "The agreed next step is: ___")).toBe(true);
    const cta = screen.getByRole("heading", { name: "Your home. Handled." }).closest("section")!;
    expect(cta).toHaveTextContent("currently prelaunch");
    expect(cta).toHaveTextContent("an early sign-up does not confirm a visit");
    expect(within(cta).getByRole("link", { name: "Explore the planned services" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: "Book a clean" })).not.toBeInTheDocument();
  });

  it("exposes a labelled cadence table, row/column headings and ordered review questions", () => {
    openArticle("weekly-or-fortnightly-cleaning-johannesburg");
    const table = screen.getByRole("table", { name: "A starting rhythm for your household" });
    expect(within(table).getAllByRole("columnheader")).toHaveLength(3);
    expect(within(table).getByRole("rowheader", { name: "Fortnightly" })).toHaveAttribute("scope", "row");
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(screen.getByText("Is the work between visits manageable for our household?").closest("ol")).toBeInTheDocument();
    expect(screen.queryByText(/\| Rhythm \|/)).not.toBeInTheDocument();
    const cta = screen.getByRole("heading", { name: "A home that takes less managing" }).closest("section")!;
    expect(cta).toHaveTextContent("anticipated window");
    expect(within(cta).getByRole("link", { name: "Explore what Care+ is intended to support" })).toHaveAttribute("href", "/care-plus");
  });

  it("preserves the existing paragraph-only article layout and links", () => {
    openArticle("what-four-hours-actually-buys-you");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("What four hours actually buys you");
    expect(screen.getByRole("heading", { name: "Four hours of work, with four hours of expectations" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book a clean" })).toHaveAttribute("href", "/book");
  });
});
