import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Staging and production do not have the same client write surface, and a revoke derived from one
 * is applied to both.
 *
 * ── Authz audit finding #2, finally measured ────────────────────────────────────
 * The 2026-08-13 audit recorded "staging and production write surfaces differ and nothing checks
 * it". `authz-surface.mjs` had a `--staging` flag, but a single baseline file whose `project_ref`
 * was production's — so `--staging` diffed staging's live surface against production's
 * expectations and reported every legitimate difference as drift. The tool meant to check it could
 * not tell the two environments apart. Each project now has its own reviewed baseline; this
 * compares them offline, with no credentials.
 *
 * ── The defect this exists to catch ─────────────────────────────────────────────
 * `20260820120000_revoke_client_writes_without_policy.sql` revokes 34 grants on the stated grounds
 * that each has a grant and ZERO policies, so revoking changes nothing. That was measured on
 * production. On STAGING, `xooter_training_progress` INSERT and UPDATE each have a policy — so
 * there, the same statement removes a grant that is genuinely reachable.
 *
 * It is still safe: the only writer is `supabase/functions/training-module/index.ts`, which uses
 * `getServiceClient()`, and service_role bypasses RLS and holds its own grants. The Xooter Training
 * page only `.select()`s a different table. Nothing changes in either environment.
 *
 * But "safe" was established by reading the code, not by the reasoning in the migration, and the
 * next revoke written the same way might not be. A revoke justified as "no policy can ever satisfy
 * this" must be true in every environment it will reach, or the exception must be written down with
 * why. That is what this file enforces.
 */

const ROOT = process.cwd();
const PRODUCTION = "docs/security/client-write-surface.json";
const STAGING = "docs/security/client-write-surface.staging.json";
const REVOKE_MIGRATION = "supabase/migrations/20260820120000_revoke_client_writes_without_policy.sql";

type Baseline = {
  project_ref: string;
  entries: Record<string, { policy_count: number; policy_fingerprint: string }>;
};

const baseline = (path: string) => JSON.parse(readFileSync(join(ROOT, path), "utf8")) as Baseline;

/** Statement text only — the comments describe the old state and are meant to keep saying so. */
const executable = (text: string) =>
  text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");

/** Every `table:COMMAND` pair the revoke migration takes away from a client role. */
const revokedPairs = () => {
  const sql = executable(readFileSync(join(ROOT, REVOKE_MIGRATION), "utf8"));
  const pairs: string[] = [];
  for (const match of sql.matchAll(/revoke\s+([a-z,\s]+?)\s+on\s+public\.([a-z0-9_]+)\s+from\s+([a-z,\s]+);/gi)) {
    for (const op of match[1].split(",")) pairs.push(`${match[2]}:${op.trim().toUpperCase()}`);
  }
  return pairs;
};

/**
 * Pairs the migration revokes that are NOT policy-less in every environment.
 *
 * Every entry needs a reason that survives someone reading it in six months. "It is fine" is not a
 * reason; naming the only writer is.
 */
const REACHABLE_BUT_DELIBERATE: Record<string, string> = {
  "xooter_training_progress:INSERT":
    "Policy-less on production, policy-backed on staging. Safe in both: the only writer is " +
    "supabase/functions/training-module/index.ts via getServiceClient(), and service_role bypasses " +
    "RLS. src/pages/xooter/Training.tsx only reads, and reads xooter_training_completions.",
  "xooter_training_progress:UPDATE":
    "Same upsert, same service-role writer, same reasoning as the INSERT above.",
};

describe("the two environment baselines", () => {
  it("describe different projects", () => {
    /*
     * If one file were copied over the other, every comparison in this file would pass while
     * comparing an environment against itself. That is the failure mode where a guard is worse than
     * no guard, because it reports confidence it has not earned.
     */
    const prod = baseline(PRODUCTION);
    const stag = baseline(STAGING);
    expect(prod.project_ref, "production baseline lost its ref").toBe("mvlrkelahhsyjrwgsxaf");
    expect(stag.project_ref, "staging baseline lost its ref").toBe("fxmxyabdjqviqbcxmvlp");
    expect(prod.project_ref).not.toBe(stag.project_ref);
  });

  it("are both populated, so nothing below is vacuous", () => {
    expect(Object.keys(baseline(PRODUCTION).entries).length).toBeGreaterThan(50);
    expect(Object.keys(baseline(STAGING).entries).length).toBeGreaterThan(50);
    expect(revokedPairs().length, "no revoke statements parsed from the migration").toBeGreaterThan(20);
  });
});

