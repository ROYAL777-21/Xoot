/**
 * What the client can actually write, compared against a reviewed baseline.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────────
 * `docs/security/rls-and-database-security-review.md` said "Reviewed: 2026-07-02" and stayed
 * accurate-looking through **eleven migrations**, including a client write-surface lockdown, fare
 * splits, and ZD-029 renaming 18 tables and 25 columns. Nothing in the repository failed when it
 * stopped being true. This is the thing that fails.
 *
 * ── A write needs BOTH a grant and a policy ─────────────────────────────────────
 * Reading either alone gives the wrong answer, in both directions, and this repo has a live example
 * of each:
 *
 *   `xooters` carries a permissive `UPDATE ... USING (user_id = auth.uid())` policy with no column
 *   restriction — over `rating`, `jobs_completed`, `verified`, `tier`. Read alone it looks like a
 *   Xooter can award themselves a tier. It is **unreachable**: the UPDATE grant was revoked.
 *
 *   `xooter_earnings`, `subscription_plans`, `training_modules` and ~10 others hold client
 *   INSERT/UPDATE/DELETE **grants** with **zero policies**. Read alone that looks alarming. They
 *   are inert, because RLS default-denies. But the grant is pre-placed, so the day anyone adds a
 *   permissive policy the write is live with no second decision.
 *
 * So the unit is `(table, command)` joined across both, plus whether a non-admin can reach it.
 *
 * ── Why the live database and not the migrations ────────────────────────────────
 * Deriving this from `supabase/migrations/**` would mean replaying 32 files of grants against 88
 * revokes, through a rename — reimplementing Postgres to answer a question Postgres answers
 * directly. The database is the authority; this reads it.
 *
 * ── Usage ───────────────────────────────────────────────────────────────────────
 *   SUPABASE_ACCESS_TOKEN=… node scripts/security/authz-surface.mjs                 # verify
 *   SUPABASE_ACCESS_TOKEN=… node scripts/security/authz-surface.mjs --staging       # verify staging
 *   SUPABASE_ACCESS_TOKEN=… node scripts/security/authz-surface.mjs --write         # regenerate
 *   SUPABASE_ACCESS_TOKEN=… node scripts/security/authz-surface.mjs --write --staging
 *
 * `--write` regenerates the baseline for a human to read and commit. It is never run in CI: a
 * guard that rewrites its own expectations is not a guard.
 *
 * ── One baseline per project, added 2026-08-20 ──────────────────────────────────
 * `BASELINE_PATH` used to be a single constant while only the project ref varied, so `--staging`
 * diffed STAGING's live surface against PRODUCTION's expectations — reporting every legitimate
 * difference between the two environments as drift. That is why authz audit finding #2, "staging
 * and production write surfaces differ and nothing checks it", stayed open: the tool that was
 * supposed to check it could not tell the two apart.
 *
 * Worse, `--write --staging` wrote staging's data INTO the production baseline file. Not noise —
 * silent corruption of the document the production guard reads.
 *
 * The two environments genuinely differ, and that is not by itself a defect: staging carries
 * `referrals`, `referral_redemptions` and `subscription_cancellation_requests`; production carries
 * `analytics_events`, `masked_conversation_sessions` and `notification_templates`. Each project now
 * has its own reviewed baseline, and `src/lib/environment-write-surface-parity.test.ts` compares
 * the two offline.
 *
 * Deliberately NOT part of `npm run security:scan`, which runs offline and must stay runnable
 * without credentials. `src/lib/authz-surface.test.ts` is the offline half.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const PRODUCTION_REF = "mvlrkelahhsyjrwgsxaf";
const STAGING_REF = "fxmxyabdjqviqbcxmvlp";

/** One reviewed baseline per project. Never one file for both — see the header. */
const BASELINE_PATHS = {
  [PRODUCTION_REF]: join(ROOT, "docs/security/client-write-surface.json"),
  [STAGING_REF]: join(ROOT, "docs/security/client-write-surface.staging.json"),
};
const baselinePathFor = (ref) => BASELINE_PATHS[ref];
const baselineNameFor = (ref) => baselinePathFor(ref).slice(ROOT.length + 1);

/**
 * The join, as one query.
 *
 * ── Why this fingerprints the policies instead of classifying them ──────────────
 * The obvious design is a boolean: "can a non-admin reach this write?" Two attempts at that
 * heuristic were both wrong, and the second was wrong in the dangerous direction:
 *
 *   `not ilike '%has_role%'` — excludes `(user_id = auth.uid()) OR has_role(admin)`, which IS
 *   owner-reachable. This reported `profiles:UPDATE` as unreachable on production, one step from
 *   filing "editing your profile is broken in production". It is not.
 *
 *   `bool_and(… ilike '%has_role%')` — the inverse. It labels that same owner-reachable policy
 *   "admin only", so a policy widening from admin-only to owner-or-admin would not move the
 *   boolean and **the guard would stay silent through exactly the change it exists to catch**.
 *
 * No regex over policy SQL decides reachability correctly, so this stops trying. It records a
 * fingerprint of the policy text, and **any** change to a policy touching a client-writable table
 * fires. That is noisier and it is right: a human reads the diff and decides, which is the one
 * step a heuristic was standing in for.
 */
