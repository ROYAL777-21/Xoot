# Branch And Pull Request Map

Reviewed: 2026-07-10 00:12 SAST

## Canonical Source Of Truth

- Target branch: `main`
- Policy: `main` is the only long-lived code source of truth. Feature branches are short-lived, reviewed through pull requests, merged, and deleted.
- Release safety: a push to `main` builds and verifies the product but does not deploy GitHub Pages. Deployment requires an explicit `workflow_dispatch` with `deploy_pages=true`.
- Current state: `main` is current through the latest merged source-of-truth, drift-control, CI-hardening, provider-auth evidence, and blocker-ledger guard pull requests, including PR #20. Use `git log --oneline -5` and the latest GitHub Actions runs on `main` for the exact current commit and check evidence.
- Temporary branch refs may still exist remotely for audit, but they are not release branches and must not be used as product sources. New work must branch from current `main`.

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

4. PR #13: merged into `main`.
   - Classification: post-merge source-of-truth record.
   - Result: blocker and release records were updated after PR #12 so current `main` evidence is discoverable from the release docs.

5. PR #14: merged into `main`.
   - Classification: source-truth and metadata-drift control.
   - Result: added a company-wide metadata drift runbook and recorded PR #8/#10 decisions.

6. PR #15: merged into `main`.
   - Classification: CI runtime hardening.
   - Result: set GitHub workflow project runtime to Node 24.

7. PR #16: merged into `main`.
   - Classification: CI action hardening.
   - Result: updated official GitHub Actions to Node 24-compatible major versions where available.

8. PR #10: closed.
   - Classification: CodeRabbit-generated test proposal for superseded PR #8.
   - Relevance: useful as historical review material only. It targets PR #8's branch shape and should not be merged blindly into current `main`.
   - Result: current `main` keeps focused native-route tests in `src/lib/native-routing.test.ts`; broader generated tests require review before any future adoption.

9. PR #17: merged into `main`.
   - Classification: release-evidence drift cleanup.
   - Result: removed the need to refresh a moving "latest main SHA" in release docs after every merge; current GitHub Actions runs on `main` are the live release evidence.

10. PR #18: merged into `main`.
    - Classification: blocker and drift evidence refresh.
    - Result: refreshed unresolved-blocker evidence and kept Supabase metadata-drift checks aligned with current source state.

11. PR #19: merged into `main`.
    - Classification: provider-auth diagnostic hardening.
    - Result: reduced false local provider-auth failures by stabilising GitHub auth timeout evidence and refreshed environment readiness records.

12. PR #20: merged into `main`.
    - Classification: blocker-ledger drift guard.
    - Result: added an automated guard that verifies `blocker.md` still covers all launch-critical unresolved blocker categories before production-readiness checks pass.

There are no open pull requests as of this review.

## Historical Branches

Older remote branches remain for audit and archival. Do not delete them in bulk: compare each branch with `main`, preserve any unique approved work, then delete only branches proven merged or obsolete. CodeRabbit-generated branches are not release sources without review.

## Merge Conflict Status

- `main` is clean and tracks `origin/main`.
- New work must use a short-lived branch and pull request.
