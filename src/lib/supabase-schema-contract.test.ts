import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Guards the contract between application code and `src/integrations/supabase/types.ts`.
 *
 * Why this exists. On 2026-08-07 the generated types were found to be 50 tables behind the
 * live schema — 28 typed against 78 live. Regenerating them surfaced a bug that had been
 * in production the whole time: `Favorites.tsx` and `useHouseholdOperatingLayer.ts`
 * selected `favorite_kind`, `repeat_bookings_count` and `last_booked_at` from `favorites`,
 * and none of those three columns exist. They come from
 * `20260508225000_trust_safety_retention.sql`, which was never applied; the live table uses
 * `favorite_type` and `repeat_count`. PostgREST rejects an entire select on the first
 * unknown column, so the "My Xooters" page showed "No favorites yet" to every user who had
 * saved a Xooter, and the household operating layer errored on every load.
 *
 * Two things had to both be true for that to survive: the types were stale, and 45
 * `(supabase as any)` casts meant TypeScript never compared the queries to them anyway. The
 * cast is the more dangerous half — it silently disables checking for a whole statement,
 * and it is invisible in review because it looks like a type-noise workaround.
 *
 * So this asserts the two halves:
 *
 *   1. Every table reached through `.from()` in `src/` exists in the generated types.
 *      A table missing here means either the types need regenerating or the code is
 *      querying something that does not exist.
 *   2. No `as any` cast on the client for a table that IS typed. Casting a typed table
 *      throws away the checking that caught this bug.
 *
 * What this does NOT do: it cannot tell whether the types file matches the live database.
 * Nothing in CI can, without a Supabase access token. Regeneration is still manual —
 * `npx supabase gen types typescript --project-id <ref>`. This narrows the blast radius
 * rather than closing the gap.
 */

const SRC = join(process.cwd(), "src");

/**
 * Tables deliberately queried without being in the generated types, each with the reason
 * it is absent. Anything not on this list must be typed.
 */
/**
 * Tables a client file may query while absent from the generated types, each with the reason.
 *
 * **Empty as of 2026-08-11, and that is the goal state.** Both former entries —
 * `booking_tips` and `support_handoff_contexts` — said "written but unapplied". Both migrations
 * are now applied to staging and production, and both tables are in the regenerated types, so
 * the entries described a world that had stopped existing.
 *
 * That is the hazard this list carries: an escape hatch whose justification has expired reads
 * exactly like one that is still valid. The "keeps the list honest" test below is what forces the
 * entry out when the reason stops being true, and it is the test that caught these two.
 */
const UNTYPED_BY_DESIGN: Record<string, string> = {};

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : [];
  });

const sourceFiles = walk(SRC);

/** Comments stripped so a table named in prose does not read as a query. */
const stripComments = (source: string) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, "$1"))
    .join("\n");

const typesSource = readFileSync(join(SRC, "integrations/supabase/types.ts"), "utf8");

