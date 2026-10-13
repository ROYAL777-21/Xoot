import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { BlogPost } from "@/lib/blog-posts";
import { articleDateLabel, journalStyle, journalTreatment } from "@/lib/journal";

export function JournalCard({ post, heading = "h3" }: { post: BlogPost; heading?: "h2" | "h3" }) {
  const Heading = heading;
  return <Link to={`/articles/${post.slug}`} className="xoot-journal-card" style={journalStyle(post)}>
    <div className="xoot-journal-meta"><span className="xoot-journal-topic">{journalTreatment(post).label}</span><span>{post.readingTime}</span></div>
    <Heading>{post.title}</Heading>
    <p>{post.excerpt}</p>
    <div className="xoot-journal-card__end"><span>Read it <ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" /></span><time dateTime={post.publishedAt}>{articleDateLabel(post.publishedAt)}</time></div>
  </Link>;
}
