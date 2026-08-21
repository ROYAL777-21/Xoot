/**
 * Does what the database EXECUTES still match what the database CONTAINS?
 *
 * `deployed-drift.mjs` asks whether deployed Edge Functions match the repo. This asks a different
 * question that nothing asked until 2026-08-15, when the answer turned out to be no.
 *
 * ── The defect that prompted it ────────────────────────────────────────────────────────────────
 * ZD-029 renamed `zootcred_ledger` to `xootcred_ledger` and renamed its trigger function with
 *
 *     alter function public.check_zootcred_balance() rename to check_xootcred_balance;
 *
 * **`ALTER FUNCTION ... RENAME` changes the name and not one character of the body.** So the
 * trigger on `xootcred_ledger` kept calling a function whose body read `from public.zootcred_ledger`
 * — a table that no longer existed. Every XootCred debit failed with
 *
 *     ERROR: 42P01: relation "public.zootcred_ledger" does not exist
 *
 * and since `create-booking` writes a debit for a redemption, a customer applying their credit lost
 * the whole booking with it.
 *
 * ── Why no repo-side test can catch this ───────────────────────────────────────────────────────
 * **The repo's migrations were correct.** Every file said the right thing; the drift was between
 * the repo and what was actually installed. `constraint-writer-parity.test.ts` reads files, so it
 * was blind to this by construction — a fact recorded in that file rather than discovered twice.
 *
 * ── Why it does not grep for the old brand ─────────────────────────────────────────────────────
 * `zootcred_ledger` was findable only because somebody thought to search for the retired brand. A
 * table renamed for any other reason would have been just as broken and completely invisible. So
 * the question here is **"does the thing this body references still exist"**, which needs no prior
 * knowledge of what changed.
 *
 * The logic lives here, apart from the CLI, because the parsing is the part worth testing and the
 * network is not.
 */

/**
 * Schema-qualified relations a routine body reads or writes.
 *
 * ⚠️ **Qualified references only** — `public.x`, never a bare `x`. That is not a shortcut, it is
 * what makes the check trustworthy:
 *
 *   - CTE names (`with due as (...) select from due`) are unqualified, so they cannot be mistaken
 *     for missing tables. A first version without this rule reported every CTE in
 *     `enqueue_sensitive_access_notifications` as a missing relation.
 *   - Table aliases (`from public.bookings b ... b.status`) are unqualified.
 *   - String literals are not preceded by `from`/`join`/`into`/`update`, so
 *     `'booking_has_no_assigned_zooter'` — a reason code this repo deliberately keeps — is never
 *     matched. That keep is real and must not be reported.
 *
 * Every routine in this repo sets `search_path` to `''` or `'public'` and qualifies its references,
 * so qualified-only loses nothing here while removing the entire false-positive class.
 *
 * ── Two more exclusions, both found by RUNNING this against production ─────────────────────────
 * The first live run reported **nineteen findings against zero real defects**, which is the
 * cry-wolf state this file already warned about. Reading the code back would not have found either
 * cause; running it did. Both are pinned as tests, verbatim from production:
 *
 *   1. **`OLD` / `NEW` are not schemas.** `if new.price is distinct from old.price` contains the
 *      word `from`, so the pattern matched `old.price` and reported it missing. They are PL/pgSQL
 *      record variables. `excluded` is the same story for `on conflict ... do update`.
 *
 *   2. **A name followed by `(` is a function, not a relation.**
 *      `select * from private.can_create_masked_call(p_booking_id, p_actor_id)` is a set-returning
 *      function call; `to_regclass` correctly says no such relation exists, and it is correct code.
 */

/** `OLD`, `NEW` and `EXCLUDED` are record variables in PL/pgSQL, never schemas. */
const PSEUDO_RECORDS = new Set(["old", "new", "excluded"]);

export const relationsReferencedBy = (body) => {
  const found = new Set();
  const text = String(body ?? "");
  /*
   * The trailing `\b(?!\s*\()` separates `from public.bookings` from
   * `from private.some_function(...)`.
   *
   * ⚠️ The `\b` is load-bearing and was missing at first. Without it the engine simply backtracks:
   * `can_create_masked_call` fails the lookahead, so it retries with `can_create_masked_cal`, whose
   * next character is `l` rather than `(` — lookahead satisfied, truncated name reported as a
   * missing relation. The word boundary forbids stopping mid-identifier, so the match either takes
   * the whole name or fails. The test for this failed until the `\b` was added.
   */
  const pattern = /\b(?:from|join|into|update)\s+(?:only\s+)?([a-z_][\w$]*)\.([a-z_][\w$]*)\b(?!\s*\()/gi;
  for (const match of text.matchAll(pattern)) {
    const schema = match[1].toLowerCase();
    if (PSEUDO_RECORDS.has(schema)) continue;
    found.add(`${schema}.${match[2].toLowerCase()}`);
  }
  return found;
};

/**
 * Schemas whose contents are not ours to police.
 *
 * `auth`, `storage`, `extensions` and friends belong to Supabase and change under us; a routine
 * referencing `auth.users` is correct and always will be. Reporting them would bury the real
 * findings, and a check that cries wolf gets deleted within a week.
 */
export const MANAGED_SCHEMAS = new Set([
  "auth", "storage", "graphql", "graphql_public", "realtime", "supabase_functions",
  "supabase_migrations", "extensions", "vault", "pgbouncer", "net", "cron", "information_schema",
  "pg_catalog", "pg_temp",
]);

/**
 * Routines referencing a relation that does not exist.
 *
 * `existing` is every relation the database actually has, as `schema.name`. `routines` is
 * `{ schema, name, body }` per function. The result names both sides, because "check_xootcred_balance
 * is broken" is not actionable and "check_xootcred_balance → public.zootcred_ledger, missing" is.
 */
export function findMissingRelations({ routines = [], existing = new Set() } = {}) {
  const missing = [];
  for (const routine of routines) {
    for (const relation of relationsReferencedBy(routine.body)) {
      const [schema] = relation.split(".");
      if (MANAGED_SCHEMAS.has(schema)) continue;
      if (existing.has(relation)) continue;
      missing.push({
        routine: `${routine.schema}.${routine.name}`,
        missing: relation,
      });
    }
  }
  return missing;
}

/**
 * Triggers whose function no longer exists, or whose table no longer exists.
 *
 * A separate failure from the above: the function body can be perfect while the trigger points at
 * something gone. Cheap to check once the catalogue is already in hand.
 */
export function findBrokenTriggers({ triggers = [], existing = new Set(), routineNames = new Set() } = {}) {
  const broken = [];
  for (const trigger of triggers) {
    if (!existing.has(trigger.table)) {
      broken.push({ trigger: trigger.name, problem: `table ${trigger.table} does not exist` });
    } else if (!routineNames.has(trigger.function)) {
      broken.push({ trigger: trigger.name, problem: `function ${trigger.function} does not exist` });
    }
  }
  return broken;
}
