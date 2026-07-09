# Integration Decision Log

Reviewed: 2026-07-09 18:24 SAST

## Decisions

1. Use PR #7 as the canonical release-hardening path.
   - Outcome: completed. PR #7 was merged into `main`; current `main` is now the canonical product source.
   - Reason: it contained the broadest verified implementation and its required checks passed.
   - Alternative rejected: opening another long-lived branch or merging PR #8 blindly.

2. Use PR #12 as the follow-up production-readiness evidence refresh.
   - Outcome: completed. PR #12 was squashed and merged into `main` at commit `12e06f6` after Web build, Production readiness guard, Native iOS Swift check, and CodeRabbit passed.
   - Reason: it made the repository source-of-truth state current by adding Supabase drift guardrails, dated SEO articles, notification personalization, and release/blocker evidence updates.
   - Alternative rejected: leaving the verified work on a short-lived branch while `main` remained behind the current evidence.

3. Keep PR #8 deferred.
   - Outcome: superseded and closed. Its temporary branch was deleted after confirming the required routing behavior was already present in the merged source.
   - Reason: it was narrower native-routing work and duplicated already-integrated functionality.

4. Preserve physical-device iOS `preview` profile and add `preview-simulator`.
   - Reason: the physical preview path must keep its Apple credential gate. Simulator builds provide iOS compile/build evidence but are not a substitute for TestFlight or device testing.

5. Do not use pasted provider secrets.
   - Reason: values pasted into chat are not safe long-term credentials. Rotate and load them locally through provider-approved mechanisms.

6. Do not production deploy automatically.
   - Reason: release commander rules require staging, smoke tests, and founder approval before a deployment action. Merging reviewed, green PRs into `main` is allowed when the change preserves `main` as the source of truth and the workflow deploy gate remains manual.

7. Keep one long-lived source branch.
   - Decision: GitHub `main` is the single code source of truth. Staging and production differences belong in environment configuration, feature flags, migrations, and secret stores.
   - Reason: parallel long-lived product branches created drift and made release evidence ambiguous.

