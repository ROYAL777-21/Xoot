# Integration Decision Log

Reviewed: 2026-07-01 05:35 SAST

## Decisions

1. Use PR #7 as the canonical release-hardening path.
   - Reason: it contains the broadest verified implementation and current checks pass.
   - Alternative rejected: opening another branch or merging PR #8 blindly.

2. Keep PR #8 deferred.
   - Reason: it is narrower native-routing work and may duplicate already-integrated functionality.
   - Revisit only if a route/deep-link regression is found in PR #7.

3. Preserve physical-device iOS `preview` profile and add `preview-simulator`.
   - Reason: the physical preview path must keep its Apple credential gate. Simulator builds provide iOS compile/build evidence but are not a substitute for TestFlight or device testing.

4. Do not use pasted provider secrets.
   - Reason: values pasted into chat are not safe long-term credentials. Rotate and load them locally through provider-approved mechanisms.

5. Do not production deploy or merge main automatically.
   - Reason: release commander rules require staging, smoke tests, and founder approval first.

