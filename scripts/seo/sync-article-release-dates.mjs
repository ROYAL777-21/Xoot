import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const siteUrl = "https://zoothome.co.za";
const blogPostsPath = path.join(root, "src/lib/blog-posts.ts");
const sitemapPath = path.join(root, "public/sitemap.xml");
const queuePath = path.join(root, "content/seo/generated/daily-blog-queue.json");
const draftsPath = path.join(root, "content/seo/generated/daily-article-drafts.md");
const releaseTimezone = "Africa/Johannesburg";

const currentReleaseDate = () => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: releaseTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

const parseArgs = (argv) => {
  const parsed = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;

    const [rawKey, ...rest] = arg.replace(/^--/, "").split("=");
    if (rest.length > 0) {
      parsed.set(rawKey, rest.join("="));
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed.set(rawKey, next);
      index += 1;
    } else {
      parsed.set(rawKey, "true");
    }
  }

  return parsed;
};

const args = parseArgs(process.argv.slice(2));

const date = args.get("date") ?? currentReleaseDate();
const dryRun = args.has("dry-run");
const slugArg = args.get("slugs") ?? "";
const explicitSlugs = slugArg
  .split(",")
  .map((slug) => slug.trim())
  .filter(Boolean);

if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error("--date must use YYYY-MM-DD format.");
  process.exit(1);
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const queue = JSON.parse(await readFile(queuePath, "utf8"));
const publishedQueueSlugs = (queue.briefs ?? [])
  .filter((brief) => brief.status === "published")
  .map((brief) => brief.slug);

const slugs = explicitSlugs.length ? explicitSlugs : publishedQueueSlugs;

if (slugs.length === 0) {
  console.error("No article slugs supplied and no published queue slugs found.");
  process.exit(1);
}

let blogPosts = await readFile(blogPostsPath, "utf8");
let sitemap = await readFile(sitemapPath, "utf8");
let drafts = await readFile(draftsPath, "utf8").catch((error) => {
  if (error?.code === "ENOENT") return null;
  throw error;
});
const changed = [];

for (const slug of slugs) {
  const blockPattern = new RegExp(`(slug:\\s*"${escapeRegex(slug)}",[\\s\\S]*?publishedAt:\\s*")\\d{4}-\\d{2}-\\d{2}(")`, "m");
  if (!blockPattern.test(blogPosts)) {
    throw new Error(`Article registry is missing slug: ${slug}`);
  }
  blogPosts = blogPosts.replace(blockPattern, `$1${date}$2`);

  const articleUrl = `${siteUrl}/articles/${slug}`;
  const sitemapPattern = new RegExp(`(<loc>${escapeRegex(articleUrl)}</loc>\\s*<lastmod>)\\d{4}-\\d{2}-\\d{2}(</lastmod>)`, "m");
  if (!sitemapPattern.test(sitemap)) {
    throw new Error(`Sitemap is missing article URL: ${articleUrl}`);
  }
  sitemap = sitemap.replace(sitemapPattern, `$1${date}$2`);

  const brief = queue.briefs?.find((item) => item.slug === slug);
  if (brief) {
    brief.date = date;
  }

  if (drafts) {
    const draftsPattern = new RegExp(`(slug:\\s*"${escapeRegex(slug)}"\\s*\\r?\\n\\s*date:\\s*")\\d{4}-\\d{2}-\\d{2}(")`, "m");
    if (draftsPattern.test(drafts)) {
      drafts = drafts.replace(draftsPattern, `$1${date}$2`);
    }
  }

  changed.push(slug);
}

sitemap = sitemap.replace(
  new RegExp(`(<loc>${escapeRegex(`${siteUrl}/articles`)}</loc>\\s*<lastmod>)\\d{4}-\\d{2}-\\d{2}(</lastmod>)`, "m"),
  `$1${date}$2`,
);

if (!dryRun) {
  await writeFile(blogPostsPath, blogPosts);
  await writeFile(sitemapPath, sitemap);
  await writeFile(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
  if (drafts) await writeFile(draftsPath, drafts);
}

console.log(
  `${dryRun ? "Would sync" : "Synced"} ${changed.length} article release date(s) to ${date}: ${changed.join(", ")}`,
);
