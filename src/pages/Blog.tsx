import { SEO } from "@/components/SEO";
import { Footer } from "@/components/xoot/Footer";
import { Navbar } from "@/components/xoot/Navbar";
import { JournalCard } from "@/components/xoot/JournalCard";
import { blogPosts } from "@/lib/blog-posts";

const publishedBlogPosts = [...blogPosts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

const Blog = () => <div className="xoot-journal-page min-h-screen">
  <SEO title="Xoot Articles - Cleaning, Care+ and Johannesburg home-care guides" description="Practical notes on cleaning, Care+, Airbnb turnovers, office care and the questions to ask before booking." canonical="/articles" />
  <Navbar />
  <main className="xoot-public-section" id="articles">
    <div className="xoot-public-inner">
      <div className="xoot-section-head">
        <p className="xoot-section-eyebrow">The Xoot journal</p>
        <h1 className="xoot-section-title">Practical notes before you book.</h1>
        <p className="xoot-section-sub">No filler and no invented testimonials — what a home-services booking actually involves, written plainly by the Xoot team.</p>
      </div>
      <div className="xoot-journal-grid">{publishedBlogPosts.map(post => <JournalCard key={post.slug} post={post} />)}</div>
    </div>
  </main>
  <Footer />
</div>;
export default Blog;
