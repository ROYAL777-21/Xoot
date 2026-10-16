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
type ClientRole = typeof CLIENT_ROLES[number];
const INTENTIONALLY_CLIENT_CALLABLE = new Map<string, { roles: readonly ClientRole[]; reason: string }>([
  ["lookup_referral_code", { roles: ["anon", "authenticated"], reason: "20260601000000:139 — public referral-code lookup" }],
  ["set_safety_pin", { roles: ["authenticated"], reason: "20260802170000:71 — verified user sets their own PIN" }],
  ["has_role", { roles: ["anon", "authenticated"], reason: "20260621000000:53 — role check used by caller-role RLS policies" }],
  ["set_default_home", { roles: ["authenticated"], reason: "20261015153244 — auth.uid() owner lock, expected-account mismatch rejection and owned active target" }],
  ["save_home", { roles: ["authenticated"], reason: "20261015153244 — auth.uid() owner lock, bounded details and immutable owner/identity" }],
  ["delete_home", { roles: ["authenticated"], reason: "20261015153244 — auth.uid() owner lock, archives only the verified owner's active home" }],
]);

/** Strip `--` line comments so prose about `security definer` is not read as code. */
const stripComments = (sql: string) => sql.replace(/--[^\n]*/g, "");

type State = { secdef: boolean; trigger: boolean; holders: Set<string> };
const unexpectedClientRoles = (name: string, holders: Set<string>) => {
  const allowed = INTENTIONALLY_CLIENT_CALLABLE.get(name)?.roles ?? [];
  return CLIENT_ROLES.filter(role => (holders.has(role) || holders.has("public")) && !allowed.includes(role));
};

/**
 * Replay every migration in filename order and return the surviving grant state per function.
 *
 * Later migrations supersede earlier ones — the same reasoning `constraint-writer-parity.test.ts`
 * uses, and the reason six constraint defects were invisible to a per-file reading.
 */
function finalState(sources = readdirSync(MIGRATIONS).filter(f => f.endsWith(".sql")).sort().map(file => readFileSync(join(MIGRATIONS, file), "utf8"))): Map<string, State> {
  const state = new Map<string, State>();
  for (const source of sources) {
    const sql = stripComments(source);

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
        state.set(name, { secdef, trigger, holders: new Set(["public", ...CLIENT_ROLES]) });
      }
    }

    // SQL permits a comma-separated list of function signatures, including commas
    // inside argument lists. Replay GRANT/REVOKE statements in their source order.
    for (const m of sql.matchAll(/\b(revoke|grant)\s+(?:all(?:\s+privileges)?|execute)\s+on\s+function\s+([^;]+?)\s+(?:from|to)\s+([^;]+);/gi)) {
      const roles = m[3].split(",").map(role => role.trim().toLowerCase());
      for (const signature of m[2].matchAll(/(?:([a-z0-9_]+)\.)?([a-z0-9_]+)\s*\([^)]*\)/gi)) {
        if (signature[1] && signature[1].toLowerCase() !== "public") continue;
        const entry = state.get(signature[2].toLowerCase());
        if (!entry) continue;
        for (const role of roles) {
          if (m[1].toLowerCase() === "revoke") entry.holders.delete(role);
          else entry.holders.add(role);
        }
      }
    }

  }

  return state;
}

describe("no SECURITY DEFINER function in public is callable by an unapproved client role", () => {
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

  it("models every atomic-home RPC as authenticated-only, without PUBLIC or anonymous execution", () => {
    for (const name of ["set_default_home", "save_home", "delete_home"]) {
      expect(state.get(name)?.secdef).toBe(true);
      expect([...state.get(name)!.holders].filter(role => ["anon", "authenticated", "public"].includes(role))).toEqual(["authenticated"]);
      expect(INTENTIONALLY_CLIENT_CALLABLE.get(name)?.roles).toEqual(["authenticated"]);
      expect(INTENTIONALLY_CLIENT_CALLABLE.get(name)?.reason).toContain("20261015153244");
    }
  });

  it("replays multi-function grants/revokes, preserves schemas and statement order, and detects omitted role revocation", () => {
    const definitions = "create function public.first(uuid,uuid) returns jsonb language sql security definer as 'select null'; create function public.second(uuid,jsonb,boolean) returns jsonb language sql security definer as 'select null';";
    const acl = "revoke all on function public.first(uuid,uuid), public.second(uuid,jsonb,boolean) from public,anon,authenticated; grant execute on function public.first(uuid,uuid), public.second(uuid,jsonb,boolean) to authenticated;";
    const clean = finalState([definitions + acl]);
    expect([...clean.get("first")!.holders]).toEqual(["authenticated"]);
    expect([...clean.get("second")!.holders]).toEqual(["authenticated"]);
    const omitted = finalState([definitions + acl.replace("from public,anon,authenticated", "from public,authenticated")]);
    for (const name of ["first", "second"]) expect(omitted.get(name)?.holders.has("anon")).toBe(true);
    const ordered = finalState([definitions + acl + " revoke execute on function public.first(uuid,uuid),public.second(uuid,jsonb,boolean) from authenticated;"]);
    expect([...ordered.get("first")!.holders]).toEqual([]);expect([...ordered.get("second")!.holders]).toEqual([]);
    const otherSchema = finalState([definitions + "revoke all on function private.first(uuid,uuid),public.second(uuid,jsonb,boolean) from public,anon,authenticated;"]);
    expect(otherSchema.get("first")?.holders.has("anon")).toBe(true);expect([...otherSchema.get("second")!.holders]).toEqual([]);
  });

  it("rejects anonymous exposure in the actual home migration despite its deliberate authenticated allowance", () => {
    const sources = readdirSync(MIGRATIONS).filter(file => file.endsWith(".sql")).sort()
      .map(file => ({ file, sql: readFileSync(join(MIGRATIONS, file), "utf8") }));
    const missingAnonRevoke = finalState(sources.map(({ file, sql }) => file === "20261015153244_atomic_default_home.sql"
      ? sql.split("from public,anon,authenticated,service_role;").join("from public,authenticated,service_role;")
      : sql));
    for (const name of ["set_default_home", "save_home", "delete_home"]) {
      expect(unexpectedClientRoles(name, state.get(name)!.holders)).toEqual([]);
      expect(unexpectedClientRoles(name, missingAnonRevoke.get(name)!.holders)).toEqual(["anon"]);
    }
    const publicRegrant = finalState([...sources.map(source => source.sql), "grant execute on function public.set_default_home(uuid,uuid,boolean),public.save_home(uuid,uuid,jsonb,boolean),public.delete_home(uuid,uuid) to public;"]);
    for (const name of ["set_default_home", "save_home", "delete_home"])
      expect(unexpectedClientRoles(name, publicRegrant.get(name)!.holders)).toEqual(["anon"]);
  });

  it("finds no SECURITY DEFINER function left callable by an unapproved anon or authenticated role", () => {
    const exposed: string[] = [];
    for (const [name, { secdef, trigger, holders }] of state) {
      if (!secdef) continue;
      const held = unexpectedClientRoles(name, holders);
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
