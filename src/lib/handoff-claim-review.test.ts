import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ── The founder's claim-ruling list, with teeth ─────────────────────────────────────────────
 *
 * The founder instructed on 2026-09-05 that the 2026-09-03 handoff's copy be ported **verbatim**
 * and each unbacked claim **flagged**, rather than rewritten as it is reached.
 *
 * A flag written only in a code comment or a markdown table is not a flag. The five sections
 * ported before this one each contained a claim that did not survive a check, and the port plan
 * says the failure mode is "somebody restoring the original copy in a later visual pass". A
 * ledger nothing enforces is exactly that failure with an extra step.
 *
 * So this file makes `docs/product/handoff-claim-review.md` executable:
 *
 *   · PENDING / APPROVED claims must actually BE in the file the ledger names. Otherwise the
 *     ledger is describing code that no longer exists and is quietly lying.
 *   · REWRITTEN claims must NOT be. A ruling that was recorded and never applied is worse than
 *     an open one, because it reads as closed.
 *   · Any row still PENDING fails the release gate, naming every outstanding ruling at once.
 *
 * ⚠️ The gate does not go green by editing the ledger. It goes green by ruling and applying.
 */
const ROOT = process.cwd();
const LEDGER_PATH = join(ROOT, "docs/product/handoff-claim-review.md");
const LEDGER = readFileSync(LEDGER_PATH, "utf8");

type Status = "PENDING" | "APPROVED" | "REWRITTEN";
type Row = { id: string; status: Status; file: string; claim: string };

/**
 * The table is `| ID | Status | File | words | why | approved |`. Only the first four columns are
 * machine-read; the last two are for the person doing the ruling.
 *
 * `File` and `words` are backticked in the markdown so they survive being read by a human, and
 * the backticks are stripped here.
 */
function parseLedger(source: string): Row[] {
  const rows: Row[] = [];
  for (const line of source.split("\n")) {
    if (!line.startsWith("| ")) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    // cells[0] is the empty string before the leading pipe.
    const [, id, status, file, claim] = cells;
    if (!id || id === "ID" || /^-+$/.test(id)) continue;
    if (status !== "PENDING" && status !== "APPROVED" && status !== "REWRITTEN") continue;
    rows.push({
      id,
      status,
      file: file.replace(/`/g, ""),
      claim: claim.replace(/^`|`$/g, ""),
    });
  }
  return rows;
}

const rows = parseLedger(LEDGER);

describe("the handoff claim ledger", () => {
  it("parses, so a passing run is not a parser that stopped matching", () => {
    /*
     * Without this the whole file becomes a no-op the moment the table's shape changes — which
     * is the exact way `marketing-claims.test.ts` describes its own allowlist going stale.
     */
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.claim.length, `${row.id} has an empty claim string`).toBeGreaterThan(3);
      expect(existsSync(join(ROOT, row.file)), `${row.id} names a file that does not exist: ${row.file}`).toBe(true);
    }
  });

  it("every claim awaiting or granted a ruling is actually in the source it names", () => {
    const stale = rows
      .filter((row) => row.status === "PENDING" || row.status === "APPROVED")
      .filter((row) => !readFileSync(join(ROOT, row.file), "utf8").includes(row.claim))
      .map((row) => `${row.id}: "${row.claim}" is not in ${row.file} — the ledger is stale`);

    expect(stale).toEqual([]);
  });

  it("every claim ruled REWRITTEN is gone from the source", () => {
    const unapplied = rows
      .filter((row) => row.status === "REWRITTEN")
      .filter((row) => readFileSync(join(ROOT, row.file), "utf8").includes(row.claim))
      .map((row) => `${row.id}: ruled REWRITTEN but "${row.claim}" is still in ${row.file}`);

    expect(unapplied).toEqual([]);
  });

  it("RELEASE GATE — no claim is still awaiting the founder's ruling", () => {
    /*
     * This is the test that is MEANT to be red while rulings are outstanding, and it is the only
     * one. A scattered red suite gets ignored; one named failure that lists the open questions
     * does not.
     *
     * When it fails, the branch is not shippable. That is the founder's own stated position on
     * the verbatim-port decision, not an interpretation of it.
     */
    const pending = rows
      .filter((row) => row.status === "PENDING")
      .map((row) => `${row.id} (${row.file}): "${row.claim}"`);

    expect(
      pending,
      `${pending.length} handoff claim(s) await a founder ruling. See docs/product/handoff-claim-review.md — rule each one, then apply it.`,
    ).toEqual([]);
  });
});
