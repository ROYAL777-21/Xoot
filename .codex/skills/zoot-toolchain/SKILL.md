---
name: zoot-toolchain
description: Tool orchestration skill for Zoot implementation work. Use when a task mentions or needs GitHub, Linear, Supabase, Computer, Build iOS Apps, Build macOS Apps, Build Web Apps, Test Android Apps, CodeRabbit, Twilio Developer Kit, OpenAI Developers, Base44, Airtable, Expo, CI checks, PRs, dashboard setup, mobile verification, provider configuration, or connector-backed operational work.
---

# Zoot Toolchain Skill

Load `zoot` first. Use this skill to choose the right connector, local command, or documented fallback for Zoot work.

Read:

- `../work/zoot_company_wide_md_pack/AGENTS.md`
- `../work/zoot_company_wide_md_pack/docs/operations/AI_AGENT_ARCHITECTURE.md`
- `../work/zoot_company_wide_md_pack/docs/engineering/CODEX_WORKFLOW.md`
- `../work/zoot_company_wide_md_pack/docs/engineering/TESTING_QA.md`
- `docs/STAGING_PRODUCTION_CHECKLIST.md`
- [references/tool-map.md](references/tool-map.md)
- [references/approval-gates.md](references/approval-gates.md)

## Principle

Tools can inspect, draft, validate, route, and prepare. They must not silently approve or execute sensitive financial, legal, trust, contractor, credential, or production actions.

## Tool Selection

Use the most direct authoritative surface:

1. Local repository and tests for code truth.
2. Supabase connector/dashboard for live project metadata, migrations, RLS, secrets, and function status when needed.
3. GitHub for branches, PRs, Actions, checks, reviews, and remote source state.
4. Linear/Airtable for roadmap, issue, pipeline, and operational status when task context requires them.
5. Twilio/OpenAI provider tools for implementation guidance and provider-specific validation.
6. Native/mobile tooling for iOS, Android, Expo, and device/emulator verification.

## Safety Rules

- Do not ask the user to paste secrets into chat.
- Do not write live credentials to source files.
- Do not deploy production, alter live secrets, approve refunds, activate contractors, change verification badges, or publish ads without explicit approval.
- Prefer staging and dry-run checks before production operations.
- If a connector is unavailable, document the manual dashboard setup and proceed with local templates/checklists.

## Standard Closeout

Report:

- connector/tools used;
- local commands run;
- checks passed/failed;
- manual dashboard actions still required;
- risks and next recommended task.
