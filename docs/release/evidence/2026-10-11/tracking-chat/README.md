# Tracking and chat — local verification

11–12 October 2026. This is a bounded website slice of the handoff implementation,
not a deployed customer journey or completion of the website/mobile production plan.
The original sources are `design/handoff-2026-09-03/xoot/app/Tracking.jsx`, `Frame.jsx`
and their shared components. No original design files were changed.

Initial review source: tree `185407f473aa24b0910ec4ada9ccb97cf30478e5`, based on
`c7c51fe44544b46fdfd387fbf4a10c23f02d2205`. The 22-path review package has 179,037 bytes
and SHA-256 `29ae0f63c705df1a25092d0d5aebe55f09674c3d867dce6964440ca46fc861e1`.
Independent review found cross-tab pending-message ownership and older-history gaps.
Correction round 1 at tree `379d207f475b6468e4ba1794ed3610a4aa01366b` passed scoped
re-review for both findings, with no new Important/Critical breakage. Its five-path
package has 62,764 bytes and SHA-256
`6f6b4f76e5e6b4ee5f2a8c6c67ccfc9f629901d2dfa1635680adc47d7bb3dcf7`.
The validated corrective risk assessment is `merge / human_review_required`, not
whole-branch or production approval. The first aggregate failed on one missing generated
RPC type declaration. Correction round 2 adds its exact required arguments and JSON return;
independent re-review approves this isolated fix. Its 1,418-byte package SHA-256 is
`82425fced50a62a9f9609ee3320a04d53fc9612fc60ab4ed0f27a763797757e4`.

Final source commit: `18b33f658c234d0bb2d1dc3a42723e41ada030fe`, tree
`810e59ae787d79126a18cce32abb1cb5af606f6d`. This is local source; it has not been published.
The final aggregate passes **162 files / 1,731 tests**, with seven existing SQL-runtime
skips. The focused RPC checks pass 12 tests. Types, global lint, lockfile validation,
source security checks, staging build, rendered artifact and artifact scan also pass.
[Final validation](final-validation.json), [aggregate log](final-aggregate-command.log)
and [build/render log](final-build-command.log) preserve those outcomes.

The rendered artifact check uses the actual built files at the configured preview origin
inside an isolated browser; its staging directory request is real and returns zero
approved helpers. It verifies home, sign-in navigation and runtime health. It does not
publish that build or prove the new authenticated RPC is deployed. Native association
files are still omitted without Apple team/signing fingerprints; the existing large
shared-chunk warning remains. No native build or distribution is claimed.

Dedicated tracking and chat routes use recorded booking status, helper identity,
checklists, events and encrypted messages. The port keeps the original map region,
card stack, control order, typography, bubbles and composer. Live location, ETA,
chat-photo sharing and the access-note editor remain explicitly unavailable; these
are unfinished backend/provider capabilities, not simulated successes. Crew and native
participant journeys still require implementation and verification.

## Rendered source comparison

[Initial browser evidence](initial-browser-evidence.json): 45 responsive and interaction
records pass on actual production components with synthetic adapters outside runtime
source, using real browser ECDH/AES encryption. The installed Playwright fallback was
used because the Browser skill was unavailable. No hosted booking, provider delivery,
native device or cross-tab pending-journal guarantee is established by this run.

Widths 320, 390, 768, 1024, 1440 and 1920, short landscape, high density and equivalent
200% reflow pass. Reflow is not a physical browser-zoom test. Checks include the original
12px frame inset, 20px helper title, 15px message body, 30×4 neutral handle, collapsed
details, footer/CTA clearance, reachable messages and controls, loaded fonts and no
horizontal overflow, runtime errors or persistent heading transform/filter.

Screenshots contain clearly isolated QA records:
[tracking](tracking-default-390.png), [chat](chat-default-390.png),
[source menu](tracking-menu-390.png), [acknowledged retry](chat-retry-recorded-390.png).
They are local component previews, not evidence that the hosted deployment has changed.

Two earlier parent harness assertions were corrected and their failures retained:
uppercase DOM text need not also have a CSS uppercase transform; on a short viewport,
a sticky footer is compared with the visible scroll position rather than the bottom
of an off-screen minimum-height frame. The final check verifies actual reachability.
No product behavior was weakened to make those assertions pass.

## Reviewed recovery and history corrections

Each pending message now owns a separate ciphertext record. Acknowledgement removes
only that attempt. Remounts can recover multiple unresolved attempts explicitly, without
automatic sends. Legacy shared-slot journals are preserved with exact acknowledgement
receipts; rolling back must retain a compatible reader for the new per-attempt records.

History retains observed pages and uses the latest server page as its pagination
boundary. A refresh can reopen retrieval after earlier exhaustion. Late results cannot
advance or exhaust a newer boundary, so a gap between retained and new rows remains
reachable. Each request is bounded and duplicate IDs appear once.

55 focused tests, typecheck and scoped lint pass. The additional
[actual-browser evidence](fix1-browser-evidence.json) and [command log](fix1-browser-command.log)
pass three cases using actual components, shared browser storage and Web Crypto:

- Two independent tabs send; A is acknowledged while B loses transport before saving.
  B's ciphertext survives, reload sends nothing automatically, and explicit retry reuses
  its exact key/envelope. The synthetic server contains exactly two messages.
- A retained acknowledged message plus a latest-page jump recovers all 205 messages once.
- Previously exhausted history plus a disjoint latest refresh recovers all 308 messages once.

[Recovered second tab](two-tabs-recovered-390.png). The transport is an isolated
in-memory test adapter. These checks do not establish hosted roles/provider delivery.

## Independent database sessions

[PostgreSQL evidence](postgres-evidence.json) and [command log](postgres-command.log)
pass 15 scenarios with 12 observed database lock barriers on PostgreSQL 17.11, using
four independent sessions. The actual migration SHA-256 is
`7f14c1218193405bf3da99b68ba8d5ba19c38caebe9b22bfed7c7d093a9391d8`.

Checks cover exact same-key replay after a lost response, conflicting ciphertext or
flags, rollback, cancellation/replacement/customer/worker-account changes while waiting,
closed-chat acknowledgement versus new-message denial, removed-helper denial, booking/
sender key scope, unrelated booking progress, crew conversion and client execution denial.

This is a minimal synthetic schema from the current verifier source. The preserved raw
JSON calls it a "committed" fixture, but the verifier was uncommitted at execution time;
that label is inaccurate. Migration hashes and outcomes are unchanged. This test does
not prove compatibility with the complete hosted schema or all live roles.

The disposable database and task-created roles were removed, existing role attributes
and memberships were preserved, and the owned loopback PostgreSQL server was stopped.
There were no hosted writes. Delivery remains migration, dependent function/shared
imports, then compatible client; the current hosted preview is still the earlier release.
