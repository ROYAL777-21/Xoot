import { SEO } from "@/components/SEO";
import { Footer } from "@/components/xoot/Footer";
import { Navbar } from "@/components/xoot/Navbar";
import { JournalCard } from "@/components/xoot/JournalCard";
import { getPublishedBlogPosts } from "@/lib/blog-posts";
import "@/styles/homepage-sections.css";
import "@/styles/public-editorial.css";

const Blog = () => <div className="min-h-screen bg-background">
  <SEO title="Xoot Articles - Cleaning, Care+ and Johannesburg home-care guides" description="Read Xoot articles on home cleaning, Care+, Airbnb turnovers and planning home care in Johannesburg. Bookings are not open yet." canonical="/articles" />
  <Navbar />
  <main>
    <section className="xoot-public-section" aria-labelledby="articles-title">
      <div className="xoot-public-inner">
        <div className="xoot-section-head" style={{ maxWidth: 620 }}>
          <p className="xoot-section-eyebrow">The Xoot journal</p>
          <h1 id="articles-title" className="xoot-section-title">Practical notes before you book.</h1>
          <p className="xoot-section-sub">Clear guides to caring for your home, planning a visit and understanding Xoot.</p>
        </div>
        <div className="xoot-journal-grid">{getPublishedBlogPosts().map(post => <JournalCard key={post.slug} post={post} heading="h2" />)}</div>
      </div>
    </section>
  </main>
  <Footer />
</div>;

export default Blog;
