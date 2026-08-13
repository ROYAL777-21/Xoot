import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const readRepoFile = (path: string) => readFileSync(join(repoRoot, path), "utf8");

describe("Concierge client reporting readiness", () => {
  it("redacts web Concierge answer reports before invoking the feedback function", () => {
    const bot = readRepoFile("src/components/xoot/XootSupportBot.tsx");

    expect(bot).toContain("redactConciergeClientText");
    expect(bot).toContain('supabase.functions.invoke("report-concierge-answer"');
    expect(bot).toContain("answer_excerpt: redactConciergeClientText(lastAssistant.body, 900)");
    expect(bot).toContain("conversation_context: redactConciergeClientText(recentContext, 900)");
    expect(bot).not.toContain("answer_excerpt: lastAssistant.body");
    expect(bot).not.toContain("`${message.role}: ${message.body}`");
  });

  it("keeps mobile Concierge reports and CTAs inside the same privacy boundary", () => {
    const mobile = readRepoFile("mobile/src/app/concierge.tsx");
    const fallback = readRepoFile("mobile/src/lib/xoot-concierge-fallback.ts");

    expect(mobile).toContain("redactConciergeClientText");
    expect(mobile).toContain("'report-concierge-answer'");
    expect(mobile).toContain("answer_excerpt: redactConciergeClientText(assistantMessage.body, 900)");
    expect(mobile).toContain("conversation_context: redactConciergeClientText(recentContext, 900)");
    expect(mobile).toContain("Report answer");
    expect(mobile).toContain("openCta");

    expect(fallback).toContain("cta?:");
    expect(fallback).toContain("protectedCta");
    expect(fallback).toContain('to: signedIn ? to : "/account"');
  });
});
