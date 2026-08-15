import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every value written to `payment_records.provider` must be one the constraint permits.
 *
 * ── The defect this exists for, and it was live on both databases ───────────────
 * `20260813180000_payfast_sole_payment_provider.sql` added
 * `check (provider = 'payfast')` to `payment_records`, while the column's own default — set in
 * `20260518123000` and never changed — is `'manual_pending'`. The column default violated the
 * column's constraint, so **every booking, Care+ signup, gift clean and fare split failed** the
 * moment it applied, on staging and production alike. Read from both live databases, not inferred.
 *
 * Nothing caught it. The migration was reviewed for the thing it was about (removing Stitch and
 * Ozow) and that part was right. What nobody checked was the six writers on the other side of the
 * constraint, because nothing joined the two.
 *
 * This is that join. It reads the constraint from the migration and the literal from every writer,
 * so the two cannot drift again — and a seventh writer inserting a new value fails here rather
 * than in production.
 *
 * ⚠️ It deliberately reads the **constraint**, not a hand-copied list. A test asserting against a
 * duplicated array would pass while the database rejected every insert, which is precisely the
 * shape of the bug it is meant to catch.
 */

const read = (relative: string) => readFileSync(join(process.cwd(), relative), "utf8");

const LIFECYCLE_MIGRATION = "supabase/migrations/20260813200000_payment_records_provider_lifecycle.sql";

/** Pull the allowed values straight out of `check (provider in ('a', 'b', 'c'))`. */
const allowedProviders = (): string[] => {
  const sql = read(LIFECYCLE_MIGRATION);
  const match = sql.match(/check\s*\(provider\s+in\s*\(([^)]*)\)\)/i);
  if (!match) throw new Error(`no 'check (provider in (...))' found in ${LIFECYCLE_MIGRATION}`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
};

/**
 * The writers, and where each one's literal lives.
 *
 * The Edge Functions all insert into `payment_records` directly, so the literal is found by
 * scanning forward from the table name. `operations.ts` builds the row in a named helper instead,
 * so it is located by that helper — the same value, reached differently, and worth covering
 * because it is the shape a client-side insert would take.
 */
const EDGE_WRITERS = [
  "supabase/functions/create-booking/index.ts",
  "supabase/functions/create-booking-request/index.ts",
  "supabase/functions/care-plus-membership/index.ts",
  "supabase/functions/ops-workflow/index.ts",
  "supabase/functions/split-booking-fare/index.ts",
];

/**
 * Providers written by a `payment_records` insert in this source.
 *
 * Scoped to a window after the table name so that `provider_events` inserts — which legitimately
 * carry `payfast`, `twilio`, `brevo` and others — are not swept in and mistaken for payment rows.
 */
const providersInsertedInto = (source: string): string[] => {
  const lines = source.split("\n");
  const found: string[] = [];
  lines.forEach((line, index) => {
    if (!line.includes('payment_records"')) return;
    for (const next of lines.slice(index + 1, index + 16)) {
      const match = next.match(/^\s*provider:\s*"([^"]+)"/);
      if (match) {
        found.push(match[1]);
        break;
      }
    }
  });
  return found;
};

describe("payment_records.provider lifecycle", () => {
  const allowed = allowedProviders();

  it("permits the value the column itself defaults to", () => {
    /*
     * The whole defect in one assertion. `provider` is NOT NULL with default 'manual_pending', so a
     * constraint excluding it makes even an insert that omits the column illegal.
     */
    const schema = read("supabase/migrations/20260518123000_full_word_document_operating_layer.sql");
    const columnDefault = schema.match(/provider text not null default '([^']+)'/)?.[1];
    expect(columnDefault, "payment_records.provider lost its default").toBe("manual_pending");
    expect(allowed, "the column default is rejected by its own constraint").toContain(columnDefault);
  });

  it.each(EDGE_WRITERS)("%s inserts only permitted providers", (file) => {
    const inserted = providersInsertedInto(read(file));
    expect(inserted.length, `no payment_records insert found in ${file} — did it move?`).toBeGreaterThan(0);
    for (const provider of inserted) {
      expect(allowed, `${file} inserts provider "${provider}", which the constraint rejects`).toContain(provider);
    }
  });

  it("src/lib/operations.ts builds a permitted provider", () => {
    const source = read("src/lib/operations.ts");
    const builder = source.slice(source.indexOf("export const buildPendingPaymentRecord"));
    expect(builder, "buildPendingPaymentRecord has moved or been renamed").not.toBe("");
    const provider = builder.match(/provider:\s*"([^"]+)"/)?.[1];
    expect(allowed, `operations.ts builds provider "${provider}", which the constraint rejects`).toContain(provider);
  });

  it("carries payfast, so a checkout can route a record to it", () => {
    // `create-payment-session` sets this when it hands the customer to PayFast, and
    // `confirm-payment` reads the record back by reference. Without it the checkout cannot write.
    expect(allowed).toContain("payfast");
  });

  it("carries manual_eft, so an admin can record money that arrived by bank transfer", () => {
    // Founder decision 2026-08-13: keep EFT as a fallback so money can still be taken while
    // PayFast onboarding is incomplete. `admin-confirm-payment` writes it.
    expect(allowed).toContain("manual_eft");
  });

  it("drops the old constraint by definition rather than by name", () => {
    /*
     * An inline `check (...)` gets an auto-generated name. `drop constraint if exists <guess>`
     * silently does nothing when the guess is wrong, leaving the old constraint in force while the
     * `add` succeeds and the migration reports success — a failure mode worse than not trying.
     * This repo has now met it five times.
     */
    const sql = read(LIFECYCLE_MIGRATION);
    expect(sql).toMatch(/pg_get_constraintdef/);
    expect(sql).toMatch(/pg_constraint/);
  });

  it("leaves the capabilities constraint alone", () => {
    /*
     * `payment_provider_capabilities.provider = 'payfast'` is correct and stays: a row there IS a
     * claim about one provider, not a lifecycle field. Widening it would let a capability row exist
     * for a provider nothing can talk to.
     */
    const sql = read(LIFECYCLE_MIGRATION);
    expect(sql).not.toMatch(/alter table\s+public\.payment_provider_capabilities/i);
  });
});
