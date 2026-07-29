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
    "Explain how Xoot handles trust, saved notes, support, and repeatability.",
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

const cleanSentence = (value) => value.replace(/\s+/g, " ").trim().replace(/[.!?]+$/g, "");

const listToPhrase = (values) => {
  if (values.length <= 1) return values[0] || "";
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
};

const draftForBrief = (brief) => {
  const areaText = listToPhrase(brief.serviceAreas);
  const secondaryText = brief.secondaryKeywords.join(", ");
  const metaTitle = `${brief.title} | Xoot`;
  const practicalPromise = cleanSentence(brief.practicalPromise);
  const readerPsychology = cleanSentence(brief.readerPsychology);
  const metaDescription = `${practicalPromise} for ${areaText}. A practical Xoot guide for ${brief.primaryKeyword} without fake claims or pressure tactics.`;

  return [
    `---`,
    `title: "${brief.title}"`,
    `slug: "${brief.slug}"`,
    `date: "${brief.date}"`,
    `primaryKeyword: "${brief.primaryKeyword}"`,
    `secondaryKeywords: "${secondaryText}"`,
    `metaTitle: "${metaTitle}"`,
    `metaDescription: "${metaDescription}"`,
    `status: "review-ready-draft"`,
    `---`,
    "",
    `# ${brief.title}`,
    "",
    `${brief.humanHook} That is the moment behind the search for ${brief.primaryKeyword}. The person searching does not want another admin task. They want the space handled, the timing respected, and the outcome to feel calm enough that they can move on with the day.`,
    "",
    `Xoot's job is to make that easier without pretending every clean is the same. In ${areaText}, the difference between a good booking and a stressful one is usually clarity: what matters most, who needs access, what must stay private, and what would make the client feel that the space is ready again.`,
    "",
    `## Start with the pressure, not the keyword`,
    "",
    `The best content for this search should name the real-life pressure first: ${readerPsychology}. That is why this article should speak to the moment before the booking, not only the service category. A homeowner, host, office manager, landlord, or studio owner is usually trying to protect time, reputation, privacy, or peace of mind.`,
    "",
    `For ${brief.primaryKeyword}, the useful question is not "can someone clean?" It is "what needs to feel sorted when the door opens again?" That answer changes the brief. A quick office reset may prioritise reception, bathrooms, boardroom glass and visible floors. A guest-ready turnover may prioritise linen, smell, bathroom detail and photos. A recurring home clean may prioritise trust, continuity and saved preferences.`,
    "",
    `## The decision checklist`,
    "",
    `Before booking, write down five things: the area, the exact service outcome, the priority rooms, the timing pressure, and any protected access notes. For ${areaText}, that is more useful than sending a long unfocused instruction message after the booking is already live.`,
    "",
    `Use this simple rule: if the detail affects trust, timing, safety, or repeat quality, it belongs in the booking or property profile. If it is sensitive, it should stay inside the app and only be visible to the right person at the right time.`,
    "",
    `Relevant searches such as ${secondaryText} are different expressions of the same intent: someone wants a clean that fits a real scenario. The article should answer that scenario with practical guidance, not generic cleaning tips.`,
    "",
    `## Where Xoot fits`,
    "",
    `Xoot is built around vetted Xooters, in-app communication, saved home or property notes, support routing, booking state visibility, Care+ continuity, and safer handling of sensitive details. Those product choices matter because cleaning is high-trust work. It happens inside homes, guest spaces, offices and private properties.`,
    "",
    `For repeat clients, Care+ can reduce repeated planning by remembering practical preferences and supporting favourite Xooter workflows where live availability allows it. For hosts and property operators, saved profiles can make the next clean start with context instead of another round of instructions.`,
    "",
    `## What to ask before you book`,
    "",
    `Ask: What should the space feel like when the clean is done? Which areas carry the most reputational risk? Are there access notes that need time-limited handling? Is this a once-off reset or the start of a recurring rhythm? Is the requested timing honest for the scope?`,
    "",
    `Those questions help the client book with confidence and help the Xooter do the right work. They also keep the content useful for people, which is the standard this automation must protect before anything gets published.`,
    "",
    `## Next step`,
    "",
    `${brief.callToAction} Keep the booking clear, keep sensitive details protected, and use Xoot to make the next clean easier than the last one.`,
    "",
    `## FAQ`,
    "",
    `### Is ${brief.primaryKeyword} available in every area?`,
    "",
    `Availability depends on live Xoot coverage and approved Xooters. Use the app or official launch updates for current coverage rather than assuming every suburb is active.`,
    "",
    `### What should I include in the booking notes?`,
    "",
    `Include priority rooms, timing, access instructions, parking, product restrictions, pets, fragile areas, and the outcome you care about most. Sensitive access details should stay inside protected app workflows.`,
    "",
    `### Is this better as a once-off or recurring clean?`,
    "",
    `Choose once-off for a specific moment. Choose recurring or Care+ when the same home, office, host unit, or property needs repeat context and less repeated planning.`,
    "",
  ].join("\n");
};

const draftMarkdownBlocks = briefs.map(draftForBrief);

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
await mkdir(path.join(outputDir, "drafts"), { recursive: true });
await writeFile(path.join(outputDir, "daily-blog-queue.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), briefs }, null, 2)}\n`);
await writeFile(path.join(outputDir, "daily-blog-queue.md"), `${markdown.join("\n")}\n`);
await writeFile(path.join(outputDir, "daily-article-drafts.md"), `${draftMarkdownBlocks.join("\n\n---\n\n")}\n`);

await Promise.all(
  briefs.map((brief) =>
    writeFile(path.join(outputDir, "drafts", `${today}-${brief.slug}.md`), `${draftForBrief(brief)}\n`),
  ),
);

console.log(`Generated ${briefs.length} SEO blog brief(s) and article draft(s) for ${today}.`);
