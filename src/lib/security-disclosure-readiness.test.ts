import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const readRepoFile = (path: string) => readFileSync(join(repoRoot, path), "utf8");

describe("Vulnerability disclosure readiness", () => {
  it("publishes one controlled route and footer entry", () => {
    const app = readRepoFile("src/App.tsx");
    const footer = readRepoFile("src/components/zoot/Footer.tsx");
    const page = readRepoFile("src/pages/security/VulnerabilityDisclosure.tsx");

    expect(app).toContain('/security/vulnerability-disclosure');
    expect(footer).toContain('Report a vulnerability');
    expect(page).toContain('Zoot Vulnerability Disclosure Programme');
    expect(page).toContain('responsible disclosure programme, not a paid bug bounty');
    expect(page).toContain('VITE_SECURITY_DISCLOSURE_INTAKE_ENABLED');
    expect(page).toContain('VITE_CLOUDFLARE_TURNSTILE_SITE_KEY');
  });

  it("keeps reports behind an Edge Function and service-role-only tables", () => {
    const page = readRepoFile("src/pages/security/VulnerabilityDisclosure.tsx");
    const migration = readRepoFile("supabase/migrations/20260710224500_security_disclosure_intake.sql");
    const config = readRepoFile("supabase/config.toml");

    expect(page).toContain('supabase.functions.invoke("submit-security-report"');
    expect(page).not.toMatch(/\.from\(["']security_disclosure_reports["']\)/);
    expect(migration).toContain('alter table public.security_disclosure_reports enable row level security');
    expect(migration).toContain('revoke all on public.security_disclosure_reports from anon, authenticated');
    expect(migration).toContain('revoke all on public.security_disclosure_events from anon, authenticated');
    expect(migration).not.toMatch(/grant\s+(select|insert|update|delete)[^;]+security_disclosure_(reports|events)\s+to\s+(anon|authenticated)/i);
    expect(config).toMatch(/\[functions\.submit-security-report\]\s+verify_jwt = false/);
  });

  it("fails closed behind controls, Turnstile, hashed limits, validation, and redaction", () => {
    const fn = readRepoFile("supabase/functions/submit-security-report/index.ts");
    const migration = readRepoFile("supabase/migrations/20260710224500_security_disclosure_intake.sql");

    expect(fn).toContain('security.disclosure_intake');
    expect(fn).toContain('security.kill.disclosure_intake');
    expect(fn).toContain('security.disclosure_turnstile_required');
    expect(fn).toContain('consumeRateLimit');
    expect(fn).toContain('verifyTurnstile');
    expect(fn).toContain('rateLimit.actorHash');
    expect(fn).toContain('redactSensitiveText');
    expect(fn).not.toContain('ip_address');
    expect(migration).toMatch(/'security\.disclosure_intake',[\s\S]*?false/);
    expect(migration).toMatch(/'security\.disclosure_turnstile_required',[\s\S]*?true/);
    expect(migration).toMatch(/'security\.kill\.disclosure_intake',[\s\S]*?false/);
  });

  it("keeps security reports out of analytics and ordinary provider messaging", () => {
    const page = readRepoFile("src/pages/security/VulnerabilityDisclosure.tsx");
    const fn = readRepoFile("supabase/functions/submit-security-report/index.ts");
    const runbook = readRepoFile("docs/operations/vulnerability-disclosure-triage-runbook.md");

    expect(page).not.toContain('captureAnalyticsEvent');
    expect(fn).not.toContain('insertNotification');
    expect(fn).not.toContain('insertOutbox');
    expect(fn).not.toContain('admin_review_queue');
    expect(fn).not.toMatch(/api\.(twilio|brevo)\.com/);
    expect(runbook).toContain('Do not copy report bodies into ordinary support');
  });
});

