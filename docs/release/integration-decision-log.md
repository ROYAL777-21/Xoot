# Integration Decision Log

Reviewed: 2026-07-09 14:38 SAST

## Decisions

1. Use PR #7 as the canonical release-hardening path.
   - Outcome: completed. PR #7 was merged into `main`; current `main` is now the canonical product source.
   - Reason: it contained the broadest verified implementation and its required checks passed.
   - Alternative rejected: opening another long-lived branch or merging PR #8 blindly.

2. Keep PR #8 deferred.
   - Outcome: superseded and closed. Its temporary branch was deleted after confirming the required routing behavior was already present in the merged source.
   - Reason: it was narrower native-routing work and duplicated already-integrated functionality.

3. Preserve physical-device iOS `preview` profile and add `preview-simulator`.
   - Reason: the physical preview path must keep its Apple credential gate. Simulator builds provide iOS compile/build evidence but are not a substitute for TestFlight or device testing.

4. Do not use pasted provider secrets.
   - Reason: values pasted into chat are not safe long-term credentials. Rotate and load them locally through provider-approved mechanisms.

5. Do not production deploy or merge main automatically.
   - Reason: release commander rules require staging, smoke tests, and founder approval first.

6. Keep one long-lived source branch.
   - Decision: GitHub `main` is the single code source of truth. Staging and production differences belong in environment configuration, feature flags, migrations, and secret stores.
   - Reason: parallel long-lived product branches created drift and made release evidence ambiguous.

