import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The two PowerShell readiness guards, re-run on Linux.
 *
 * ── The defect ──────────────────────────────────────────────────────────────────
 * `scripts/ops/verify-production-readiness.ps1` and `scripts/ops/check-blocker-ledger.ps1` assert
 * that named files exist and contain named strings. They run in exactly one place: the
 * `windows-latest` job *Verify blocker and provider-readiness artifacts*. Nothing local runs them —
 * not `npm test`, not `npm run build`, not `security:scan`.
 *
 * So when ZD-029 (`43e8d24`, "Rename the schema to Xoot, and the 267 files that name it") swept the
 * repo for `zoot` -> `xoot`, it rewrote **twenty assertions** in the verifier while their targets
 * correctly did not move — an applied migration is immutable history, and `20260624224551` really
 * did create `zooter_jobs` before `20260813160000` renamed it. 25 checks went to `fail`, the job
 * exited 1, and it stayed red on `main` for a day while four separate reports called it
 * "pre-existing, not mine".
 *
 * It also hid a second failure. The workflow runs its five steps in order and stops at the first
 * non-zero exit, so `check-blocker-ledger.ps1` — failing because `blocker.md` still described the
 * deep-link scheme ZD-028 had already changed — never ran at all.
 *
 * ── Why the third assertion is here ─────────────────────────────────────────────
 * The same sweep moved `ZOOT_INVOICE_LEGAL_ENTITY` to `XOOT_` in
 * `generate-booking-invoice/index.ts` and left `.env.example` and two setup docs on the old name.
 * Following the documented setup therefore set four variables nothing read, and every invoice was
 * refused with "invoice legal entity is not configured". It failed closed, which is the right
 * direction — a South African tax invoice with a blank legal entity would be worse than none — but
 * the feature was dead and no test could see it.
 *
 * A name a function reads and a name the setup docs tell you to set are the same fact written
 * twice. This file is where they are made to agree.
 */

const ROOT = process.cwd();

const readRepo = (relativePath: string) => readFileSync(join(ROOT, relativePath), "utf8");

/**
 * PowerShell escapes a double quote inside a double-quoted string as a backtick-quote. Undo that
 * before treating the payload as a regex, or `"LOAD_TEST_ENV !== `"staging`""` never matches.
 */
const unescapePwsh = (value: string) => value.replace(/`"/g, '"');

/**
 * `-match` is a .NET regex and is case-insensitive by default. Every pattern in these scripts is
 * simple enough that JavaScript agrees, and a pattern that does *not* translate must fail loudly:
 * a guard that silently skips what it cannot parse is the shape this repo has shipped before.
 */
const pwshMatches = (pattern: string, text: string) => new RegExp(pattern, "i").test(text);

// ─────────────────────────────────────────────────────────────────────────────────
// verify-production-readiness.ps1
// ─────────────────────────────────────────────────────────────────────────────────

const VERIFIER = "scripts/ops/verify-production-readiness.ps1";
const verifierSource = readRepo(VERIFIER);

/** `Test-RepoFile "<area>" "<path>"`, plus the `$hardeningDocs` array it loops over. */
const assertedFiles = (): string[] => [
  ...[...verifierSource.matchAll(/^Test-RepoFile\s+"[^"]+"\s+"([^"]+)"/gm)].map((m) => m[1]),
  ...[...verifierSource.matchAll(/^\s*"(docs\/[^"]+)",?$/gm)].map((m) => m[1]),
];

/** `Test-RepoPattern "<area>" "<path>" "<pattern>" "<name>"`. */
const assertedPatterns = () =>
  [...verifierSource.matchAll(/^Test-RepoPattern\s+"([^"]+)"\s+"([^"]+)"\s+"((?:[^"]|`")*)"\s+"([^"]+)"/gm)].map(
    (m) => ({ area: m[1], path: m[2], pattern: unescapePwsh(m[3]), name: m[4] }),
  );

