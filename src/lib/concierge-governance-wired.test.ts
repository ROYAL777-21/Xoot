import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every registered Concierge control must be read by something, or explained.
 *
 * ── The defect this exists to prevent, measured 2026-08-11 ──────────────────────
 * Twenty `concierge.*` controls were registered across two migrations. Grepping every read in
 * `supabase/functions/`, **only `create-concierge-handoff` read any of them.** `support-respond` —
 * the function every Concierge message goes through — read `support.turnstile_required` and
 * `support.openai_fallback` and no `concierge.*` control at all.
 *
 * So `concierge.kill.global` killed nothing. Someone reaching for it in an incident would have
 * flipped it, watched the Concierge keep answering, and had no way to tell why. A kill switch
 * wired to nothing is worse than no kill switch, because it is believed.
 *
 * ── Why the existing test did not catch it ──────────────────────────────────────
 * `concierge-governance-readiness.test.ts` asserts the migration **registers** the flags, and it
 * passed the whole time. Registration and wiring are different claims, and only one of them was
 * being checked. This file checks the other.
 *
 * ── Why `DELIBERATELY_INERT` exists rather than demanding every control be read ──
 * Several controls gate tools that are not built yet. Requiring a read for those would push
 * someone toward wiring them to the nearest available thing — and the nearest available thing is
 * the static knowledge base, which would make the Concierge refuse the Care+ and XootCred
 * questions it answers well today. An explicit list with a reason keeps the gap visible and
 * documented instead of hidden or wrongly filled.
 */

const repoRoot = process.cwd();

const read = (path: string) => readFileSync(join(repoRoot, path), "utf8");

/** The shared resolver. Excluded from the "acted on" corpus — see `actedOn` below. */
const RESOLVER = "supabase/functions/_shared/concierge-controls.ts";

/**
 * Every `.ts` file under `supabase/functions/`, optionally excluding one path.
 *
 * The exclusion matters. The resolver names all twenty controls by definition, so counting it as
 * a read would make every control look wired the moment it was added to a map — which is the
 * registration-versus-wiring confusion this whole file exists to break. A control is wired when
 * something **acts** on it, not when something enumerates it.
 */
const collectFunctionSources = (dir: string, exclude?: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(join(repoRoot, dir))) {
    const rel = `${dir}/${entry}`;
    if (rel === exclude) continue;
    if (statSync(join(repoRoot, rel)).isDirectory()) out.push(...collectFunctionSources(rel, exclude));
    else if (entry.endsWith(".ts")) out.push(read(rel));
  }
  return out;
};

const RENAME_MIGRATION = "supabase/migrations/20260813160000_rename_zoot_schema_to_xoot.sql";

const MIGRATIONS = [
  "supabase/migrations/20260703150828_concierge_governance_controls.sql",
  // The 20th control, `concierge.handoff.case_creation_tool`, lives here rather than in the
  // governance migration. Parsing only the obvious file would report a control as unregistered
  // that is registered and working.
  "supabase/migrations/20260703153056_concierge_structured_handoff.sql",
  // The 2026-08-13 Zoot→Xoot rename. Included because it is where `concierge.xootcred_support`
  // and `concierge.xooter_support` get their current names — the two migrations above still
  // register the pre-rename ones, correctly, being the applied record of what ran at the time.
  RENAME_MIGRATION,
];

/**
 * Controls that are registered on purpose and read by nothing yet, each with the reason.
 *
 * These are **tool-permission flags, not topic-permission flags**: they gate acting on a real
 * account — reading a booking's true status, creating a support case, touching a live Care+
 * subscription — not whether the Concierge may discuss the subject from approved static
 * knowledge. All are `false` live, which is correct, because none of those tools exists.
 */
const DELIBERATELY_INERT: Record<string, string> = {
  "concierge.authenticated_account_support": "gates an account-data tool that is not built",
  "concierge.care_plus_support": "gates a live Care+ account tool that is not built",
  "concierge.xootcred_support": "gates a XootCred balance tool that is not built",
  "concierge.referral_support": "gates a referral tool that is not built",
  "concierge.booking_cover_support": "gates a booking-cover claims tool that is not built",
  "concierge.partnership_interest": "gates a partnership lead tool that is not built",
  "concierge.xooter_support": "gates a Xooter-account tool that is not built",
  "concierge.booking_status": "gates reading a real booking's status; no tool reads it yet",
  "concierge.kill.booking_status": "kill switch for the above, inert until that tool exists",
  "concierge.mobile.enabled": "the mobile app reads this through its own client, not an Edge Function",
};