const typedTables = new Set(
  [...typesSource.matchAll(/\n {6}(\w+): \{\n {8}Row:/g)].map((match) => match[1]),
);

/**
 * Column names per table, taken from each table's `Row` type.
 *
 * Edge Functions are Deno and build their own client with no generated types, so nothing
 * compiles their queries against the schema — the protection the web app now has stops at
 * the `supabase/functions` boundary. This set lets the same checks run over them.
 *
 * The generated types stand in for the live database here. That substitution was verified
 * on 2026-08-07: the column sets matched live exactly, table for table, for all 46 tables
 * the Edge Functions touch. It holds only for as long as the types are regenerated, which
 * is the standing gap recorded in blocker.md.
 */
const typedColumns = new Map<string, Set<string>>(
  [...typesSource.matchAll(/\n {6}(\w+): \{\n {8}Row: \{\n([\s\S]*?)\n {8}\}/g)].map(
    ([, table, body]) => [
      table,
      new Set([...body.matchAll(/^\s+(\w+)\??:/gm)].map((match) => match[1])),
    ],
  ),
);

const edgeFunctionFiles = walk(join(process.cwd(), "supabase/functions"));

/** The balanced bracket group starting at `open`, so a nested object cannot end it early. */
const balanced = (text: string, open: number) => {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if ("{[(".includes(text[i])) depth += 1;
    else if ("}])".includes(text[i])) {
      depth -= 1;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  return "";
};

/**
 * Keys at depth 1 of an object literal.
 *
 * A key's previous non-space character must be `{` or `,`. Without that test the middle
 * branch of a ternary reads as a key — `status: x >= 4 ? "escalated" : "open"` yields a
 * bogus `escalated` — which is exactly the false positive this check produced first time.
 */
const topLevelKeys = (object: string) => {
  const keys: string[] = [];
  let depth = 0;
  for (let i = 0; i < object.length; i += 1) {
    const char = object[i];
    if ("{[(".includes(char)) depth += 1;
    else if ("}])".includes(char)) depth -= 1;
    else if (depth === 1) {
      const before = object.slice(0, i).trimEnd();
      if (before && "{,".includes(before[before.length - 1])) {
        const match = /^\s*(?:["']([A-Za-z_]\w*)["']|([A-Za-z_]\w*))\s*:/.exec(object.slice(i));
        if (match) {
          keys.push(match[1] ?? match[2]);
          i += match[0].length - 1;
        }
      }
    }
  }
  return keys;
};

/** Every `.from(table)` in a file, paired with the query chain that follows it. */
const queryChains = (source: string) => {
  const starts = [...source.matchAll(/\.from\(\s*["'`]([a-z0-9_]+)["'`]/g)];
  return starts.map((match, index) => ({
    table: match[1],
    // Bounded at the next `.from(`. A fixed-size window instead attributed one statement's
    // write columns to a previous statement's table.
    chain: source.slice(
      match.index + match[0].length,
      index + 1 < starts.length ? starts[index + 1].index : source.length,
    ),
  }));
};

describe("supabase schema contract", () => {
  it("types file is populated, so a truncated or failed generation fails loudly", () => {
    // A generation that silently produced an near-empty file would make every other
    // assertion here vacuous, so this is checked before anything depends on it.
    expect(typedTables.size).toBeGreaterThan(50);
  });

  it("every table queried in src/ is present in the generated types", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles) {
      const source = stripComments(readFileSync(file, "utf8"));
      for (const match of source.matchAll(/\.from\(\s*["'`]([a-z0-9_]+)["'`]/g)) {
        const table = match[1];
        if (typedTables.has(table) || table in UNTYPED_BY_DESIGN) continue;
        offenders.push(`${file.replace(process.cwd() + "/", "")} → ${table}`);
      }
    }

    expect(
      offenders,
      "Queried table is not in src/integrations/supabase/types.ts. Either regenerate the " +
        "types, or the table does not exist and the query is broken. If it is genuinely " +
        "pending, add it to UNTYPED_BY_DESIGN with the reason.",
    ).toEqual([]);
  });

  it("does not cast away typing on the client for a table that is typed", () => {
    const offenders: string[] = [];

    for (const file of sourceFiles) {
      const source = stripComments(readFileSync(file, "utf8"));
      // The cast and the .from() can sit on separate lines, so match across whitespace.
      for (const match of source.matchAll(
        /\((?:supabase|supa) as any\)\s*\.from\(\s*["'`]([a-z0-9_]+)["'`]/g,
      )) {
        const table = match[1];
        if (!typedTables.has(table)) continue;
        offenders.push(`${file.replace(process.cwd() + "/", "")} → ${table}`);
      }
    }

    expect(
      offenders,
      "`as any` on the Supabase client disables column checking for the whole statement. " +
        "These tables are typed, so the cast is not needed and hides real mismatches. If a " +
        "single value will not satisfy `Json`, cast that value, not the client.",
    ).toEqual([]);
  });

  it("every table queried by an Edge Function is present in the generated types", () => {
    const offenders: string[] = [];

    for (const file of edgeFunctionFiles) {
      const source = stripComments(readFileSync(file, "utf8"));
      for (const { table } of queryChains(source)) {
        if (typedTables.has(table) || table in UNTYPED_BY_DESIGN) continue;
        offenders.push(`${file.replace(process.cwd() + "/", "")} → ${table}`);
      }
    }

    expect(offenders, "Edge Function queries a table absent from the generated types.").toEqual([]);
  });

  it("Edge Function selects, filters and write payloads use columns that exist", () => {
    const offenders: string[] = [];

    for (const file of edgeFunctionFiles) {
      const source = stripComments(readFileSync(file, "utf8"));
      const where = file.replace(process.cwd() + "/", "");

      for (const { table, chain } of queryChains(source)) {
        const columns = typedColumns.get(table);
        if (!columns) continue; // untyped-by-design; covered by the test above

        // Plain column lists only. A select containing "(" is embedded-resource syntax.
        for (const select of chain.matchAll(/\.select\(\s*["'`]([^"'`()]*)["'`]/g)) {
          for (const raw of select[1].split(",")) {
            const column = raw.trim().split(":").pop()?.trim() ?? "";
            if (!column || column === "*" || !/^[a-z0-9_]+$/.test(column)) continue;
            if (!columns.has(column)) offenders.push(`${where} → ${table}.${column} (select)`);
          }
        }

        for (const filter of chain.matchAll(
          /\.(?:eq|neq|gt|gte|lt|lte|like|ilike|is|in|contains|order)\(\s*["'`]([a-z0-9_]+)["'`]/g,
        )) {
          if (!columns.has(filter[1])) offenders.push(`${where} → ${table}.${filter[1]} (filter)`);
        }

        const write = /\.(insert|update|upsert)\(/.exec(chain);
        if (!write) continue;
        const args = balanced(chain, chain.indexOf("(", write.index));
        const first = args.slice(1, -1).trimStart();
        // A payload passed as a variable cannot be resolved statically, so it is skipped
        // rather than guessed at. Taking only the first argument also keeps the upsert
        // options object (onConflict, ...) out of the column check.
        if (!first.startsWith("{")) continue;
        for (const key of topLevelKeys(balanced(first, 0))) {
          if (!columns.has(key)) offenders.push(`${where} → ${table}.${key} (${write[1]})`);
        }
      }
    }

    expect(
      offenders,
      "Edge Function references a column that does not exist in the generated types. " +
        "PostgREST rejects the whole statement on the first unknown column.",
    ).toEqual([]);
  });

  it("keeps the untyped-by-design list honest", () => {
    for (const [table, reason] of Object.entries(UNTYPED_BY_DESIGN)) {
      // Once a table is typed the exemption is stale and must go, otherwise the list
      // grows into a permanent bypass of the check above.
      expect(typedTables.has(table), `${table} is now typed — remove it from UNTYPED_BY_DESIGN`).toBe(false);
      expect(reason.length, `${table} needs a real reason`).toBeGreaterThan(40);
    }
  });
});
