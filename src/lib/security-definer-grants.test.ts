import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ── A SECURITY DEFINER function in `public` must not be executable by `anon` or `authenticated` ──
 *
 * PostgREST exposes every function in `public` at `/rest/v1/rpc/<name>`. A SECURITY DEFINER
 * function runs with its owner's rights, so if `anon` holds EXECUTE, anyone with the publishable
 * key can call it — and the publishable key ships in every client bundle.
 *
 * ── The defect this exists for, measured on production 2026-08-21 ────────────────────────────
 * Eight functions were executable by `anon` and `authenticated` for eight days:
 *
 *     get_xooter_job_cards_for_user(uuid)   prosecdef=t   postgres=X | anon=X | authenticated=X | service_role=X
 *
 * That one is SECURITY DEFINER, takes an arbitrary `p_user_id`, applies no `auth.uid()` check, and
 * returns `destination_address` — a customer's home address.
 *
 * **The cause is a one-word difference.** `REVOKE ... FROM PUBLIC` removes the PUBLIC default; it
 * does NOT remove the direct grants Supabase's platform hands `anon` and `authenticated`. You have
 * to name the roles. `20260813220000` wrote `from public;` alone, eight times, where
 * `20260701093000`, `20260802170000` and `20260808120000` had all correctly named them.
 *
 * ── What makes the model correct rather than approximately correct ───────────────────────────
 * `20260813220000` DROPPED and RECREATED each function under its new name, and **a newly created
 * function gets fresh default ACLs**. So `20260701093000`'s correct hardening of
 * `can_release_zooter_payout` was silently undone when the rename recreated it as
 * `can_release_xooter_payout`. This test therefore treats `create function` (without `or replace`)
 * as RESETTING the grant state — which is the whole mechanism, and without it the test would read
 * the 1 July revoke as still standing and see nothing wrong.
 *
 * The model is validated against two ACLs read from the live database, in the assertions below:
 * it must predict `can_release_xooter_payout` as exposed and `set_safety_pin` as clean, because
 * that is what production actually showed.
 *
 * ── What it cannot see ───────────────────────────────────────────────────────────────────────
 * It reads migration TEXT, so it cannot see an ACL changed outside a migration, nor the platform's
 * own defaults changing. The live check is the `proacl` query in `docs/release/next-session.md`,
 * which is where it belongs for the same reason the stale-function-body check does: only a live
 * database can answer it.
 *
 * Planted 2026-08-21: removing `, anon, authenticated` from one revoke in
 * `20260821120000_revoke_anon_execute_on_definer_rpcs.sql` fails this test naming that function.
 * Restored after.
 */

const ROOT = process.cwd();
const MIGRATIONS = join(ROOT, "supabase/migrations");

/** Roles that reach PostgREST from a browser holding only the publishable key. */
const CLIENT_ROLES = ["anon", "authenticated"] as const;

/**
 * Functions deliberately callable by a client role, each with the migration that intends it.
 * Adding a name here is a security decision and must cite its migration.
 */
const INTENTIONALLY_CLIENT_CALLABLE = new Map<string, string>([
  ["lookup_referral_code", "20260601000000:139 — public referral-code lookup, granted to anon, authenticated"],
  ["set_safety_pin", "20260802170000:71 — a user sets their own PIN; revoked from anon, granted to authenticated"],
  ["has_role", "20260621000000:53 — role check used by RLS policies, which evaluate as the calling role"],
]);

/** Strip `--` line comments so prose about `security definer` is not read as code. */
const stripComments = (sql: string) => sql.replace(/--[^\n]*/g, "");

type State = { secdef: boolean; trigger: boolean; holders: Set<string> };

/**
 * Replay every migration in filename order and return the surviving grant state per function.
 *
 * Later migrations supersede earlier ones — the same reasoning `constraint-writer-parity.test.ts`
 * uses, and the reason six constraint defects were invisible to a per-file reading.
 */
