import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const siteUrl = "https://zoothome.co.za";
const blogPostsPath = path.join(root, "src/lib/blog-posts.ts");
const sitemapPath = path.join(root, "public/sitemap.xml");
const queuePath = path.join(root, "content/seo/generated/daily-blog-queue.json");

const readOptionalJson = async (filePath) => {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
};

const text = await readFile(blogPostsPath, "utf8");
const sitemap = await readFile(sitemapPath, "utf8");
const queue = await readOptionalJson(queuePath);

const postBlocks = [...text.matchAll(/^  \{\r?\n\s+slug:\s*"([^"]+)"[\s\S]*?^  \},/gm)].map((match) => ({
  slug: match[1],
  body: match[0],
}));

const errors = [];
const slugs = new Set();
const today = new Date().toISOString().slice(0, 10);

if (postBlocks.length === 0) {
  errors.push("No published article blocks were found in src/lib/blog-posts.ts.");
}

for (const post of postBlocks) {
  if (slugs.has(post.slug)) {
    errors.push(`Duplicate article slug: ${post.slug}`);
  }
  slugs.add(post.slug);

  const requiredFields = [
    "title",
    "seoTitle",
    "description",
    "excerpt",
    "publishedAt",
    "readingTime",
    "author",
    "primaryKeyword",
    "secondaryKeywords",
    "areas",
    "sections",
    "faqs",
  ];

  for (const field of requiredFields) {
    if (!new RegExp(`\\b${field}:`).test(post.body)) {
      errors.push(`${post.slug} is missing required field: ${field}`);
    }
  }

  const publishedAt = post.body.match(/\bpublishedAt:\s*"([^"]+)"/)?.[1];
  if (!publishedAt || !/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) {
    errors.push(`${post.slug} must use publishedAt in YYYY-MM-DD format.`);
  } else if (publishedAt > today) {
    errors.push(`${post.slug} has a future publishedAt date: ${publishedAt}`);
  }

  const description = post.body.match(/\bdescription:\s*(?:"([^"]+)"|`([^`]+)`)/s)?.[1];
  if (!description || description.length < 90 || description.length > 180) {
    errors.push(`${post.slug} needs a practical meta description between 90 and 180 characters.`);
  }

  const sectionCount = [...post.body.matchAll(/\bheading:\s*"/g)].length;
  if (sectionCount < 4) {
    errors.push(`${post.slug} needs at least four useful article sections.`);
  }

  const faqCount = [...post.body.matchAll(/\bquestion:\s*"/g)].length;
  if (faqCount < 2) {
    errors.push(`${post.slug} needs at least two FAQ entries for long-tail search intent.`);
  }

  const articleUrl = `${siteUrl}/articles/${post.slug}`;
  if (!sitemap.includes(`<loc>${articleUrl}</loc>`)) {
    errors.push(`Sitemap is missing article URL: ${articleUrl}`);
  }
}

if (!sitemap.includes(`<loc>${siteUrl}/articles</loc>`)) {
  errors.push("Sitemap is missing the /articles index URL.");
}

if (queue?.briefs?.length) {
  for (const brief of queue.briefs) {
    if (brief.status === "published") {
      if (!brief.publishedUrl) {
        errors.push(`Published queue item ${brief.slug} is missing publishedUrl.`);
      }
      if (!slugs.has(brief.slug)) {
        errors.push(`Published queue item ${brief.slug} is not present in src/lib/blog-posts.ts.`);
      }
      if (!sitemap.includes(`<loc>${siteUrl}${brief.publishedUrl}</loc>`)) {
        errors.push(`Published queue item ${brief.slug} is missing from sitemap.xml.`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("Article SEO validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Validated ${postBlocks.length} published article(s), sitemap coverage, and published queue state.`);
