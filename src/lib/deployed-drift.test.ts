import { describe, expect, it } from "vitest";
// Plain-JS ops module, deliberately outside the app build: the CLI that uses it runs under
// bare node, so it cannot be TypeScript. TS resolves and checks it from here regardless.
import {
  classifyDrift,
  effectiveSourceTime,
  sharedClosure,
  sharedImportsOf,
} from "../../scripts/ops/lib/deployed-drift.mjs";

/**
 * The check that would have caught the two worst findings of 2026-08-07.
 *
 * Both — production charging a superseded pricing model, and every function serving the old
 * domain — were invisible because every guard in this suite reads the repo file, and the repo
 * file was correct. What nothing did was compare the repo against what is actually running.
 *
 * These tests pin the part that is easy to get wrong rather than the part that talks to
 * Supabase. My own first pass at this audit got it wrong in the direction that hides drift,
 * so that specific mistake is the first thing asserted.
 */

const DAY = 86_400;

describe("finding the shared modules a function actually deploys with", () => {
  it("picks up every _shared import in a file", () => {
    const source = `
      import { fail, ok } from "../_shared/action-utils.ts";
      import { basePrice } from "../_shared/pricing.ts";
    `;
    expect([...sharedImportsOf(source)].sort()).toEqual(["action-utils.ts", "pricing.ts"]);
  });

  it("survives a function with no shared imports", () => {
    expect(sharedClosure("Deno.serve(() => new Response())", {}).size).toBe(0);
  });

  it("follows shared modules that import other shared modules", () => {
    const closure = sharedClosure('import "../_shared/a.ts";', {
      "a.ts": 'import "./b.ts"; import "../_shared/b.ts";',
      "b.ts": 'import "../_shared/c.ts";',
      "c.ts": "export const x = 1;",
    });
    expect([...closure].sort()).toEqual(["a.ts", "b.ts", "c.ts"]);
  });

  it("follows a shared module that imports a sibling by its bare path", () => {
    // The case the test above could not catch, because its fixture wrote `b.ts` both ways and so
    // passed on the `_shared/` spelling alone. Real code only ever writes the sibling form:
    // `twilio-webhook.ts` says `from "./governance-utils.ts"`, and `admin-action-utils.ts` says
    // `from "./action-utils.ts"`. Neither contains `_shared/`, so both were invisible until
    // 2026-08-08 — the five twilio webhooks were never reported stale when `governance-utils.ts`
    // changed, and the seven `admin-*` functions had the same hole via `action-utils.ts`.
    const closure = sharedClosure('import { handle } from "../_shared/twilio-webhook.ts";', {
      "twilio-webhook.ts": 'import { claimProviderEvent } from "./governance-utils.ts";',
      "governance-utils.ts": "export const claimProviderEvent = () => {};",
    });
    expect([...closure].sort()).toEqual(["governance-utils.ts", "twilio-webhook.ts"]);
  });

  it("does not mistake a function's own sibling file for a shared module", () => {
    // `./helpers.ts` next to `functions/<slug>/index.ts` is that function's own file, not
    // `_shared/helpers.ts`. Only sources already inside `_shared` get the sibling treatment;
    // widening it to entry files would invent dependencies that do not exist.
    const closure = sharedClosure('import { x } from "./helpers.ts";', {
      "helpers.ts": "export const x = 1;",
    });
    expect(closure.size).toBe(0);
  });

  it("does not loop forever on a cycle", () => {
    const closure = sharedClosure('import "../_shared/a.ts";', {
      "a.ts": 'import "../_shared/b.ts";',
      "b.ts": 'import "../_shared/a.ts";',
    });
    expect([...closure].sort()).toEqual(["a.ts", "b.ts"]);
  });
});

