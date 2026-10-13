import { describe, expect, it } from "vitest";
import { articleReleaseDate, blogPosts, getBlogPost, getPublishedBlogPosts } from "./blog-posts";

// Isolated synthetic editorial dates; no account, review or booking fixtures.
describe("published article selection", () => {
  it("selects eligible dates before sorting, without changing the registry", () => {
    const dated = [
      { ...blogPosts[0], slug: "older", publishedAt: "2026-09-30" },
      { ...blogPosts[0], slug: "future", publishedAt: "2026-10-13" },
      { ...blogPosts[0], slug: "today", publishedAt: "2026-10-12" },
    ];
    expect(getPublishedBlogPosts("2026-10-12", dated).map(post => post.slug)).toEqual(["today", "older"]);
    expect(dated.map(post => post.slug)).toEqual(["older", "future", "today"]);
  });
  it("uses the Johannesburg publication day at a UTC date boundary", () => {
    expect(articleReleaseDate(new Date("2026-10-11T22:30:00Z"))).toBe("2026-10-12");
  });
  it("does not expose a future release through a direct slug", () => {
    const latest = getPublishedBlogPosts("2026-10-12")[0];
    expect(getBlogPost(latest.slug, "2026-01-01")).toBeNull();
    expect(getBlogPost(latest.slug, "2026-10-12")).toBe(latest);
    expect(getBlogPost("unknown-article", "2026-10-12")).toBeNull();
  });
});
