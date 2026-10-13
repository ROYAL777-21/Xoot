import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getPublishedBlogPosts } from "@/lib/blog-posts";
import { JournalCard } from "./JournalCard";
import "@/styles/homepage-sections.css";
import "@/styles/public-editorial.css";

/** SiteBlog.jsx's six-card composition, using the approved published registry and real routes. */
export function Journal() {
  const published = getPublishedBlogPosts();
  return <section id="articles" className="xoot-public-section" aria-labelledby="journal-title">
    <div className="xoot-public-inner">
      <div className="xoot-section-head" style={{ maxWidth: 620 }}>
        <p className="xoot-section-eyebrow">The Xoot journal</p>
        <h2 id="journal-title" className="xoot-section-title">Practical notes before you book.</h2>
        <p className="xoot-section-sub">Clear guides to caring for your home, planning a visit and understanding Xoot.</p>
      </div>
      <div className="xoot-journal-grid">{published.slice(0, 6).map(post => <JournalCard post={post} key={post.slug} />)}</div>
      <Link to="/articles" className="xoot-journal-all">All {published.length} articles <ArrowRight size={17} aria-hidden="true" /></Link>
    </div>
  </section>;
}
