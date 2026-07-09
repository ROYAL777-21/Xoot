# Branch And Pull Request Map

Reviewed: 2026-07-09 14:15 SAST

## Canonical Source Of Truth

- Target branch: `main`
- Policy: `main` is the only long-lived code source of truth. Feature branches are short-lived, reviewed through pull requests, merged, and deleted.
- Release safety: a push to `main` builds and verifies the product but does not deploy GitHub Pages. Deployment requires an explicit `workflow_dispatch` with `deploy_pages=true`.
- Current state: PR #7 was merged into `main` at commit `2f0de84` on 2026-07-09. The Web build, Production readiness guard, and Native iOS Swift check all passed on the merged commit.
- Local and remote temporary branches for PR #7 and PR #8 were deleted after verification.

## Pull Request Status

1. PR #7: merged into `main`.
   - Classification: completed source convergence.
   - Result: web, backend, Supabase, security, Expo mobile, release-readiness, and blocker tracking now live in the canonical Git history.

2. PR #8: closed and branch deleted.
   - Classification: superseded.
   - Relevance: its routing behavior is already present in PR #7 with broader URL allowlisting, auth callback handling, assistant intent support, and optional legacy-shell loading.
   - Result: duplicate code was not merged.

There are no open pull requests as of this review.

## Historical Branches

Older remote branches remain for audit and archival. Do not delete them in bulk: compare each branch with `main`, preserve any unique approved work, then delete only branches proven merged or obsolete. CodeRabbit-generated branches are not release sources without review.

## Merge Conflict Status

- `main` is clean and tracks `origin/main`.
- New work must use a short-lived branch and pull request.
