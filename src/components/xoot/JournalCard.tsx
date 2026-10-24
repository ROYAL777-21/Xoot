import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "@/lib/blog-posts";
import "@/styles/journal.css";

export function journalTheme(post: BlogPost) {
  if (post.journal) return post.journal;
  const text = `${post.title} ${post.primaryKeyword}`.toLowerCase();
  if (/safety|vett|trust|gate code|access detail/.test(text)) return { label: "Trust & safety", tint: "mist" };
  if (/care\+|care plus|membership|memory/.test(text)) return { label: "Care+", tint: "blush" };
  if (/price|pricing|cost|hour|commission/.test(text)) return { label: "Pricing", tint: "petal" };
  if (/airbnb|office|property|turnover/.test(text)) return { label: "How we work", tint: "sage" };
  return { label: "Guides", tint: "honey" };
}

export const articleDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function JournalCard({ post }: { post: BlogPost }) {
  const theme = journalTheme(post);
  return <Link to={`/articles/${post.slug}`} className="xoot-journal-card" data-tint={theme.tint}>
    <div className="xoot-journal-meta"><span className="xoot-journal-kicker">{theme.label}</span><span>{post.readingTime}</span></div>
    <h3>{post.title}</h3>
    <p>{post.excerpt}</p>
    <span className="xoot-journal-read">Read it <ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" /></span>
  </Link>;
}