describe("verify-production-readiness.ps1 asserts things that are true", () => {
  const files = assertedFiles();
  const patterns = assertedPatterns();

  it("parsed both kinds of assertion out of the script", () => {
    // Without this, a change to the script's call style would make every assertion below vacuous
    // and the suite would go green by seeing nothing at all.
    expect(files.length, "no Test-RepoFile paths parsed").toBeGreaterThan(30);
    expect(patterns.length, "no Test-RepoPattern assertions parsed").toBeGreaterThan(200);
  });

  it.each([...new Set(files)])("%s exists", (path) => {
    expect(existsSync(join(ROOT, path)), `${VERIFIER} asserts ${path} exists`).toBe(true);
  });

  it("every asserted pattern matches its file", () => {
    const failures: string[] = [];
    for (const { area, path, pattern, name } of patterns) {
      if (!existsSync(join(ROOT, path))) {
        failures.push(`[${area}] ${name}: ${path} does not exist`);
        continue;
      }
      let matched: boolean;
      try {
        matched = pwshMatches(pattern, readRepo(path));
      } catch (error) {
        // Not skipped. An unparseable pattern is a broken assertion, not an excused one.
        failures.push(`[${area}] ${name}: pattern is not a usable regex — ${String(error)}`);
        continue;
      }
      if (!matched) failures.push(`[${area}] ${name}\n      ${path} :: ${pattern}`);
    }
    expect(failures, "the Windows readiness job will exit 1 on these").toEqual([]);
  });

  it("keeps naming the migrations that created the renamed objects", () => {
    /*
     * The specific regression, pinned by name. `20260813160000_rename_zoot_schema_to_xoot.sql` is
     * the reason these older files must keep the old spelling: it renames the objects *forward*, so
     * a migration that created them under the new name would make the rename fail on a fresh
     * `supabase db reset` and on every Supabase preview branch.
     */
    const renameMigration = readRepo("supabase/migrations/20260813160000_rename_zoot_schema_to_xoot.sql");
    for (const [historical, current] of [
      ["zooter_payout_accounts", "xooter_payout_accounts"],
      ["zoot_concierge_feedback", "xoot_concierge_feedback"],
      ["zoot_black_area_pilots", "xoot_black_area_pilots"],
    ]) {
      expect(
        renameMigration,
        `${historical} must still be renamed forward, or the verifier should stop naming it`,
      ).toContain(`rename to ${current}`);
      expect(verifierSource, `the verifier must assert ${historical}, not ${current}`).toContain(
        `"${historical}"`,
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────────
// check-blocker-ledger.ps1
// ─────────────────────────────────────────────────────────────────────────────────

describe("check-blocker-ledger.ps1 covers the current production checklist", () => {
  const ledgerSource = readRepo("scripts/ops/check-blocker-ledger.ps1");
  const blocker = readRepo("docs/release/production-checklist.md").toLowerCase();
  const required = [...ledgerSource.matchAll(/id = "([^"]+)"[\s\S]*?patterns = @\(([^)]*)\)/g)].map((m) => ({
    id: m[1],
    patterns: [...m[2].matchAll(/"((?:[^"]|`")*)"/g)].map((p) => unescapePwsh(p[1])),
  }));

  it("parsed the required-blocker map", () => {
    expect(required.length, "no blockers parsed out of the ledger guard").toBeGreaterThan(10);
    expect(required.every((entry) => entry.patterns.length > 0)).toBe(true);
  });

  it.each(required.map((entry) => [entry.id, entry.patterns] as const))(
    "production checklist covers %s",
    (id, patterns) => {
      const missing = patterns.filter((pattern) => !blocker.includes(pattern.toLowerCase()));
      expect(missing, `production checklist is missing the coverage terms for ${id}`).toEqual([]);
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────────
// Edge Function environment variables
// ─────────────────────────────────────────────────────────────────────────────────

/** Injected by the Supabase runtime. Never set by hand, so never listed in the template. */
const PLATFORM_INJECTED = new Set([
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_DB_URL",
  "SB_SECRET_KEY",
]);

const functionSources = (dir: string, acc: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) functionSources(full, acc);
    else if (entry.endsWith(".ts")) acc.push(full);
  }
  return acc;
};

describe("every environment variable a function reads is documented", () => {
  const template = readRepo("supabase/functions/.env.example");
  const read = new Map<string, string>();
  for (const file of functionSources(join(ROOT, "supabase/functions"))) {
    for (const match of readFileSync(file, "utf8").matchAll(/Deno\.env\.get\(\s*"([A-Z0-9_]+)"/g)) {
      if (!read.has(match[1])) read.set(match[1], file.replace(`${ROOT}/`, ""));
    }
  }

  it("found the env reads and the template", () => {
    expect(read.size, "no Deno.env.get calls found — has the call style changed?").toBeGreaterThan(20);
    expect(template.length).toBeGreaterThan(0);
  });

  it.each([...read].filter(([name]) => !PLATFORM_INJECTED.has(name)))(
    "%s appears in .env.example",
    (name, file) => {
      /*
       * A declaration (`NAME=`) or a comment naming it both count. Some names are pure fallback
       * aliases — `create-masked-call` reads `TWILIO_API_KEY_SID ?? TWILIO_API_KEY` — and giving
       * those an empty `NAME=` line would tell a reader to set something they should not.
       * `twilio-secrets-contract.test.ts` already governs that surface and lists `TWILIO_API_KEY`
       * as fallback-backed; naming it in a comment is the form that agrees with both.
       *
       * The word boundary is load-bearing. A plain substring test passes `TWILIO_API_KEY` on the
       * strength of `TWILIO_API_KEY_SID` being present, which is exactly how this went unnoticed
       * when I first checked it by hand.
       */
      expect(
        new RegExp(`\\b${name}\\b`).test(template),
        `${file} reads ${name}, which supabase/functions/.env.example never mentions — ` +
          "anyone following the setup docs would leave it unset",
      ).toBe(true);
    },
  );

  it("declares no ZOOT_-prefixed name whose code moved to XOOT_", () => {
    // The half-rename, stated directly: the template must never offer a name the code stopped
    // reading. This is the assertion that would have caught the dead invoice generator.
    const stale = [...template.matchAll(/^(ZOOT_[A-Z0-9_]+)=/gm)].map((m) => m[1]);
    const shadowed = stale.filter((name) => read.has(name.replace(/^ZOOT_/, "XOOT_")));
    expect(shadowed, "the code reads the XOOT_ spelling of these; the template still offers ZOOT_").toEqual(
      [],
    );
  });
});
