# Vendored skills — provenance

These skills are **copied in**, not submoduled. This file records exactly where each came
from so a re-sync is deterministic instead of guesswork. Installed 2026-07-29 per §9 of
`docs/xoot-master-brief.md`.

Most sources are packs containing many more skills than we installed. Only the folders
listed below were copied — installing whole packs adds noise that degrades skill selection.

| Installed as | Source repo | Path in source | Source commit |
|---|---|---|---|
| `impeccable` | pbakaus/impeccable | `.claude/skills/impeccable/` | `adf7d70` |
| `huashu-design` | alchaincyf/huashu-design | `SKILL.md` (root) | `1572d43` |
| `humanizer` | blader/humanizer | `SKILL.md` (root) | `523374d` |
| `resolve-agent-reviews` | pbakaus/agent-reviews | `skills/resolve-agent-reviews/` | `ee827ae` |
| `resolve-reviews` | pbakaus/agent-reviews | `skills/resolve-reviews/` | `ee827ae` |
| `marketing-onboarding` | coreyhaines31/marketingskills | `skills/onboarding/` | `7868cb9` |
| `marketing-paywalls` | coreyhaines31/marketingskills | `skills/paywalls/` | `7868cb9` |
| `marketing-pricing` | coreyhaines31/marketingskills | `skills/pricing/` | `7868cb9` |
| `marketing-cro` | coreyhaines31/marketingskills | `skills/cro/` | `7868cb9` |
| `marketing-copywriting` | coreyhaines31/marketingskills | `skills/copywriting/` | `7868cb9` |
| `marketing-ab-testing` | coreyhaines31/marketingskills | `skills/ab-testing/` | `7868cb9` |
| `test-driven-development` | obra/superpowers | `skills/test-driven-development/` | `44c9b2d` |
| `verification-before-completion` | obra/superpowers | `skills/verification-before-completion/` | `44c9b2d` |
| `systematic-debugging` | obra/superpowers | `skills/systematic-debugging/` | `44c9b2d` |
| `writing-plans` | obra/superpowers | `skills/writing-plans/` | `44c9b2d` |
| `mem-search` | thedotmack/claude-mem | `plugin/skills/mem-search/` | `132b463` |
| `learn-codebase` | thedotmack/claude-mem | `plugin/skills/learn-codebase/` | `132b463` |
| `seo-technical` | AgriciDaniel/claude-seo | `skills/seo-technical/` | `09d37c7` |
| `seo-audit` | AgriciDaniel/claude-seo | `skills/seo-audit/` | `09d37c7` |
| `seo-schema` | AgriciDaniel/claude-seo | `skills/seo-schema/` | `09d37c7` |
| `brandkit` | Leonxlnx/taste-skill | `skills/brandkit/` | `e988add` |

The `marketing-*` prefix is a local rename. Upstream names (`onboarding`, `pricing`, `cro`…)
are generic enough to collide with project skills and to mis-trigger on unrelated prompts.

## Local modifications

The six `marketing-*` skills are the only vendored files edited on copy: their frontmatter
`name:` was changed to match the new folder (`cro` → `marketing-cro`, etc.) so the folder and
the declared name agree. Nothing else in any skill was touched.

Their description text still cross-references upstream names ("For pricing decisions, see
pricing"). Those now point at the `marketing-`-prefixed skills. Cosmetic, left as-is to keep
the diff against upstream minimal.

## Caveats worth knowing

- **`huashu-design` is written in Chinese**, including its trigger description. It will not
  reliably auto-trigger from English prompts — invoke it explicitly by name. Its substantive
  rule (always ship 3 real directions before picking one) is restated in the master brief so
  it applies whether or not the skill fires.
- **`mem-search`** queries a claude-mem database that does not exist in this project yet. It
  will return nothing until claude-mem is actually initialised. Installed, not yet useful.
- **`seo-*`** are for the website session only (Phase 4's web half, and later SEO work).
  Deliberately excluded: `extensions/ahrefs/`, which needs its own Ahrefs API key.

## Not installed, and why

- **`ponytail`** (DietrichGebert/ponytail) — optimises for fewest lines of code. That trades
  directly against readability on a codebase multiple people and sessions touch, and against
  `impeccable`'s clarity rules. Left out; say the word and it takes a minute to add.
- **`resolve-human-reviews`** (pbakaus/agent-reviews) — brief scoped this to bot triage only.
- The other 43 `marketingskills`, 10 `superpowers`, 17 `claude-mem`, and 20+ `claude-seo`
  skills — deliberately not installed, per §9.
- `pi`, `jcode`, `open-design`, `graphiti`, `loop-engineering`, `AI-Builder-Club/skills`,
  `gstack`, `awesome-pentest`, `hackingtool`, `every-app/open-seo` — ruled out in the brief.

## Re-syncing

```bash
git clone --depth 1 https://github.com/<owner>/<repo>.git /tmp/skillsrc/<repo>
rm -rf .claude/skills/<dest> && cp -r /tmp/skillsrc/<repo>/<path> .claude/skills/<dest>
```

Update the commit column above when you do. These are third-party skills — re-read the diff
before adopting upstream changes wholesale.

## Where these live — the two repos differ, deliberately

**`zoot-your-local-helpers`** ignores `.claude/` (and `.codex/`, `.continue/`, and every
other agent-tool directory) in `.gitignore`, with the existing convention stated at
`.gitignore:38`: *"Keep `skills/` and `skills-lock.json` trackable as the portable source."*
That convention is followed here rather than overridden:

- `skills/<name>/` — **tracked**. The portable, shared-with-the-team source of truth, and
  registered in `skills-lock.json` alongside the pre-existing Supabase skills.
- `.claude/skills/<name>/` — **git-ignored**, derived. Claude Code only loads skills from
  `.claude/skills/`, so this copy is what actually makes them available at runtime.

Re-derive the runtime copy after pulling:

```bash
for d in skills/*/; do n=$(basename "$d"); rm -rf ".claude/skills/$n"; cp -r "$d" ".claude/skills/$n"; done
```

**`zoot-app-iteration.`** does *not* ignore `.claude/`, so there the skills are tracked
directly in `.claude/skills/` and there is no second copy.

Both repos carry the same 21 skills. If you update one, update the other.
