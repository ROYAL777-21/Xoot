import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { diffSurface, entryKey } from "../../scripts/security/authz-surface.mjs";

/**
 * The offline half of the authz drift guard.
 *
 * `scripts/security/authz-surface.mjs` reads the live database and compares it to
 * `docs/security/client-write-surface.json`. **No agent session can run it** — it needs
 * `SUPABASE_ACCESS_TOKEN`, which does not reach one. So the part that fetches is untestable here
 * and the part that *decides* is kept separate and tested for real.
 *
 * That split matters. Testing only the fetch would prove nothing about whether drift is caught;
 * testing the decision proves the thing the guard exists for.
 *
 * ⚠️ What this does NOT prove: that the script's SQL returns what the comparison expects, or that
 * the credentials work. The first run against a live project is the honest test of those.
 */

const BASELINE_PATH = "docs/security/client-write-surface.json";
const baseline = JSON.parse(readFileSync(join(process.cwd(), BASELINE_PATH), "utf8"));

/** The shape the query returns, so fixtures cannot drift from it silently. */
const row = (table: string, cmd: string, policy_count: number, policy_fingerprint: string) => ({
  table_name: table,
  cmd,
  policy_count,
  policy_fingerprint,
});

/** The live surface reconstructed from the baseline — the "nothing changed" case. */
const liveMatchingBaseline = () =>
  Object.entries(baseline.entries as Record<string, { policy_count: number; policy_fingerprint: string }>).map(
    ([key, value]) => {
      const [table, cmd] = key.split(":");
      return row(table, cmd, value.policy_count, value.policy_fingerprint);
    },
  );

describe("authz drift detection", () => {
  it("passes when the live surface matches the baseline exactly", () => {
    const result = diffSurface(liveMatchingBaseline(), baseline);
    expect(result).toMatchObject({ ok: true, added: [], removed: [], changed: [] });
  });

  it("catches a NEW client-writable command", () => {
    // A migration granting UPDATE on a table the client could not write before.
    const live = [...liveMatchingBaseline(), row("bookings", "UPDATE", 1, "deadbeef")];
    const result = diffSurface(live, baseline);
    expect(result.ok).toBe(false);
    expect(result.added).toContain("bookings:UPDATE");
  });

  it("catches a policy appearing on a grant that had none — the quiet one", () => {
    /*
     * ⚠️ The finding this guard was built for.
     *
     * 34 of the 98 entries are `no-policy`: the client holds INSERT/UPDATE/DELETE and RLS
     * default-denies because nothing permits it. `xooter_earnings`, `subscription_plans` and
     * `training_modules` are in that set — money, pricing, and training content.
     *
     * The grant is already there. The day anyone adds a permissive policy, the write becomes live
     * with no second decision and no migration touching a grant. Nothing else in the repo would
     * notice.
     */
    const live = liveMatchingBaseline().map((r) =>
      r.table_name === "xooter_earnings" && r.cmd === "UPDATE"
        ? row("xooter_earnings", "UPDATE", 1, "a-newly-added-policy")
        : r,
    );
    const result = diffSurface(live, baseline);
    expect(result.ok).toBe(false);
    expect(result.changed.join(" ")).toMatch(/xooter_earnings:UPDATE/);
  });

  it("catches a policy being rewritten, even with the count unchanged", () => {
    /*
     * The case a count-only comparison misses, and the case the two rejected heuristics missed:
     * one policy replaced by another, admin check dropped, same count.
     */
    const live = liveMatchingBaseline().map((r) =>
      r.table_name === "user_roles" && r.cmd === "UPDATE"
        ? row("user_roles", "UPDATE", 1, "admin-check-removed")
        : r,
    );
    const result = diffSurface(live, baseline);
    expect(result.ok).toBe(false);
    expect(result.changed.join(" ")).toMatch(/user_roles:UPDATE/);
  });

  it("reports a write DISAPPEARING rather than treating it as good news", () => {
    // A revoke can break a feature. `20260813180000` proved a tightening can be an outage.
    const live = liveMatchingBaseline().filter(
      (r) => !(r.table_name === "saved_addresses" && r.cmd === "INSERT"),
    );
    const result = diffSurface(live, baseline);
    expect(result.ok).toBe(false);
    expect(result.removed).toContain("saved_addresses:INSERT");
  });

  it("keys entries as table:COMMAND", () => {
    expect(entryKey(row("profiles", "UPDATE", 1, "x"))).toBe("profiles:UPDATE");
  });
});

describe("the committed baseline", () => {
  it("is well formed, and every entry carries a fingerprint", () => {
    expect(baseline.project_ref).toBe("mvlrkelahhsyjrwgsxaf");
    const entries = Object.entries(baseline.entries as Record<string, Record<string, unknown>>);
    expect(entries.length).toBeGreaterThan(50);
    for (const [key, value] of entries) {
      expect(key, `${key} must be table:COMMAND`).toMatch(/^[a-z_]+:(INSERT|UPDATE|DELETE)$/);
      expect(typeof value.policy_count, `${key} policy_count`).toBe("number");
      expect(typeof value.policy_fingerprint, `${key} policy_fingerprint`).toBe("string");
    }
  });

  it("records that the privilege-escalation tables are policy-guarded", () => {
    // Not a claim about WHAT the policy says — the fingerprint carries that. This asserts the
    // policies exist at all, so a drop shows up as a count change rather than looking normal.
    for (const key of ["user_roles:INSERT", "user_roles:UPDATE", "user_roles:DELETE", "xooters:INSERT"]) {
      expect(baseline.entries[key]?.policy_count, `${key} must be policy-guarded`).toBeGreaterThan(0);
    }
  });

  it("still records the grants that are inert only because RLS default-denies", () => {
    /*
     * These are the ones worth revoking. Keeping them in the baseline means the guard fires the
     * moment one gains a policy — which is the only warning anyone would get.
     */
    for (const key of ["xooter_earnings:UPDATE", "subscription_plans:UPDATE", "training_modules:UPDATE"]) {
      expect(baseline.entries[key]?.policy_fingerprint, `${key} should still be ungoverned`).toBe("no-policy");
    }
  });
});

describe("how the guard is wired", () => {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));

  it("stays out of security:scan, which must run without database credentials", () => {
    /*
     * `npm run security:scan` runs in CI and locally with no secrets. Adding a check that needs
     * SUPABASE_ACCESS_TOKEN would make it fail for everyone without one — and the usual response to
     * a check that fails for the wrong reason is to stop running it.
     */
    expect(packageJson.scripts["security:scan"]).not.toMatch(/authz-surface/);
  });

  it("is reachable as its own script", () => {
    expect(packageJson.scripts["security:authz"]).toMatch(/authz-surface\.mjs/);
  });
});
