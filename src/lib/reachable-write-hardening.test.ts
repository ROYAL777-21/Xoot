import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The three hardening migrations of 2026-08-20, and the properties that make them worth having.
 *
 * All three came from reading production (`mvlrkelahhsyjrwgsxaf`) rather than the repository, and
 * two of them found something the 2026-08-13 authz audit had not:
 *
 *   admin_review_queue   the audit called the `user_id IS NULL` limb a finding. The live read
 *                        showed `authenticated` also holds UPDATE and DELETE grants, and that the
 *                        INSERT limb is reachable by ANY signed-in session today.
 *
 *   booking_tips         the audit recorded "role {public}". The live read showed `anon` holding
 *                        INSERT, UPDATE and DELETE grants on the table that records money owed to
 *                        a Xooter. It fails closed only because auth.uid() is NULL for anon.
 *
 *   xooter_id            the audit named one table. There are three, all of them payout tables,
 *                        where `xooter_id` is a FK to auth.users and not to xooters.
 *
 * These assertions exist because every one of those properties is a single clause that a later
 * edit can drop while the migration still applies cleanly and still looks right.
 */

const ROOT = process.cwd();

const ADMIN_QUEUE = "supabase/migrations/20260820130000_admin_review_queue_is_service_role_only.sql";
const TIPS = "supabase/migrations/20260820140000_booking_tips_authenticated_only.sql";
const FK_TRAP = "supabase/migrations/20260820150000_xooter_id_means_two_different_things.sql";

const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

/** Statement text only — the comments explain the old state and are meant to keep saying so. */
const executable = (text: string) =>
  text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");

/** A policy body, by policy name, from a `create policy "<name>" … ;` statement. */
const policyBody = (source: string, name: string) => {
  const pattern = new RegExp(`create policy\\s+"${name}"([\\s\\S]*?);\\s*(?=\\n|$)`, "i");
  return pattern.exec(executable(source))?.[1] ?? "";
};

describe("admin_review_queue is service-role only", () => {
  const source = () => read(ADMIN_QUEUE);

  it("revokes all three write operations from both client roles", () => {
    const revoke = /revoke\s+([a-z,\s]+?)\s+on\s+public\.admin_review_queue\s+from\s+([a-z,\s]+);/i.exec(
      executable(source()),
    );
    expect(revoke, "no revoke statement for admin_review_queue").not.toBeNull();

    const ops = revoke![1].split(",").map((o) => o.trim().toLowerCase());
    expect(ops.sort(), "the UPDATE and DELETE grants are half of a pair too").toEqual([
      "delete",
      "insert",
      "update",
    ]);

    const roles = revoke![2].split(",").map((r) => r.trim().toLowerCase());
    expect(roles.sort(), "revoking from one role leaves the other holding it").toEqual([
      "anon",
      "authenticated",
    ]);
  });

  it("never revokes SELECT — src/pages/admin/Ops.tsx reads through it", () => {
    /*
     * `revoke all` here would take the admin console's only read of the queue with it. This is the
     * same trap `profiles` set in the 34-grant revoke, where `revoke all` would have broken profile
     * editing in production.
     */
    expect(executable(source()), "revoke all would break the admin console").not.toMatch(/revoke\s+all/i);
    expect(executable(source()), "SELECT must survive").not.toMatch(
      /revoke[^;]*\bselect\b[^;]*on\s+public\.admin_review_queue/i,
    );
  });

  it("drops the `user_id IS NULL` limb any signed-in session could satisfy", () => {
    const body = policyBody(source(), "admin_review_queue_insert_user_or_admin");
    expect(body, "the INSERT policy was not recreated at all").toContain("with check");
    expect(body, "this limb is what made the queue writable by anyone").not.toMatch(
      /user_id\s+is\s+null/i,
    );
  });

  it("keeps the two limbs that are actually used", () => {
    const body = policyBody(source(), "admin_review_queue_insert_user_or_admin");
    expect(body, "admins must still be able to file operational rows").toMatch(
      /private\.has_role\(\(select auth\.uid\(\)\),\s*'admin'/i,
    );
    expect(body, "a user must still be able to file one about themselves").toMatch(
      /user_id\s*=\s*\(select auth\.uid\(\)\)/i,
    );
  });
});

describe("booking_tips is authenticated-only", () => {
  const source = () => read(TIPS);

  it("revokes the three write grants anon should never have held on a money table", () => {
    const revoke = /revoke\s+([a-z,\s]+?)\s+on\s+public\.booking_tips\s+from\s+([a-z,\s]+);/i.exec(
      executable(source()),
    );
    expect(revoke, "no revoke statement for booking_tips").not.toBeNull();
    expect(
      revoke![1].split(",").map((o) => o.trim().toLowerCase()).sort(),
      "anon held all three",
    ).toEqual(["delete", "insert", "update"]);
    expect(revoke![2].trim().toLowerCase()).toBe("anon");
  });

  it("pins every recreated policy to `authenticated`", () => {
    /*
     * The default is `{public}`, which includes anon. Every one of the five policies was on the
     * default until this migration.
     */
    const statements = [...executable(source()).matchAll(/create policy\s+"([^"]+)"([\s\S]*?);\s*(?=\n|$)/gi)];
    expect(statements.length, "no policies parsed — the rest of this block would be vacuous").toBe(5);
    const unpinned = statements.filter(([, , body]) => !/\bto\s+authenticated\b/i.test(body));
    expect(
      unpinned.map(([, name]) => name),
      "a policy left on the default {public} role includes anon",
    ).toEqual([]);
  });

  it("uses (select auth.uid()) in every policy body, never the bare call", () => {
    /*
     * Bare `auth.uid()` is re-evaluated per row. `(select auth.uid())` is the repo's documented
     * pattern and what 20260624121516 applied to every other table.
     *
     * Scoped to POLICY BODIES on purpose. A first version scanned the whole file and matched
     * `auth.uid()` inside the `comment on table` prose, which is English describing the old bug —
     * a true match to a rule that was never about prose. Widening a guard until it fires is how a
     * guard stops meaning anything.
     */
    const offenders: string[] = [];
    for (const [, name, body] of executable(source()).matchAll(
      /create policy\s+"([^"]+)"([\s\S]*?);\s*(?=\n|$)/gi,
    )) {
      for (const match of body.matchAll(/(.{0,8})auth\.uid\(\)/g)) {
        if (!/\(select\s*$/i.test(match[1])) offenders.push(`${name}: ...${match[0]}`);
      }
    }
    expect(offenders, "bare auth.uid() re-evaluates per row").toEqual([]);
  });

  it("keeps every tip rule the policies were enforcing", () => {
    const body = executable(source());
    expect(body, "a tip before the service is a different product under the CPA").toMatch(
      /b\.status\s*=\s*'completed'::public\.booking_status/,
    );
    expect(body, "only unsettled tips are editable by the customer").toMatch(
      /settled_at\s+is\s+null/i,
    );
    expect(body, "the Xooter sees a tip only once it is settled").toMatch(
      /settled_at\s+is\s+not\s+null/i,
    );
    expect(body, "the customer may only tip their own booking").toMatch(
      /b\.user_id\s*=\s*\(select auth\.uid\(\)\)/i,
    );
  });

  it("renames the policy it recreates, and drops the old name too", () => {
    const body = executable(source());
    expect(body, "the old policy name must be dropped or it survives alongside").toMatch(
      /drop policy if exists\s+"zooters view settled tips only"/i,
    );
    expect(body, "leaving a policy half-renamed after touching it is how ZD-029 spread").toMatch(
      /create policy\s+"xooters view settled tips only"/i,
    );
  });
});

