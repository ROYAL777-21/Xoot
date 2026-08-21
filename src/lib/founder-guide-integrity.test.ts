import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The founder guide is the eighth attempt at this list. The other seven rotted.
 *
 * `blocker.md` still showed three closed issues as open; four `docs/release/` checklists were last
 * reviewed in July; `NEEDS-FOUNDER.md` and `founder-todo.md` were created the same day and each
 * carried items the other had never listed. The pattern is always the same — a second register
 * appears, both drift, and nobody can tell which is current.
 *
 * This file is cheap and it is the thing that was missing. It cannot check that a step is CORRECT;
 * it checks the structural properties whose absence is how the previous seven died.
 */

const ROOT = process.cwd();
const GUIDE = "docs/release/FOUNDER-GUIDE.md";

const guide = () => readFileSync(join(ROOT, GUIDE), "utf8");

/** The five documents that must point at the guide rather than compete with it. */
const POINTERS = [
  "NEEDS-FOUNDER.md",
  "blocker.md",
  "docs/release/founder-todo.md",
  "docs/release/go-live.md",
  "docs/release/release-blockers.md",
];

describe("the guide is structurally complete", () => {
  it("has all six phases", () => {
    const text = guide();
    for (const phase of [
      "Phase 1 — nothing else works until these",
      "Phase 2 — money",
      "Phase 3 — clean up the live surface",
      "Phase 4 — voice and safety",
      "Phase 5 — iOS and Android to the stores",
      "Phase 6 — decisions, not clicks",
    ]) {
      expect(text, `missing: ${phase}`).toContain(phase);
    }
  });

  it("gives every numbered item a way to know it worked", () => {
    /*
     * The single property that separates this from the seven that rotted. An item without a
     * *proves it done* becomes an item nobody can close, and an item nobody can close is how a
     * register starts lying.
     */
    const sections = guide().split(/\n## (?=\d)/).slice(1);
    expect(sections.length, "no numbered items parsed — the rest would be vacuous").toBeGreaterThan(15);

    const silent = sections
      .filter((s) => !/\*\*Proves it done\b/i.test(s) && !/\bProves it done\b/i.test(s))
      .map((s) => s.split("\n")[0].trim().slice(0, 60));
    expect(silent, "these items cannot be verified, so they cannot be closed").toEqual([]);
  });

  it("keeps the summary table honest about the count", () => {
    // The number in the prose and the number of rows in the table must agree. A summary that drifts
    // from its own table is how "it is only 8 things" happened.
    const text = guide();
    const rows = [...text.matchAll(/^\| \d+\.\d+ \|/gm)].length;
    expect(rows, "the one-page table lost its rows").toBeGreaterThan(15);
    expect(text, "the prose count must match the table").toContain(`It is ${rows}`);
  });

  it("never contains a secret value, only the names of secrets", () => {
    const text = guide();
    // Long random-looking strings are what a pasted key looks like. Names, URLs and refs are fine.
    const suspicious = [...text.matchAll(/\b(?:sk|pk|rk)[-_][A-Za-z0-9_-]{16,}|\beyJ[A-Za-z0-9_-]{20,}/g)].map(
      (m) => m[0].slice(0, 12),
    );
    expect(suspicious, "a credential must never be written into a repository file").toEqual([]);
  });
});

describe("the older registers point here instead of competing", () => {
  it.each(POINTERS)("%s carries the pointer banner", (path) => {
    const text = readFileSync(join(ROOT, path), "utf8");
    expect(text, `${path} has no banner — two registers is how the last seven rotted`).toContain(
      "FOUNDER-GUIDE.md",
    );
    expect(text, `${path} should say what it is still the best source for`).toMatch(
      /still the best source for/i,
    );
  });

  it("names every one of them in its own index", () => {
    // If a document points here but this file does not point back, the reasoning behind an item
    // becomes unreachable from the list of items.
    const text = guide();
    for (const path of POINTERS) {
      const base = path.split("/").pop()!;
      expect(text, `the guide never mentions ${base}`).toContain(base);
    }
  });
});
