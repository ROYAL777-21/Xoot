import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const readRepoFile = (path: string) => readFileSync(join(repoRoot, path), "utf8");

describe("Concierge structured handoff readiness", () => {
  it("stores handoff context as an RLS-protected support-ticket extension", () => {
    const migration = readRepoFile("supabase/migrations/20260703153056_concierge_structured_handoff.sql");

    expect(migration).toContain("create table if not exists public.support_handoff_contexts");
    expect(migration).toContain("ticket_id uuid not null references public.support_tickets");
    expect(migration).toContain("alter table public.support_handoff_contexts enable row level security");
    expect(migration).toContain("revoke all on public.support_handoff_contexts from anon, authenticated");
    expect(migration).toContain("grant select on public.support_handoff_contexts to authenticated");
    expect(migration).toContain("support_handoff_contexts_owner_or_admin_read");
    expect(migration).toContain("private.has_role((select auth.uid()), 'admin'::public.app_role)");
    expect(migration).not.toMatch(/grant\s+(insert|update|delete)[^;]+support_handoff_contexts\s+to\s+authenticated/i);
  });

  it("documents and enforces sensitive data exclusions at the schema boundary", () => {
    const migration = readRepoFile("supabase/migrations/20260703153056_concierge_structured_handoff.sql");

    for (const prohibited of [
      "gate codes",
      "alarm codes",
      "lockbox codes",
      "raw payment data",
      "OTPs",
      "private household access notes",
      "fraud data",
      "provider payloads",
    ]) {
      expect(migration).toContain(prohibited);
    }

    expect(migration).toContain("safe_context jsonb not null default '{}'::jsonb");
    expect(migration).toContain("support_handoff_contexts_safe_context_is_object");
  });

  it("gates the Edge Function behind auth, rate limits, feature flags and kill switches", () => {
    const fn = readRepoFile("supabase/functions/create-concierge-handoff/index.ts");
    const config = readRepoFile("supabase/config.toml");

    expect(config).toContain("[functions.create-concierge-handoff]");
    expect(config).toMatch(/\[functions\.create-concierge-handoff\]\s+verify_jwt = true/);
    expect(fn).toContain("requireAuth(req, origin)");
    expect(fn).toContain("consumeRateLimit");
    expect(fn).toContain("concierge.enabled");
    expect(fn).toContain("concierge.support_case_creation");
    expect(fn).toContain("concierge.human_handoff");
    expect(fn).toContain("concierge.handoff.case_creation_tool");
    expect(fn).toContain("concierge.kill.global");
    expect(fn).toContain("concierge.kill.support_handoff");
    expect(fn).toContain("fallback_route: \"/app/support\"");
  });

  it("does not trust client supplied role, booking access or urgency", () => {
    const fn = readRepoFile("supabase/functions/create-concierge-handoff/index.ts");

    expect(fn).toContain("resolveRoleType");
    expect(fn).toContain("isAdminUser");
    expect(fn).toContain(".from(\"xooters\")");
    expect(fn).toContain("inferUrgencyLevel");
    expect(fn).toContain("priorityFromUrgency");
    expect(fn).toContain("assertBookingParticipant");
    expect(fn).toContain("booking access denied");
    expect(fn).not.toContain("body.urgency_level");
    expect(fn).not.toContain("body.priority");
    expect(fn).not.toContain("body.role_type");
  });

  it("redacts sensitive text and only queues internal support workflow records", () => {
    const fn = readRepoFile("supabase/functions/create-concierge-handoff/index.ts");

    expect(fn).toContain("redactSensitiveText");
    expect(fn).toContain("sensitivePatterns");
    expect(fn).toContain("support_handoff_contexts");
    expect(fn).toContain("support_tickets");
    expect(fn).toContain("support_followups");
    expect(fn).toContain("insertReviewQueue");
    expect(fn).toContain("insertNotification");
    expect(fn).toContain("insertOutbox");
    expect(fn).toContain("writeAuditLog");
    expect(fn).toContain("channel: \"in_app\"");

    for (const forbidden of [
      "twilio.messages.create",
      "sendEmail",
      "fetch(\"https://api.twilio.com",
      "fetch(\"https://api.brevo.com",
      "issue_refund",
      "createRefund",
      "refundPayment",
      "confirm_payment",
      "assign_xooter",
      "issue_xootcred",
      "change_care_plus",
    ]) {
      expect(fn).not.toContain(forbidden);
    }
  });
});
