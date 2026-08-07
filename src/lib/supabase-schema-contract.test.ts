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
const UNTYPED_BY_DESIGN: Record<string, string> = {
  booking_tips:
    "20260730090000_booking_tips.sql is written but unapplied (gated on ZD-003/ZD-005). " +
    "TIP_READINESS is 'schema_pending' and canOfferTip() is false, so the insert is " +
    "unreachable. Remove this entry when the migration is applied and types regenerated.",
};

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

const typedTables = (() => {
  const types = readFileSync(join(SRC, "integrations/supabase/types.ts"), "utf8");
  return new Set([...types.matchAll(/\n {6}(\w+): \{\n {8}Row:/g)].map((match) => match[1]));
})();

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

  it("keeps the untyped-by-design list honest", () => {
    for (const [table, reason] of Object.entries(UNTYPED_BY_DESIGN)) {
      // Once a table is typed the exemption is stale and must go, otherwise the list
      // grows into a permanent bypass of the check above.
      expect(typedTables.has(table), `${table} is now typed — remove it from UNTYPED_BY_DESIGN`).toBe(false);
      expect(reason.length, `${table} needs a real reason`).toBeGreaterThan(40);
    }
  });
});