const SURFACE_QUERY = `
with client_writes as (
  select distinct table_name, privilege_type as cmd
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('authenticated', 'anon')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
)
select w.table_name,
       w.cmd,
       count(p.policyname)::int as policy_count,
       coalesce(
         md5(string_agg(
           p.policyname || '|' || p.roles::text || '|' || coalesce(p.qual, '') || '|' || coalesce(p.with_check, ''),
           E'\\n' order by p.policyname
         )),
         'no-policy'
       ) as policy_fingerprint
from client_writes w
left join pg_policies p
  on p.schemaname = 'public'
 and p.tablename = w.table_name
 and (p.cmd = w.cmd or p.cmd = 'ALL')
group by w.table_name, w.cmd
order by w.table_name, w.cmd
`;

/** Tables with RLS switched off are reported separately — that is a different, worse problem. */
const RLS_QUERY = `
select t.tablename
from pg_tables t
join pg_class c on c.relname = t.tablename and c.relnamespace = 'public'::regnamespace
where t.schemaname = 'public' and not c.relrowsecurity
order by t.tablename
`;

const die = (message) => {
  console.error(`authz-surface: ${message}`);
  process.exit(1);
};

const runQuery = async (ref, query) => {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) die("SUPABASE_ACCESS_TOKEN is not set, so the live surface cannot be read.");

  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) {
    die(`query against ${ref} failed: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`);
  }
  return response.json();
};

/** `table:CMD` — stable, sorted, and readable in a diff. */
export const entryKey = (row) => `${row.table_name}:${row.cmd}`;

/**
 * Compare a live surface against the baseline.
 *
 * Pure, exported, and tested offline in `src/lib/authz-surface.test.ts` — the connection cannot be
 * exercised from an agent session (no database credentials reach it), so the part that decides
 * pass or fail is kept separable from the part that fetches. Testing only the fetch would prove
 * nothing; testing only the decision proves the thing that matters.
 */
export const diffSurface = (liveRows, baseline) => {
  const known = new Map(Object.entries(baseline.entries ?? {}));
  const live = new Map(liveRows.map((row) => [entryKey(row), row]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [key, row] of live) {
    const expected = known.get(key);
    if (!expected) {
      added.push(key);
      continue;
    }
    /*
     * Any change to the policies governing a client-writable command. A table gaining its first
     * policy (`no-policy` -> a hash) is the one that matters most: those grants are inert only
     * because RLS default-denies, so the first policy makes the write live with no second decision.
     */
    if (row.policy_fingerprint !== expected.policy_fingerprint) {
      changed.push(
        `${key}: policies changed (${expected.policy_count} -> ${row.policy_count})`,
      );
    }
  }
  for (const key of known.keys()) if (!live.has(key)) removed.push(key);

  return { added, removed, changed, ok: !added.length && !removed.length && !changed.length };
};

const toBaseline = (rows, ref) => ({
  generated_at: new Date().toISOString(),
  project_ref: ref,
  note: "Regenerate with --write, then READ THE DIFF before committing. Every entry is a decision about who may write.",
  entries: Object.fromEntries(
    rows.map((row) => [
      entryKey(row),
      { policy_count: row.policy_count, policy_fingerprint: row.policy_fingerprint },
    ]),
  ),
});

const main = async () => {
  const staging = process.argv.includes("--staging");
  const write = process.argv.includes("--write");
  const ref = staging ? STAGING_REF : PRODUCTION_REF;

  const baselinePath = baselinePathFor(ref);

  const rows = await runQuery(ref, SURFACE_QUERY);
  const rlsOff = await runQuery(ref, RLS_QUERY);

  if (write) {
    writeFileSync(baselinePath, `${JSON.stringify(toBaseline(rows, ref), null, 2)}\n`);
    console.log(`authz-surface: wrote ${rows.length} entries to ${baselineNameFor(ref)}`);
    console.log("Read the diff before committing. Every entry is a decision about who may write.");
    return;
  }

  const failures = [];

  if (rlsOff.length) {
    // Worse than any grant change: a table with RLS off is readable and writable by anyone holding
    // the anon key, policies notwithstanding.
    failures.push(`RLS is DISABLED on: ${rlsOff.map((r) => r.tablename).join(", ")}`);
  }

  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));

  if (baseline.project_ref !== ref) {
    // The baseline names the project it describes. If they disagree, something copied one
    // environment's file over the other's and every comparison below would be meaningless.
    die(`${baselineNameFor(ref)} describes ${baseline.project_ref}, not ${ref}`);
  }
  const { added, removed, changed, ok } = diffSurface(rows, baseline);

  if (!ok) {
    if (added.length) failures.push(`client write surface GAINED: ${added.join(", ")}`);
    if (changed.length) failures.push(`reachability CHANGED: ${changed.join("; ")}`);
    // Removals are reported, not celebrated: a write disappearing can mean a feature broke.
    if (removed.length) failures.push(`client write surface LOST: ${removed.join(", ")}`);
  }

  if (failures.length) {
    console.error(`authz-surface: ${ref} does not match ${baselineNameFor(ref)}\n`);
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error(
      "\nIf the change is intended, regenerate with --write, read the diff, and commit it with the reason.",
    );
    process.exit(1);
  }

  console.log(
    `authz-surface: ${ref} matches the baseline — ${rows.length} client-writable (table, command) pairs, RLS on every table.`,
  );
};

// Only run when invoked directly, so the test can import `diffSurface` without hitting the network.
if (process.argv[1] && process.argv[1].endsWith("authz-surface.mjs")) {
  main().catch((error) => die(error instanceof Error ? error.message : String(error)));
}
