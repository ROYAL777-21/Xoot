import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const promptFiles = [
  "docs/prompts/siri-ai-app-intents-ios27-master-prompt.md",
  "docs/prompts/ai-agent-architecture-master-prompt.md",
  "docs/prompts/company-wide-self-improvement-loops-master-prompt.md",
  "docs/prompts/company-wide-security-hardening-master-prompt.md",
  "docs/prompts/anti-hallucination-and-drift-master-prompt.md",
  "docs/prompts/canonical-main-and-migration-drift-master-prompt.md",
  "docs/prompts/company-wide-bug-review-and-patch-master-prompt.md",
  "docs/prompts/codex-interaction-qa-master-prompt.md",
] as const;

const sharedFiles = [
  "blocker.md",
  "docs/prompts/README.md",
  "docs/source-of-truth/README.md",
  "docs/source-of-truth/policy-template.md",
  "docs/source-of-truth/policy-registry.md",
] as const;

const read = (path: string) => readFileSync(join(repoRoot, path), "utf8");

const readSection = (document: string, heading: string) => {
  const marker = `## ${heading}`;
  const start = document.indexOf(marker);
  if (start < 0) return "";
  const remaining = document.slice(start + marker.length);
  const nextHeading = remaining.search(/\n## /);
  return nextHeading < 0 ? remaining.trim() : remaining.slice(0, nextHeading).trim();
};

describe("master AI operating programme prompt pack", () => {
  it("keeps every required prompt and policy contract in the repository", () => {
    for (const path of [...promptFiles, ...sharedFiles]) {
      expect(existsSync(join(repoRoot, path)), `${path} should exist`).toBe(true);
    }
  });

  it("makes every master prompt inspect first, fail closed, and report evidence", () => {
    for (const path of promptFiles) {
      const prompt = read(path);
      const inspection = readSection(prompt, "Inspect before editing");
      const stopConditions = readSection(prompt, "Stop conditions");
      const finalResponse = readSection(prompt, "Required final response");

      expect(inspection.length, `${path} should define inspection evidence`).toBeGreaterThan(80);
      expect(prompt).toContain("Do not deploy production");
      expect(stopConditions, `${path} should fail closed`).toMatch(/block|stop|disable|pause|prohibit/i);
      expect(stopConditions, `${path} should update unresolved blockers`).toContain("blocker.md");
      expect(finalResponse, `${path} should require an evidence report`).toContain("Report:");
      expect(finalResponse, `${path} should require prohibited-action confirmation`).toContain("Confirmation");
      expect(prompt).not.toMatch(/^Deploy production\.?$/m);
      expect(prompt).not.toMatch(/^Production deployment is authorized\.?$/m);
      expect(prompt).not.toMatch(/^Merge automatically\.?$/m);
      expect(prompt).not.toMatch(/\b(?:TBD|TODO|FIXME)\b/);
    }
  });

  it("pins the Siri prompt to safe Expo CNG and current public App Intents APIs", () => {
    const prompt = read(promptFiles[0]);
    expect(prompt).toContain("iOS 27");
    expect(prompt).toContain("installed public SDK");
    expect(prompt).toContain("supportedModes");
    expect(prompt).toContain("allowedExecutionTargets");
    expect(prompt).toContain("Expo CNG");
    expect(prompt).toContain("must not create or confirm a booking");
    expect(prompt).toContain("Safe route enum");
    expect(prompt).toContain("Free-form suburb, address, or place text is not permitted");
    expect(prompt).toContain("SDK-backed Swift/Xcode compilation in macOS CI is mandatory");
    expect(prompt).toContain("Discovery controls are best effort");
    expect(prompt).toContain("Never forward raw phrase text");
    expect(prompt).toContain("reject and discard that location value");
    expect(prompt).toContain("eas-cli@20.5.0 build --platform ios");
    expect(prompt).toContain("physical iPhone");
  });

  it("defines one Codex harness, seven specialists, and bounded AI spend", () => {
    const prompt = read(promptFiles[1]);
    expect(prompt).toContain("Codex Executive Harness");
    expect(prompt).toContain("exactly seven specialist agents");
    expect(prompt).toContain("Evidence and Control Plane is not an agent");
    expect(prompt).toContain("maximum_input_tokens");
    expect(prompt).toContain("daily_cost_ceiling");
    expect(prompt).toContain("No agent may increase its own budget");
    expect(prompt).toContain("cost_per_run_ceiling");
    expect(prompt).toContain("Schema, migration-history, Auth configuration");
    expect(prompt).toContain("Any change to an agent or skill prompt");
    expect(prompt).toContain("| Concierge | Customer Continuity and Service Recovery Agent |");
    expect(prompt).toContain("outcome: accepted | declined_with_reason");
  });

  it("requires measured autonomy, grounding, demotion, and human authority", () => {
    const loops = read(promptFiles[2]);
    const assurance = read(promptFiles[4]);
    expect(loops).toContain("founder-intervention review");
    expect(loops).toContain("autonomy promotion");
    expect(loops).toContain("rollback");
    expect(loops).toContain("idempotency_key_schema");
    expect(loops).toContain("maximum_runtime_seconds");
    expect(loops).toContain("privacy_impact");
    expect(loops).toContain("minimum_sample_size");
    expect(loops).toContain("observation_window");
    expect(loops).toContain("Every loop follows one privacy contract");
    expect(loops).toContain("produces `Investigate` with no operational action");
    expect(assurance).toContain("return unknown");
    expect(assurance).toContain("source version");
    expect(assurance).toContain("source_version");
    expect(assurance).toContain("automatic demotion");
    expect(assurance).toContain("may not rewrite their own active prompts");
    expect(assurance).toContain("`answer`");
    expect(assurance).toContain("`action_request`");
  });

  it("pins security and migration safety to explicit verification gates", () => {
    const security = read(promptFiles[3]);
    const sourceControl = read(promptFiles[5]);
    expect(security).toContain("OWASP ASVS v5.0.0");
    expect(security).toContain("MASVS 2.1");
    expect(security).toContain("manual penetration test");
    expect(security).toContain("short-lived, single-use password-recovery token");
    expect(sourceControl).toContain("main is the only long-lived branch");
    expect(sourceControl).toContain("Supabase MCP remains read-only");
    expect(sourceControl).toContain("Do not use broad `supabase db push`");
    expect(sourceControl).toContain("RequireRemoteEvidence");
    expect(sourceControl).toContain("Ordinary pull-request CI runs offline drift guards");
    expect(sourceControl).toContain("Configure and verify an enforced ruleset");
  });

  it("requires severity-led repair and real interaction evidence", () => {
    const bugs = read(promptFiles[6]);
    const qa = read(promptFiles[7]);
    expect(bugs).toContain("SEV-1");
    expect(bugs).toMatch(/regression (?:test|cases)/i);
    expect(bugs).toContain("root cause");
    expect(bugs).toContain("Emergency containment exception");
    expect(qa).toContain("Playwright");
    expect(qa).toContain("Android device or emulator");
    expect(qa).toContain("physical iPhone");
    expect(qa).toContain("accessibility tree");
    expect(qa).toContain("Approved synthetic or explicitly classified staging sensitive-data fixtures");
  });

  it("defines the repository authority hierarchy and conflict behavior", () => {
    const sourceTruth = read("docs/source-of-truth/README.md");
    const registry = read("docs/source-of-truth/policy-registry.md");
    expect(sourceTruth).toContain("Policy truth");
    expect(sourceTruth).toContain("Operational truth");
    expect(sourceTruth).toContain("Provider truth");
    expect(sourceTruth).toContain("status: approved");
    expect(sourceTruth).toMatch(/stop the affected workflow/i);
    expect(sourceTruth).toContain("must be protected by enforced review and CI rules");
    expect(sourceTruth).toContain("dependent_feature_flags");
    expect(sourceTruth).toContain("kill_switches");
    expect(registry).toContain("ai-governance-policy");
    expect(registry).toContain("tool-authority-policy");

    const template = read("docs/source-of-truth/policy-template.md");
    expect(template).toContain("dependent_feature_flags: []");
    expect(template).toContain("kill_switches: []");
  });

  it("distinguishes governance, administrative, runtime, and read-only missions", () => {
    const index = read("docs/prompts/README.md");
    expect(index).toContain("GitHub ruleset/branch-governance configuration");
    expect(index).toContain("declared read-only inspection");
    expect(index).toContain("administrative/database writes");
    expect(index).toContain("Runtime product writes");
    expect(index).toContain("production-read-only");
    expect(index).toContain("production_write_authorized: false");
  });
});
