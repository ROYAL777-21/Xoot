import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Journal } from "./Journal";
import { getPublishedBlogPosts } from "@/lib/blog-posts";

const show = () => render(<MemoryRouter><Journal /></MemoryRouter>);

describe("Journal", () => {
  it("links to canonical, refreshable article routes", () => {
    show();
    for (const link of screen.getAllByRole("link")) expect(link.getAttribute("href")).toMatch(/^\/articles(\/|$)/);
  });
  it("shows the six newest published articles, in release order", () => {
    show();
    const expected = getPublishedBlogPosts().slice(0, 6);
    expect(screen.getAllByRole("heading", { level: 3 }).map(heading => heading.textContent)).toEqual(expected.map(post => post.title));
    expect([...document.querySelectorAll("time")].map(time => time.dateTime)).toEqual(expected.map(post => post.publishedAt));
  });
  it("uses the published count and avoids implementation commentary", () => {
    show();
    expect(screen.getByRole("link", { name: `All ${getPublishedBlogPosts().length} articles` })).toHaveAttribute("href", "/articles");
    expect(document.body.textContent).not.toMatch(/invented testimonials|people who do this work|customers actually ask/);
  });
});
