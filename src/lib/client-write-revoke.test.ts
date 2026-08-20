import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The revoke migration must match the audit it implements, and must never use `revoke all`.
 *
 * ── Why this test exists ────────────────────────────────────────────────────────
 * A client write needs a table GRANT **and** a permissive RLS policy. 34 grants had the grant and
 * no policy, so they were unreachable — permission Postgres would never honour. Unreachable is not
 * harmless: it is half of a pair that completes itself the moment someone adds a policy for an
 * unrelated reason, which is a normal thing to do and does not look dangerous at review.
 *
 * ── The trap this pins ──────────────────────────────────────────────────────────
 * `profiles` has a live UPDATE writer at `src/pages/app/Profile.tsx:74`, and only
 * `profiles:DELETE` lacks a policy. Both instinctive readings are wrong:
 *
 *   "profiles has a writer, leave it"  -> the DELETE grant survives and completes later
 *   "revoke all on public.profiles"    -> editing your own profile breaks in production
 *
 * So the migration must name operations, never `ALL`. That is the assertion below, and it is the
 * one that would have caught the mistake the last tightening made here.
 */

const ROOT = process.cwd();
const MIGRATION = "supabase/migrations/20260820120000_revoke_client_writes_without_policy.sql";
const BASELINE = "docs/security/client-write-surface.json";

const sql = () => readFileSync(join(ROOT, MIGRATION), "utf8");

/** Statement text only — the comments explain the old state and are meant to keep saying so. */
const executable = (text: string) =>
  text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");

/** `revoke <ops> on public.<table> from …` -> { table, ops }. */
const revokes = () =>
  [...executable(sql()).matchAll(/revoke\s+([a-z,\s]+?)\s+on\s+public\.([a-z0-9_]+)\s+from\s+([a-z,\s]+);/gi)].map(
    (m) => ({
      ops: m[1].split(",").map((o) => o.trim().toUpperCase()).filter(Boolean),
      table: m[2],
      roles: m[3].split(",").map((r) => r.trim()).filter(Boolean),
    }),
  );

/** `table:OP` pairs the committed audit says have a grant and zero policies. */
const noPolicyPairs = () => {
  const baseline = JSON.parse(readFileSync(join(ROOT, BASELINE), "utf8"));
  return Object.entries(baseline.entries as Record<string, { policy_count: number }>)
    .filter(([, v]) => v.policy_count === 0)
    .map(([k]) => k);
};

describe("the revoke migration matches the audit", () => {
  it("parsed both sides", () => {
    // A regex that matches nothing would make everything below vacuous.
    expect(revokes().length, "no revoke statements parsed").toBeGreaterThan(5);
    expect(noPolicyPairs().length, "no no-policy pairs in the baseline").toBe(34);
  });

  it("never uses `revoke all` — the statement that would break profile editing", () => {
    expect(
      /revoke\s+all\b/i.test(executable(sql())),
      "`revoke all` removes SELECT and the policied writes too; profiles:UPDATE is live",
    ).toBe(false);
  });

  it("revokes exactly the pairs the audit found unreachable, and nothing else", () => {
    const revoked = new Set<string>();
    for (const { table, ops } of revokes()) for (const op of ops) revoked.add(`${table}:${op}`);

    const expected = new Set(noPolicyPairs());
    const missing = [...expected].filter((p) => !revoked.has(p));
    const extra = [...revoked].filter((p) => !expected.has(p));

    expect(missing, "the audit says these are unreachable but the migration leaves them granted").toEqual([]);
    expect(
      extra,
      "the migration revokes something the audit did not mark unreachable — that is a behaviour " +
        "change, not a cleanup, and needs its own evidence",
    ).toEqual([]);
  });

  it("names both client roles on every statement", () => {
    /*
     * `analytics_events` is granted to `anon` AND `authenticated`; every other table here is
     * `authenticated` only. Revoking from one role would have left the other holding it — read
     * from the live database, not from the baseline, which flattens the grantee.
     *
     * Revoking a grant that was never made is a no-op, so naming both everywhere is safe.
     */
    const wrong = revokes().filter(
      (r) => !r.roles.includes("authenticated") || !r.roles.includes("anon"),
    );
    expect(wrong.map((r) => r.table), "a revoke names only one client role").toEqual([]);
  });

  it("profiles keeps the operations its live writer needs", () => {
    const profiles = revokes().filter((r) => r.table === "profiles");
    expect(profiles.length, "profiles must appear exactly once").toBe(1);
    expect(profiles[0].ops, "only DELETE lacks a policy on profiles").toEqual(["DELETE"]);
  });

  it("still has the writer it is protecting", () => {
    // If Profile.tsx stops updating profiles, the reasoning above needs re-deriving rather than
    // inheriting. Fails loudly instead of silently becoming a comment about nothing.
    const profileScreen = readFileSync(join(ROOT, "src/pages/app/Profile.tsx"), "utf8");
    expect(
      /from\(\s*["']profiles["']\s*\)[\s\S]{0,80}?\.update\(/.test(profileScreen),
      "src/pages/app/Profile.tsx no longer updates profiles — re-run the writer audit",
    ).toBe(true);
  });
});

describe("no client writer exists for any table this migration fully revokes", () => {
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

  const clientSource = [...sourceFiles(join(ROOT, "src")), ...sourceFiles(join(ROOT, "mobile/src"))]
    .map((f) => ({ file: f.replace(`${ROOT}/`, ""), text: readFileSync(f, "utf8") }));

  const fullyRevoked = revokes()
    .filter((r) => r.ops.includes("INSERT") && r.ops.includes("UPDATE") && r.ops.includes("DELETE"))
    .map((r) => r.table);

  it.each(fullyRevoked)("%s has no client write", (table) => {
    /*
     * The step that must never be skipped. The last time someone tightened grants without checking
     * the writers it took production down — so this is asserted in the suite rather than left as a
     * grep somebody remembers to run.
     */
    const offenders = clientSource
      .filter(({ text }) => {
        const at = text.indexOf(`from("${table}")`) >= 0 ? text.indexOf(`from("${table}")`) : text.indexOf(`from('${table}')`);
        if (at < 0) return false;
        return /\.(insert|update|upsert|delete)\(/.test(text.slice(at, at + 240));
      })
      .map(({ file }) => file);

    expect(offenders, `${table} is written by a client, so revoking its writes breaks that screen`).toEqual([]);
  });
});
