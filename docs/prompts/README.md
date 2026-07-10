# Zoot Master Prompt Pack

Reviewed: 2026-07-10

Status: Phase 2 implementation prompts. These files authorize reviewable repository changes and declared read-only inspection of provider, Supabase, GitHub, staging, and production systems when the run manifest permits it. They do not authorize external writes, a production deployment, live provider mutation, financial action, customer communication, or policy approval.

## Purpose

This directory contains independently executable prompts for the Zoot Master AI Operating Programme. The prompts translate the Phase 1 discovery findings into bounded implementation missions with exact evidence, safety, cost, and release requirements.

Use the prompts in this order:

1. `canonical-main-and-migration-drift-master-prompt.md`
2. `ai-agent-architecture-master-prompt.md`
3. `anti-hallucination-and-drift-master-prompt.md`
4. `company-wide-self-improvement-loops-master-prompt.md`
5. `company-wide-security-hardening-master-prompt.md`
6. `siri-ai-app-intents-ios27-master-prompt.md`
7. `company-wide-bug-review-and-patch-master-prompt.md`
8. `codex-interaction-qa-master-prompt.md`

The sequence is intentional. Source authority must be stable before agents run; agent permissions must be stable before loops promote autonomy; security must gate native features; interaction testing must verify the assembled product.

## Shared Execution Contract

Every prompt inherits these rules:

- Inspect before editing and use current repository, provider, and build evidence rather than prior chat claims.
- Work in a short-lived branch and pull request based on current `main`.
- Do not deploy production, merge automatically, force-push, or rotate credentials. GitHub ruleset/branch-governance configuration may occur only under the canonical-main prompt after explicit approval and must include readback evidence; this Phase 2 prompt-pack run does not grant that approval.
- Do not send real customer, Zooter, partner, marketing, support, SMS, WhatsApp, voice, push, or email communications.
- Do not move money, confirm payments, issue refunds or credits, change payouts, change pricing, approve contractors, suspend accounts, activate claims, or mutate bookings.
- Do not expose secrets. Chat-pasted values are not trusted credentials or source-of-truth configuration.
- Use Expo and Continuous Native Generation for mobile. Do not reintroduce Capacitor as the native release target.
- Use Codex as the executive automation harness. Do not introduce a second orchestrator.
- Keep the Evidence and Control Plane deterministic and non-agentic.
- Supabase MCP is project-scoped and read-only. Schema, migration, Auth, Edge secret, deployment, and other administrative/database writes use the approved Supabase CLI workflow only after rotated credentials are loaded locally, the operation is dry-run/read back where supported, and required human approval is recorded. Runtime product writes are permitted only through explicitly approved typed Edge Functions enforcing user authentication, role/ownership/RLS, schemas, idempotency, rate limits, flags, audit, and action-specific approvals; they are not a general agent write path.
- A model cannot approve its own prompt, permissions, tools, budget, autonomy, policy, or production release.
- Production systems may consume only policies with `status: approved`.
- Unknown, stale, conflicting, or unsupported claims fail closed and create a reviewable evidence or knowledge-gap request.
- Update `blocker.md` with unresolved external or manual work only. Remove solved blockers only when current evidence proves closure.
- Finish with exact files changed, checks run, failures, skipped checks, manual approvals, residual risk, rollback, and confirmation that prohibited external actions were not performed.

## Required Run Manifest

At the start of each prompt execution, record:

```yaml
mission_id:
prompt_file:
prompt_version:
repository:
base_branch: main
base_commit:
working_branch:
environment: local | staging | production-read-only | staging+production-read-only
production_write_authorized: false
allowed_file_scope:
allowed_external_reads:
allowed_external_writes: none
human_owner:
started_at:
```

If the requested work cannot fit this manifest, stop and obtain a narrower mission or explicit approval. Do not silently widen scope.

## Authority Order

When evidence conflicts, use this order:

1. System and user instructions for the current task.
2. Approved policy in `docs/source-of-truth`.
3. Current protected `main` code and immutable migration files.
4. RLS-protected Supabase operational state.
5. Verified provider API or signed provider event state.
6. Human workflow state in restricted review queues.
7. PostHog aggregate behavior and Sentry technical reliability evidence.
8. Draft documents, historical PRs, local branches, chat history, and external research as non-authoritative inputs only.

No lower authority may overwrite or reinterpret a higher authority.

## Prompt Change Control

Prompt changes require:

1. A short-lived branch from current `main`.
2. A stated reason and affected agent or workflow.
3. Regression evaluation covering normal, missing, stale, conflicting, malicious, privacy, financial, and provider-outage cases.
4. Token and cost impact where a model call changes.
5. Security and owner review for permission, tool, data, or autonomy changes.
6. Green repository checks.
7. Reviewed merge into `main`.

An agent may propose a prompt change. It may not edit and activate its own prompt in the same approval chain.

## Current Platform References

- Apple App Intents updates: https://developer.apple.com/documentation/Updates/AppIntents
- Apple App Shortcuts guidance: https://developer.apple.com/design/human-interface-guidelines/app-shortcuts
- Expo CNG: https://docs.expo.dev/workflow/continuous-native-generation/
- Expo config plugins: https://docs.expo.dev/config-plugins/introduction/
- Supabase MCP safety: https://supabase.com/docs/guides/ai-tools/mcp
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
- OWASP MASVS: https://mas.owasp.org/MASVS/

The installed public SDK and repository lockfiles remain authoritative for implementation details. Documentation links guide inspection; they do not justify using APIs absent from the installed toolchain.
