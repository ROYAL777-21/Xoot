import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "content/seo/keyword-intent-map.json");
const outputDir = path.join(root, "content/seo/generated");
const blogPostsPath = path.join(root, "src/lib/blog-posts.ts");

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

const today = process.env.SEO_QUEUE_DATE || new Date().toISOString().slice(0, 10);
const dailyCount = Math.min(Math.max(Number(process.env.SEO_DAILY_COUNT || 2), 1), 2);
const source = JSON.parse(await readFile(sourcePath, "utf8"));
const existingBlogPosts = await readFile(blogPostsPath, "utf8");
const existingSlugs = new Set([...existingBlogPosts.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1]));

const selected = source
  .map((item) => ({ ...item, slug: slugify(item.primaryKeyword) }))
  .filter((item) => !existingSlugs.has(item.slug))
  .sort((a, b) => Number(b.priority) - Number(a.priority))
  .slice(0, dailyCount);

const briefs = selected.map((item, index) => ({
  date: today,
  slot: index + 1,
  slug: item.slug,
  title: item.primaryKeyword.replace(/\b\w/g, (letter) => letter.toUpperCase()),
  primaryKeyword: item.primaryKeyword,
  secondaryKeywords: item.secondaryKeywords,
  searchIntent: item.intent,
  cluster: item.cluster,
  serviceAreas: item.areas,
  evidenceSource: item.source,
  humanHook: item.hook,
  readerPsychology: item.emotionalMechanism,
  practicalPromise: item.logicalValue,
  outline: [
    "Open with the real-life pressure behind the search.",
    "Name the local service and area naturally in the first section.",
    "Give a practical checklist or decision framework.",
    "Explain how Zoot handles trust, saved notes, support, and repeatability.",
    "Answer two to four long-tail questions a customer would actually ask.",
    "Close with a clear booking or Care+ call to action.",
  ],
  qualityGate: [
    "No fake testimonials, guarantees, or unsupported availability claims.",
    "One primary keyword; secondary keywords only where natural.",
    "Specific local examples; no generic filler.",
    "Human review required before publishing.",
    "Update title, meta description, FAQ, and JSON-LD before release.",
  ],
  callToAction: item.cta,
}));

const markdown = [
  `# Daily SEO Blog Queue - ${today}`,
  "",
  "Generated from `content/seo/keyword-intent-map.json`.",
  "Semrush/Search Console validation should be added to each keyword row before publication when exports are available.",
  "",
  ...briefs.flatMap((brief) => [
    `## Slot ${brief.slot}: ${brief.title}`,
    "",
    `- Primary keyword: ${brief.primaryKeyword}`,
    `- Secondary keywords: ${brief.secondaryKeywords.join(", ")}`,
    `- Search intent: ${brief.searchIntent}`,
    `- Areas: ${brief.serviceAreas.join(", ")}`,
    `- Hook: ${brief.humanHook}`,
    `- Reader psychology: ${brief.readerPsychology}`,
    `- Practical promise: ${brief.practicalPromise}`,
    `- CTA: ${brief.callToAction}`,
    "",
    "Outline:",
    ...brief.outline.map((item) => `- ${item}`),
    "",
    "Quality gate:",
    ...brief.qualityGate.map((item) => `- ${item}`),
    "",
  ]),
];

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "daily-blog-queue.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), briefs }, null, 2)}\n`);
await writeFile(path.join(outputDir, "daily-blog-queue.md"), `${markdown.join("\n")}\n`);

console.log(`Generated ${briefs.length} SEO blog brief(s) for ${today}.`);
