import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Footer } from "@/components/xoot/Footer";
import { Navbar } from "@/components/xoot/Navbar";
import { getBlogPost, getPublishedBlogPosts } from "@/lib/blog-posts";
import { articleDateLabel, journalStyle, journalTreatment } from "@/lib/journal";
import "@/styles/homepage-sections.css";
import "@/styles/public-editorial.css";

const BlogPost = () => {
  const { slug } = useParams();
  const post = getBlogPost(slug);
  if (!post) return <div className="min-h-screen bg-background">
    <SEO title="Xoot Articles - Post not found" description="The requested Xoot article could not be found." canonical="/articles" noIndex />
    <Navbar />
    <main className="xoot-public-section"><div className="xoot-public-inner xoot-article-missing">
      <p className="xoot-section-eyebrow">The Xoot journal</p>
      <h1 className="xoot-section-title">Article not found</h1>
      <p className="xoot-section-sub">This guide may have moved or is not published yet.</p>
      <Link to="/articles" className="xoot-journal-all"><ArrowLeft size={17} aria-hidden="true" />Back to articles</Link>
    </div></main>
    <Footer />
  </div>;

  const published = getPublishedBlogPosts();
  const next = published[(published.findIndex(item => item.slug === post.slug) + 1) % published.length];
  const structuredData = [
    {
      "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title,
      description: post.description, datePublished: post.publishedAt,
      author: { "@type": "Organization", name: post.author },
      publisher: { "@type": "Organization", name: "Xoot", url: "https://xoot.co.za" },
      mainEntityOfPage: `https://xoot.co.za/articles/${post.slug}`,
      keywords: [post.primaryKeyword, ...post.secondaryKeywords].join(", "), areaServed: post.areas,
    },
    {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: post.faqs.map(faq => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
    },
  ];

  return <div className="min-h-screen bg-background">
    <SEO title={post.seoTitle} description={post.description} canonical={`/articles/${post.slug}`} ogType="article" jsonLd={structuredData} />
    <Navbar />
    <main className="xoot-public-section xoot-reading-page">
      <div className="xoot-public-inner">
        <Link to="/articles" className="xoot-reader-back"><ArrowLeft size={17} aria-hidden="true" />Back to the journal</Link>
        <article className="xoot-reader" style={journalStyle(post)}>
          <header>
            <div className="xoot-journal-meta"><span className="xoot-reader-topic">{journalTreatment(post).label}</span><span><time dateTime={post.publishedAt}>{articleDateLabel(post.publishedAt)}</time> · {post.readingTime}</span></div>
            <h1>{post.title}</h1>
            <p className="xoot-reader-dek">{post.excerpt}</p>
            <p className="xoot-reader-author">{post.author}</p>
          </header>
          <div className="xoot-reader-body">
            {post.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2>{section.body.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}
            <section className="xoot-reader-faq"><h2>Quick answers</h2>{post.faqs.map(faq => <div key={faq.question}><h3>{faq.question}</h3><p>{faq.answer}</p></div>)}</section>
            <div className="xoot-reader-cta"><p>Bookings are not open yet. Explore the service and what is planned for your home.</p><Link className="xoot-action" to="/book">Explore a visit</Link></div>
            {next && next.slug !== post.slug && <Link to={`/articles/${next.slug}`} className="xoot-reader-next"><span><span>Read next</span><strong>{next.title}</strong></span><ArrowRight size={17} aria-hidden="true" /></Link>}
          </div>
        </article>
      </div>
    </main>
    <Footer />
  </div>;
};

export default BlogPost;
