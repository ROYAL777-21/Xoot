import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Journal } from "./Journal";
import { blogPosts } from "@/lib/blog-posts";

const renderJournal = () =>
  render(
    <MemoryRouter>
      <Journal />
    </MemoryRouter>,
  );

describe("Journal", () => {
  it("links real post routes, not a hash modal", () => {
    // The handoff opens articles at `#article-<id>` because a one-file prototype has nowhere
    // else to put them. This repo has `/blog/:slug`. A hash link here would be a silent
    // downgrade: unshareable, unindexable, and gone on refresh.
    renderJournal();
    const links = screen.getAllByRole("link");
    const hrefs = links.map((link) => link.getAttribute("href"));

    expect(hrefs).toContain("/blog");
    for (const href of hrefs) {
      expect(href).toMatch(/^\/blog(\/|$)/);
      expect(href).not.toMatch(/#article-/);
    }
  });

  it("shows the three newest posts, newest first", () => {
    // Sorted rather than sliced off the top of the file, because the file is in authoring
    // order. Getting this wrong shows a stale post as the lead and nobody notices for weeks.
    const expected = [...blogPosts]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 3);

    renderJournal();
    for (const post of expected) {
      expect(screen.getByText(post.title)).toBeInTheDocument();
    }

    const dates = [...document.querySelectorAll("time")].map((t) => t.getAttribute("dateTime"));
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("claims no authorship or audience it does not have", () => {
    // The handoff says the posts are "written by people who do this work" and answer "the
    // questions customers actually ask". Every post's author is the Xoot team, and zero
    // bookings have completed — there is nobody who has done the work, and no customers.
    renderJournal();
    const copy = document.body.textContent ?? "";
    expect(copy).not.toMatch(/people who do this work/i);
    expect(copy).not.toMatch(/customers actually ask/i);
    expect(copy).not.toMatch(/our customers/i);
  });

  it("counts the articles from the data rather than a hardcoded number", () => {
    // A number typed into copy stops being true the first time a post is added.
    renderJournal();
    expect(screen.getByText(new RegExp(`All ${blogPosts.length} articles`))).toBeInTheDocument();
  });
});
