import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { articleDate, journalTheme } from "@/components/xoot/JournalCard";

import { SEO } from "@/components/SEO";
import { Footer } from "@/components/xoot/Footer";
import { Navbar } from "@/components/xoot/Navbar";
import { getBlogPost } from "@/lib/blog-posts";

const BlogPost = () => {
  const { slug } = useParams();
  const post = getBlogPost(slug);

  if (!post) {
    return (
      <div className="xoot-journal-page min-h-screen">
        <SEO
          title="Xoot Articles - Post not found"
          description="The requested Xoot article could not be found."
          canonical="/articles"
          noIndex
        />
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-32 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-primary">Xoot Articles</p>
          <h1 className="mt-3 font-display text-3xl font-bold">Post not found</h1>
          <p className="mt-3 text-muted-foreground">This guide may have moved or is not published yet.</p>
          <Link to="/articles" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <ArrowLeft className="h-4 w-4" />
            Back to articles
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const theme = journalTheme(post);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt,
      author: { "@type": "Organization", name: post.author },
      publisher: { "@type": "Organization", name: "Xoot", url: "https://xoot.co.za" },
      mainEntityOfPage: `https://xoot.co.za/articles/${post.slug}`,
      keywords: [post.primaryKeyword, ...post.secondaryKeywords].join(", "),
      areaServed: post.areas,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={post.seoTitle}
        description={post.description}
        canonical={`/articles/${post.slug}`}
        ogType="article"
        jsonLd={structuredData}
      />
      <Navbar />
      <main className="xoot-public-section xoot-journal-page">
        <div className="xoot-public-inner">
          <article className="xoot-journal-reader" data-tint={theme.tint}>
            <header>
              <Link to="/articles" className="xoot-journal-read"><ArrowLeft size={16} /> Back to the journal</Link>
              <div className="xoot-journal-meta mt-6"><span className="xoot-journal-kicker">{theme.label}</span><span><time dateTime={post.publishedAt}>{articleDate(post.publishedAt)}</time> · {post.readingTime}</span></div>
              <h1>{post.title}</h1>
            </header>
            <div className="xoot-journal-reader__body">
              <div><p>{post.excerpt}</p><p className="text-sm">{post.author}</p></div>
              {post.sections.map(section => <section key={section.heading}>
                <h2>{section.heading}</h2>
                {section.body.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              </section>)}
              {post.faqs.length > 0 && <section className="xoot-reader-faq"><h2>Quick answers</h2>{post.faqs.map(faq => <div key={faq.question}><h3>{faq.question}</h3><p>{faq.answer}</p></div>)}</section>}
              <section className="xoot-journal-reader__cta"><h2>Ready for Xoot?</h2><p>Choose your service, review the details and continue through the booking flow.</p><div className="mt-5 flex flex-wrap gap-3"><Link to="/book" className="xoot-action">Book a clean</Link><Link to="/care-plus" className="xoot-action xoot-action--outline">Explore Care+</Link></div></section>
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPost;
