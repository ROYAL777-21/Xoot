# Branch And Pull Request Map

Reviewed: 2026-07-01 05:35 SAST

## Canonical Integration Branch

- Branch: `codex/full-zoot-iphone-pwa-auth-security`
- Pull request: #7, `[codex] Full Zoot iPhone PWA auth and security readiness`
- Base branch: `main`
- Status at review: open draft PR, mergeable, clean merge state, current checks passing.
- Reason: this branch contains the complete web, backend, Supabase, security, Expo mobile, release-readiness, and blocker-tracking work. It is the safest single source of truth for deployment hardening.

## Open Pull Requests

1. PR #7: `codex/full-zoot-iphone-pwa-auth-security`
   - Classification: merge candidate after manual blockers and founder approval.
   - Relevance: primary release-hardening branch.
   - Current role: continue controlled blocker fixes here.

2. PR #8: `codex/native-routing-bridge`
   - Classification: deferred/selective integration candidate.
   - Relevance: narrower native routing bridge work.
   - Current role: do not merge into #7 automatically. Review selectively only if a routing regression appears in the canonical branch.

## Branches To Ignore For This Task

- `main`: production base only, not the working integration branch.
- `codex/native-routing-bridge`: useful but narrower; avoid duplicating or mixing it into the current release-hardening task without a specific reason.
- `coderabbitai/*`: CodeRabbit-generated branches should not be treated as release sources without review.

## Merge Conflict Status

- PR #7 reports clean/mergeable.
- No new branch is required for the current iOS preview and release-documentation work.

