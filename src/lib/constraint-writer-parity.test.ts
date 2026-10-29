import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";

/**
 * ── Every value a writer sends must be a value its column allows ───────────────────────────────
 *
 * This repo has now shipped the same defect **eight times in two months**: a CHECK constraint whose
 * body lists literal values, and application code that writes a value the list forbids. Every
 * instance failed at runtime with SQLSTATE 23514 and passed every test beforehand, because each
 * test compared the code to itself.
 *
 * The ones that reached a live database:
 *
 *   payment_records.provider          `= 'payfast'` vs six writers sending `manual_pending`
 *                                     → NO booking, Care+ signup, gift clean or fare split could
 *                                       be created on either project, for two days
 *   safety_sos_alerts.raiser_role     `in ('customer','zooter')` vs `"xooter"`
 *                                     → a Xooter could not raise an SOS alert
 *   support_handoff_contexts.role_type `in ('user','zooter','admin')` vs `"xooter"`
 *                                     → a Xooter could not open a Concierge handoff
 *   messages.sender_type              `in ('user','zooter')` vs `"xooter"`
 *   xoot_concierge_feedback.role      same shape
 *   payment_provider_capabilities     `in ('stitch','ozow')` vs `payfast`
 *
 * `founder-todo.md` §5 examined this pattern after the third instance and concluded there were
 * three. Five more followed. **A pattern that recurs after being investigated needs a guard, not
 * another fix**, which is what this is.
 *
 * ── What it does ───────────────────────────────────────────────────────────────────────────────
 *
 * 1. Parses every `check (col in ('a','b'))` and `check (col = 'a')` out of `supabase/migrations/`,
 *    keeping the LAST definition per table+column — later migrations supersede earlier ones, which
 *    is the whole reason six of these were invisible.
 * 2. Finds every object literal in `supabase/functions/**` and `src/**` that assigns a string
 *    literal to one of those column names.
 * 3. Fails when a writer sends a value the surviving constraint forbids.
 *
 * ── What it deliberately does not do ───────────────────────────────────────────────────────────
 *
 * It only sees **string literals**, either written inline at the insert or assigned to a `const`
 * in the same file and used by name. That second hop is not optional: the real SOS defect was
 *
 *     const raiserRole = xooter?.id ? "xooter" : "customer";
 *     ...
 *     raiser_role: raiserRole,
 *
 * and the first draft of this guard missed it, because it only read the insert. Planting the bug
 * is what exposed that — reading the test back would not have. A value that arrives from a
 * function call or another module is still invisible, and cannot be seen without a type checker,
 * so this is a floor rather than a ceiling.
 *
 * Planted 2026-08-15, both directions: reverting `safety_sos_alerts.raiser_role` to `'zooter'` fails
 * naming `raise-sos-alert`; adding a writer with an invented value fails naming the constraint.
 * Restored after each.
 */

const root = process.cwd();
const migrationsDir = join(root, "supabase/migrations");

/** table -> column -> allowed values, last definition winning. */
type Allowed = Map<string, Map<string, Set<string>>>;

/**
 * Which table a bare `check (...)` belongs to.
 *
 * Inline column checks sit inside `create table x (...)`, and `alter table x add constraint`
 * names its table directly. Both forms are scanned; the nearest preceding table name wins, which
 * is how Postgres reads it too.
 */
