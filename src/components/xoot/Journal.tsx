import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { blogPosts } from "@/lib/blog-posts";

/**
 * The journal teaser — ported from the 2026-09-03 handoff
 * (`design/handoff-2026-09-03/xoot/site/SiteBlog.jsx` → `Journal`).
 *
 * ── Structure deliberately not copied ─────────────────────────────────────────────────
 * The handoff reads articles in a hash-routed in-page modal (`#article-<id>`) because a
 * single-file prototype has nowhere else to put them. This repo already has real routes —
 * `/blog` and `/blog/:slug` in `App.tsx`, backed by 31 posts in `src/lib/blog-posts.ts`. The
 * handoff's own README says to match the visual output rather than the prototype's internals
 * "unless it happens to fit", and a modal does not fit: real URLs are shareable, indexable
 * and survive a refresh, which is most of the point of having a journal at all.
 *
 * So this is the section, with the cards linking out to the pages that already exist.
 *
 * ── Two claims changed ────────────────────────────────────────────────────────────────
 * The handoff's heading is *"Written by people who do this work"* and its sub-line promises
 * *"the questions customers actually ask"*.
 *
 * Neither survives a check. Every post's `author` is "Xoot Team", and **zero bookings have
 * completed** — so nobody at Xoot has yet done the work being written about, and there are no
 * customers whose questions these could be. Both are CPA s41 representations rather than
 * flourishes, and the honest version is barely weaker: these are the questions that come up
 * *before* someone books, which is exactly what the posts are.
 */

/** Newest first. Sorted here rather than trusting the file's order, which is authoring order. */
const RECENT = [...blogPosts]
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  .slice(0, 3);

const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export const Journal = () => {
  return (
    <section className="py-16 sm:py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            The Xoot journal
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            The questions that come up before you book.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            No filler — what a home-services booking actually involves, written plainly.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {RECENT.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <time dateTime={post.publishedAt}>{dateLabel(post.publishedAt)}</time>
                <span aria-hidden="true"> · </span>
                {post.readingTime}
              </p>
              <h3 className="mt-3 font-display text-xl font-bold leading-snug tracking-tight">
                {post.title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{post.excerpt}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Read it
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            All {blogPosts.length} articles
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
};
