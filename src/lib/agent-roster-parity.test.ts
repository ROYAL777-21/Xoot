import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The orchestration doc must match the frontmatter it describes.
 *
 * ⚠️ **This is the check `agent-orchestration.md` §8 proposes, built rather than left as a
 * convention.** The reason it is worth building: `company-social.md`'s `description` says
 * "X, Instagram, YouTube" and omits TikTok, while its body makes TikTok the primary engine — and
 * that error was copied into `xoot-growth/SKILL.md` too. **Three files, one error, and prose review
 * missed it three times.**
 *
 * The frontmatter is executable and the doc is prose, so on any disagreement the frontmatter wins
 * and the doc is the bug. This test enforces that direction.
 */
const AGENTS_DIR = join(process.cwd(), ".claude/agents");
const DOC = readFileSync(join(process.cwd(), "docs/marketing/agent-orchestration.md"), "utf8");

type Agent = { name: string; model: string; tools: string[] };

const agents: Agent[] = readdirSync(AGENTS_DIR)
  .filter((f) => f.endsWith(".md"))
  .map((f) => {
    const front = readFileSync(join(AGENTS_DIR, f), "utf8").split("---")[1] ?? "";
    const field = (key: string) =>
      front.split("\n").find((l) => l.startsWith(`${key}:`))?.slice(key.length + 1).trim() ?? "";
    return {
      name: field("name"),
      model: field("model"),
      tools: field("tools").split(",").map((t) => t.trim()).filter(Boolean),
    };
  });

describe("agent-orchestration.md matches .claude/agents frontmatter", () => {
  it("found the roster", () => {
    expect(agents.length).toBe(8);
    for (const a of agents) expect(a.name, "an agent has no name in frontmatter").toBeTruthy();
  });

  it("names every agent", () => {
    for (const a of agents) expect(DOC, `${a.name} missing from the doc`).toMatch(a.name);
  });

  it("records each agent's real model", () => {
    // The doc's §1 table row for an agent must carry its actual model. community-responder being
    // sonnet on the most irreversible surface is a stated finding — if it silently becomes opus,
    // or another agent becomes sonnet, the finding is wrong and the doc must be re-reasoned.
    for (const a of agents) {
      const row = DOC.split("\n").find((l) => l.includes(`\`${a.name}\``) && l.startsWith("|"));
      expect(row, `no §1 table row for ${a.name}`).toBeTruthy();
      expect(row!.toLowerCase(), `${a.name} row does not state model ${a.model}`).toMatch(a.model);
    }
  });

  it("gets the dispatcher right: exactly one agent holds the Agent tool", () => {
    // The doc claims the graph is star-shaped and one level deep. That claim is only true while
    // exactly one agent can dispatch. Granting Agent to a second one silently makes the topology
    // section wrong.
    const dispatchers = agents.filter((a) => a.tools.includes("Agent")).map((a) => a.name);
    expect(dispatchers).toEqual(["growth-orchestrator"]);
    expect(DOC).toMatch(/the only one/);
  });

  it("gets the web-reach finding right: exactly four agents have no web tool", () => {
    // "Four of the eight have no web tool at all" is a counted claim in §1. If a WebFetch is
    // granted to company-social later, the sentence becomes false and nothing else would notice.
    const noWeb = agents
      .filter((a) => !a.tools.includes("WebFetch") && !a.tools.includes("WebSearch"))
      .map((a) => a.name)
      .sort();
    expect(noWeb).toEqual(
      ["community-responder", "company-social", "creative-director", "retention-analyst"].sort(),
    );
    expect(DOC).toMatch(/Four of the eight have no web tool/);
  });

  it("still records that community-responder cannot reach the app stores", () => {
    // The tool gap is the ONLY thing making a sonnet agent safe on a public, permanent surface.
    // If the Expo tools are ever granted, this fails and forces the model decision to be revisited.
    const responder = agents.find((a) => a.name === "community-responder")!;
    for (const tool of responder.tools) expect(tool).not.toMatch(/Expo|review/i);
    expect(DOC).toMatch(/never add the reply tools without changing the model/i);
  });
});
