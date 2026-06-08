import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, MapPin, Search } from "lucide-react";

import { Footer } from "@/components/zoot/Footer";
import { Navbar } from "@/components/zoot/Navbar";
import { getBlogPost } from "@/lib/blog-posts";

const setMetaDescription = (description: string) => {
  const existing = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (existing) existing.content = description;
};

const BlogPost = () => {
  const { slug } = useParams();
  const post = getBlogPost(slug);

  useEffect(() => {
    if (!post) {
      document.title = "Zoot Blog - Post not found";
      setMetaDescription("The requested Zoot blog post could not be found.");
      return;
    }

    document.title = post.seoTitle;
    setMetaDescription(post.description);
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-32 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-primary">Zoot Blog</p>
          <h1 className="mt-3 font-display text-3xl font-bold">Post not found</h1>
          <p className="mt-3 text-muted-foreground">This guide may have moved or is not published yet.</p>
          <Link to="/blog" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <ArrowLeft className="h-4 w-4" />
            Back to blog
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-28">
        <article className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 lg:px-8">
          <Link to="/blog" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-smooth hover:gap-3">
            <ArrowLeft className="h-4 w-4" />
            Back to Zoot Blog
          </Link>

          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-soft px-3 py-1 text-xs font-semibold text-sage-deep">
            <Search className="h-3.5 w-3.5" />
            {post.primaryKeyword}
          </div>

          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            {post.title}
          </h1>

          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{post.author}</span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {new Date(post.publishedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            <span>{post.readingTime}</span>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {post.areas.map((area) => (
              <span key={area} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {area}
              </span>
            ))}
          </div>

          <div className="mt-10 space-y-9">
            {post.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">{section.heading}</h2>
                <div className="mt-4 space-y-4 text-base leading-8 text-muted-foreground">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className="mt-12 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">Quick answers</h2>
            <div className="mt-5 space-y-5">
              {post.faqs.map((faq) => (
                <div key={faq.question}>
                  <h3 className="font-semibold text-foreground">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10 rounded-2xl border border-primary/20 bg-accent-soft p-5 sm:p-6">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">Ready for Zoot?</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Book trusted home care, save your preferences, and keep booking details inside the app.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/auth" className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-smooth hover:bg-primary/90">
                Book a clean
              </Link>
              <Link to="/care-plus" className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition-smooth hover:bg-muted">
                Explore Care+
              </Link>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPost;
