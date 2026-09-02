#!/usr/bin/env node
/**
 * Does the database still contain everything its own functions reference?
 *
 * Written 2026-08-15, after a trigger function spent two days calling a table that had been
 * renamed out from under it. `check_xootcred_balance` read `from public.zootcred_ledger` while the
 * table was `xootcred_ledger`, so every XootCred debit failed with
 *
 *     ERROR: 42P01: relation "public.zootcred_ledger" does not exist
 *
 * and every file in the repo was correct throughout. `ALTER FUNCTION ... RENAME` changes the name
 * and not one character of the body, which is how it happened and why no repo-side test could see
 * it. That check was written into a markdown file as a "post-deploy step" first — **a check that
 * lives in prose is a check nobody runs**, so it is a script now.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=... node scripts/ops/check-schema-drift.mjs [--staging]
 *   node scripts/ops/check-schema-drift.mjs --from-json <file>
 *
 * `--from-json` takes `{ routines: [{schema,name,body}], relations: ["public.x"], triggers: [...] }`
 * so this runs where `api.supabase.com` is unreachable — the same escape hatch, and for the same
 * reason, as `check-deployed-drift.mjs`.
 *
 * Exit codes: 0 nothing missing, 1 drift found, 2 could not determine.
 */
import { readFileSync } from "node:fs";
import { findBrokenTriggers, findMissingRelations } from "./lib/schema-drift.mjs";

const PROJECTS = { production: "mvlrkelahhsyjrwgsxaf", staging: "fxmxyabdjqviqbcxmvlp" };

const args = process.argv.slice(2);
const jsonAt = args.indexOf("--from-json");
const environment = args.includes("--staging") ? "staging" : "production";

const die = (message, code = 2) => {
  console.error(`schema-drift: ${message}`);
  process.exit(code);
};

/**
 * One round trip, three catalogues.
 *
 * Deliberately one statement: three separate queries could interleave with a migration and produce
 * a snapshot where a routine references a table that a later query then reports as present.
 */
const SNAPSHOT_SQL = `
select json_build_object(
  'routines', (
    select coalesce(json_agg(json_build_object('schema', n.nspname, 'name', p.proname, 'body', p.prosrc)), '[]')
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
  ),
  'relations', (
    select coalesce(json_agg(n.nspname || '.' || c.relname), '[]')
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'v', 'm', 'p', 'f')
  ),
  'triggers', (
    select coalesce(json_agg(json_build_object(
      'name', t.tgname,
      'table', tn.nspname || '.' || tc.relname,
      'function', pn.nspname || '.' || p.proname)), '[]')
    from pg_trigger t
    join pg_class tc on tc.oid = t.tgrelid
    join pg_namespace tn on tn.oid = tc.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace pn on pn.oid = p.pronamespace
    where not t.tgisinternal and tn.nspname in ('public', 'private')
  )
) as snapshot;
`;

async function fetchSnapshot(ref) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) die("SUPABASE_ACCESS_TOKEN is not set. Pass --from-json to check without it.");

  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: SNAPSHOT_SQL }),
  });
  if (!response.ok) die(`Management API answered ${response.status} for project ${ref}`);

  const rows = await response.json();
  const snapshot = Array.isArray(rows) ? rows[0]?.snapshot : rows?.snapshot;
  if (!snapshot) die("the catalogue query returned nothing recognisable");
  return snapshot;
}

const snapshot =
  jsonAt !== -1
    ? JSON.parse(readFileSync(args[jsonAt + 1] ?? die("--from-json needs a file path"), "utf8"))
    : await fetchSnapshot(PROJECTS[environment]);

const relations = new Set(snapshot.relations ?? []);
const routines = snapshot.routines ?? [];
const routineNames = new Set(routines.map((r) => `${r.schema}.${r.name}`));

const missing = findMissingRelations({ routines, existing: relations });
const broken = findBrokenTriggers({ triggers: snapshot.triggers ?? [], existing: relations, routineNames });

const where = jsonAt !== -1 ? args[jsonAt + 1] : environment;
console.log(`schema-drift: ${routines.length} routines, ${relations.size} relations — ${where}`);

if (missing.length === 0 && broken.length === 0) {
  console.log("schema-drift: every referenced relation exists.");
  process.exit(0);
}

for (const row of missing) {
  console.error(`  ✗ ${row.routine} references ${row.missing}, which does not exist`);
}
for (const row of broken) {
  console.error(`  ✗ trigger ${row.trigger}: ${row.problem}`);
}
console.error(
  `\nschema-drift: ${missing.length + broken.length} broken reference(s). ` +
    "Each of these fails at runtime with SQLSTATE 42P01 the moment its code path is taken.",
);
process.exit(1);
