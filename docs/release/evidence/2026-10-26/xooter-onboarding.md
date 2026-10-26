# Xooter handoff and real saved details — 26 October 2026

## What is actually live

Production aggregate readback found 2 Auth accounts, both with saved/confirmed email addresses,
and 2 matching owner profiles, with 0 missing profiles. Owner profile INSERT/SELECT/UPDATE RLS
is present; UPDATE has ownership USING and WITH CHECK. Emails remain in protected Auth,
not a new public email directory. This checks the registered accounts; it does not prove every
signup route, future account, profile-write failure or real applicant document flow accepted.

The live website build-info still reports e0c021e9fde328098f33fb216b1efa720eadf2f1,
built 2026-10-24T19:18:14.334Z. Signup PR95 and this PR97 are not live. The current trigger
already guards optional referral dependencies; no missing-referral-table cause is asserted.

## Prepared implementation

- Original reference: design/handoff-2026-09-03/xoot/app/XooterOnboarding.jsx.
- Work with Xoot, You / Where / What / Checks, Newsreader and Plus Jakarta Sans, supplied
  script wordmark, paper cards and scoped brand-purple controls. Retain seven real substeps:
  about you, address, experience, identity/banking, references, documents, consent.
- Move identity/banking into Checks; no fake service/radius options, jobs-first promises,
  guaranteed income, paid-check promise, reviewer decision or activation.
- Save & continue waits for a real successful application_id; failed/throwing writes remain
  on the current step. Pending controls lock, and saved status clears when details change.
- Edge writes use the captured owner's normal session. Owner-key remounts and cancelled
  loads prevent another account's late draft/review appearing after an account switch.
- Read failures show Retry; submitted applicants go to the authenticated review screen,
  not a dashboard requiring an approved Xooter role. Review reads only displayed fields.
- Labels target their inputs, phone uses tel input, mobile inputs remain16px, and uploads
  remain private with an accessible picker. The shell uses the handoff Logo; unearned Pro removed.
- A reviewed inherited server bug ignored xooter_documents.insert errors. The local helper
  now requires a returned matching owner/application/type/path/pending row and rejects foreign
  or traversing file pointers. Stored pending metadata never means verified KYC.

## Verification and exact staged backend

- UI b2c6598 independently cleared; Apply/Kyc independent9/9.
- Document/shell follow-up5523048: independent13/13 plus9 synthetic actual-entrypoint
  checks. Deno handler checking passed; error/missing/mismatched/foreign writes return failure.
- Old Apply fails2 regressions; old Kyc fails3. Removing the actual acknowledgment guard
  makes2 of4 document tests fail; restored4/4. No test deadline or protection was relaxed.
- Broad first run exposed absent local native dependencies and a timing failure. Linking
  already installed dependencies with the identical mobile lockfile fixed the environment;
  the complete rerun passed169 files /1,690 tests /7 existing skips. No source fix was inferred
  from the missing-dependency errors; no native build was started.
- TypeScript, scoped lint and Deno checking passed. Production-mode build at10ddbbf with
  actual staging public configuration passed, including approved-homepage/design guards,
  50 public prerenders and artifact security scan. The initial missing-config build correctly
  failed its environment guard; no fallback or bypass was added. Existing bundle-size and
  ineffective-dynamic-import warnings remain. Native association files remain pending real
  Apple team/signing and Android certificate values.
- Final repository-wide ESLint and source/security scans passed, including all3 live-header
  positive/negative controls. Required artifact browser checks remain for release CI;
  the local CUA checks below do not relabel that runner as completed.
- CUA phone390px/desktop1440px synthetic previews verified labels, saved-step/back navigation,
  retained details, supplied fonts/purple control, review layouts and no horizontal overflow.
  These are synthetic visual checks, not real applicant acceptance. Viewport reset afterwards.
- Exact submit-xooter-application source is staged as v18 with verify_jwt=true. All4 deployed
  files match reviewed source/config after CRLF normalization. The frozen shared-importer delta
  (bounded JSON parsing, empty origin fallback, exact region-token matching) was independently
  reviewed; other importers were not redeployed. Missing-bearer staging probe returns401.
- First delivery attempt rejected the old stored absolute import-map path; explicitly supplying
  the included functions/deno.json succeeded. No production function was deployed.

## Release limits

Required GitHub checks still cannot start. PR96 security-review job121376146677 has no steps;
its fresh annotation says recent payments failed or the spending limit needs attention.
Keep the founder's current plan/spending; no paid upgrade or fabricated check/merge/promotion.

The stored document row is acknowledged. File existence/contents, optional selfie-pointer
atomicity, complete real KYC, fresh password-signup code/link confirmation, browser Realtime,
admin MFA and physical-device GPS/audio remain separate acceptance. Personalisation is planning
only; no production roles, tracking/calling, worker approval, payment or provider-plan change.
