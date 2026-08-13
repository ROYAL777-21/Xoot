import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The client and server copies of the distance code must be the same code.
 *
 * ── Why this is worth a test of its own ─────────────────────────────────────────
 * `geo.ts` decides which Xooter is offered a job and what distance the customer is shown. If the
 * two copies drift, the app displays one thing and the marketplace does another — which is exactly
 * the defect that produced the multi-Xooter R799 gap: one question, two answers, no test.
 *
 * `pricing-parity.test.ts` already does this for money. Work allocation earns the same protection,
 * because being passed over for jobs is as consequential to a Xooter as being underpaid for them.
 *
 * Compared as **source text after the header**, not by re-implementing the functions here. A test
 * that reimplements what it checks can agree with neither copy.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const client = read("src/lib/geo.ts");
const server = read("supabase/functions/_shared/geo.ts");

/** Everything from the first export onward — the code, without each file's own header comment. */
const bodyOf = (source: string) => source.slice(source.indexOf("export type SuburbCentroid"));

describe("client/server geo parity", () => {
  it("keeps the two copies byte-identical below the header", () => {
    const clientBody = bodyOf(client);
    const serverBody = bodyOf(server);

    // Guards the slicer: if the anchor stopped matching, both bodies would be the whole file and
    // the comparison could pass while comparing the wrong thing.
    expect(clientBody.length).toBeGreaterThan(1000);
    expect(serverBody.length).toBeGreaterThan(1000);

    expect(
      serverBody,
      "supabase/functions/_shared/geo.ts has drifted from src/lib/geo.ts — edit both identically",
    ).toBe(clientBody);
  });

  it("keeps the offer radius the same on both sides", () => {
    // Called out separately because this is the constant that decides whether a Xooter is offered
    // a job at all. A client that draws people the server will not match is a support ticket.
    const radius = (source: string) => source.match(/MAX_TRAVEL_KM = (\d+)/)?.[1];
    expect(radius(client)).toBe("25");
    expect(radius(server)).toBe(radius(client));
  });

  it("says in the server copy that it is a mirror", () => {
    // The header is the only part that legitimately differs, and it has one job: tell whoever
    // opens the server file that editing it alone will not work.
    expect(server).toMatch(/Server mirror of `src\/lib\/geo\.ts`/);
    expect(server).toMatch(/geo-parity\.test\.ts/);
  });
});

describe("the dead distance column", () => {
  it("is no longer used to rank or display anything", () => {
    // `xooters.distance_mi` is a static seeded value: the same number for every customer. It was
    // scored in `ai-match` and rendered to users as `${distance_mi} km`, which is a claim about a
    // person's travel that the app could not support.
    //
    // The column stays in the schema — dropping one both projects still expose is a separate
    // change — but nothing may read it again.
    const consumers = [
      "supabase/functions/ai-match/index.ts",
      "src/components/xoot/XooterCard.tsx",
    ];
    for (const path of consumers) {
      const source = read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      expect(source, `${path} still reads the seeded distance_mi`).not.toMatch(/\bdistance_mi\b/);
    }
  });
});
