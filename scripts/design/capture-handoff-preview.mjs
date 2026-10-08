import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const option = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : process.argv[index + 1];
};
const url = option("url", "http://127.0.0.1:4199/");
const reference = option("reference", "http://127.0.0.1:5174/Xoot%20Website.dc.html");
const output = resolve(option("out", "outputs/visual-fidelity"));
mkdirSync(output, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const evidence = { capturedAt: new Date().toISOString(), url, reference, captures: [] };
try {
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    for (const [name, target] of [["reference", reference], ["website", url]]) {
      const page = await browser.newPage({ viewport: { width, height: width < 768 ? 844 : 1000 }, reducedMotion: "reduce" });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(target, { waitUntil: "domcontentloaded" });
      const heading = page.locator("h1").filter({ hasText: "Premium home care" }).first();
      await heading.waitFor({ state: "visible" });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.querySelectorAll("img")].filter((image) => image.getBoundingClientRect().top < innerHeight).map((image) => image.decode().catch(() => {})));
      });
      const geometry = await heading.evaluate((element) => {
        const rect = (node) => {
          if (!node) return null;
          const { x, y, width, height } = node.getBoundingClientRect();
          return { x, y, width, height };
        };
        return {
          heading: rect(element), description: rect(element.nextElementSibling),
          card: rect(element.nextElementSibling?.nextElementSibling),
          portrait: rect(element.parentElement.nextElementSibling),
          navigation: rect(document.querySelector("header nav")),
          overflow: document.documentElement.scrollWidth > innerWidth,
          fontStatus: document.fonts.status,
          headingTransform: getComputedStyle(element).transform,
          headingFilter: getComputedStyle(element).filter,
        };
      });
      const filename = `${name}-${width}.png`;
      await page.screenshot({ path: resolve(output, filename) });
      evidence.captures.push({ name, width, filename, errors, ...geometry });
      console.log(`${name} ${width}: ${errors.length} page errors; overflow=${geometry.overflow}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
  writeFileSync(resolve(output, "measurements.json"), JSON.stringify(evidence, null, 2) + "\n");
}
if (evidence.captures.some((capture) => capture.name === "website" && (capture.errors.length || capture.overflow))) process.exitCode = 1;
