import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const adminOps = readFileSync(join(repoRoot, "src/pages/admin/Ops.tsx"), "utf8");
const adminActions = readFileSync(join(repoRoot, "src/lib/admin-actions.ts"), "utf8");
const adminMarkOutbox = readFileSync(join(repoRoot, "supabase/functions/admin-mark-outbox/index.ts"), "utf8");

describe("admin ops production-readiness controls", () => {
  it("keeps the ops dashboard MFA-gated", () => {
    expect(adminOps).toContain("getAuthenticatorAssuranceLevel");
    expect(adminOps).toContain('currentLevel !== "aal2"');
    expect(adminOps).toContain("Admin MFA verification is required");
  });

  it("surfaces outbox retries, dead letters, and agent decisions", () => {
    expect(adminOps).toContain("Outbox retries and dead letters");
    expect(adminOps).toContain("Agent decisions");
    expect(adminOps).toContain("outboxDeadLetters");
    expect(adminOps).toContain("agentDecisionRows");
  });

  it("does not mutate integration outbox directly from the browser", () => {
    expect(adminOps).not.toMatch(/from\("integration_outbox"\)\s*\.\s*(insert|update|delete|upsert)/);
    expect(adminOps).toContain("markOutboxProcessed(row.id, reason)");
  });

  it("requires an audit reason for outbox completion at the type boundary and Edge Function", () => {
    expect(adminActions).toContain("markOutboxProcessed(outboxId: string, reason: string)");
    expect(adminMarkOutbox).toContain("requireAdminReason(body.reason");
    expect(adminMarkOutbox).toContain("writeStrictAdminAuditLog");
  });

  it("prevents replaying already failed or terminal outbox rows from the generic completion action", () => {
    expect(adminMarkOutbox).toContain('["queued", "needs_approval", "processing"].includes(outbox.status)');
    expect(adminMarkOutbox).toContain("only queued, approval, or processing outbox events can be marked completed");
  });
});
