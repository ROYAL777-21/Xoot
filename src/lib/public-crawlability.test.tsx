import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToString } from "react-dom/server";
import { HelmetProvider, type HelmetServerState } from "react-helmet-async";
import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";
import { SEO } from "@/components/SEO";
import { blogPosts } from "@/lib/blog-posts";
import { publicPageLoaderFor } from "@/lib/public-page-loader";
import { publicRoutes, renderPublicPage } from "../../scripts/seo/public-entry";
import { composePublicHtml, publicHtmlPath, validatePublicHtml } from "../../scripts/seo/public-html.mjs";

const template = '<html><head><title>Generic</title><meta name="description" content="Generic"><meta property="og:url" content="https://xoot.co.za/"><link rel="canonical" href="https://xoot.co.za/"><link rel="stylesheet" href="/assets/main.css"><script type="module" src="/assets/main.js"></script></head><body><div id="root"></div></body></html>';
const serverRender = (work: () => void) => {
  const original = HelmetProvider.canUseDOM;
  HelmetProvider.canUseDOM = false;
  try { work(); } finally { HelmetProvider.canUseDOM = original; }
};

describe("public HTML from the actual website", () => {
  it("covers exactly the published sitemap", () => {
    const sitemap = readFileSync(join(process.cwd(), "public/sitemap.xml"), "utf8");
    const paths = [...sitemap.matchAll(/<loc>https:\/\/xoot\.co\.za([^<]*)<\/loc>/g)].map(match => match[1] || "/");
    expect(publicRoutes.map(route => route.path).sort()).toEqual(paths.sort());
  });

  it.each(publicRoutes)("renders $path with content, its own canonical and no API reads", ({ path }) => serverRender(() => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("Unexpected network read during public render"); });
    const warn = vi.spyOn(console, "error").mockImplementation((message, ...args) => {
      // React's development renderer warns about layout effects which correctly do not run on the server.
      if (!String(message).includes("useLayoutEffect does nothing on the server")) throw new Error(String(message) + args.join(" "));
    });
    try {
        const rendered = renderPublicPage(path);
        const html = composePublicHtml(template, { path, ...rendered });
        const post = blogPosts.find(post => path === `/articles/${post.slug}`);
        if (post) {
          const dom = new JSDOM(html);
          try {
            expect(dom.window.document.querySelector("h1")?.textContent).toBe(post.title);
            const data = JSON.parse(dom.window.document.querySelector('script[type="application/ld+json"]')!.textContent!);
            expect(data[0].headline).toBe(post.title);
            expect(data[1].mainEntity).toHaveLength(post.faqs.length);
            for (const faq of post.faqs) expect(dom.window.document.querySelector("main")!.textContent).toContain(faq.answer);
          } finally { dom.window.close(); }
        }
      expect(fetch).not.toHaveBeenCalled();
    } finally { fetch.mockRestore(); warn.mockRestore(); }
  }), 15_000);

  it("rejects private, transactional, unknown and traversal routes", () => {
    for (const path of ["/auth", "/book", "/app", "/admin", "/payment/success", "/articles/missing", "/../auth"]) {
      expect(() => renderPublicPage(path)).toThrow("Not a public render route");
    }
    expect(() => publicHtmlPath("/../../auth")).toThrow("Unsafe public render path");
  });

  it("serves home as a real index and keeps the private fallback separate", () => {
    const config = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8"));
    expect(publicHtmlPath("/")).toBe("index.html");
    expect(config.rewrites.some(rule => rule.source === "/")).toBe(false);
    expect(config.rewrites.at(-1).destination).toBe("/_spa.html");
    expect(config.rewrites.at(-1).source).toContain("well-known");
    expect(readFileSync(join(process.cwd(), "netlify.toml"), "utf8")).toContain('to = "/_spa.html"');
    expect(readFileSync(join(process.cwd(), "public/.htaccess"), "utf8")).toContain('RewriteRule . /_spa.html [L]');
  });

  it("preloads every rendered public page and leaves private startup alone", () => {
    for (const route of publicRoutes) expect(publicPageLoaderFor(route.path)).toBeTypeOf("function");
    for (const path of ["/auth", "/book", "/app", "/admin", "/xooter/jobs", "/api", "/unknown"]) {
      expect(publicPageLoaderFor(path)).toBeUndefined();
    }
  });

  it("prevents pre-startup input loss without disabling normal navigation", () => serverRender(() => {
    const rendered = renderPublicPage("/");
    const dom = new JSDOM(composePublicHtml(template, { path: "/", ...rendered }));
    try {
      const controls = [...dom.window.document.querySelectorAll("input, textarea, select, button")];
      expect(controls.length).toBeGreaterThan(5);
      expect(controls.every(control => control.hasAttribute("disabled"))).toBe(true);
      expect(dom.window.document.querySelector('a[href="/book"]')?.hasAttribute("disabled")).toBe(false);
    } finally { dom.window.close(); }
  }));

  it("preserves scripts/fonts and uses route CSS once; refuses to overwrite rendered HTML", () => serverRender(() => {
    const rendered = renderPublicPage("/articles");
    const output = composePublicHtml(template, { path: "/articles", ...rendered, css: ["assets/main.css", "assets/journal.css", "assets/journal.css"] });
    const dom = new JSDOM(output);
    try {
      expect(dom.window.document.querySelectorAll('link[href="/assets/main.css"]')).toHaveLength(1);
      expect(dom.window.document.querySelectorAll('link[href="/assets/journal.css"]')).toHaveLength(1);
      expect(dom.window.document.querySelector('script[type="module"]')?.getAttribute("src")).toBe("/assets/main.js");
    } finally { dom.window.close(); }
    expect(() => composePublicHtml(output, { path: "/articles", ...rendered })).toThrow("empty client shell");
    expect(() => composePublicHtml(template, { path: "/articles", ...rendered, css: ["assets/../../private.css"] })).toThrow("Unsafe public stylesheet");
    expect(() => validatePublicHtml(output.replace('href="https://xoot.co.za/articles"', 'href="https://xoot.co.za/"'), "/articles")).toThrow("wrong canonical");
    expect(() => validatePublicHtml(output.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/, ""), "/articles")).toThrow("#root h1");
  }));

  it("keeps JSON-LD text intact without allowing it to close the script element", () => serverRender(() => {
    const context: { helmet?: HelmetServerState } = {};
    const value = { name: '</script><script src="https://attacker.invalid/x.js"></script> $& <tag>' };
    renderToString(<HelmetProvider context={context}><SEO title="Example" description="Example" canonical="/" jsonLd={value} /></HelmetProvider>);
    const dom = new JSDOM(`<head>${context.helmet!.script.toString()}</head>`);
    try {
      expect(dom.window.document.querySelectorAll("script")).toHaveLength(1);
      expect(JSON.parse(dom.window.document.querySelector("script")!.textContent!)).toEqual(value);
    } finally { dom.window.close(); }
  }));
});
