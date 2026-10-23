import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { blogPosts } from "@/lib/blog-posts";
import { JournalCard } from "./JournalCard";

const RECENT = [...blogPosts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 6);

/** Handoff SiteBlog card layout, with reviewed articles at real, shareable URLs. */
export const Journal = () => <section id="articles" className="xoot-public-section xoot-journal" aria-labelledby="journal-title">
  <div className="xoot-public-inner">
    <div className="xoot-section-head">
      <p className="xoot-section-eyebrow">The Xoot journal</p>
      <h2 id="journal-title" className="xoot-section-title">Practical notes before you book.</h2>
      <p className="xoot-section-sub">No filler and no invented testimonials — what a home-services booking actually involves, written plainly by the Xoot team.</p>
    </div>
    <div className="xoot-journal-grid">{RECENT.map(post => <JournalCard key={post.slug} post={post} />)}</div>
    <Link to="/articles" className="xoot-journal-all">All {blogPosts.length} articles <ArrowRight size={16} aria-hidden="true" /></Link>
  </div>
</section>;
