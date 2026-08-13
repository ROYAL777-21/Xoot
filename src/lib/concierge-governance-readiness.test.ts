import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const readRepoFile = (path: string) => readFileSync(join(repoRoot, path), "utf8");

const parseFrontmatter = (content: string) => {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  expect(match, "knowledge file must include frontmatter").not.toBeNull();
  return Object.fromEntries(
    match![1]
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(":");
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
};

const requiredConciergeDocs = [
  "README.md",
  "concierge-product-scope.md",
  "concierge-supported-intents.md",
  "concierge-unsupported-intents.md",
  "concierge-escalation-matrix.md",
  "concierge-tone-and-response-style.md",
  "concierge-data-boundaries.md",
  "concierge-tool-registry.md",
  "concierge-fallback-policy.md",
  "concierge-human-handoff-policy.md",
  "concierge-quality-evaluation.md",
  "concierge-abuse-and-moderation-policy.md",
  "concierge-analytics-and-privacy.md",
  "concierge-release-gate.md",
  "concierge-knowledge-change-policy.md",
  "concierge-test-catalogue.md",
];

const requiredKnowledgeFiles = [
  "xoot-overview.md",
  "service-catalogue.md",
  "booking-guide.md",
  "service-area-guide.md",
  "customer-preparation-guide.md",
  "booking-status-guide.md",
  "cancellation-and-rescheduling-guide.md",
  "payment-and-invoice-guide.md",
  "care-plus-guide.md",
  "xootcred-and-referrals-guide.md",
  "booking-cover-guide.md",
  "xooter-support-guide.md",
  "customer-service-recovery-guide.md",
  "account-and-security-guide.md",
  "property-manager-partnership-guide.md",
  "xoot-black-guide.md",
  "privacy-and-data-guide.md",
  "safety-and-urgent-support-guide.md",
];

const requiredFrontmatterKeys = [
  "title",
  "knowledge_id",
  "version",
  "status",
  "owner",
  "approved_by",
  "effective_from",
  "last_reviewed_at",
  "review_due_at",
  "source_of_truth_reference",
];

describe("Concierge production-readiness governance", () => {
  it("contains the required governance docs and operational loops", () => {
    const docs = new Set(readdirSync(join(repoRoot, "docs/concierge")));
    for (const doc of requiredConciergeDocs) expect(docs.has(doc), doc).toBe(true);

    const loops = new Set(readdirSync(join(repoRoot, "docs/concierge/loops")));
    expect(loops).toEqual(
      new Set([
        "daily-concierge-health-loop.md",
        "weekly-concierge-quality-loop.md",
        "weekly-knowledge-gap-loop.md",
        "weekly-escalation-quality-loop.md",
        "monthly-concierge-scope-review.md",
        "incident-to-concierge-control-loop.md",
      ]),
    );
  });

  it("requires frontmatter and approval status on every Concierge knowledge file", () => {
    const files = new Set(readdirSync(join(repoRoot, "docs/concierge/knowledge")));
    for (const file of requiredKnowledgeFiles) expect(files.has(file), file).toBe(true);

    for (const file of requiredKnowledgeFiles) {
      const frontmatter = parseFrontmatter(readRepoFile(`docs/concierge/knowledge/${file}`));
      for (const key of requiredFrontmatterKeys) expect(frontmatter[key], `${file}:${key}`).toBeTruthy();
      expect(["approved", "draft", "deprecated"]).toContain(frontmatter.status);
    }
  });

  it("keeps unresolved commercial policy out of approved Concierge knowledge", () => {
    const carePlusPolicy = parseFrontmatter(readRepoFile("docs/agents/source-of-truth/care-plus-policy.md"));
    const carePlusGuide = parseFrontmatter(readRepoFile("docs/concierge/knowledge/care-plus-guide.md"));
    const bookingCoverGuide = parseFrontmatter(readRepoFile("docs/concierge/knowledge/booking-cover-guide.md"));
    const xootBlackGuide = parseFrontmatter(readRepoFile("docs/concierge/knowledge/xoot-black-guide.md"));

    expect(carePlusPolicy.status).toBe("draft");
    expect(carePlusGuide.status).toBe("draft");
    expect(bookingCoverGuide.status).toBe("draft");
    expect(xootBlackGuide.status).toBe("draft");

    const edgeKnowledge = readRepoFile("supabase/functions/_shared/xoot-knowledge.ts");
    const webFallback = readRepoFile("src/lib/xoot-concierge-fallback.ts");
    const mobileFallback = readRepoFile("mobile/src/lib/xoot-concierge-fallback.ts");
    expect(`${edgeKnowledge}\n${webFallback}\n${mobileFallback}`).not.toContain("R99/month");
    expect(`${edgeKnowledge}\n${webFallback}\n${mobileFallback}`).toContain("Care+ details need the approved Care+ policy");
  });

  it("registers Concierge feature flags and kill switches without activating sensitive tools", () => {
    /*
     * Two migrations, because two of these controls were renamed after registration.
     *
     * The governance migration registered `concierge.zootcred_support` and
     * `concierge.zooter_support`; the 2026-08-13 Zoot→Xoot rename gave them their current names.
     * Both files are read so the assertion checks the control exists under the name code uses
     * TODAY — dropping the two renamed controls from this list would have made it green while
     * quietly no longer checking them at all.
     */
    const migration = [
      "supabase/migrations/20260703150828_concierge_governance_controls.sql",
      "supabase/migrations/20260813160000_rename_zoot_schema_to_xoot.sql",
    ].map(readRepoFile).join("\n");

    for (const control of [
      "concierge.xootcred_support",
      "concierge.xooter_support",
      "concierge.enabled",
      "concierge.web.enabled",
      "concierge.mobile.enabled",
      "concierge.authenticated_account_support",
      "concierge.booking_status",
      "concierge.care_plus_support",
      "concierge.referral_support",
      "concierge.booking_cover_support",
      "concierge.support_case_creation",
      "concierge.partnership_interest",
      "concierge.human_handoff",
      "concierge.model_answers",
      "concierge.safe_static_fallback",
      "concierge.kill.global",
      "concierge.kill.model_answers",
      "concierge.kill.support_handoff",
      "concierge.kill.booking_status",
    ]) {
      expect(migration).toContain(control);
    }

    expect(migration).toMatch(/'concierge\.model_answers',\s*'feature_flag',\s*'all',\s*false/);
    expect(migration).toMatch(/'concierge\.support_case_creation',\s*'feature_flag',\s*'all',\s*false/);
    expect(migration).toContain("safe_human_handoff");
    expect(migration).toContain("send_unrestricted_provider_message");
  });

  it("documents prohibited tool actions for the Concierge", () => {
    const registry = readRepoFile("docs/concierge/concierge-tool-registry.md");

    for (const prohibited of [
      "create_booking",
      "cancel_booking",
      "reschedule_booking",
      "assign_xooter",
      "confirm_payment",
      "issue_refund",
      "issue_xootcred",
      "change_care_plus",
      "activate_booking_cover",
      "approve_claim",
      "send_unrestricted_whatsapp",
    ]) {
      expect(registry).toContain(prohibited);
    }
  });
});
