import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Journal } from "./Journal";
import { blogPosts } from "@/lib/blog-posts";

// Model the next SEO publication before Journal computes its initial selection.
vi.mock("@/lib/blog-posts", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/blog-posts")>();
  return { ...actual, blogPosts: [...actual.blogPosts, { ...actual.blogPosts[0], slug: "newer-seo-story", title: "A newer SEO story", publishedAt: "2099-01-01" }] };
});

const renderJournal = () =>
  render(
    <MemoryRouter>
      <Journal />
    </MemoryRouter>,
  );

describe("Journal", () => {
  it("links real post routes, not a hash modal", () => {
    // The handoff opens articles at `#article-<id>` because a one-file prototype has nowhere
    // else to put them. This repo has `/articles/:slug`. A hash link here would be a silent
    // downgrade: unshareable, unindexable, and gone on refresh.
    renderJournal();
    const links = screen.getAllByRole("link");
    const hrefs = links.map((link) => link.getAttribute("href"));

    expect(hrefs).toContain("/articles");
    for (const href of hrefs) {
      expect(href).toMatch(/^\/articles(\/|$)/);
      expect(href).not.toMatch(/#article-/);
    }
  });

  it("keeps the six handoff stories in editorial order when newer SEO posts exist", () => {
    const expected = [
      "what-four-hours-actually-buys-you", "what-vetted-should-mean", "what-a-xooter-takes-home",
      "giving-a-stranger-your-gate-code", "employing-someone-or-booking-visits", "why-we-are-only-in-gauteng",
    ];
    renderJournal();
    expect(screen.getAllByRole("link").slice(0, 6).map(link => link.getAttribute("href"))).toEqual(expected.map(slug => `/articles/${slug}`));
    expect(screen.queryByText("A newer SEO story")).not.toBeInTheDocument();
    expected.forEach(slug => expect(blogPosts.find(post => post.slug === slug)?.sections.length).toBeGreaterThanOrEqual(4));
  });

  it("restores the handoff heading and category colours", () => {
    renderJournal();
    expect(screen.getByRole("heading", { level: 2, name: "Written by people who do this work." })).toBeInTheDocument();
    const cards = document.querySelectorAll(".xoot-journal-card");
    expect([...cards].map(card => card.getAttribute("data-tint"))).toEqual(["petal", "mist", "sage", "lilac", "honey", "blush"]);
  });

  it("counts the articles from the data rather than a hardcoded number", () => {
    // A number typed into copy stops being true the first time a post is added.
    renderJournal();
    expect(screen.getByText(new RegExp(`All ${blogPosts.length} articles`))).toBeInTheDocument();
  });
});