function finalState(): Map<string, State> {
  const state = new Map<string, State>();
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const sql = stripComments(readFileSync(join(MIGRATIONS, file), "utf8"));

    // Every `create function` in `public`, and whether its header says `security definer`.
    // The region runs to the next `create ... function`, which is where the header must appear.
    const creates = [...sql.matchAll(/create\s+(or\s+replace\s+)?function\s+(?:public\.)?([a-z0-9_]+)\s*\(/gi)];
    for (let i = 0; i < creates.length; i += 1) {
      const [, orReplace, name] = creates[i];
      // Skip anything explicitly in another schema; `public.` or bare both land in public here.
      if (/\b(private|extensions|auth|storage)\.$/i.test(sql.slice(Math.max(0, creates[i].index! - 12), creates[i].index! + 20))) continue;
      const region = sql.slice(creates[i].index!, creates[i + 1]?.index ?? sql.length);
      const secdef = /security\s+definer/i.test(region);
      // PostgREST does not expose functions returning `trigger` as RPC, so those are hygiene
      // rather than exposure. The distinction is kept so the failure message cannot overstate.
      const trigger = /returns\s+trigger/i.test(region);

      const previous = state.get(name);
      if (orReplace && previous) {
        // `create or replace` keeps the OID and therefore the ACL.
        previous.secdef = secdef;
        previous.trigger = trigger;
      } else {
        // A fresh `create` resets the ACL to the platform defaults. This is the mechanism.
        state.set(name, { secdef, trigger, holders: new Set(CLIENT_ROLES) });
      }
    }

    for (const m of sql.matchAll(
      /revoke\s+(?:all|execute)[^;]*?\s+on\s+function\s+(?:public\.)?([a-z0-9_]+)\s*\([^)]*\)\s*from\s+([^;]+);/gi,
    )) {
      const entry = state.get(m[1]);
      if (!entry) continue;
      for (const role of m[2].split(",").map((r) => r.trim().toLowerCase())) entry.holders.delete(role);
    }

    for (const m of sql.matchAll(
      /grant\s+execute\s+on\s+function\s+(?:public\.)?([a-z0-9_]+)\s*\([^)]*\)\s*to\s+([^;]+);/gi,
    )) {
      const entry = state.get(m[1]);
      if (!entry) continue;
      for (const role of m[2].split(",").map((r) => r.trim().toLowerCase())) {
        if ((CLIENT_ROLES as readonly string[]).includes(role)) entry.holders.add(role);
      }
    }
  }

  return state;
}

describe("no SECURITY DEFINER function in public is callable by a client role", () => {
  const state = finalState();

  it("parses a meaningful number of functions", () => {
    // A parser matching nothing passes every assertion below while checking none — the failure
    // mode that made several guards in this repo meaningless for weeks.
    expect(state.size, "no functions parsed out of the migrations").toBeGreaterThan(30);
    expect(
      [...state.values()].filter((s) => s.secdef).length,
      "no SECURITY DEFINER functions detected — has the header format changed?",
    ).toBeGreaterThan(10);
  });

  it("reproduces the two ACLs actually read from production", () => {
    /*
     * The model is only worth trusting if it predicts what the live database showed on 2026-08-21.
     *
     *   can_release_xooter_payout  postgres=X | anon=X | authenticated=X | service_role=X
     *   set_safety_pin             postgres=X |         authenticated=X | service_role=X
     *
     * `set_safety_pin` is the control: `20260802170000` named `anon` in its revoke, and the live
     * ACL has no `anon`. If this test cannot tell those two apart it is not modelling anything.
     */
    expect(state.get("set_safety_pin")?.holders.has("anon"), "set_safety_pin must not be anon-callable").toBe(false);
    expect(state.get("set_safety_pin")?.holders.has("authenticated"), "set_safety_pin is granted to authenticated").toBe(true);
    expect(state.get("can_release_xooter_payout")?.secdef, "can_release_xooter_payout is SECURITY DEFINER").toBe(true);
  });

  it("finds no SECURITY DEFINER function left callable by anon or authenticated", () => {
    const exposed: string[] = [];
    for (const [name, { secdef, trigger, holders }] of state) {
      if (!secdef) continue;
      if (INTENTIONALLY_CLIENT_CALLABLE.has(name)) continue;
      const held = CLIENT_ROLES.filter((role) => holders.has(role));
      if (!held.length) continue;
      // A trigger function is not reachable through PostgREST; say so rather than calling it
      // reachable, or the next person spends a day chasing an exposure that does not exist.
      const reach = trigger
        ? "holds EXECUTE (returns trigger, so not RPC-reachable — hygiene)"
        : "is callable at /rest/v1/rpc/" + name;
      exposed.push(`${name} — ${reach}, held by ${held.join(", ")}`);
    }

    expect(
      exposed.sort(),
      "A SECURITY DEFINER function in `public` is callable from a browser holding only the " +
        "publishable key. `revoke ... from public` does NOT remove anon/authenticated — name the " +
        "roles: `revoke all on function ... from public, anon, authenticated;`",
    ).toEqual([]);
  });
});
