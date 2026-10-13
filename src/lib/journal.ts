import type { CSSProperties } from "react";
import type { BlogPost } from "./blog-posts";

// Topic treatments follow the handoff's Journal palette; authors and dates come from the registry.
export function journalTreatment(post: BlogPost) {
  const topic = `${post.slug} ${post.primaryKeyword}`;
  if (/safety|trust|legit|vetting/.test(topic)) return { label: "Trust & safety", tint: "mist" };
  if (/care-plus|care\+|same-cleaner|mental-load/.test(topic)) return { label: "Care+ & home", tint: "lilac" };
  if (/airbnb|host|turnover/.test(topic)) return { label: "Hosting", tint: "sage" };
  if (/launch|xooter|earn|comparison|alternatives/.test(topic)) return { label: "How we work", tint: "blush" };
  if (/price|pricing|cost/.test(topic)) return { label: "Pricing", tint: "petal" };
  return { label: "Guides", tint: "honey" };
}

export function journalStyle(post: BlogPost): CSSProperties {
  const { tint } = journalTreatment(post);
  return { "--journal-wash": `var(--xoot-${tint}-wash)`, "--journal-ink": `var(--xoot-${tint}-ink)` } as CSSProperties;
}

export const articleDateLabel = (iso: string, month: "short" | "long" = "short") =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-ZA", { day: "numeric", month, year: "numeric", timeZone: "UTC" });
