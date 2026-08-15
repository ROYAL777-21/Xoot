import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * GitHub Actions minutes are a hard, exhaustible budget on this account.
 *
 * ── What happened ───────────────────────────────────────────────────────────────
 * This repository is **private** on the **GitHub Free** plan: 2,000 Actions minutes a month, and
 * minutes are billed by runner — Linux 1x, **Windows 2x, macOS 10x**, each job rounded up to a
 * whole minute. On 2026-08-14 the allowance ran out and every job on the account began failing
 * 2-6 seconds after creation with `runner_id: 0` and no logs. CI was dead for ~28 hours and could
 * not be bought back: a free-plan allowance is not a spending limit you can raise.
 *
 * Where the minutes went, per push to a branch with an open pull request:
 *
 *   native-ios-swift    macos-15   10x   ~10 min   one job, type-checking 7 Swift files,
 *                                                  with NO path filter
 *   tests               ubuntu      1x    ~8 min   ran TWICE — `push` and `pull_request` both matched
 *   semgrep             ubuntu      1x    ~6 min   ran TWICE, same cause
 *   production-readiness windows    2x    ~2 min
 *   others              ubuntu      1x    ~3 min
 *                                        ~29 min per push
 *
 * Not one of that day's ten pushes touched a Swift file.
 *
 * ── What this test pins ─────────────────────────────────────────────────────────
 * The three controls that brought it to roughly 8 minutes. Each is one line in a YAML file, which
 * is exactly the kind of thing that gets removed by someone debugging an unrelated problem and
 * never put back — and the cost of losing it is silent until CI stops entirely.
 */

const ROOT = process.cwd();
const DIR = join(ROOT, ".github/workflows");

const workflows = () =>
  readdirSync(DIR)
    .filter((f) => f.endsWith(".yml"))
    .map((file) => ({ file, source: readFileSync(join(DIR, file), "utf8") }));

/** Runners that cost more than 1x, and their multiplier. */
const EXPENSIVE_RUNNERS: Record<string, number> = { "macos-": 10, "windows-": 2 };

const runnersIn = (source: string) =>
  [...source.matchAll(/runs-on:\s*([a-z0-9.-]+)/g)].map((m) => m[1]);

describe("Actions minute budget", () => {
  it("found the workflows", () => {
    expect(workflows().length, "no workflow files parsed").toBeGreaterThan(5);
  });

  it.each(workflows().map((w) => w.file))("%s declares a concurrency group", (file) => {
    /*
     * Without one, a superseded run keeps burning minutes after the next push has already made its
     * result irrelevant. Six workflows lacked this until 2026-08-15.
     */
    const { source } = workflows().find((w) => w.file === file)!;
    expect(/^concurrency:/m.test(source), `${file} has no concurrency block`).toBe(true);
  });

  it("every workflow using a 10x or 2x runner justifies itself", () => {
    /*
     * An expensive runner must either be path-filtered, or be dispatch-only, or carry an explicit
     * note saying why it cannot be filtered. `production-readiness` is the deliberate exception:
     * it asserts that docs, scripts and migrations agree, so a docs-only change genuinely can break
     * it — that is how it broke on 2026-08-13.
     */
    const problems: string[] = [];
    for (const { file, source } of workflows()) {
      const expensive = runnersIn(source).filter((r) =>
        Object.keys(EXPENSIVE_RUNNERS).some((prefix) => r.startsWith(prefix)),
      );
      if (!expensive.length) continue;

      const automatic = /^\s{2}(push|pull_request):/m.test(source);
      if (!automatic) continue; // dispatch-only costs nothing until a human asks

      const filtered = /^\s{4}paths:/m.test(source);
      const justified = /NOT path-filtered/i.test(source);
      if (!filtered && !justified) {
        problems.push(`${file} runs ${expensive.join(",")} automatically with no paths filter and no stated reason`);
      }
    }
    expect(problems, "an expensive runner lost its cost control").toEqual([]);
  });

  it("the macOS job only runs when native iOS code changes", () => {
    // The single biggest line item — 10x, and about a third of that day's whole consumption.
    const { source } = workflows().find((w) => w.file === "native-ios-swift.yml")!;
    const pathBlocks = [...source.matchAll(/^\s{4}paths:\n((?:\s{6}- .*\n)+)/gm)].map((m) => m[1]);
    expect(pathBlocks.length, "native-ios-swift.yml must filter BOTH push and pull_request").toBe(2);
    for (const block of pathBlocks) {
      expect(block, "the filter must cover the Swift sources").toContain("native/ios/**");
    }
  });

  it("no workflow runs twice for the same commit", () => {
    /*
     * A feature-branch glob on `push` combined with `pull_request` to `main` fires both triggers
     * for one commit. That doubled the two most frequent workflows until 2026-08-15.
     */
    const doubled: string[] = [];
    for (const { file, source } of workflows()) {
      const push = source.match(/^\s{2}push:\n(?:\s{4}.*\n|\s{6}.*\n)*/m)?.[0] ?? "";
      const hasPr = /^\s{2}pull_request:/m.test(source);

      /*
       * Only the `branches:` list under `push:` — NOT the whole push block.
       *
       * The first version of this matched any `foo/**` anywhere in the push block, which flagged
       * `paths: - "native/ios/**"` as if it were a branch glob. A **paths** glob is the fix; a
       * **branches** glob is the defect. Reading the wrong one inverted the test's meaning, and it
       * failed against workflows that were already correct.
       */
      const pushBranches =
        push.match(/^\s{4}branches:\s*\[([^\]]*)\]/m)?.[1] ??
        push.match(/^\s{4}branches:\n((?:\s{6}- .*\n)+)/m)?.[1] ??
        "";
      const branchGlob = /[a-z0-9_-]+\/\*\*/.test(pushBranches);
      if (hasPr && branchGlob) doubled.push(file);
    }
    expect(
      doubled,
      "these run once for `push` and again for `pull_request` on the same commit — double the minutes",
    ).toEqual([]);
  });
});
