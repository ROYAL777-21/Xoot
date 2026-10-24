import { blogPosts } from "./blog-posts";

/** Editorial order from SiteBlog.jsx. New SEO posts must not displace these six stories. */
export const JOURNAL_SLUGS = [
  "what-four-hours-actually-buys-you",
  "what-vetted-should-mean",
  "what-a-xooter-takes-home",
  "giving-a-stranger-your-gate-code",
  "employing-someone-or-booking-visits",
  "why-we-are-only-in-gauteng"
] as const;

export const journalPosts = JOURNAL_SLUGS.flatMap(slug => blogPosts.filter(post => post.slug === slug));
export const journalTitle = "Written by people who do this work.";
export const journalDescription = "No filler. The questions customers actually ask, answered by someone who knows the answer.";
