import { fireEvent, render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Blog from "./Blog";
import BlogPost from "./BlogPost";
import { getPublishedBlogPosts } from "@/lib/blog-posts";

vi.mock("@/components/xoot/Navbar", () => ({ Navbar: () => <nav aria-label="Site navigation" /> }));
vi.mock("@/components/xoot/Footer", () => ({ Footer: () => <footer /> }));

const show = (path: string) => render(<HelmetProvider><MemoryRouter initialEntries={[path]}><Routes>
  <Route path="/articles" element={<Blog />} /><Route path="/articles/:slug" element={<BlogPost />} />
  <Route path="/blog" element={<Blog />} /><Route path="/blog/:slug" element={<BlogPost />} />
</Routes></MemoryRouter></HelmetProvider>);

describe("Journal destinations", () => {
  it.each(["/articles", "/blog"])("opens %s and navigates its lead card to a real article", path => {
    const latest = getPublishedBlogPosts()[0];
    show(path);
    const card = screen.getAllByRole("link").find(link => link.getAttribute("href") === `/articles/${latest.slug}`);
    expect(card).toBeDefined();
    fireEvent.click(card!);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(latest.title);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", `https://xoot.co.za/articles/${latest.slug}`);
    expect(screen.getByText(latest.author)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore a visit" })).toHaveAttribute("href", "/book");
    expect(document.body.textContent).toContain("Bookings are not open yet.");
  });
  it.each(["/articles", "/blog"])("supports direct detail entry at %s", base => {
    const post = getPublishedBlogPosts()[1];
    show(`${base}/${post.slug}`);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(post.title);
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute("href", `https://xoot.co.za/articles/${post.slug}`);
    fireEvent.click(screen.getByRole("link", { name: "Back to the journal" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Practical notes before you book.");
  });
  it("provides a noindex recovery route for unknown slugs", () => {
    show("/articles/unknown-article");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Article not found");
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex,nofollow");
    fireEvent.click(screen.getByRole("link", { name: "Back to articles" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Practical notes before you book.");
  });
  it("lets a reader continue to another published article", () => {
    const published = getPublishedBlogPosts();
    show(`/articles/${published[0].slug}`);
    fireEvent.click(screen.getByRole("link", { name: `Read next ${published[1].title}` }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(published[1].title);
  });
});