function parseConstraints(sql: string, into: Allowed) {
  const statements = sql.split(/;\s*$/m);
  for (const statement of statements) {
    const createMatch = /create table (?:if not exists )?(?:([a-z_]+)\.)?([a-z_]+)/i.exec(statement);
    const alterMatch = /alter table (?:only )?(?:([a-z_]+)\.)?([a-z_]+)/i.exec(statement);
    const match = createMatch ?? alterMatch;
    const schema = match?.[1]?.toLowerCase();
    const table = match ? `${schema && schema !== "public" ? `${schema}.` : ""}${match[2].toLowerCase()}` : "";
    if (!table) continue;

    // `col in ('a', 'b')` — the multi-value form.
    for (const m of statement.matchAll(/check\s*\(\s*\(?\s*([a-z_]+)\s+in\s*\(([^)]*)\)/gi)) {
      const column = m[1].toLowerCase();
      const values = [...m[2].matchAll(/'([^']*)'/g)].map((v) => v[1]);
      if (values.length === 0) continue;
      if (!into.has(table)) into.set(table, new Map());
      into.get(table)!.set(column, new Set(values));
    }

    // `col = 'a'` — the single-value form, which is how payment_records was broken.
    for (const m of statement.matchAll(/check\s*\(\s*\(?\s*([a-z_]+)\s*=\s*'([^']*)'/gi)) {
      const column = m[1].toLowerCase();
      if (!into.has(table)) into.set(table, new Map());
      into.get(table)!.set(column, new Set([m[2]]));
    }
  }
}

function loadAllowed(): Allowed {
  const allowed: Allowed = new Map();
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    parseConstraints(readFileSync(join(migrationsDir, file), "utf8"), allowed);
  }
  return allowed;
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "generated") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    // Negative test fixtures deliberately contain values production writers must reject.
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Columns whose name is too generic to attribute to one table from source alone.
 *
 * `status`, `state`, `role` and friends appear on a dozen tables with different value sets, so a
 * literal written to `status:` cannot be matched to a single constraint without type information.
 * Including them would produce false failures, and a guard that cries wolf gets deleted. The
 * columns that have actually broken are all specific.
 */
const AMBIGUOUS = new Set([
  "status", "state", "role", "type", "source", "channel", "kind", "category",
  "provider", "priority", "environment", "platform", "reason", "direction", "purpose",
  // Auth screens, applicant commands and the private lookup allowance use different modes.
  // The allowance's actual values remain covered by its handler and PostgreSQL contracts.
  "mode",
]);

/** Read actual literal value branches, never strings passed into a function. */
function literalValues(expression: string): string[] {
  const source = ts.createSourceFile("writer-expression.ts", `const candidate = (${expression});`,
    ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const statement = source.statements[0];
  if (!statement || !ts.isVariableStatement(statement)) return [];
  const initialiser = statement.declarationList.declarations[0]?.initializer;
  const unwrap = (node: ts.Expression): ts.Expression => {
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)
      || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node)) return unwrap(node.expression);
    return node;
  };
  const literalFacts = (expression: ts.Expression): { truthy?: boolean; nullish?: boolean } => {
    const node = unwrap(expression);
    if (ts.isStringLiteralLike(node)) return { truthy: node.text.length > 0, nullish: false };
    if (ts.isNumericLiteral(node)) return { truthy: Number(node.text) !== 0, nullish: false };
    if (node.kind === ts.SyntaxKind.TrueKeyword) return { truthy: true, nullish: false };
    if (node.kind === ts.SyntaxKind.FalseKeyword) return { truthy: false, nullish: false };
    if (node.kind === ts.SyntaxKind.NullKeyword) return { truthy: false, nullish: true };
    return {};
  };
  const collect = (node: ts.Expression | undefined): string[] => {
    if (!node) return [];
    node = unwrap(node);
    if (ts.isStringLiteralLike(node)) return [node.text];
    if (ts.isConditionalExpression(node)) return [...collect(node.whenTrue), ...collect(node.whenFalse)];
    if (ts.isBinaryExpression(node)) {
      const facts = literalFacts(node.left);
      const eitherBranch = () => [...collect(node.left), ...collect(node.right)];
      switch (node.operatorToken.kind) {
        case ts.SyntaxKind.QuestionQuestionToken:
          return facts.nullish === true ? collect(node.right)
            : facts.nullish === false ? collect(node.left) : eitherBranch();
        case ts.SyntaxKind.BarBarToken:
          return facts.truthy === true ? collect(node.left)
            : facts.truthy === false ? collect(node.right) : eitherBranch();
        case ts.SyntaxKind.AmpersandAmpersandToken:
          return facts.truthy === true ? collect(node.right)
            : facts.truthy === false ? collect(node.left) : eitherBranch();
      }
    }
    return [];
  };
  return collect(initialiser);
}

