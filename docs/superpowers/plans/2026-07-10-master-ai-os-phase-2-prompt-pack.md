# Zoot Master AI OS Phase 2 Prompt Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a repository-owned, test-enforced master prompt pack for Siri/App Intents, agent architecture, improvement loops, security, AI assurance, canonical source control, bug remediation, and interaction testing.

**Architecture:** The pack is documentation-led and enforced by executable repository validation built on the completed Phase 1 discovery report. Each prompt is independently executable, shares one source-of-truth hierarchy, keeps Codex as the orchestration harness, uses Expo/CNG for native work, and preserves human approval for consequential actions. A Vitest contract test and PowerShell production-readiness checks are part of the deliverable and prevent required safety clauses from silently drifting.

**Tech Stack:** Markdown, TypeScript, Vitest, PowerShell readiness checks, GitHub pull requests, Expo/CNG, Supabase, Apple App Intents.

## Global Constraints

- Do not deploy production, merge automatically, force-push, rotate credentials, change live provider settings, or send external communications.
- Do not move money, change pricing or entitlements, approve claims or contractors, suspend accounts, or mutate bookings from an AI prompt.
- `main` is the only long-lived code source of truth; feature work remains reviewable in short-lived pull requests.
- Supabase MCP is project-scoped and read-only; live writes require the approved CLI workflow, local rotated credentials, dry-run evidence, and human approval.
- Expo and Continuous Native Generation are the only mobile implementation path.
- Production systems may consume only approved policy; drafts and conflicts must fail closed.

---

### Task 1: Prompt and policy contract

**Files:**
- Create: `docs/prompts/README.md`
- Create: `docs/source-of-truth/README.md`
- Create: `docs/source-of-truth/policy-template.md`
- Create: `docs/source-of-truth/policy-registry.md`

**Interfaces:**
- Consumes: `docs/programme/master-discovery-report.md`, `docs/AGENT_RULES.md`, `docs/release/metadata-drift-control.md`.
- Produces: the shared authority hierarchy, prompt execution order, policy frontmatter contract, conflict behavior, and policy inventory used by every prompt.

- [ ] **Step 1: Add the shared prompt index and policy contract**

Create complete Markdown documents that define authority, status, owners, conflict handling, approval gates, and the required policy inventory without inventing commercial decisions.

- [ ] **Step 2: Verify the files are ASCII and contain no unresolved placeholders**

Run:

```powershell
rg -n "TBD|TODO|FIXME" docs/prompts docs/source-of-truth
```

Expected: no matches.

### Task 2: Master prompt pack

**Files:**
- Create: `docs/prompts/siri-ai-app-intents-ios27-master-prompt.md`
- Create: `docs/prompts/ai-agent-architecture-master-prompt.md`
- Create: `docs/prompts/company-wide-self-improvement-loops-master-prompt.md`
- Create: `docs/prompts/company-wide-security-hardening-master-prompt.md`
- Create: `docs/prompts/anti-hallucination-and-drift-master-prompt.md`
- Create: `docs/prompts/canonical-main-and-migration-drift-master-prompt.md`
- Create: `docs/prompts/company-wide-bug-review-and-patch-master-prompt.md`
- Create: `docs/prompts/codex-interaction-qa-master-prompt.md`

**Interfaces:**
- Consumes: the shared contract from Task 1 and current repository evidence.
- Produces: eight independently executable implementation prompts with exact scope, artifacts, stop conditions, tests, and final-report requirements.

- [ ] **Step 1: Write the native assistant prompt**

Require installed-public-SDK inspection, safe foreground continuation, allowlisted routes, no consequential actions, Expo CNG ownership, and physical-device verification.

- [ ] **Step 2: Write the agent architecture and cost prompt**

Define one Codex harness, seven exclusive specialists, typed handoffs, tool contracts, model classes, budgets, circuit breakers, and audit records.

- [ ] **Step 3: Write the improvement and AI assurance prompts**

Define bounded daily/weekly/monthly loops, promotion and demotion evidence, anti-hallucination grounding, drift evaluation, and human-only policy changes.

- [ ] **Step 4: Write the security, source-control, bug-patching, and interaction-QA prompts**

Pin OWASP references, preserve one protected `main`, require migration evidence, define severity-driven repair, and require browser/device interaction proof.

### Task 3: Drift enforcement and records

**Files:**
- Create: `src/lib/master-programme-prompt-pack.test.ts`
- Modify: `scripts/ops/verify-production-readiness.ps1`
- Modify: `docs/programme/master-discovery-report.md`
- Modify: `docs/release/branch-and-pr-map.md`
- Modify: `blocker.md`

**Interfaces:**
- Consumes: all Task 1 and Task 2 documents.
- Produces: test and release evidence that the prompt pack remains complete, plus current PR/blocker records.

- [ ] **Step 1: Add a failing prompt-pack contract test**

Assert that every required file exists and that the pack preserves Codex, Expo, read-only Supabase MCP, human approvals, cost ceilings, migration drift gates, safe Siri behavior, and real-device QA.

- [ ] **Step 2: Run the focused test and confirm it fails before the documents exist**

Run:

```powershell
npx vitest run src/lib/master-programme-prompt-pack.test.ts
```

Expected: FAIL because required documents are missing.

- [ ] **Step 3: Complete documents and readiness checks**

Add prompt-pack file/pattern checks to the offline readiness verifier, reconcile PR #24/PR #25 state in repository records, and keep `blocker.md` unresolved-only.

- [ ] **Step 4: Run focused and broad verification**

Run:

```powershell
npx vitest run src/lib/master-programme-prompt-pack.test.ts
npm test
npm run lint
npm run ops:blockers:check -- -Json
npm run ops:readiness -- -Json
git diff --check
```

Expected: all local checks pass; live/manual blockers remain explicitly reported.

### Task 4: Reviewable GitHub handoff

**Files:**
- Modify only the Phase 2 files listed above.

**Interfaces:**
- Consumes: verified Phase 2 worktree.
- Produces: a commit and updated draft PR #25 without merging into `main`.

- [ ] **Step 1: Review the complete diff and secret scan**

Run:

```powershell
git diff --check
npm run security:scan
git status --short
```

Expected: no whitespace errors, secret scan passes, and only intended files are changed.

- [ ] **Step 2: Commit and push the Phase 2 checkpoint**

Commit message:

```text
Add master AI operating prompt pack
```

- [ ] **Step 3: Update draft PR #25 and wait for CI/CodeRabbit**

Expected: PR remains draft and unmerged; all relevant checks pass or actionable failures are fixed.
