#!/usr/bin/env node
/**
 * Create today's build journal entry, pre-filled with what actually happened.
 *
 * ── Why this is a script and not a blank template ───────────────────────────────
 * A daily journal that starts empty is a daily journal that stops after nine days.
 * The hard part is never the writing — it is remembering what you did, which is
 * already recorded in `git log` and nowhere else in a readable form.
 *
 * So this pulls the day's commits and puts them at the top of the page. The founder
 * starts from evidence and edits down, instead of starting from a cursor.
 *
 * ── Why the journal exists at all ───────────────────────────────────────────────
 * `founder-voice.md`: the highest-engagement artefact found anywhere in the research
 * was a numbered list of hard-won rules, beating its own author's highest-REACH post
 * by roughly 39x on engagement rate. A build journal is where those rules come from.
 * It is also the AI-detection answer without a detector — a post carrying a real
 * error message from this repo could not have been generated.
 *
 * Usage:
 *   node scripts/ops/new-journal-entry.mjs            # today
 *   node scripts/ops/new-journal-entry.mjs 2026-09-01 # a specific day
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "docs", "journal");

const arg = process.argv[2];
if (arg && !/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
  console.error(`Not a date: ${arg}. Use YYYY-MM-DD, or pass nothing for today.`);
  process.exit(1);
}
const day = arg ?? new Date().toISOString().slice(0, 10);

/**
 * Commits authored on that calendar day. `--no-pager` because this runs in CI and
 * in agent sessions, where a pager blocks forever rather than failing.
 */
const commitsFor = (date) => {
  try {
    const out = execFileSync(
      "git",
      ["--no-pager", "log", `--since=${date} 00:00`, `--until=${date} 23:59`, "--format=%h%x09%s"],
      { encoding: "utf8" },
    );
    return out.trim().split("\n").filter(Boolean);
  } catch {
    // A journal entry is still worth writing when git is unavailable. Failing here
    // would make the tool useless in exactly the situation it is most wanted.
    return [];
  }
};

const commits = commitsFor(day);
const file = join(DIR, `${day}.md`);

if (existsSync(file)) {
  console.log(`${file} already exists — opening nothing, changing nothing.`);
  process.exit(0);
}

const commitBlock = commits.length
  ? commits.map((c) => `- \`${c.split("\t")[0]}\` ${c.split("\t").slice(1).join(" ")}`).join("\n")
  : "_No commits on this day. That is a fact worth writing down too._";

const body = `# ${day}

## What actually happened

${commitBlock}

## What broke, and what it cost

<!--
The most valuable section, and the one that gets skipped. A defect with its
measurement is the best-performing content this repo can produce: it is specific,
it is checkable, and it could not have been invented.

Write the error message verbatim. Not "there was a config issue".
-->

## What I got wrong

<!--
Separate from the section above. "It broke" is a fact about the system.
"I believed X and X was false" is a fact about me, and it is the more useful one.

Shape, from 2026-09-02: I closed the same launch gate twice on evidence that could
not support it, because I read a host's own configuration as proof of what the
public actually receives. It was neither time.
-->

## The decision, and the trade-off I accepted

<!-- What I chose, what I gave up, and what would make me reverse it. -->

## Numbers

| | |
|---|---|
| Bookings completed | |
| Xooters activated | |
| Live-site check | |

## Is any of this postable?

<!--
Against the test in .claude/agents/founder-voice.md: can a stranger who will never
book a cleaner do something differently after reading it? A number, a command, an
error message, a rule.

If the post only announces, it is not ready. Mark candidates APPROVE / EDIT / KILL.
Nothing here is published without the founder saying yes to that exact text.
-->
`;

mkdirSync(DIR, { recursive: true });
writeFileSync(file, body, { encoding: "utf8", flag: "wx" });
console.log(`Wrote ${file} with ${commits.length} commit(s) pre-filled.`);
