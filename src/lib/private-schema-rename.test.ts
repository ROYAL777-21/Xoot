import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The `private` schema got renamed too — or it did the third time.
 *
 * ── The defect ──────────────────────────────────────────────────────────────────
 * ZD-029 renamed 18 tables and 25 columns. A function body is stored as text, so
 * `alter table … rename` never rewrites one. That has now bitten three times:
 *
 *   1. eight `public` functions          -> fixed by `20260813220000`
 *   2. `sensitive-access-read`'s RPC args -> fixed in the same change
 *   3. **two `private` functions**        -> fixed by `20260814170000`, this test
 *
 * Round 2 is the one worth remembering: I wrote the fix for round 1, checked `public`, and
 * stopped. `private` was never queried. One of the two functions there runs on a cron schedule:
 *
 *   cron job "zoot-sensitive-access-ready", every minute
 *     last success  2026-08-13 09:35:00
 *     first failure 2026-08-13 09:36:00      <- the minute ZD-029 was applied
 *     1,975 consecutive failures on production, 1,977 on staging, still failing 33 hours later
 *
 *     ERROR: relation "public.zooters" does not exist
 *
 * Nothing surfaced it. A failing cron writes to `cron.job_run_details` and nowhere a person looks.
 *
 * ── What this test can and cannot see ───────────────────────────────────────────
 * It reads migration SQL, so it runs offline. It **cannot** see a live function body — the
 * authority for that is a query against `pg_proc`, which is what found this. What it *can* do is
 * stop a migration from being written that reintroduces a dropped name, which is how all three
 * rounds started.
 */

const ROOT = process.cwd();
const MIGRATIONS = join(ROOT, "supabase/migrations");

/** Objects ZD-029 renamed away. Naming one of these in NEW sql is naming something that is gone. */
const DROPPED_OBJECTS = [
  "public.zooters",
  "zooter_id",
  "zooter_jobs",
  "zooter_earnings",
  "zooter_payout_accounts",
];

/**
 * Migrations written after the rename. Anything at or before `20260813160000` is history and is
 * *supposed* to name the old objects — rewriting it would make a fresh `supabase db reset` create
 * the new name early and then fail the rename itself.
 */
const RENAME_VERSION = "20260813160000";

const migrationsAfterRename = () =>
  readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .filter((f) => (f.match(/^(\d{14})_/)?.[1] ?? "") > RENAME_VERSION)
    .sort();

describe("no migration written after ZD-029 may name a dropped object", () => {
  const files = migrationsAfterRename();

  it("found migrations after the rename", () => {
    // If this ever hits zero the suite below is vacuous — the shape of guard this repo has shipped.
    expect(files.length, "no post-rename migrations found; has the version moved?").toBeGreaterThan(0);
  });

  it.each(files)("%s names only objects that still exist", (file) => {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    // Comments are where these migrations *explain* the old names, which is the point of them.
    const executable = sql
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");

    const offenders = DROPPED_OBJECTS.filter((name) => executable.includes(name));
    expect(
      offenders,
      `${file} references objects ZD-029 renamed away. A function body is stored as text, so this ` +
        "will not error until something calls it — which for a cron job means never, out loud.",
    ).toEqual([]);
  });
});

describe("the private schema is covered, not just public", () => {
  const sql = readFileSync(join(MIGRATIONS, "20260814170000_fix_private_function_bodies_zd029.sql"), "utf8");

  it.each([
    ["private.enqueue_sensitive_access_notifications", "the cron job that announces gate-code access"],
    ["private.can_create_masked_call", "the masked-voice eligibility gate"],
  ])("rebuilds %s", (fn) => {
    expect(sql).toContain(`create or replace function ${fn}`);
  });

  it("repoints the notification at a route that exists", () => {
    /*
     * The link in the notification was `/zooter/jobs`. The app serves `/xooter/jobs`, so the deep
     * link in the one notification that matters led nowhere. Asserted against the router rather
     * than against a string I chose, so this stays true if the route moves again.
     */
    const app = readFileSync(join(ROOT, "src/App.tsx"), "utf8");
    // Comments are where the migration explains what the old value was and why it was wrong.
    // Stripping them is the difference between checking the SQL and checking the prose.
    const executable = sql
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");

    const route = executable.match(/'(\/[a-z]+\/jobs)'/)?.[1];
    expect(route, "the migration no longer sets a jobs route").toBeTruthy();
    expect(app, `the migration links to ${route}, which src/App.tsx does not serve`).toContain(
      `path="${route}"`,
    );
    expect(executable).not.toContain("/zooter/jobs");
  });

  it("keeps the masked-call reason strings that other tests pin as contract", () => {
    /*
     * Changing a returned reason string is an API change, not a rename. `twilio-phase9-readiness`
     * pins these against migration text; this asserts the outage fix did not quietly move them.
     *
     * ⚠️ Matches the QUOTED literal, not a substring. `toContain("not_booking_participant")` passes
     * against `'not_booking_participant_x'` — planting exactly that is how this assertion was
     * caught being useless. Third time today a substring test hid a real difference.
     */
    for (const reason of ["not_booking_participant", "masked_voice_requires_accepted_active_booking"]) {
      expect(sql, `${reason} is pinned elsewhere and must survive this rebuild`).toContain(`'${reason}'`);
    }
  });
});
