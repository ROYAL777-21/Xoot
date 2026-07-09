# Branch And Pull Request Map

Reviewed: 2026-07-09 12:30 SAST

## Canonical Source Of Truth

- Target branch: `main`
- Policy: `main` is the only long-lived code source of truth. Feature branches are short-lived, reviewed through pull requests, merged, and deleted.
- Release safety: a push to `main` builds and verifies the product but does not deploy GitHub Pages. Deployment requires an explicit `workflow_dispatch` with `deploy_pages=true`.
- Current merge candidate: PR #7, `[codex] Full Zoot iPhone PWA auth and security readiness`.
- Current state: PR #7 is mergeable and 280 commits ahead of `main`. It contains the complete web, Supabase, security, Expo mobile, release-readiness, and blocker-tracking work.

## Open Pull Requests

1. PR #7: `codex/full-zoot-iphone-pwa-auth-security`
   - Classification: canonical merge candidate.
   - Relevance: primary release-hardening branch.
   - Current role: finish verification, merge to `main`, then delete the remote branch.

2. PR #8: `codex/native-routing-bridge`
   - Classification: superseded candidate.
   - Relevance: its routing behavior is already present in PR #7 with broader URL allowlisting, auth callback handling, assistant intent support, and optional legacy-shell loading.
   - Current role: close after PR #7 is merged; do not merge duplicate code.

## Branches To Ignore For This Task

- `codex/native-routing-bridge`: superseded by PR #7.
- `coderabbitai/*`: CodeRabbit-generated branches should not be treated as release sources without review.

## Merge Conflict Status

- PR #7 reports clean/mergeable.
- No new long-lived branch is required.
