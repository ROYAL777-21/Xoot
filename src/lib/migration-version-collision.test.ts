import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `supabase db push` keys on a migration's 14-digit VERSION, and never on its name.
 *
 * ── What happened, 2026-08-20 ───────────────────────────────────────────────────
 * Two sessions work this repository and cannot message each other. On 2026-08-15 both wrote a
 * migration numbered `20260815150000`:
 *
 *   Release     20260815150000_rename_remaining_zooter_check_bodies.sql   -> applied to production
 *   Correctness 20260815150000_revoke_client_writes_without_policy.sql    -> never applied
 *
 * Each branch was internally consistent, so nothing local could see the clash. Once Release's
 * migration was recorded in `supabase_migrations.schema_migrations`, the next `db push` would have
 * found version `20260815150000` already present, **skipped the revoke file, and exited 0**. All 34
 * client write grants would have stayed exactly where they were, with the repository's own ledger
 * saying they had been revoked.
 *
 * A revoke that silently does not happen is worse than no revoke, because everything downstream
 * reads as done.
 *
 * ── Why a duplicate-filename check is not enough ────────────────────────────────
 * The obvious guard — "no two files in `supabase/migrations/` share a version" — would NOT have
 * caught this. The two files were never in the same tree. The only thing that catches it is
 * comparing the tree against **what production has already run**, which is what
 * `supabase/applied-migrations.json` is for.
 *
 * That snapshot is committed, so this runs offline with no credentials, in `security:scan`'s
 * company rather than in the credentialed drift script that CI cannot invoke.
 *
 * ── Staleness is safe in one direction only ─────────────────────────────────────
 * An out-of-date snapshot can MISS a new collision. It cannot invent one: every assertion here
 * fires on a disagreement between two recorded facts, never on absence. Regenerate it with the
 * query in the file's own `regenerate` field, and read the diff.
 */

const ROOT = process.cwd();
const MIGRATION_DIR = join(ROOT, "supabase/migrations");
const SNAPSHOT_PATH = join(ROOT, "supabase/applied-migrations.json");

const FILENAME = /^(\d{14})_(.+)\.sql$/;

type Snapshot = {
  readAt: string;
  projectRef: string;
  applied: { version: string; name: string }[];
};

const snapshot = (): Snapshot => JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")) as Snapshot;

const migrationFiles = () => readdirSync(MIGRATION_DIR).filter((f) => f.endsWith(".sql")).sort();

/** version -> name, for every well-formed local migration file. */
const localByVersion = () => {
  const out = new Map<string, string>();
  for (const file of migrationFiles()) {
    const match = FILENAME.exec(file);
    if (match) out.set(match[1], match[2]);
  }
  return out;
};

const appliedByVersion = () => new Map(snapshot().applied.map((a) => [a.version, a.name] as const));

describe("the applied-migrations snapshot", () => {
  it("is well formed and identifies where it was read from", () => {
    const snap = snapshot();
    expect(snap.projectRef, "the snapshot must say which project it describes").toMatch(/^[a-z]{20}$/);
    expect(snap.readAt, "the snapshot must carry the date it was read").toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(snap.applied.length, "an empty snapshot would make every assertion here vacuous").toBeGreaterThan(50);
  });

  it("records each version exactly once", () => {
    const versions = snapshot().applied.map((a) => a.version);
    expect(versions.length - new Set(versions).size, "duplicate versions in the snapshot").toBe(0);
  });
});

describe("local migration files", () => {
  it("are all named <14-digit version>_<name>.sql", () => {
    const malformed = migrationFiles().filter((f) => !FILENAME.test(f));
    expect(malformed, "the CLI derives the version from the filename; a malformed name is unpushable").toEqual([]);
  });

  it("never share a version with each other", () => {
    const seen = new Map<string, string[]>();
    for (const file of migrationFiles()) {
      const version = FILENAME.exec(file)?.[1];
      if (!version) continue;
      seen.set(version, [...(seen.get(version) ?? []), file]);
    }
    const clashes = [...seen.entries()].filter(([, files]) => files.length > 1);
    expect(clashes, "two files at one version: db push applies whichever it sees first").toEqual([]);
  });
});

describe("local files against what production has already run", () => {
  it("never reuse a version production recorded under a different name", () => {
    /*
     * THE ONE THAT MATTERS. A local file at an already-applied version is skipped by `db push`,
     * which then reports success. This is the assertion that fails on the 2026-08-20 collision.
     */
    const applied = appliedByVersion();
    const collisions: string[] = [];
    for (const [version, name] of localByVersion()) {
      const appliedName = applied.get(version);
      if (appliedName !== undefined && appliedName !== name) {
        collisions.push(
          `${version}: repo has "${name}", production already ran "${appliedName}" — ` +
            `db push will SKIP the repo file and still exit 0. Renumber it.`,
        );
      }
    }
    expect(collisions, "a migration here would never run, and nothing would say so").toEqual([]);
  });

  it("account for every migration production has run", () => {
    /*
     * The other direction. A version applied on production with no file in the repository means
     * `supabase/migrations/**` can no longer rebuild the database — someone applied SQL out of
     * band. `20260815160000_xootcred_trigger_queries_a_dropped_table` was exactly this on
     * 2026-08-20, applied and present in neither branch.
     */
    const local = localByVersion();
    const orphans = [...appliedByVersion().entries()]
      .filter(([version]) => !local.has(version))
      .map(([version, name]) => `${version}_${name} is applied on production but has no file here`);
    expect(orphans, "the repo can no longer rebuild the database from migrations alone").toEqual([]);
  });
});
