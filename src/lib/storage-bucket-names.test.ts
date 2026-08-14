import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every storage bucket the code uploads to must be a bucket some migration creates.
 *
 * ── The defect ──────────────────────────────────────────────────────────────────
 * `src/pages/xooter/Profile.tsx:65` uploaded to `xooter-avatars`. That bucket had never existed.
 * The bucket is `zooter-avatars`, and **no migration ever renamed it**: ZD-029's
 * `20260813160000` renamed tables, columns, views and an enum label, and `20260813140000` renamed
 * data values — control keys, agent keys, event names. A storage bucket is neither. It sat in the
 * gap between the two and the sweep went straight past it.
 *
 * Queried on both projects before this test was written:
 *
 *     zooter-avatars   public=true   objects=0
 *     xooter-avatars   does not exist
 *
 * So every Xooter who picked a profile photo got `Bucket not found`. Fixed by
 * `20260814103000_rename_zooter_avatars_bucket.sql`.
 *
 * ── Why a bucket name is the worst kind of string ───────────────────────────────
 * `types.ts` covers tables, columns and functions, so `tsc` catches those. Bucket ids are looked up
 * **by value** at runtime and appear in nothing generated. Neither the compiler, nor
 * `rpc-names-exist.test.ts`, nor the *Types match the live schema* workflow can see them. This file
 * is the only thing standing between a renamed bucket and a broken upload.
 *
 * It reads migrations rather than the live database so it runs offline in `npx vitest run`. The
 * live check is `verify-supabase-live.ps1`.
 */

const ROOT = process.cwd();

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

/**
 * `supabase.storage.from("<bucket>")` and the `*_BUCKET` constants that feed it.
 *
 * Deliberately NOT a bare `.from("…")` — that is also the table accessor, and matching it would
 * drag in all 83 tables. It is also not `bucket:` — that key names a *rate-limit* bucket
 * (`consumeRateLimit({ bucket: "payments" })`), which has nothing to do with storage. Conflating
 * the two produced four false positives the first time this was checked by hand.
 */
const bucketsUsedInCode = () => {
  const found = new Map<string, string>();
  for (const file of [
    ...sourceFiles(join(ROOT, "src")),
    ...sourceFiles(join(ROOT, "supabase/functions")),
    ...sourceFiles(join(ROOT, "mobile/src")),
  ]) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/storage\s*\.\s*from\(\s*["'`]([a-z0-9_-]+)["'`]/g)) {
      if (!found.has(match[1])) found.set(match[1], file.replace(`${ROOT}/`, ""));
    }
    for (const match of source.matchAll(/[A-Z_]*BUCKET[A-Z_]*\s*=\s*["'`]([a-z0-9_-]+)["'`]/g)) {
      if (!found.has(match[1])) found.set(match[1], file.replace(`${ROOT}/`, ""));
    }
  }
  return found;
};

/** Buckets any migration inserts into `storage.buckets`, minus any it later deletes. */
const bucketsInMigrations = () => {
  const dir = join(ROOT, "supabase/migrations");
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");

  const live = new Set<string>();
  for (const match of sql.matchAll(/\(\s*'([a-z0-9_-]+)'\s*,\s*'[a-z0-9_-]+'\s*,\s*(?:true|false)/g)) {
    live.add(match[1]);
  }
  // A bucket that was created and then renamed away is not available to upload to.
  for (const match of sql.matchAll(/delete\s+from\s+storage\.buckets\s+where\s+id\s*=\s*'([a-z0-9_-]+)'/gi)) {
    live.delete(match[1]);
  }
  return live;
};

describe("storage bucket names", () => {
  const used = bucketsUsedInCode();
  const defined = bucketsInMigrations();

  it("found buckets on both sides", () => {
    // A regex that quietly matches nothing would make every assertion below vacuous — the exact
    // shape of guard this repo has shipped before.
    expect(used.size, "no storage.from() calls found — has the call style changed?").toBeGreaterThan(0);
    expect(defined.size, "no buckets parsed out of the migrations").toBeGreaterThan(0);
  });

  it.each([...used])("%s is created by a migration", (bucket, file) => {
    expect(
      [...defined],
      `${file} uploads to "${bucket}", which no migration creates — every upload fails with ` +
        "\"Bucket not found\"",
    ).toContain(bucket);
  });

  it("no bucket id still carries the old brand", () => {
    /*
     * The direction the check above cannot see: code and migrations agreeing on a `zoot`-era name
     * is consistent and still wrong, because a public bucket id is customer-visible — it appears
     * verbatim in every public URL, `/storage/v1/object/public/<bucket>/…`.
     *
     * `zoot-black-certificates` is deliberately exempt: it is private, unreachable from any client
     * (the Xoot Black feature ships dark behind `xoot_black.enabled`, every flag false), and its
     * creating migrations are history that must not be rewritten. Rename it when that feature is
     * turned on, not before.
     */
    const exempt = new Set(["zoot-black-certificates"]);
    const stale = [...defined].filter((bucket) => /^zoot/.test(bucket) && !exempt.has(bucket));
    expect(stale, "a customer-visible bucket id still says zoot").toEqual([]);
  });
});
