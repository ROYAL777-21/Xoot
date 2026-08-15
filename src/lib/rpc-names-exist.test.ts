import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every RPC the code calls must be a function the database actually has.
 *
 * ── The defect, and it was live on both projects ────────────────────────────────
 * ZD-029 renamed 18 tables, 25 columns, 2 views and an enum label. It renamed **no functions** and
 * fixed **no function bodies** — a body is stored as text, and `alter table … rename` rewrites
 * dependent views and policies but never a function that queries the renamed object.
 *
 * So eight functions were left pointing at tables and columns that no longer existed, and two of
 * them are called by name from Edge Functions that had been updated to the new names:
 *
 *     get-xooter-job-cards/index.ts:39  ->  get_xooter_job_cards_for_user   (db had get_zooter_…)
 *     respond-xooter-job/index.ts:85    ->  xooter_job_transition_allowed   (db had zooter_…)
 *
 * **A Xooter could not list their jobs and could not accept one.** Proven by calling the
 * sensitive-access gate on production, which answered with Postgres naming the fix itself:
 *
 *     ERROR: 42703: column "zooter_id" does not exist
 *     HINT:  Perhaps you meant to reference the column "bookings.xooter_id".
 *
 * ── What this test can and cannot see ───────────────────────────────────────────
 * It compares the RPC names in the source against `src/integrations/supabase/types.ts`, which is
 * generated from the live schema and is already asserted against it by the *Types match the live
 * schema* workflow. So the chain is: code → types.ts → database.
 *
 * It **cannot** see argument names or a stale function body — `types.ts` carries argument names,
 * and a separate assertion below checks those, but a body referencing a dropped table is invisible
 * from here. Only calling the function finds that, which is what the workflow does.
 */

const ROOT = process.cwd();
const TYPES = join(ROOT, "src/integrations/supabase/types.ts");

/** Walk the source trees that can issue an RPC. */
const sourceFiles = (dir: string, acc: string[] = []): string[] => {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
};

/** `.rpc("name"` — the only way this codebase calls a database function. */
const calledRpcNames = () => {
  const found = new Map<string, string>();
  for (const file of [
    ...sourceFiles(join(ROOT, "src")),
    ...sourceFiles(join(ROOT, "supabase/functions")),
  ]) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/\.rpc\(\s*["'`]([a-z0-9_]+)["'`]/g)) {
      if (!found.has(match[1])) found.set(match[1], file.replace(`${ROOT}/`, ""));
    }
  }
  return found;
};

/** The `public` schema's `Functions:` block in the generated types. */
const typedFunctions = () => {
  const types = readFileSync(TYPES, "utf8");
  const lines = types.split("\n");
  // The second `Functions: {` is the public schema's; the first belongs to the graphql schema.
  const starts = lines.reduce<number[]>((acc, line, index) => {
    if (/^ {4}Functions: \{/.test(line)) acc.push(index);
    return acc;
  }, []);
  const start = starts[starts.length - 1];
  expect(start, "could not find a Functions block in types.ts").toBeGreaterThan(0);

  const names = new Map<string, string>();
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^ {4}Enums: \{/.test(lines[i])) break;
    const name = lines[i].match(/^ {6}([a-z0-9_]+): \{/)?.[1];
    if (name) names.set(name, lines[i + 1] ?? "");
  }
  return names;
};

describe("every RPC the code calls exists in the schema", () => {
  const called = calledRpcNames();
  const typed = typedFunctions();

  it("finds the RPC calls and the generated function list", () => {
    // A regex that silently matches nothing would make every assertion below vacuous — the exact
    // shape of guard this repo has shipped before.
    expect(called.size, "no .rpc( calls found — has the call style changed?").toBeGreaterThan(0);
    expect(typed.size, "no functions parsed out of types.ts").toBeGreaterThan(0);
  });

  it.each([...calledRpcNames().keys()])("%s exists in types.ts", (name) => {
    const where = called.get(name);
    expect(
      [...typed.keys()],
      `${where} calls .rpc("${name}"), which the live schema does not define`,
    ).toContain(name);
  });

  it("passes argument names the function actually declares", () => {
    /*
     * PostgREST resolves an RPC by name AND argument names, so a caller passing `p_actor_id` to a
     * function declaring `p_xooter_id` fails to resolve — the same class of break as a wrong name,
     * and just as invisible until someone calls it.
     *
     * Only checks calls whose argument object is written inline as literal keys; anything spread
     * or computed is skipped rather than guessed at.
     */
    const mismatches: string[] = [];
    for (const file of [
      ...sourceFiles(join(ROOT, "src")),
      ...sourceFiles(join(ROOT, "supabase/functions")),
    ]) {
      const source = readFileSync(file, "utf8");
      for (const call of source.matchAll(
        /\.rpc\(\s*["'`]([a-z0-9_]+)["'`]\s*,\s*\{([^}]*)\}/g,
      )) {
        const [, name, body] = call;
        const declared = typed.get(name);
        if (!declared || !declared.includes("Args:")) continue;
        // Drop the `Args:` label before reading the parameter names, or "rgs" becomes a parameter.
        const argsBody = declared.slice(declared.indexOf("Args:") + "Args:".length);
        const declaredArgs = [...argsBody.matchAll(/([a-z0-9_]+)\??:/g)].map((m) => m[1]);
        if (!declaredArgs.length) continue;
        for (const passed of [...body.matchAll(/^\s*([a-z0-9_]+)\s*:/gm)].map((m) => m[1])) {
          if (!declaredArgs.includes(passed)) {
            mismatches.push(
              `${file.replace(`${ROOT}/`, "")} calls ${name} with "${passed}"; declared: ${declaredArgs.join(", ")}`,
            );
          }
        }
      }
    }
    expect(mismatches, "an RPC argument name does not match the schema").toEqual([]);
  });
});
