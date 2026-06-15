import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, MapPin, Search } from "lucide-react";

import { SEO } from "@/components/SEO";
import { Footer } from "@/components/zoot/Footer";
import { Navbar } from "@/components/zoot/Navbar";
import { blogPosts } from "@/lib/blog-posts";

const Blog = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Zoot Articles - Cleaning, Care+ and Johannesburg home-care guides"
        description="Read Zoot articles for trusted cleaning, Care+, Airbnb turnovers, office cleaning and premium home-care services in Johannesburg launch areas."
        canonical="/articles"
      />
      <Navbar />
      <main className="pt-28">
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-soft px-3 py-1 text-xs font-semibold text-sage-deep">
              <Search className="h-3.5 w-3.5" />
              Local cleaning guides
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Zoot Articles
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Practical, human guides for premium cleaning, trusted Zooters, Care+, Airbnb turnovers, office resets, and launch-area home care across Johannesburg.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          {blogPosts.map((post) => (
            <article key={post.slug} className="rounded-2xl border border-border bg-card p-5 shadow-card transition-smooth hover:-translate-y-1 hover:shadow-warm sm:p-6">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(post.publishedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span>{post.readingTime}</span>
              </div>
              <h2 className="font-display text-2xl font-bold leading-tight text-foreground">
                <Link to={`/articles/${post.slug}`} className="hover:text-primary">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {post.areas.slice(0, 5).map((area) => (
                  <span key={area} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {area}
                  </span>
                ))}
              </div>
              <Link to={`/articles/${post.slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-smooth hover:gap-3">
                Read guide
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