describe("every revoked grant is inert everywhere it will land", () => {
  it("is policy-less in BOTH environments, or carries a written reason", () => {
    const prod = baseline(PRODUCTION).entries;
    const stag = baseline(STAGING).entries;

    const reachable: string[] = [];
    for (const pair of revokedPairs()) {
      if (pair in REACHABLE_BUT_DELIBERATE) continue;
      const where: string[] = [];
      if ((prod[pair]?.policy_count ?? 0) > 0) where.push(`production(${prod[pair].policy_count})`);
      if ((stag[pair]?.policy_count ?? 0) > 0) where.push(`staging(${stag[pair].policy_count})`);
      if (where.length) {
        reachable.push(
          `${pair} has a policy in ${where.join(" and ")} — the migration calls it unreachable. ` +
            `Either it is wrong, or add it to REACHABLE_BUT_DELIBERATE with the writer that makes it safe.`,
        );
      }
    }
    expect(reachable, "a revoke justified as inert would remove a reachable write").toEqual([]);
  });

  it("does not carry exceptions that have stopped being exceptional", () => {
    /*
     * The other direction. Once an exception becomes policy-less in both environments it is no
     * longer an exception, and leaving it listed teaches the next reader that a reachable revoke
     * was accepted here when it no longer is.
     */
    const prod = baseline(PRODUCTION).entries;
    const stag = baseline(STAGING).entries;
    const stale = Object.keys(REACHABLE_BUT_DELIBERATE).filter(
      (pair) => (prod[pair]?.policy_count ?? 0) === 0 && (stag[pair]?.policy_count ?? 0) === 0,
    );
    expect(stale, "these are inert in both environments now — delete the exception").toEqual([]);
  });

  it("every exception explains itself by naming the writer", () => {
    for (const [pair, reason] of Object.entries(REACHABLE_BUT_DELIBERATE)) {
      expect(reason.length, `${pair}: a one-word reason is not a reason`).toBeGreaterThan(60);
      expect(reason, `${pair}: say which writer makes it safe`).toMatch(
        /service[_ -]?role|getServiceClient|supabase\/functions\//i,
      );
    }
  });
});

describe("where the two environments diverge", () => {
  /*
   * Divergence is not by itself a defect — staging carries features production has not seen, and
   * production carries tables staging was created after. It IS a fact nobody was tracking, and the
   * measured set is recorded so the NEXT divergence stands out against it instead of hiding in it.
   */
  const MEASURED_ONLY_ON_PRODUCTION = [
    "analytics_events:DELETE",
    "analytics_events:INSERT",
    "analytics_events:UPDATE",
    "booking_xooter_profiles:DELETE",
    "booking_xooter_profiles:INSERT",
    "booking_xooter_profiles:UPDATE",
    "masked_conversation_sessions:DELETE",
    "masked_conversation_sessions:INSERT",
    "masked_conversation_sessions:UPDATE",
    "notification_templates:DELETE",
    "notification_templates:INSERT",
    "notification_templates:UPDATE",
    "sensitive_access_logs:INSERT",
  ];

  const MEASURED_ONLY_ON_STAGING = [
    "referral_redemptions:DELETE",
    "referral_redemptions:INSERT",
    "referral_redemptions:UPDATE",
    "referrals:DELETE",
    "referrals:INSERT",
    "referrals:UPDATE",
    "subscription_cancellation_requests:DELETE",
    "subscription_cancellation_requests:INSERT",
    "subscription_cancellation_requests:UPDATE",
    "user_reassignment_state:DELETE",
    "user_reassignment_state:INSERT",
    "user_reassignment_state:UPDATE",
    // Pre-ZD-029 name, on staging only. Production has no such table. Recorded, not swept —
    // the same call the founder made about the ~110 zoot-named constraints on 2026-08-20.
    "zootcred_wallets:DELETE",
    "zootcred_wallets:INSERT",
    "zootcred_wallets:UPDATE",
  ];

  it("matches what was measured on 2026-08-20", () => {
    const prod = new Set(Object.keys(baseline(PRODUCTION).entries));
    const stag = new Set(Object.keys(baseline(STAGING).entries));
    expect([...prod].filter((k) => !stag.has(k)).sort()).toEqual([...MEASURED_ONLY_ON_PRODUCTION].sort());
    expect([...stag].filter((k) => !prod.has(k)).sort()).toEqual([...MEASURED_ONLY_ON_STAGING].sort());
  });

  it("records which pairs are reachable in one environment and inert in the other", () => {
    // The dangerous shape: same grant, same command, different reachability. Anything reasoning
    // from one environment about the other is wrong for these.
    const prod = baseline(PRODUCTION).entries;
    const stag = baseline(STAGING).entries;
    const asymmetric = Object.keys(prod)
      .filter((k) => k in stag)
      .filter((k) => (prod[k].policy_count === 0) !== (stag[k].policy_count === 0))
      .sort();
    expect(asymmetric).toEqual([
      "support_followups:DELETE",
      "xooter_applications:DELETE",
      "xooter_training_progress:INSERT",
      "xooter_training_progress:UPDATE",
    ]);
  });
});
