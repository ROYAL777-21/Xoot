#!/usr/bin/env node
/*
 * Search the MoreMozi corpus without `qmd`.
 *
 * ── Why this exists ────────────────────────────────────────────────────────────────────────────
 * I told the founder that `ask-hormozi` "cannot retrieve anything" and left that in the plan and
 * the docs as a blocker. That was WRONG, and it cost real time. What is actually true, measured
 * 2026-09-01:
 *
 *   - github.com/poseljacob/ask-hormozi clones fine, and BUNDLES the corpus:
 *     2,039 episodes / 9,330 timestamped Markdown segments, each with a citation URL.
 *   - Only the SEMANTIC INDEXER is blocked. `setup.sh` installs `qmd` from static.crates.io (403
 *     through this environment's egress policy) and `ask_hormozi/cli.py` routes every search
 *     through `qmd_index` -- so the official CLI is unusable here.
 *   - Reading Markdown needs none of that.
 *
 * So the corpus was always usable and I reported it as unavailable. This script is the correction.
 *
 * ── The licence, which is why the corpus is not in this repo ────────────────────────────────────
 * corpus/NOTICE.md: the transcript material is redistributed WITH PERMISSION, copyright stays with
 * the rights holders, and it is explicitly NOT covered by that repo's MIT licence. So Xoot vendors
 * the script, never the corpus. Clone it yourself:
 *
 *     git clone https://github.com/poseljacob/ask-hormozi ~/.local/share/ask-hormozi
 *
 * ── Usage ──────────────────────────────────────────────────────────────────────────────────────
 *     node scripts/ops/ask-hormozi-search.mjs "pricing against a cheaper competitor"
 *     node scripts/ops/ask-hormozi-search.mjs "first customers" --show-text --limit 3
 *
 * Exit codes: 0 = ran (even with zero hits), 1 = bad usage, 2 = NO CORPUS FOUND.
 * The 2 matters: "I could not look" is not "there is nothing there". Conflating those two is
 * exactly how the false blocker was produced in the first place.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

const query = args.filter((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--limit" && args[args.indexOf(a) - 1] !== "--corpus").join(" ").trim();
const limit = Number(flag("limit", 5));
const showText = has("show-text");

if (!query) {
  console.error("usage: node scripts/ops/ask-hormozi-search.mjs \"<query>\" [--limit N] [--show-text] [--corpus PATH]");
  process.exit(1);
}

/** Locate a corpus. Explicit flag, then env, then the path setup.sh would have used. */
const candidates = [
  flag("corpus"),
  process.env.ASK_HORMOZI_CORPUS,
  join(homedir(), ".local", "share", "ask-hormozi", "corpus"),
  join(homedir(), "ask-hormozi", "corpus"),
].filter(Boolean);

const corpus = candidates.find((path) => existsSync(join(path, "segments")));

if (!corpus) {
  console.error("No MoreMozi corpus found. Looked in:");
  for (const path of candidates) console.error(`  - ${path}`);
  console.error("");
  console.error("This is a SETUP GAP, not an empty result. Clone the corpus (it ships in the repo):");
  console.error("");
  console.error("  git clone https://github.com/poseljacob/ask-hormozi ~/.local/share/ask-hormozi");
  console.error("");
  console.error("You do NOT need to run its setup.sh -- that installs `qmd` for semantic search,");
  console.error("which this script deliberately does not require.");
  process.exit(2);
}

/** Recursively collect segment files. The corpus is ~9,330 small Markdown files. */
const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".md")) out.push(full);
  }
  return out;
};

const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
const field = (text, name) => new RegExp(`${name}:\\s*"(.*?)"`).exec(text)?.[1] ?? "";

const files = walk(join(corpus, "segments"));
const scored = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const lower = text.toLowerCase();
  const distinct = terms.filter((t) => lower.includes(t)).length;
  if (distinct < Math.min(2, terms.length)) continue;
  const hits = terms.reduce((sum, t) => sum + lower.split(t).length - 1, 0);
  scored.push({ distinct, hits, file, text });
}

scored.sort((a, b) => b.distinct - a.distinct || b.hits - a.hits);

console.log(`Searched ${files.length} segments in ${corpus}`);
console.log(`⚠️  KEYWORD search, not semantic — \`qmd\` is unavailable here, so recall is worse than`);
console.log(`   the official CLI's. An empty result is NOT proof the corpus is silent on a topic.`);
console.log("");

if (scored.length === 0) {
  console.log(`No segments matched "${query}". Try fewer or more common terms.`);
  process.exit(0);
}

for (const result of scored.slice(0, limit)) {
  const title = field(result.text, "title");
  const published = field(result.text, "published");
  const url = field(result.text, "timestamp_url");
  console.log(`[${result.distinct} terms / ${result.hits} hits] ${title} (${published})`);
  console.log(`    ${url}`);
  if (showText) {
    const body = result.text.split(/\n\n/).slice(1).join("\n\n").replace(/\s+/g, " ").trim();
    console.log(`    ${body.slice(0, 700)}…`);
  }
  console.log("");
}

console.log(`${scored.length} segments matched; showing ${Math.min(limit, scored.length)}.`);
