# 15 October 2026 — native Xooter verification and training handoff

## What actually changed

Two missing **Expo Router native screens** are implemented from the supplied `design/handoff-2026-09-03/xoot/app/XooterOnboarding.jsx` and the existing live web Xooter trust/training workflow:

- `mobile/src/app/xooter/kyc.tsx` shows the signed-in applicant's application status, six verification areas and the latest 30 submitted-document statuses. Queries project only non-sensitive status metadata: never national ID number, bank account, document file content or storage paths, background-check notes or raw uploaded evidence. It retains explicit error, empty and refresh states, and hands off secure document actions to the existing web verification and application routes.
- `mobile/src/app/xooter/training.tsx` shows the server-provided module catalogue, the mandatory foundation and optional learning, and only owner-scoped completion progress. The query deliberately excludes `quiz_questions` and therefore **does not ship the answer key**. All grading, certification and persisted progress actions remain on the authenticated web training flow. Recognition points are never described as wages.
- `mobile/src/app/account.tsx` links both routes from You → Work with Xoot.
- The pure `mobile/src/lib/native-xooter-trust.ts` projection strips extra fields even if a backend response accidentally includes them. Account-keyed screen remount and per-request cancellation prevent previous-user records from showing across account switches.

`mobile/scripts/native-xooter-trust.test.mts` exercises sensitive-field stripping, status classification, completion isolation and the account/route/privacy projections of both screens. It is collected by `npm --prefix mobile run test:xooter-trust` in the `Verify approved Xoot redesign` CI alongside native typechecks, lint, web tests and production build.

## Boundaries

This is an **application source handoff**, not a physical device build, completed KYC, independent contractor activation, accepted qualification or a new trust provider. It does not generate/submit any KYC document, store PINs, complete training automatically, create fake Xooter reviews, or alter RLS. User must authenticate in the browser separately if no shared session is present. A signed-in worker can still be pending checks and cannot infer job approval from this display.

Pending: native sign-in and web handoff device smoke, full onboarding form fidelity, actual reviewer/worker test accounts, live training server grades, encrypted storage, and iOS/Android distribution. Production database/PayFast/Twilio are untouched by this PR. Main and Codex PR #46 remain separate.
