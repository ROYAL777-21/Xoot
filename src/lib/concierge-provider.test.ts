import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The Concierge's provider wiring — OpenRouter primary, OpenAI fallback (founder, 2026-08-13).
 *
 * Two failure modes worth a test, and neither announces itself at runtime.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const SUPPORT_RESPOND = "supabase/functions/support-respond/index.ts";
const REPORT_ANSWER = "supabase/functions/report-concierge-answer/index.ts";
const MIGRATION = "supabase/migrations/20260813100000_concierge_openrouter_source.sql";

describe("concierge provider", () => {
  /**
   * One enum, four copies.
   *
   * `source` is declared in the CHECK constraint, in `report-concierge-answer`'s `allowedSources`,
   * and in two client type unions. Nothing joins them, and the failure is quiet by design:
   *
   *     const source = allowedSources.has(body.source) ? body.source : "unknown";
   *
   * An unlisted provider is not rejected — it is silently recorded as `unknown`. So a user reports
   * a bad OpenRouter answer, the report saves, and the one field that would have told you *which
   * model produced it* is blank. After changing providers, "are the new model's answers reported
   * more often?" is the question you most want to ask, and it is exactly the question that data
   * cannot answer.
   */
  it("agrees on the source values in all four places", () => {
    const emitted = ["knowledge_base", "openrouter", "openai_responses", "human_escalation"];

    /*
     * The CHECK block only — NOT the whole migration file.
     *
     * The first version of this test read the whole file, and it passed against a migration with
     * `'openrouter'` deleted from the constraint: the `comment on column` below it writes the
     * value with SQL-escaped quotes (`''openrouter''`), which contains `'openrouter'`. So the
     * assertion was matching prose about the constraint instead of the constraint. Found by
     * planting the deletion and watching the test stay green — which is the entire reason this
     * repo plants defects rather than trusting a passing run.
     */
    const migration = read(MIGRATION);
    const checkBlock = /check \(source in \(([\s\S]*?)\)\)/.exec(migration)?.[1];
    expect(checkBlock, "migration no longer declares a source CHECK constraint").toBeTruthy();

    const allowed = read(REPORT_ANSWER);
    const bot = read("src/components/xoot/XootSupportBot.tsx");
    const support = read("src/pages/app/Support.tsx");

    for (const source of emitted) {
      expect(checkBlock!, `${source} missing from the CHECK constraint`).toContain(`'${source}'`);
      expect(allowed, `${source} missing from allowedSources`).toContain(`"${source}"`);
    }

    // The client unions are display-only and narrower on purpose — `Support.tsx` never renders a
    // knowledge-base answer — so assert the provider values rather than the whole set.
    for (const source of ["openrouter", "openai_responses"]) {
      expect(bot, `${source} missing from XootSupportBot`).toContain(`"${source}"`);
      expect(support, `${source} missing from Support.tsx`).toContain(`"${source}"`);
    }
  });

  /**
   * OpenRouter is chat-completions. OpenAI's Responses API is not.
   *
   * Both live in one file now and read almost identically at a glance, which is how a `max_tokens`
   * becomes a `max_output_tokens` in a hurry. The consequence of getting it wrong is not an error
   * anyone sees: the call 400s, the builder returns null, the request falls through to OpenAI or
   * to the canned knowledge answer, and the Concierge simply stops using the model it was moved to.
   */
  it("sends OpenRouter a chat-completions body, not a Responses body", () => {
    const src = read(SUPPORT_RESPOND);
    const openRouter = src.slice(
      src.indexOf("buildOpenRouterSupportResponse"),
      src.indexOf("buildOpenAiSupportResponse = async"),
    );

    expect(openRouter).toContain("https://openrouter.ai/api/v1/chat/completions");
    expect(openRouter).toMatch(/max_tokens:/);
    expect(openRouter).toMatch(/role: "system"/);
    expect(openRouter).toMatch(/role: "user"/);
    expect(openRouter).toMatch(/choices\?\.\[0\]\?\.message\?\.content/);

    // The Responses-API vocabulary must not appear on this path.
    expect(openRouter).not.toMatch(/max_output_tokens/);
    expect(openRouter).not.toMatch(/instructions:/);
    expect(openRouter).not.toMatch(/input_text/);
  });

  it("tries OpenRouter before OpenAI", () => {
    const src = read(SUPPORT_RESPOND);
    const chain = /buildOpenRouterSupportResponse\(modelInput\)\)\s*\?\?\s*\(await buildOpenAiSupportResponse\(modelInput\)/;
    expect(src, "OpenRouter must be attempted first").toMatch(chain);
  });

  /**
   * The customer's message reaches a third party, so redaction is not optional on the new path.
   *
   * `buildConciergeUserTurn` applies `redactSupportText` once for both providers, deliberately —
   * a second provider added with the redaction left off is how a pasted gate code ends up in
   * someone else's logs. The key must not be logged either.
   */
  it("redacts before sending, and never logs the key", () => {
    const src = read(SUPPORT_RESPOND);

    const turn = src.slice(src.indexOf("const buildConciergeUserTurn"), src.indexOf("OpenRouter — the primary"));
    expect(turn).toMatch(/redactSupportText\(subject\)/);
    expect(turn).toMatch(/redactSupportText\(body\)/);

    // No log line may interpolate the key or the raw message.
    for (const line of src.split("\n").filter((l) => l.includes("console."))) {
      expect(line, `log line leaks a secret: ${line.trim()}`).not.toMatch(/apiKey|OPENROUTER_API_KEY|safeBody/);
    }
  });

  /** A missing key must degrade, never throw — the request still has to return an answer. */
  it("falls through rather than failing when the key is absent", () => {
    const src = read(SUPPORT_RESPOND);
    const openRouter = src.slice(
      src.indexOf("buildOpenRouterSupportResponse"),
      src.indexOf("buildOpenAiSupportResponse = async"),
    );
    expect(openRouter).toMatch(/Deno\.env\.get\("OPENROUTER_API_KEY"\)/);
    expect(openRouter).toMatch(/if \(!apiKey\) return null;/);
  });
});
