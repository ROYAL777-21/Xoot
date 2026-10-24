import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

type SEOProps = {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  noIndex?: boolean;
  ogType?: "website" | "article";
  jsonLd?: unknown;
};

const siteUrl = "https://xoot.co.za";
const defaultImage = `${siteUrl}/og-image.png`;

export const SEO = ({
  title,
  description,
  canonical,
  image = defaultImage,
  noIndex = false,
  ogType = "website",
  jsonLd,
}: SEOProps) => {
  const canonicalUrl = canonical ? `${siteUrl}${canonical}` : siteUrl;
  const robots = noIndex ? "noindex,nofollow" : "index,follow";

  useEffect(() => {
    document.title = title;

    const setMeta = (selector: string, attribute: "content" | "href", value: string, create?: () => HTMLElement) => {
      const existing = document.querySelector<HTMLElement>(selector) ?? create?.();
      existing?.setAttribute(attribute, value);
    };

    const createMeta = (name: string) => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", name);
      document.head.appendChild(meta);
      return meta;
    };

    const createPropertyMeta = (property: string) => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", property);
      document.head.appendChild(meta);
      return meta;
    };

    setMeta('meta[name="description"]', "content", description, () => createMeta("description"));
    setMeta('meta[name="robots"]', "content", robots, () => createMeta("robots"));
    setMeta('link[rel="canonical"]', "href", canonicalUrl, () => {
      const link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
      return link;
    });
    setMeta('meta[property="og:title"]', "content", title, () => createPropertyMeta("og:title"));
    setMeta('meta[property="og:description"]', "content", description, () => createPropertyMeta("og:description"));
    setMeta('meta[property="og:url"]', "content", canonicalUrl, () => createPropertyMeta("og:url"));
    setMeta('meta[property="og:type"]', "content", ogType, () => createPropertyMeta("og:type"));
    setMeta('meta[property="og:image"]', "content", image, () => createPropertyMeta("og:image"));
    setMeta('meta[name="twitter:title"]', "content", title, () => createMeta("twitter:title"));
    setMeta('meta[name="twitter:description"]', "content", description, () => createMeta("twitter:description"));
    setMeta('meta[name="twitter:image"]', "content", image, () => createMeta("twitter:image"));
  }, [canonicalUrl, description, image, ogType, robots, title]);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta name="robots" content={robots} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:locale" content="en_ZA" />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {jsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd).replace(/</g, "\\u003c")}
        </script>
      ) : null}
    </Helmet>
  );
};