describe("booking_sensitive_access loses the grants a view rebuild handed back", () => {
  const REGRANT = "supabase/migrations/20260820160000_booking_sensitive_access_regrant_regression.sql";
  const source = () => read(REGRANT);

  it("revokes from all three client-facing roles", () => {
    /*
     * `20260624113000`-era migrations used exactly these three statements. Missing `public` is the
     * subtle one: revoking from anon and authenticated while PUBLIC still holds the grant leaves it
     * reachable by both, because both are members of PUBLIC.
     */
    const revoked = [...executable(source()).matchAll(
      /revoke\s+all\s+on\s+public\.booking_sensitive_access\s+from\s+([a-z]+);/gi,
    )].map((m) => m[1].toLowerCase());
    expect(revoked.sort(), "revoking from anon and authenticated but not PUBLIC changes nothing").toEqual([
      "anon",
      "authenticated",
      "public",
    ]);
  });

  it("records that security_invoker and the revokes must both survive a rebuild", () => {
    // The whole defect was a rebuild inheriting neither. The comment is where the next person
    // rebuilding this view will actually be looking.
    const comment = /comment on view\s+public\.booking_sensitive_access[\s\S]*?;/i.exec(executable(source()))?.[0] ?? "";
    expect(comment, "no comment on the view").not.toBe("");
    expect(comment, "name the setting that keeps RLS applying").toMatch(/security_invoker/i);
    expect(comment, "and say the grants come back on their own").toMatch(/default privileges/i);
  });
});

describe("the xooter_id foreign-key trap is written into the schema", () => {
  const source = () => read(FK_TRAP);

  it("comments all three payout tables, not just the one the audit named", () => {
    const commented = [
      ...executable(source()).matchAll(/comment on column\s+public\.([a-z0-9_]+)\.xooter_id/gi),
    ].map((m) => m[1]);
    expect(commented.sort(), "these three are the tables that move money").toEqual([
      "payout_change_requests",
      "xooter_payout_accounts",
      "xooter_payout_holds",
    ]);
  });

  it("says which table the key actually points at", () => {
    const comments = [...executable(source()).matchAll(/comment on column[\s\S]*?;/gi)].map((m) => m[0]);
    expect(comments.length).toBe(3);
    for (const comment of comments) {
      expect(comment, "the whole point is naming the real target").toMatch(/auth\.users\(id\)/);
      expect(comment, "and naming what it is NOT").toMatch(/not\s+xooters\(id\)/i);
    }
  });
});
