# Requested tools: compatibility and actual use

Updated 2 October 2026. A requested link is not proof that its service is installed, authenticated
or running. This inventory distinguishes source references, local skills and active capabilities.
Load the relevant skill/documentation when its phase begins, then update its evidence here.

## Routine context efficiency

- Use `rg` and the local dependency graph to identify files before reading bodies. Read only relevant
  source sections; retain fresh failures, accepted business rules and unresolved decisions.
- Keep a plan-specific progress ledger, task briefs, test evidence and review packages on disk. Pass
  focused file paths to agents. Do not resend the whole conversation or giant tool outputs.
- Update the dependency graph after source changes. Its static edges narrow inspection; they do not
  prove runtime correctness or detect all SQL/dynamic imports. Verify money and access behavior directly.
- Use one implementer for a bounded task and independent review, as directed by the installed
  Superpowers execution skill. Batch independent read-only calls and avoid repeated full test runs.
- No measured token reduction is claimed. Graph estimates are not actual model billing measurements.

The requested [context-optimization skill](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering/blob/main/skills/context-optimization/SKILL.md)
was read; its selective retrieval, output reduction and concise handoff practices are applied.

## Local dependency graph

[code-review-graph](https://github.com/tirth8205/code-review-graph) **2.3.8** was installed in an isolated
Python 3.12 environment under this task's `work/tooling/crg`. No cloud embeddings, watch daemon or
global agent hooks were enabled. Set `CRG_HOME` to the task's `work/tooling/crg-state` before using it;
store the database in `work/tooling/xoot-graph`.

Initial measured build: **674 files, 5,731 nodes, 50,480 edges**. A subsequent incremental update
reparsed three changed files. Environment impact query returned Supabase client, `env.ts`,
`public-environment.test.ts` and `main.tsx` as additional files to inspect.

The 2 October incremental update completed after the reviewed source ports: 233 files
updated, 1,952 nodes and 23,985 edges processed; the search index contains 6,032 rows.
Those are graph statistics, not measured token savings or runtime verification.

Portable setup using an available Python 3.10+ runtime:

```powershell
python -m venv <task-work>/tooling/crg
<task-work>/tooling/crg/Scripts/python.exe -m pip install code-review-graph==2.3.8
$env:CRG_HOME = '<task-work>/tooling/crg-state'
<task-work>/tooling/crg/Scripts/code-review-graph.exe build --repo . --data-dir <task-work>/tooling/xoot-graph --skip-flows
<task-work>/tooling/crg/Scripts/code-review-graph.exe update --repo . --data-dir <task-work>/tooling/xoot-graph --skip-flows
```

For impact/search, capture the complete JSON to scratch and extract the summary and file paths before
reading source. Do not paste thousands of graph edges into agent context. Rebuild after checkout
expansion if newly materialized tracked files were absent from the initial sparse checkout.

## Requested source repositories

| Source | Compatibility / status | Intended use |
|---|---|---|
| [obra/superpowers](https://github.com/obra/superpowers) | Installed Codex skills used for execution, isolation, debugging and verification; current version 6.4.2. | Routine implementation/review workflow. |
| [usestrix/strix](https://github.com/usestrix/strix) | Runtime compatibility not yet verified; not invoked. | Evaluate for scoped staging security testing if it adds coverage. |
| [anthropics/claude-code-security-review](https://github.com/anthropics/claude-code-security-review) | Workflow remains failed, including run 36933862732. Prior artifact diagnoses insufficient API credit and GitHub's 300-file diff retrieval limit. No completed scan claimed. | Use paginated file retrieval/local Git input and owner-funded API access before counting a review. |
| [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) | `mem-search` / `learn-codebase` listed in skills lock. Search/filter/fetch method read; no live memory service verified. | Selective retrieval; avoid whole-codebase ingestion as routine. |
| [every-app/open-seo](https://github.com/every-app/open-seo) | Not integrated; runtime compatibility pending. | Evaluate during SEO release gate; retain one content system. |
| [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) | SEO audit/schema/technical skills in repository lock; not yet invoked this implementation. | Website technical SEO and supported structured data. |
| [garrytan/gstack](https://github.com/garrytan/gstack) | Not integrated; compatibility pending. | Evaluate individual review/QA practices when needed. |
| [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) | Not integrated; no second index activated. | Evaluate only if the working code graph lacks required coverage. |
| [diegosouzapw/OmniRoute](https://github.com/diegosouzapw/OmniRoute) | Not integrated; runtime compatibility pending. | Evaluate routing only if a concrete provider requirement arises. |
| [1jehuang/jcode](https://github.com/1jehuang/jcode) | Not integrated; runtime compatibility pending. | Evaluate task-relevant capability without replacing the current Codex runtime. |
| [enaqx/awesome-pentest](https://github.com/enaqx/awesome-pentest) | Reference only; no tools from the list executed. | Relevant authorized security test research. |
| [Z4nzu/hackingtool](https://github.com/Z4nzu/hackingtool) | Not installed or run; platform/scope review pending. | Consider only specific tests against authorized Xoot environments. |
| [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | Existing package/scripts pinned at 4.0.501. Not rendered this session. | Existing native/web launch assets when required. |
| [tirth8205/code-review-graph](https://github.com/tirth8205/code-review-graph) | Installed and exercised locally, evidence above. | Routine incremental dependency and impact retrieval. |
| [Agent-Skills-for-Context-Engineering](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering) | Context-optimization read and applied as workflow practices. | Routine focused context management. |
| [coleam00/context-engineering-intro](https://github.com/coleam00/context-engineering-intro) | Reference; no runtime integration claimed. | Focused requirements and handoffs when useful. |
| [pbakaus/agent-reviews](https://github.com/pbakaus/agent-reviews) | Review-resolution skills in repository lock; not invoked yet. | Handle actionable review feedback. |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Skill in repository lock; load for relevant visual review. | Refine handoff fidelity without replacing approved design. |
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) | Six skills in repository lock; not invoked yet. | Approved copy, onboarding and conversion journeys after real functionality. |
| [blader/humanizer](https://github.com/blader/humanizer) | Skill in repository lock; not invoked yet. | Plain public copy that preserves factual claims. |
| [getzep/graphiti](https://github.com/getzep/graphiti) | No memory backend integrated; compatibility pending. | Evaluate only if a concrete memory use case warrants another service. |
| [cobusgreyling/loop-engineering](https://github.com/cobusgreyling/loop-engineering) | Reference; no autonomous service enabled. | Evidence-driven implementation cycles. |
| [earendil-works/pi](https://github.com/earendil-works/pi) | Not integrated; compatibility pending. | Evaluate only specific missing capabilities. |
| [AI-Builder-Club/skills](https://github.com/AI-Builder-Club/skills) | Collection not blanket-installed. | Select exact relevant skills when a phase needs them. |
| [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | Six skills in repository lock; not invoked yet. | Scoped audit/review when additive to existing checks. |
| [nexu-io/open-design](https://github.com/nexu-io/open-design) | Not integrated; compatibility pending. | Evaluate for missing design inspection capability. |
| [alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design) | Skill in repository lock; large unrelated media excluded from working checkout. | Relevant visual guidance only when needed. |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | `brandkit` in repository lock; not invoked yet. | Handoff-consistent design review. |
| [juliangarnier/anime](https://github.com/juliangarnier/anime) | Not added to application dependencies. | Evaluate only if existing animation tooling cannot meet a requirement. |
| [anthropics/launch-your-agent](https://github.com/anthropics/launch-your-agent) | Reference; compatibility not assessed. | Relevant agent release guidance only. |
| [anthropics/prompt-eng-interactive-tutorial](https://github.com/anthropics/prompt-eng-interactive-tutorial) | Reference; no application runtime integration. | Improve bounded prompts if needed. |
| [monet-design/monet-registry](https://github.com/monet-design/monet-registry) | Not integrated; compatibility pending. | Evaluate a specific component gap against the approved design. |

## Requested Codex plugins

| Plugin | Actual state and role |
|---|---|
| Context7 | Callable documentation tools; used for Supabase CLI and current notification publication/RLS documentation on 2 October. |
| Superpowers | Installed skills actively driving implementation and verification. |
| GitHub | Authorized private-repository access; branch and work claim pushed. |
| Vercel | Connected; project `xoot` verified. Hobby plan still gates paid launch. |
| Supabase | Read-only connector works. GitHub CLI token previously deployed functions but fresh database linking fails required endpoint privileges (run 36932028355). Secure account/secret correction is required; local login alone does not update Actions. |
| CodeRabbit | Signed Windows CLI 0.7.6 authenticated and used for source reviews, including the 15-file account port. Findings/results are recorded in the visual ledger; whole-branch release approval remains outstanding. |
| Codex Security | Scoped calculator/account-guard reviews recorded during implementation. Whole-branch release review remains outstanding; a reviewed slice is not a repository-wide security result. |
| Build Web Apps | Testing/debugging, frontend builder and React performance skills read. Supplied visual reference replaces a new concept; existing Vite/React app remains the target. |
| Browser / Computer | CUA browser automation available; native computer control disabled in this environment. |
| Sentry / PostHog | Plugins available; account/project setup and privacy verification pending. |
| Cloudflare | Skills/tools available; DNS export is historical. Inspect actual zone before any changes. |
| Twilio Developer Kit | Skills/tools available; sender, capability and provider verification pending. |
| Expo | Skills/tools available; existing native project retained for mobile phase. |
| Test Android Apps | Available skill; emulator/device testing not yet run in this implementation. |
| Build iOS Apps | Skills available; real iOS builds/testing require macOS/EAS and device/account access. |
| Build macOS Apps | Available skills; a macOS product is not in the approved Xoot release scope. |
| Semrush | Connector availability alone is not an SEO audit; use during relevant release work. |
| OpenAI Developers | Available documentation tools; use for existing agent/API features when touched. |
| Sites | Available; Vercel remains the approved production host. No duplicate site published. |
| Netlify | Legacy host remains in repository configuration; not selected for production. No new deployment. |

Do not enable extra infrastructure, paid usage or third-party source transmission merely to mark a
row active. Use the requested capability when it contributes to the approved deliverable.
