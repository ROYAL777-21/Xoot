# Branch And Pull Request Map

Reviewed: 2026-07-09 18:24 SAST

## Canonical Source Of Truth

- Target branch: `main`
- Policy: `main` is the only long-lived code source of truth. Feature branches are short-lived, reviewed through pull requests, merged, and deleted.
- Release safety: a push to `main` builds and verifies the product but does not deploy GitHub Pages. Deployment requires an explicit `workflow_dispatch` with `deploy_pages=true`.
- Current state: PR #12 was squashed and merged into `main` at commit `12e06f6` on 2026-07-09. The Web build, Production readiness guard, Native iOS Swift check, and CodeRabbit review all passed on the merge candidate; post-merge main checks passed.
- Local and remote temporary branches for PR #7, PR #8, and PR #12 were deleted after verification.

## Pull Request Status

1. PR #7: merged into `main`.
   - Classification: completed source convergence.
   - Result: web, backend, Supabase, security, Expo mobile, release-readiness, and blocker tracking now live in the canonical Git history.

2. PR #8: closed and branch deleted.
   - Classification: superseded.
   - Relevance: its routing behavior is already present in PR #7 with broader URL allowlisting, auth callback handling, assistant intent support, and optional legacy-shell loading.
   - Result: duplicate code was not merged.

3. PR #12: merged into `main`.
   - Classification: production-readiness evidence refresh.
   - Result: Supabase metadata-drift guardrails, SEO article releases, notification personalization, iOS/native check evidence, and updated blocker/release records now live in the canonical Git history.

There are no open pull requests as of this review.

## Historical Branches

Older remote branches remain for audit and archival. Do not delete them in bulk: compare each branch with `main`, preserve any unique approved work, then delete only branches proven merged or obsolete. CodeRabbit-generated branches are not release sources without review.

## Merge Conflict Status

- `main` is clean and tracks `origin/main`.
- New work must use a short-lived branch and pull request.