describe("concierge controls are wired, not merely registered", () => {
  const registered = new Set<string>();
  for (const path of MIGRATIONS) {
    for (const match of read(path).matchAll(/'(concierge\.[a-z._]+)'/g)) registered.add(match[1]);
  }
  /*
   * Drop the superseded names, reading the mapping out of the rename migration rather than
   * hardcoding it here. Each rename is written as
   * `set control_key = 'new' where control_key = 'old'`, so the migration is the single place
   * that says which key replaced which — and this test cannot fall out of step with it.
   */
  for (const match of read(RENAME_MIGRATION).matchAll(
    /where control_key = '(concierge\.[a-z._]+)'/g,
  )) {
    registered.delete(match[1]);
  }
  const resolverSource = read(RESOLVER);
  const actingSources = collectFunctionSources("supabase/functions", RESOLVER).join("\n");

  /**
   * Control key → the capability property the resolver exposes it as, parsed from the resolver so
   * the mapping cannot drift from the code it describes.
   */
  const capabilityOf = new Map<string, string>();
  for (const match of resolverSource.matchAll(/^\s*([a-zA-Z]+):\s*"(concierge\.[a-z._]+)",$/gm)) {
    capabilityOf.set(match[2], match[1]);
  }

  /**
   * Is this control acted on anywhere outside the resolver? Either the raw key appears, or the
   * capability it resolves to is referenced as a property.
   */
  const actedOn = (key: string) => {
    if (actingSources.includes(`"${key}"`) || actingSources.includes(`'${key}'`)) return true;
    const capability = capabilityOf.get(key);
    return Boolean(capability) && actingSources.includes(`.${capability}`);
  };

  it("registers the controls this test believes exist", () => {
    // Guards the parser itself. If the regex silently stopped matching, every assertion below
    // would pass vacuously — which is the failure mode of a test that reads its own inputs.
    expect(registered.size).toBeGreaterThanOrEqual(20);
    expect(registered.has("concierge.kill.global")).toBe(true);
    expect(registered.has("concierge.handoff.case_creation_tool")).toBe(true);
  });

  it("the resolver knows every registered control", () => {
    // Completeness is a separate claim from wiring, and worth its own assertion: a control the
    // resolver has never heard of cannot be acted on or deliberately shelved — it is just missed.
    const known = new Set([...capabilityOf.keys(), ...resolverSource.matchAll(/"(concierge\.kill\.[a-z_]+)"/g)].map(
      (item) => (typeof item === "string" ? item : item[1]),
    ));
    const unknown = [...registered].filter((key) => !known.has(key));
    expect(unknown, `the resolver does not map: ${unknown.join(", ")}`).toEqual([]);
  });

  it("acts on every registered control somewhere, or explains why not", () => {
    const unexplained = [...registered].filter((key) => !actedOn(key) && !DELIBERATELY_INERT[key]);
    expect(
      unexplained,
      `registered but nothing acts on them and no reason is recorded: ${unexplained.join(", ")}`,
    ).toEqual([]);
  });

  it("does not carry stale entries in the inert list", () => {
    // The list must shrink as tools get built. An entry for a control that is now acted on, or for
    // a control that no longer exists, is a note that has stopped being true.
    for (const key of Object.keys(DELIBERATELY_INERT)) {
      expect(registered.has(key), `${key} is listed as inert but is not registered anywhere`).toBe(true);
      expect(actedOn(key), `${key} is now acted on — remove it from DELIBERATELY_INERT`).toBe(false);
    }
  });

  it("the message path reads the controls that govern it", () => {
    // The specific regression: `support-respond` handles every Concierge message and read no
    // concierge control at all.
    const supportRespond = read("supabase/functions/support-respond/index.ts");
    expect(supportRespond).toMatch(/getConciergeCapabilities/);
    expect(supportRespond).toMatch(/concierge\.enabled \|\| concierge\.killed/);
    expect(supportRespond).toMatch(/concierge\.staticFallback/);
    expect(supportRespond).toMatch(/concierge\.modelAnswers/);
  });

  it("the model gate narrows and never widens", () => {
    // `concierge.model_answers` must AND with `support.openai_fallback`, not replace it. Turning
    // the Concierge flag on must not enable a model the support-wide flag has switched off.
    const supportRespond = read("supabase/functions/support-respond/index.ts");
    expect(supportRespond).toMatch(/supportOpenAiAllowed && concierge\.modelAnswers/);
  });

  it("fails closed when the controls cannot be read", () => {
    // A governance layer that opens when it cannot read its own rules is not a governance layer.
    const resolver = read("supabase/functions/_shared/concierge-controls.ts");
    expect(resolver).toMatch(/failing closed/);
    expect(resolver).toMatch(/if \(killed\) return ALL_OFF;/);
    // And one query, not one per key — this runs on the path a person is waiting on.
    expect(resolver).toMatch(/\.like\("control_key", "concierge\.%"\)/);
  });

  it("the client can learn the state without widening the RLS policy", () => {
    // `operational_controls` is admin-read-only, so the config endpoint is the only route. If
    // someone "fixes" this by granting a broader policy, every operational control in the product
    // — including safety and payment switches — becomes readable from a browser console.
    const config = read("supabase/functions/concierge-config/index.ts");
    expect(config).toMatch(/getConciergeCapabilities/);
    expect(config).toMatch(/verify_jwt/.test(config) ? /./ : /getConciergeCapabilities/);
    expect(read("supabase/config.toml")).toMatch(/\[functions\.concierge-config\]\nverify_jwt = false/);
  });

  it("the launcher renders nothing when the Concierge is switched off", () => {
    const bot = read("src/components/xoot/XootSupportBot.tsx");
    expect(bot).toMatch(/if \(!webEnabled\) return null;/);
    expect(bot).toMatch(/useConciergeConfig/);
  });
});