describe("every literal a writer sends is a value its column allows", () => {
  const allowed = loadAllowed();

  it("preserves private table attribution and still parses the bounded lookup modes", () => {
    expect(allowed.get("private.kyc_quarantine_receipts")?.get("content_type"))
      .toEqual(new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]));
    expect(allowed.get("xoot_address_lookup_allowances")?.get("mode"))
      .toEqual(new Set(["suggest", "confirm"]));
  });

  it("finds forbidden literal branches without treating function arguments or types as writes", () => {
    expect(literalValues('"zooter"')).toEqual(["zooter"]);
    expect(literalValues('xooter?.id ? "xooter" : "customer"')).toEqual(["xooter", "customer"]);
    expect(literalValues('condition ? "zooter" : getRole()')).toEqual(["zooter"]);
    expect(literalValues('String(metadata.mimetype ?? "")')).toEqual([]);
    expect(literalValues('Deno.env.get("PAYFAST_MODE")')).toEqual([]);
    expect(literalValues('"signup" | "signin"')).toEqual([]);
  });

  it("finds logical fallback values and excludes statically unreachable value branches", () => {
    expect(literalValues('requestedRole ?? "zooter"')).toEqual(["zooter"]);
    expect(literalValues('requestedRole || "zooter"')).toEqual(["zooter"]);
    expect(literalValues('condition && "zooter"')).toEqual(["zooter"]);
    expect(literalValues('(requestedRole as string) ?? (condition ? "zooter" : "customer")'))
      .toEqual(["zooter", "customer"]);
    expect(literalValues('"customer" ?? "zooter"')).toEqual(["customer"]);
    expect(literalValues('"customer" || "zooter"')).toEqual(["customer"]);
    expect(literalValues('"" || "customer"')).toEqual(["customer"]);
    expect(literalValues('null ?? "customer"')).toEqual(["customer"]);
    expect(literalValues('false && "zooter"')).toEqual([]);
    expect(literalValues('true && "customer"')).toEqual(["customer"]);
    expect(literalValues('0 || "customer"')).toEqual(["customer"]);
    expect(literalValues('String(requestedRole ?? "zooter")')).toEqual([]);
  });

  it("scans shipped TSX writers while excluding their negative test fixtures", () => {
    const files = sourceFiles(join(root, "src/pages/app"));
    expect(files).toContain(join(root, "src/pages/app/Bookings.tsx"));
    expect(files).toContain(join(root, "src/pages/app/BookingFlow.tsx"));
    expect(files).not.toContain(join(root, "src/pages/app/Bookings.test.tsx"));
    expect(sourceFiles(join(root, "src/lib"))).not.toContain(join(root, "src/lib/constraint-writer-parity.test.ts"));
  });

  it("parses a meaningful number of constraints", () => {
    // A parser that silently matches nothing passes every assertion below while checking none —
    // the failure mode that made several guards in this repo meaningless for weeks.
    const columns = [...allowed.values()].reduce((n, cols) => n + cols.size, 0);
    expect(columns).toBeGreaterThan(30);
  });

  it("still sees the two constraints that were breaking live features", () => {
    // Pinned by name: if the parser stops recognising these forms, the test above still passes.
    expect(allowed.get("safety_sos_alerts")?.get("raiser_role")).toEqual(new Set(["customer", "xooter"]));
    expect(allowed.get("payment_records")?.get("provider")).toEqual(
      new Set(["manual_pending", "payfast", "manual_eft"]),
    );
  });

  it("finds no writer sending a forbidden value", () => {
    const byColumn = new Map<string, { table: string; values: Set<string> }[]>();
    for (const [table, columns] of allowed) {
      for (const [column, values] of columns) {
        if (AMBIGUOUS.has(column)) continue;
        if (!byColumn.has(column)) byColumn.set(column, []);
        byColumn.get(column)!.push({ table, values });
      }
    }

    const violations: string[] = [];
    const files = [
      ...sourceFiles(join(root, "supabase/functions")),
      ...sourceFiles(join(root, "src")),
    ];

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const [column, tables] of byColumn) {
        // `column: "value"`, `column: cond ? "a" : "b"`, and `column: someConst` where that
        // const is a literal or ternary of literals in the same file. The last form is how the
        // SOS defect was actually written.
        for (const m of text.matchAll(new RegExp(`\\b${column}\\s*:\\s*([^,;\\n}]+)`, "g"))) {
          let expression = m[1];
          const identifier = /^\s*([A-Za-z_$][\w$]*)\s*$/.exec(expression);
          if (identifier) {
            const assigned = new RegExp(
              `\\b(?:const|let|var)\\s+${identifier[1]}\\s*(?::[^=]+)?=\\s*([^;\\n]+)`,
            ).exec(text);
            if (!assigned) continue;
            expression = assigned[1];
          }
          const literals = literalValues(expression);
          if (literals.length === 0) continue;
          for (const literal of literals) {
            // Only complain when EVERY table defining this column forbids the value. A column name
            // shared by two tables with different sets must not fail on the stricter one.
            if (tables.every((t) => !t.values.has(literal))) {
              violations.push(
                `${file.replace(`${root}/`, "")} writes ${column}: "${literal}" — ` +
                  tables.map((t) => `${t.table} allows ${[...t.values].join("|")}`).join("; "),
              );
            }
          }
        }
      }
    }

    expect(
      [...new Set(violations)],
      "A writer is sending a value its own column rejects. This is SQLSTATE 23514 at runtime and " +
        "has already broken booking creation and the Xooter SOS alert on live databases.",
    ).toEqual([]);
  });
});
