# Appearance and PayFast staging follow-up — 27 October 2026

Production remains on the approved release. PR101 is a staging candidate, not live-payment
approval. Preserve PR98/99, founder-entered credentials, genuine account data and production's
external safety-PIN migration. No paid plan, spending change or provider charge was made.

## Appearance and handoff

The root now follows device appearance by default, with a saved Light/Dark override. The original
handoff's dark aliases accept the root class the theme provider actually writes. All284 light
and78 dark values remain unchanged. An external pre-paint script works under the existing CSP
and when storage is blocked. Profile appearance, shared logo, auth/booking actions, selected
choices, navigation, Care+ panels/comparison and journal artwork have paired readable colours.
Original flowers, display type and taped object cards are retained. Planned merchandise has no
fake price, waitlist or unsupported ingredient/manufacturing claim.

Booking no longer asks for a second suburb. Its modal still scrolls while its scrollbar is hidden.
Account destinations return to You; the reward flower animates on entry with reduced-motion
support. Speculative route preloads are bounded and respect Data Saver. Reward amounts,
eligibility, worker approval and provider switches remain server controlled.

Independent source review closed all reported contrast findings, including83e1dbe's Care+
comparison SVG. Real hosted owner-profile checks confirmed manual Dark survives reload,
manual Light remains fixed while the emulated device changes, and Device default follows
both schemes. Profile at390×844 had no horizontal overflow; its public saved-place fixture
remains visible. This is browser emulation, not a physical-phone dark-mode acceptance.
Local built signup and Care+ pages were also visually inspected at390 CSS pixels in dark mode.

The two original theme defects were planted separately and both detected before restoration.
Five provider/pre-paint regressions pass. Screenshot: founder workspace outputs/
xoot-dark-profile-390-20261027.png. No credential or private address was captured.

## Reviewed PayFast deployment

PR72 is retained through merge17e7155. Independent review of93fe439 found four issues; correction
3a208e2 closes actual admin MFA enforcement, late-provider transaction binding, no-reference
manual EFT support and the unrelated replacement-history uniqueness constraint. Re-review found
no new issue and cleared only limited staging delivery with checkout controls OFF.

The founder privately configured the sandbox merchant and saved all five staging secret names.
Only names and hashes of the known sandbox/staging values were checked. Configuration is not
provider acceptance; no merchant key/passphrase was read back or copied into source/evidence.

Actual staging projectfxmxyabdjqviqbcxmvlp received migration20261027201017. Only this newly
authored migration was renamed from its prepared20261027150000 filename to the generated ledger
version. No SQL change, historical rename or repair-stamping occurred. Exact ledger SQL and all
three database function bodies match the reviewed source. Browser/anon execution and receipt
SELECT are denied; service-role RPC execution is allowed; RLS is enabled. Initial receipt count0.

Ordered delivery: migration → confirm-payment v37 → admin-confirm-payment v36 →
create-payment-session v14. All23 returned runtime/import-map files match the sent source.
The provider omits deno.json from readback; it was sent with each bundle and is not represented
as a returned file. Manifest:payfast-staging-manifest.json. JWT verification stays OFF only for
the independently verified provider webhook, ON for checkout/admin routes.

The deployed database passed42 rollback-only contract assertions: downstream failure rolls back
all consequences; retry commits once; receipt-backed replay does not regress later booking state;
amount/payload/transaction mismatch and customer-as-admin are denied; first late provider binding
is unique; another provider charge is rejected; legacy manual EFT reaches its admin guard. The
original status-only acknowledgement shortcut was planted in temporary SQL and detected at the
distinct-transaction assertion. No approved worker or admin/MFA session was fabricated.

An initial post-deployment wrapper used the wrong temporary assertion-table name and aborted;
the corrected wrapper then passed42/42. Subsequent readback found0 owned test bookings/payments,
0 receipts and no injected failure function. Six actual HTTP boundary checks passed: checkout
401, admin401, callback GET405, unsigned callback POST400, both anonymous RPC calls42501/401.
Both operational checkout controls and all provider evidence flags remain false.

These are real deployed database/HTTP checks with synthetic SQL provider events. They do not prove
a genuine PayFast buyer/ITN, authorised JWT ownership, live admin AAL2, worker offer, cancellation
or independent-session concurrency. The existing cancellation/refund stale-snapshot race remains
a live-activation blocker. Other financial kinds and crew fulfilment remain held.

## Local validation reconciliation

The first full threads attempt stalled before reporting completed tests and was stopped. A serial
fork-based full run completed193 files:1975 passed,7 existing skips,4 failures. The failures were
the two new RPC declarations and crew_size absent from the generated schema, plus an old test's
literal dark-selector format. Types were narrowly copied from actual staging generation, the
equivalent CSS selector order restored compatibility without changing tokens/assertions, and75
focused checks across all five affected suites passed. No deadline or failing assertion was waived.
Final source checks atcdc6dc4 pass: both lockfiles, web TypeScript, full ESLint, four header
tests and all four source-security scans. The production-mode build using staging public
configuration passes50 prerenders, artifact security,390/1440 handoff checks and actual
backend directory/auth startup with0 approved workers. Apple/Android association files remain
unconfigured without genuine signing/team identifiers; no native build is claimed.

The final serial full run completed193 files with1978 passes,7 existing skips and one rendered
sign-in case timing out at its unchanged30-second deadline. The same case passed alone on
28 October in6.07 seconds, with the original deadline and no source change. This is not a clean
single-run full-suite pass; preserve the timeout evidence and rerun required CI after recovery.
Previous same-source built-site acceptance and the earlier complete43-case rendered pass are
separate evidence, not replacements for the required release job.

Staging security advisors add only the expected INFO for the service-only private receipt table
having no browser policy. Existing safety-PIN SECURITY DEFINER and leaked-password-protection
WARN notices remain unchanged. No broad client grant or paid Auth upgrade was applied.

## 28 October delivery handoff

The founder supplied a new instruction to reconcile download/xoot-delivery-20261028/, then run
its steps0–3 (push, secrets, migration, deploy), then SOS tests. That folder is absent from the
attached workspace and Windows Downloads search. The connected Xoot Production Health chat
returns only content-reference markers; the browser lacks that ChatGPT session. A full local
path or retrievable delivery link is requested. No bundle/patch/report was read or executed,
no new push/deploy/SOS activation occurred on the basis of unseen instructions. Preserve this
branch and its staged database work until the new delivery can be reconciled.

## Remaining release work

Genuine sandbox buyer/ITN and duplicate/failure acceptance, cancellation/refund reconciliation,
normal-account/admin/device acceptance, canonical quote/crew consistency and required CI precede
live activation. GitHub included usage remains a release gate at the founder's instruction; no
paid quota increase, fake status or branch-protection bypass. No production migration/promotion.

Rewards' next milestone and staffed SOS still need the founder's requested commercial/operating
clarifications. Google branding/custom auth-host options and affected GSC example URLs are not
resolved: Cloud branding failed to load and GSC's detail rows did not open. Private noindex,
canonical alternates and redirects were not removed to manufacture indexing success.