describe("the newest source that affects a deployment", () => {
  it("uses the function's own source when nothing shared is newer", () => {
    const result = effectiveSourceTime({
      ownTime: 100 * DAY,
      closure: new Set(["action-utils.ts"]),
      sharedTimes: { "action-utils.ts": 90 * DAY },
    });
    expect(result).toEqual({ newest: 100 * DAY, driver: "own source" });
  });

  /**
   * The mistake that made this drift invisible.
   *
   * A function untouched for six weeks whose shared dependency moved this morning is stale,
   * and comparing only its own directory says it is fine. That is how a first pass reported
   * five functions in step when the true answer was zero.
   */
  it("is driven by a shared module when that is what moved", () => {
    const result = effectiveSourceTime({
      ownTime: 40 * DAY,
      closure: new Set(["action-utils.ts"]),
      sharedTimes: { "action-utils.ts": 100 * DAY },
    });
    expect(result).toEqual({ newest: 100 * DAY, driver: "_shared/action-utils.ts" });
  });

  it("names the newest shared module, not merely a newer one", () => {
    const result = effectiveSourceTime({
      ownTime: 10 * DAY,
      closure: new Set(["a.ts", "b.ts"]),
      sharedTimes: { "a.ts": 50 * DAY, "b.ts": 80 * DAY },
    });
    expect(result.driver).toBe("_shared/b.ts");
  });

  it("ignores shared modules the function does not import", () => {
    const result = effectiveSourceTime({
      ownTime: 10 * DAY,
      closure: new Set(["a.ts"]),
      sharedTimes: { "a.ts": 20 * DAY, "unused.ts": 999 * DAY },
    });
    expect(result.newest).toBe(20 * DAY);
  });
});

describe("classifying a whole estate", () => {
  const sharedTimes = { "action-utils.ts": 100 * DAY };
  const closures = {
    "create-booking": new Set(["action-utils.ts"]),
    "twilio-voice-twiml": new Set<string>(),
  };

  it("calls a function stale when a shared module outran its deployment", () => {
    const { stale, inStep } = classifyDrift({
      deployments: [{ slug: "create-booking", deployedAt: 60 * DAY }],
      ownTimes: { "create-booking": 50 * DAY },
      closures,
      sharedTimes,
    });
    expect(inStep).toHaveLength(0);
    expect(stale[0]).toMatchObject({ slug: "create-booking", driver: "_shared/action-utils.ts" });
  });

  it("calls a function in step when the deployment is newer than everything it bundles", () => {
    const { stale, inStep } = classifyDrift({
      deployments: [{ slug: "twilio-voice-twiml", deployedAt: 200 * DAY }],
      ownTimes: { "twilio-voice-twiml": 150 * DAY },
      closures,
      sharedTimes,
    });
    expect(stale).toHaveLength(0);
    expect(inStep.map((row) => row.slug)).toEqual(["twilio-voice-twiml"]);
  });

  it("treats a deployment exactly as old as its source as in step", () => {
    // Equal timestamps mean the deploy captured that commit. Only strictly newer source is drift.
    const { stale } = classifyDrift({
      deployments: [{ slug: "create-booking", deployedAt: 100 * DAY }],
      ownTimes: { "create-booking": 50 * DAY },
      closures,
      sharedTimes,
    });
    expect(stale).toHaveLength(0);
  });

  it("reports the worst drift first", () => {
    const { stale } = classifyDrift({
      deployments: [
        { slug: "twilio-voice-twiml", deployedAt: 10 * DAY },
        { slug: "create-booking", deployedAt: 10 * DAY },
      ],
      ownTimes: { "create-booking": 50 * DAY, "twilio-voice-twiml": 20 * DAY },
      closures,
      sharedTimes,
    });
    // create-booking is dragged to day 100 by action-utils; twilio-voice-twiml sits at day 20.
    expect(stale.map((row) => row.slug)).toEqual(["create-booking", "twilio-voice-twiml"]);
  });

  it("flags a deployed function with no source in the repo", () => {
    const { orphans } = classifyDrift({
      deployments: [{ slug: "ghost-function", deployedAt: 10 * DAY }],
      ownTimes: {},
      closures: {},
      sharedTimes: {},
    });
    // Four Twilio functions were once exactly this — running with no source anywhere.
    expect(orphans).toEqual(["ghost-function"]);
  });

  it("says nothing at all about an empty estate rather than inventing a pass", () => {
    expect(classifyDrift({ deployments: [] })).toEqual({ stale: [], inStep: [], orphans: [] });
  });
});
