import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The sweep that finally makes production's identifiers match `types.ts`.
 *
 * ── Why this file exists at all ─────────────────────────────────────────────────
 * `alter table … rename` rewrites references, never stored identifiers. After ZD-029 production
 * still carried 113 constraints, 64 indexes, 27 policies and 3 triggers whose NAMES said `zoot`,
 * while `types.ts` — regenerated optimistically during the rename — carried the `xoot` versions.
 * That mismatch is why *Types match the live schema* has been red, and
 * `20260821090000_zd029_rename_remaining_identifiers.sql` is what closes it.
 *
 * ── The defect this guard is really about ───────────────────────────────────────
 * The first draft of that migration used a PREFIX LIST — `zooter`→`xooter`, `zootcred`→`xootcred`,
 * `zoot_black`→`xoot_black`. It silently left **15** identifiers behind, every one of them
 * `zoot_concierge_*`, because that prefix was not on the list. A sweep whose pattern list is
 * shorter than reality is exactly the failure ZD-029 itself was, one level down.
 *
 * Every case is the same four letters, so the rule is those four letters and there is no list to be
 * incomplete. These assertions exist to stop anyone re-introducing a narrower one.
 */

const ROOT = process.cwd();
const MIGRATION = "supabase/migrations/20260821090000_zd029_rename_remaining_identifiers.sql";
const TYPES = "src/integrations/supabase/types.ts";

const sql = () => readFileSync(join(ROOT, MIGRATION), "utf8");

/** Statement text only — the header comment quotes the old names on purpose. */
const executable = (text: string) =>
  text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");

describe("types.ts is the target, not the thing being changed", () => {
  it("carries no zoot-named foreign key, so production must move to meet it", () => {
    const names = [...readFileSync(join(ROOT, TYPES), "utf8").matchAll(/foreignKeyName:\s*"([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(names.length, "no foreignKeyName entries parsed — the rest would be vacuous").toBeGreaterThan(50);
    expect(
      names.filter((n) => n.includes("zoot")),
      "types.ts should already hold the post-rename names",
    ).toEqual([]);
    expect(names.some((n) => n.includes("xoot")), "and it should hold xoot ones").toBe(true);
  });

  it("is not edited by this migration — the database moves, the types stay", () => {
    // If a future change starts rewriting types.ts to match a half-swept database, the two drift
    // apart again and the check goes green for the wrong reason.
    expect(sql()).not.toContain("types.ts\n");
  });
});

describe("the sweep uses the universal rule, never a prefix list", () => {
  it("replaces `zoot` with `xoot` and nothing narrower", () => {
    const body = executable(sql());
    expect(body, "the universal rule must be the one in the file").toContain("'zoot','xoot'");

    // The 15 identifiers the first draft missed were all zoot_concierge_*. Any of these as a
    // replace() pattern means someone has gone back to enumerating prefixes.
    const narrower = ["'zooter','xooter'", "'zootcred','xootcred'", "'zoot_black','xoot_black'"].filter(
      (pattern) => body.includes(pattern),
    );
    expect(
      narrower,
      "a prefix list is shorter than reality — zoot_concierge_* proved it, 15 identifiers over",
    ).toEqual([]);
  });

  it("covers all four classes of stored identifier, each in its own rename loop", () => {
    /*
     * Checked against the LOOPS, not the whole file.
     *
     * A first version asserted `body.toContain("pg_policies")`. Deleting the entire policy loop
     * still passed, because the final leftover assertion also names `pg_policies` in its count
     * query. The string was present; the sweep was not. Every catalogue here appears at least
     * twice in the file, so presence proves nothing — only a `for … in select … from <catalogue>`
     * followed by an `execute format('alter …')` does.
     */
    const loops = [...executable(sql()).matchAll(/for\s+r\s+in\s+select([\s\S]*?)end loop;/gi)].map(
      (m) => m[1],
    );
    expect(loops.length, "four rename loops expected").toBe(4);

    const missing: string[] = [];
    for (const [catalog, why] of [
      ["pg_constraint", "113 constraints, and PK/UNIQUE renames carry their index"],
      ["pg_indexes", "37 indexes that do not back a constraint"],
      ["pg_policies", "27 policy names — bodies were already rewritten, names were not"],
      ["pg_trigger", "3 triggers"],
    ] as const) {
      const loop = loops.find((l) => l.includes(catalog));
      if (!loop) missing.push(`${catalog} has no rename loop: ${why}`);
      else if (!/execute format\('alter /i.test(loop)) missing.push(`${catalog} is read but never renamed`);
    }
    expect(missing, "a class of identifier would survive the sweep").toEqual([]);
  });

  it("renames constraints before re-reading indexes", () => {
    // Renaming a PK or UNIQUE constraint renames its backing index too. Counting indexes first and
    // then renaming constraints would try to rename 27 indexes that no longer have those names.
    const body = executable(sql());
    expect(body.indexOf("pg_constraint")).toBeLessThan(body.indexOf("pg_indexes"));
  });
});

describe("it cannot report a success it did not achieve", () => {
  it("raises if any identifier still contains zoot", () => {
    const body = executable(sql());
    expect(body, "no final assertion — a partial sweep would look like a clean apply").toMatch(
      /raise exception[^;]*zoot/i,
    );
  });

  it("is driven by the catalogue, not by literal statements captured today", () => {
    /*
     * Three reasons this matters, each learned here:
     *   - `20260820140000` already recreates booking_tips' policy under the new name, so a literal
     *     `alter policy "zooters view settled tips only"` would fail on a missing object;
     *   - migrations wait days for a db-push, and literals captured now can be stale by then;
     *   - a catalogue loop is re-runnable after a partial apply.
     */
    const body = executable(sql());
    const literals = [...body.matchAll(/alter\s+(table|index|policy|trigger)\b[^;]*zoot[^;]*;/gi)].map(
      (m) => m[0].slice(0, 70),
    );
    expect(literals, "literal renames go stale and collide with 20260820140000").toEqual([]);
    expect(body, "the loops must read the live catalogue").toMatch(/for\s+r\s+in\s+select/i);
  });

  it("records the counts it was written against", () => {
    // Measured on production 2026-08-21 and confirmed by applying the whole block inside a
    // transaction that was rolled back: all four counts went to zero, 0 colliding targets.
    for (const n of ["113", "37", "27", "3", "180"]) {
      expect(sql(), `the header should state the ${n} it was measured against`).toContain(n);
    }
  });
});
