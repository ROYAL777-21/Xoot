import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { blogPosts } from "./blog-posts";

/**
 * Editorial rules the founder set on 2026-08-02, enforced rather than remembered.
 *
 * A blog post is a representation under the Consumer Protection Act, and it is the artefact
 * most likely to drift from the product — posts are written once and outlive several pricing
 * changes. These are the rules a human reviewer would have to re-check on every post forever.
 */

const root = process.cwd();

/** The suburbs Xoot actually serves, read from the server rather than duplicated here. */
const servedSuburbs = (() => {
  const source = readFileSync(join(root, "supabase/functions/_shared/action-utils.ts"), "utf8");
  const block = source.slice(source.indexOf("approvedLaunchRegions"));
  return new Set(
    [...block.slice(0, block.indexOf("]")).matchAll(/"([^"]+)"/g)].map((m) => m[1].toLowerCase()),
  );
})();

/** Johannesburg contains every approved suburb; "South Africa" is the country, not a claim. */
const ALLOWED_BROAD_AREAS = new Set(["johannesburg", "south africa"]);

const textOf = (post: (typeof blogPosts)[number]) =>
  [
    post.title,
    post.seoTitle,
    post.description,
    post.excerpt,
    ...post.sections.flatMap((s) => [s.heading, ...s.body.flatMap(block => typeof block === "string"
      ? [block] : block.type === "list" ? block.items : [block.caption, ...block.headings, ...block.rows.flat()])]),
    ...post.faqs.flatMap((f) => [f.question, f.answer]),
    ...(post.callToAction ? [post.callToAction.heading, ...post.callToAction.body, post.callToAction.label] : []),
  ].join(" ");

describe("blog posts", () => {
  it("quote no prices", () => {
    // Founder rule, and stronger than the CPA one for a different reason: a post with no
    // number never goes stale, never needs a sweep when a ladder changes, and cannot misquote
    // one. The live pricing page is the single place a number appears.
    for (const post of blogPosts) {
      const prices = textOf(post).match(/R\s?\d[\d\s,]*(?:\.\d{2})?/g) ?? [];
      expect({ slug: post.slug, prices }).toEqual({ slug: post.slug, prices: [] });
    }
  });

  it("only claim areas Xoot serves", () => {
    // A page that ranks for a suburb Xoot cannot reach is a complaint, not a lead. Posts may
    // still discuss expansion — that is what the body is for — but `areas` is coverage.
    for (const post of blogPosts) {
      for (const area of post.areas) {
        const key = area.toLowerCase();
        expect({
          slug: post.slug,
          area,
          served: servedSuburbs.has(key) || ALLOWED_BROAD_AREAS.has(key),
        }).toEqual({ slug: post.slug, area, served: true });
      }
    }
  });

  it("carry no pre-rename slugs", () => {
    // Slugs are URLs. Renaming one after indexing costs the ranking; renaming before costs
    // nothing. Four still said "zoot" after the company-wide rename and were only free to fix
    // because no domain is registered yet.
    for (const post of blogPosts) {
      expect({ slug: post.slug, stale: /zoot/i.test(post.slug) }).toEqual({
        slug: post.slug,
        stale: false,
      });
    }
  });

  it("do not compete with each other for the same keyword", () => {
    // Two posts on one primary keyword split their own signal and neither wins. Found twice on
    // the first audit: two "quick office cleaning Sandton" and two "Airbnb turnover cleaning
    // Johannesburg".
    const seen = new Map<string, string[]>();
    for (const post of blogPosts) {
      const key = post.primaryKeyword.trim().toLowerCase();
      seen.set(key, [...(seen.get(key) ?? []), post.slug]);
    }
    const clashes = [...seen.entries()].filter(([, slugs]) => slugs.length > 1);
    expect(clashes).toEqual([]);
  });

  it("keep slugs distinct rather than prefixes of one another", () => {
    // `/a` and `/a-extended` read as near-duplicates to a crawler even when the keywords differ.
    const slugs = blogPosts.map((p) => p.slug);
    const overlaps = slugs.flatMap((a) =>
      slugs.filter((b) => b !== a && b.startsWith(`${a}-`)).map((b) => `${a} <- ${b}`),
    );
    expect(overlaps).toEqual([]);
  });

  it("claim no feature that is still gated", () => {
    // Tips, SOS and visit recording are behind readiness constants precisely so a promise
    // cannot ship before the thing it promises. A blog post is the easiest place for that
    // discipline to leak, because posts outlive the sprint that wrote them.
    const gated: [RegExp, string][] = [
      [/\btip(s|ping)?\b/i, "tipping (TIP_READINESS)"],
      [/\bSOS\b|emergency button|panic button/i, "SOS (SAFETY_READINESS)"],
      [/record(ing)? (your|the) (visit|clean)/i, "visit recording (SAFETY_READINESS)"],
    ];
    for (const post of blogPosts) {
      const text = textOf(post);
      for (const [pattern, feature] of gated) {
        expect({ slug: post.slug, feature, claimed: pattern.test(text) }).toEqual({
          slug: post.slug,
          feature,
          claimed: false,
        });
      }
    }
  });

  it("attribute competitor claims rather than asserting them", () => {
    // Comparative advertising is lawful in South Africa when every claim is substantiated.
    // The way to stay inside that is to describe a competitor only as they describe
    // themselves, and to tell the reader to check — which these posts do. This keeps it true
    // as they are edited.
    for (const post of blogPosts) {
      const text = textOf(post);
      if (!/sweep\s?south/i.test(text)) continue;
      const attributes =
        /publicly positions|its own service pages|their own|check .{0,30}current|describe/i.test(text);
      expect({ slug: post.slug, attributes }).toEqual({ slug: post.slug, attributes: true });
    }
  });

  it("have the metadata a search result needs", () => {
    for (const post of blogPosts) {
      // Google truncates around these lengths; over is not an error but it is wasted.
      expect({ slug: post.slug, seoTitle: post.seoTitle.length <= 65 }).toEqual({
        slug: post.slug,
        seoTitle: true,
      });
      expect({ slug: post.slug, description: post.description.length <= 165 }).toEqual({
        slug: post.slug,
        description: true,
      });
      // A title identical to the H1 wastes one of the two chances to match a query.
      expect(post.seoTitle).not.toBe(post.title);
      expect(post.faqs.length).toBeGreaterThan(0);
    }
  });
});
