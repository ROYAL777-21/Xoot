# Xoot production checklist

Current register: **16 October 2026 (Africa/Johannesburg)**. This replaces the status claims in `blocker.md`,
`NEEDS-FOUNDER.md`, `founder-todo.md`, `next-session.md`, `go-live.md` and the old readiness guide.
Historical investigations remain in Git; they are not instructions to repeat migrations or change DNS.

Approved sequence: [production implementation plan](../implementation/production-plan-2026-09-11.md).
Engineering source: this private repository. Visual source: `design/handoff-2026-09-03/`.

Domain resolves to the public Vercel website. Do not import the old GoDaddy zone export;
the current working DNS records must be preserved unless a verified change is required.

## Verified state

### Phase position

| Phase | Current position |
|---|---|
| 0 — startup | Local/staging checks pass. The actual production home and sign-in now render at 1440 and 390 pixels; [fresh public evidence](evidence/2026-10-16/live-state/README.md) identifies release commit `5aebf7d`. Reconciliation of the newer release lineage and complete production dependencies remains open. |
| 1 — visuals | In progress. The founder's navbar, Trust, Journal and SVG corrections are implemented locally as `6056b6f`; [seven-size, keyboard and DPR2 evidence](evidence/2026-10-14/public-visual/README.md) passes. Independent source and evidence review approve this bounded task on 15 October. The full website and native handoff remain incomplete. |
| 2 — bookings/money | Quote, parsing, benefit locking and disabled atomic creation foundations are locally verified. Complete crew fulfilment, payments, referral rewards/reversals and real role journeys remain. |
| 3 — paid website launch | Not ready. Database delivery access, provider/operational prerequisites and full release checks remain open. |
| 4 — remaining capabilities | Partial source implementations; complete Care+, gifts, recurring, loyalty, property/business and Concierge journeys remain. |
| 5 — mobile | Source ports exist; complete visual, device, signing, store and operational proof remain. |

No verified percentage or reliable production date is available. The founder's
[12 October extension](../implementation/production-plan-2026-09-11.md#founder-extension--12-october-2026)
adds company-wide final functional/security checks, real checklist progress/reminders,
atomic default-home switching and booking-day destination access without weakening
secret-code revocation. These are required work, not completed by this status entry.

| Area | Evidence and date | Status / next closing condition |
|---|---|---|
| Website hosting | On 15 October UTC, [actual production captures](evidence/2026-10-16/live-state/README.md) identify `5aebf7d` at `xoot.co.za`. Home and sign-in render at 1440 and 390 pixels without the configuration overlay, root overflow or recorded page/console errors. | The earlier startup failure is no longer present in these checks. The mobile header still has both Book and Book now; the newer reviewed visual corrections have not been released. No paid journey or full production readiness is established. |
| Rendered startup | The hosted preview at `14cc5d5` passed on 8 October; a fresh unauthenticated metadata request redirects to Vercel login, so that historical result is not a current preview verification. The local `6056b6f` build passes [rendered checks](evidence/2026-10-14/public-visual/README.md). | Preserve configured staging isolation and the strict backend-aware browser gate. Reconcile newer release/main work before the next preview; verify its actual rendered commit and dependencies. |
| Vercel access | Connector lists project `xoot`, `prj_tz7Ai5SwguPd645qBnnDn4wxu3Jw`, on 12 September. Team plan is Hobby. | Preview configuration possible; commercial hosting plan required for paid launch. |
| Design references | Seven HTML files match; seven newly supplied ZIPs contain identical Xoot sources. [Receipt](../implementation/design-source-receipt-2026-09-13.md). | Header/hero compared at six widths; remaining layouts require the same source-based port. |
| Visit / Rating implementation | [Source comparison](evidence/2026-10-08/visit-rate/README.md): 27 browser states passed. [Reviewed corrections](evidence/2026-10-09/visit-rate-fix1/README.md) add native sharing/deep links and atomic low-rating support routing: final 1,656-test aggregate, 67 isolated SQL groups and eight additional browser cases pass. [10 October concurrency check](evidence/2026-10-10/visit-rate-concurrency/README.md): 12 scenarios and nine observed lock barriers pass on PostgreSQL 17.11. | Committed locally as `89d6fe3`; independent spec/quality re-review, staging build/rendered artifact and scans pass. Changes are not published. Migration/function delivery, full-schema/live actor checks, complete crew reviews and native counterparts remain. |
| Tracking / Chat implementation | [11–12 October local evidence](evidence/2026-10-11/tracking-chat/README.md): 45 rendered records, PostgreSQL 17.11 retry proof (15 scenarios, 12 lock barriers), and three actual-browser tab/history regressions pass. Independent review approves the corrected journal, history and RPC typing. | Source committed locally as `18b33f6`; final 162-file / 1,731-test aggregate, types, lint, staging build/rendered artifact and scans pass. Seven existing SQL-runtime skips remain separately covered. No publication. Live location, chat photos, access-note editing, crew/native routing and hosted delivery remain unfinished. |
| Atomic booking foundation | [12 October evidence](evidence/2026-10-12/README.md#one-job-booking-transaction-foundation): R393 base plus R39 fee, one booking/payment and complete rollback/replay proof. PostgreSQL 17.11: 53 scenarios, nine observed barriers; independent task review approved. | Local source `d139dd7`; 163 files / 1,742 aggregate tests pass with seven existing skips. Types, lint, lockfiles, staging build/rendered artifact and scans pass. Both public writers remain disabled; selected-roster policy, assignments/commissions, payment/lifecycle integration and hosted delivery remain. |
| Staging schema | [16 October SAST read-only metadata](evidence/2026-10-16/live-state/catalog-receipt.json): 85 versions. New entries are `20261015102137` referral client grants and `20261015155437` checklist mutation. The checklist RPC exists with service-role execution only. | Reconcile the applied checklist statements/version with the prepared `20261007150000` migration and preserve incoming release prerequisites. Earlier prepared gift/quote/benefit/notification additions are not proven delivered by the newer timestamps. |
| Production schema | The same fresh catalog records 82 versions, latest external safety-PIN `20261008011821`; both referral tables and the checklist mutation RPC are absent. | Review the incoming referral-base prerequisite and reconcile the external PIN change before ordered delivery. Crew/referral and subsequent prepared delivery remain incomplete. |
| Backend delivery | 15 October inventory: production has 58 functions. `public-xooter-directory` is now ACTIVE v1; `get-booking-quote` and `xooter-job-checklist` remain absent. [Receipt](evidence/2026-10-16/live-state/catalog-receipt.json). | Directory delivery resolves the earlier missing-endpoint observation. Complete the remaining reviewed dependencies, migrate first and redeploy affected importers; a working homepage does not close booking delivery. |
| Notification delivery/security | 7 October catalog still shows missing notification publication and eight excess client TRUNCATE/TRIGGER grants. [Prepared migration evidence](evidence/2026-10-02/notification-database.md) and [CI](evidence/2026-10-07/integration-preflight.md): 23 groups/30 expected denials pass on PostgreSQL 17.6 and 17.11; independent review passed. | Migration is prepared, not deployed. Apply through the audited CLI and verify signed-in delivery. Client subscriptions/local SQL alone are not hosted delivery evidence. No private hosted rows were read or changed. |
| Dependencies | 8 October reviewed compatible patches: web npm audit zero; mobile 26 package findings, representing three remaining advisories (23 high, 3 moderate, zero critical with parent attributions). [Disposition](../security/dependency-advisories-2026-10-07.md). | Mobile braces/node-forge lack supported patches; the fixed decoder needs compatible Expo/Metro integration proof. Native release gates remain open. No forced framework downgrade or unsupported clean-scan claim. |
| PayFast | Hosted checkout disabled; provider verification flags false in both environments at audit. | Signed webhook smoke tests, amount matching and reconciliation evidence required. |
| Mapbox | 16 October: owner reports setup steps 1–4 completed in the other chat. Vercel has `VITE_MAPBOX_PUBLIC_TOKEN` for production/preview; its sensitive value cannot be read through the connector, so validity is not established. Incoming release `9f647bd` includes native reference-map retry/attribution/token guards. | Integrate existing work, then complete address search, booking destinations, authorized navigation and real tracking. Website currently uses the handoff SVG; it is not proof of Mapbox API calls. Actual web/native provider, permissions, error-state and device evidence remains required. Do not repeat owner setup without checking it. |
| Monitoring access | 12 October: PostHog discovery reports `USER_NOT_LOGGED_IN`. The local Sentry API token/org/project and public monitoring variables are absent; this is not evidence about hosted settings. | Connect the PostHog app to the Xoot project. Configure Sentry's project identity and a scoped read token securely, then verify actual error delivery, privacy filtering and the complete booking funnel. Existing SDK code alone is insufficient. |
| Supply | Production aggregate counts: zero Xooters and zero bookings, rechecked 21 September. | Recruit/verify helpers and run consenting pilot; no invented availability/reviews. |
| Supabase CLI | Fresh staging dry run on 16 October SAST, [run 38815125826](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/38815125826), used release source `6487d78`. Credential-presence/setup passed; `supabase link` failed because the token/project pair lacks endpoint privileges. The job stopped before migration listing, dry-run SQL or repair. [Raw evidence](evidence/2026-10-16/live-state/README.md#database-deployment-access). | Correct the deployment identity's project/database-management access and token scope. Keep separate database passwords. Local login does not update the GitHub secret. Do not repeat the same preflight until access changes. |
| Reviews | CodeRabbit retry completed 20 September with 11 findings: eight addressed and three rejected with rationale in the visual ledger. Gift/native slices and the 26 September dependency/runtime slice passed scoped reviews. | Whole-branch release/security review still required before production. |

These are timestamped observations, not continuing monitoring. A checked build or a reachable domain
does not prove booking, payment, data access, or operational readiness.

Development review: [draft PR 46](https://github.com/ROYAL777-21/xoot-your-local-helpers/pull/46).
The separate release lineage is now `9f647bd`; `origin/main` is `1062bdb` (16 October fetch).
Reconcile their meaningful changes with the current implementation, preserving both histories
and the verified production/staging project-key pairing. The full source handoff, real-user
and paid journeys remain open. Current database-access evidence is the failed run above.

The [16 October steering](../implementation/production-plan-2026-09-11.md#founder-steering--16-october-2026)
prioritizes complete Mapbox and payments after source reconciliation. It also requires
service requests outside launch suburbs, editable inputs, first-use greetings, hidden
visual side scrollbars with usable scrolling, and renewed live Trust/Journal/Concierge
comparison. No subscription expiry date or reliable completion date is established.

The following checkpoints are historical. The [8 October dependency checkpoint](evidence/2026-10-08/README.md) verifies `14cc5d5`
on the actual hosted preview. Required Tests CI passed 152 files / 1,559 tests and all SQL/
PostgreSQL jobs. Production directory, schema comparison, external review and deployment
access were failed gates at that checkpoint; the current rows above supersede those observations.
The [28 September preview evidence](evidence/2026-09-28/README.md) records the verified application
commit, hosted screenshots, responsive checks and CI results. This is not the completed production release.
The [30 September checkpoint](evidence/2026-09-30/README.md) adds current hosted screenshots,
real PostgreSQL concurrency results and the passing production-configured browser build.
The [1 October hosted checkpoint](evidence/2026-10-01/hosted-profile/README.md) verifies
`0ee9cb2`, including fresh public-page captures and 143 files / 1,444 passing tests (seven
existing skips). Its production Web build fails on the absent directory endpoint. Schema
drift and the external Claude scan also remain failed gates; source ports and paid/native
journeys are unfinished. The earlier `5f1b150` evidence is retained as history.

The 28 September production schema check is red for pending gift/referral changes and generated
differences. The Claude security action did not run its scan because the Anthropic API credit balance
was too low; its nominal success is not review evidence. A result guard now exposes that failure.
The 1 October run `36854449608` artifact additionally records GitHub 406 while fetching the
PR, alongside the same insufficient-credit error. A direct read-only diff request confirms
the 300-file limit. Engineering must use paginated file retrieval or a local Git comparison;
the owner must restore API credit. Neither repair alone establishes a completed scan.

The staging quote endpoint was delivered through Supabase CLI server-side bundling in run
`36385184482`; readback shows ACTIVE v1 with JWT verification, a successful stable-preview
preflight, and denial of unsigned requests. Signed-in quote/creation/payment proof remains open.
The earlier Web build's local artifact origin was not permitted by the production backend.
The correction uses the configured public origin for isolated artifact rendering and passes
locally with real backend requests. The unsafe-DOM fixture failure in run `36452446984` was
corrected with DOM creation. Web build `36528691982` then reached browser verification and
failed on a resource 404, whose path was not reported. Commit `04f309d` adds URL-path diagnostics
without query values; all nine browser regressions and scoped lint pass locally. Web build
`36643027236` at `c9a9386` now passes its production-configured rendered check. The earlier404
did not recur in that run and its URL remains unknown. On 1 October, Web build `36854449284`
identified the missing production `public-xooter-directory` endpoint. A synthetic delayed
response probe proved the old smoke can navigate away before a slow 404 arrives: earlier
passes were insufficient directory-readiness evidence. Repair this wait and complete the
reviewed backend delivery; do not retry for a green result. Production CORS has not been loosened.
Hosted home and direct sign-in on `105b926` render at both checked widths on 30 September;
the separate CI artifact check verifies the production configuration without promoting it.

The private SQL quote calculator passes eight checks, including 1,332 complete quote comparisons
against the shared server engine, plus scoped CodeRabbit and Codex Security reviews with zero
findings. The required booking SQL and gift rollback/access job passed in run `36452447053`,
alongside the ordinary suite (132 files / 1,342 passing tests). Database
delivery, atomic booking creation, concurrent benefit spending, crew fulfilment and payment
verification remain open; reviewed calculation alone does not enable checkout.

The creation request parser binds the accepted quote, confirmed service, crew roster, address,
instructions and property IDs; 27 focused checks pass. It preserves old-attempt parsing for
idempotent replay and rejects inconsistent referral discounts. It is not connected to an enabled
writer. The reviewed account-guard foundation corrects the reproduced debit race (two R70 debits
against R100 previously both committed). A real PostgreSQL 17.11 run passes 39 scenarios, including
20 observed database blocking barriers, expiry while waiting, bulk rollback and role permissions.
The required PostgreSQL 17.6/17.11 jobs passed in `36643027223`, along with 133 files /1352 ordinary
tests and the separate SQL contracts. The fixture is synthetic and bounded; full Supabase migration
preflight and complete transaction integration remain gates. This migration is not deployed
and does not enable bookings, benefits or payments.

### Current implementation delivery sequence

The 16 October catalog above supersedes the historical counts below. Staging now contains a
checklist RPC under an externally recorded October 15 version; production has the public
directory but still lacks quote/checklist endpoints and referral tables. Reconcile exact
statements and effects before applying the prepared sequence. The atomic default-home change
is in local implementation/review, and incoming release/native work must be integrated before
the next delivery. Do not duplicate an externally applied migration or mark one applied merely
because a function with a matching name exists.

The 7 October engineering integration adds
`20261003140000_company_wide_defaults_and_xooter_checklists.sql` (default-home uniqueness,
task table, seed trigger and participant reads) and
`20261004160000_backend_rls_and_storage_hardening.sql` (client grants, RLS and storage
restrictions). Preserve timestamp order after the prepared September gift/quote/benefit/
notification migrations. Apply and verify these on staging before deploying
`xooter-job-checklist` or exercising the customer/Xooter checklist views. Redeploy all
importers of `_shared/action-utils.ts` for bounded request parsing; a changed shared
source file does not update existing bundles. Split-fare clients still record shares
and offer manual invite delivery; they do not enable payment collection. These additions
do not close hosted role/journey checks. A read-only inventory on 7 October observes
83 staging migrations through `20261003140000` and ACTIVE v1 `xooter-job-checklist`;
production remains at 81 migrations through `20260902120000` and lacks that function.
The exact-version ledger check confirms the October storage/RLS migration and September
gift/quote/benefit/notification migrations are absent. Compare actual schema effects before
delivery; a ledger check is not a full migration or role-behavior preflight.

The incoming storage hardening mistakenly counted the filename as a folder, rejecting
current `{user_id}/{file}` and `{booking_id}/{file}` uploads while admitting an extra
folder. Apply the additive `20261007140000_storage_upload_path_contract.sql` after
`20261004160000`: it changes only five upload/update `WITH CHECK` predicates to one
folder and preserves owner/member checks, MIME/size controls and completion-evidence
overwrite denial. Local isolated SQL reproduces the defect, executes the unchanged
storage/rename/hardening sequence, verifies the correction/replay, role isolation and
atomic failure on missing prerequisites. The required SQL CI step and real staging
Storage API upload/denial checks must pass before delivery is treated as verified.

The reviewed checklist correction adds `20261007150000_checklist_active_job_mutation.sql`
after the October 3 checklist schema and before deployment of the amended
`xooter-job-checklist` endpoint. It accepts only the verified actor's accepted job on an
active booking, rechecks state under row locks, and denies terminal/cancelled work.
The isolated SQL contract covers 50 groups. The [12 October PostgreSQL proof](evidence/2026-10-12/README.md)
passes nine scenarios with six observed lock barriers on actual PostgreSQL 17.11.
Required CI integration, complete schema compatibility and hosted role journeys remain
delivery gates; the local synthetic fixture alone does not establish them.
The endpoint reports unavailable when the RPC has not been delivered; UI visibility is
not server authorization. Concierge origin handling, native environment-specific invite
links and explicit checklist retry states also received focused fixes and scoped review.

The reviewed gift-request slice requires `20260920200000_gift_order_contract.sql` **before**
`ops-workflow` and `create-payment-session`. Staging still lacks that migration. The local types now
describe its expected columns/RPC; regenerate and compare against staging after applying it.
PGlite checks exercise the migration, provider constraint, atomic rollback and role denial locally;
they do not prove the whole Supabase chain, concurrent requests or live customer roles.

Do not enable gift checkout: paid delivery, redemption, refunds/reversal and saved-order browsing
are still incomplete. The website describes an unpaid request and the payment endpoint refuses gifts.
Native Search/Profile/Rewards/notifications and booking input/review have progressed. Remaining source
screens, booking creation/fulfilment, device checks and distributions are unfinished. See the source
coverage matrix in the visual ledger.

Wallet readers now load every ordered ledger page, preserve cents and hide previous-account data
and incomplete balances on errors. Focused checks and independent review pass. These reads do not
authorize spending. Free-clean redemption remains unavailable: the old endpoint consumes a credit
without atomically attaching a free clean to a booking. It must be repaired and verified before
the redemption control can be enabled; no credit is consumed by the disabled screen.

The website Visits list follows the source composition with real service/profile/review fields
and confirmed owner payment amounts. Fourteen component checks, typecheck, lint and scoped
review pass. Six-width browser checks use isolated synthetic account records, documented in
[Visits evidence](evidence/2026-09-30/visits/README.md). This does not close authenticated staging
journeys, visit detail/crew behaviour or the native Visits port.

Customer Home and the floating app navigation now follow the supplied Frame/Today source.
Owner-bound paginated reads, SAST dates, legacy booking links, honest account states and keyboard
search are covered by focused checks and a passing scoped review on 1 October. Seven-width
[Home/navigation evidence](evidence/2026-09-30/today/README.md) uses isolated synthetic records;
it is not proof of live authenticated journeys. The reviewed Profile overview/account/place
editors and notification feed have subsequent evidence in the coverage matrix. Remaining
preferences/destinations, notification settings/delivery, benefit semantics and native parity
remain open.

ZD-038 approves the handoff's shared-job crew price: Airbnb 5.5 hours with two Xooters is R393 base,
plus the separate R39 fee for a standard customer. The new server quote and clients use this rule.
Do not connect it to the legacy per-person booking writer. Atomic single-job creation, accepted-quote
recalculation, retries and complete crew earnings/lifecycle changes remain required before checkout.

The additive private SQL calculator `20260928003000_booking_quote_calculator.sql` is prepared
locally and not deployed. Eight executable checks cover 1,332 complete SQL/server quote pairs,
67 invalid cases, caller grants and read-only behavior; a planted R684 regression is detected.
The calculator does not itself authenticate, lock account facts, reserve workers or create a booking.
The forthcoming transaction must enforce those boundaries. The separate required SQL-contract
CI job passed on `c80fd40`; ordinary-suite skips are not being counted as SQL execution.

## Release gates

Record commit, environment, command/run link, date and result when closing each row. A failure stays open.

| Gate | Owner | Status | Required evidence |
|---|---|---|---|
| Startup and configuration | Engineering | In progress | Host-inferred production builds render; missing/invalid configuration fails before publish; no preview → production fallback. |
| Responsive visual fidelity | Engineering | Pending | Home, auth, booking, checkout, legal/security at 320/390/768/1024/1440/1920, landscape, zoom and high DPI. No overflow or persistent text blur. |
| Server quotes and accepted totals | Engineering | Pending | Itemized ZAR cents; explicit service/price acceptance; retry-safe booking; displayed/charged/invoiced amounts agree. |
| Crews | Engineering | Pending | One booking, multiple assignees; partial acceptance/replacement/cancellation/access/completion and reconciled earnings. |
| Referrals | Engineering | Pending | R100 eligibility/single-use/self-referral/concurrency checks; referrer credit only after paid completion; Xooter earnings preserved. |
| Payments and payout | Engineering + founder | Blocked / implementation pending | Sandbox proof, live merchant approval, signed notifications, duplicate/failure reconciliation, audited manual-bank payout. |
| Database and security | Engineering | Pending | Migrations apply, generated types agree, customer/Xooter/admin RLS tested, no secret leakage, relevant security review. |
| Default homes | Engineering | Locally implemented and reviewed as `d1c12ea`; [verification](evidence/2026-10-16/default-home/README.md) passes | One canonical default across web/native readers; PostgreSQL 17.11 22 scenarios/eight lock barriers, 1,774 aggregate tests and seven-size browser checks pass. Hosted migration/ACL/two-user proof and compatible rollout remain. |
| Xooter checklist and customer progress | Engineering | Partial / delivery and full journeys pending | Only actual accepted-worker actions update persisted tasks; customer receives progress; retry/reconnect/account changes remain correct; finite accessible reminder; photo evidence where required. Staging RPC presence alone is insufficient. |
| Booking-day address and revocable codes | Engineering | Pending | Current accepted assignees receive the destination on the Johannesburg booking day; codes remain separately revocable; cancellation/replacement/completion removes obsolete access across all read paths. |
| Auth and account deletion | Engineering + founder | Pending | Supabase Auth redirect allowlists; `xoot://auth/callback`; email, password reset, MFA for Admin Access; Google OAuth/Apple Sign in only when configured. |
| Real behavior and final company-wide review | Engineering | Pending | Every handoff action maps to a verified customer/Xooter/admin journey or named dependency; no fabricated production data or success states; final business-rule, privacy and security review covers every enabled service. |
| Customer and worker operations | Founder + engineering | Blocked / verification pending | Real approved helpers, monitored support and notification queue, booking chat role-based smoke testing via `send-booking-message`. |
| Receipts and private files | Engineering + founder | Pending | Approved invoice entity; private PDF read policy; `generate-booking-invoice` and `resend-booking-invoice` role checks and delivery. |
| Monitoring and recovery | Engineering + founder | Pending | Sentry/PostHog production data minimization, real failure alert, backup restore, rollback exercise and measured load test. |
| Legal/security commitments | Founder | Unconfirmed | Approved entity, contacts, policies, privacy/POPIA obligations and security response commitments. |
| GitHub release | Engineering | Pending | Reviewed tag, source ZIP, deployable website ZIP, SHA-256 checksums, setup/rollback notes and tested preview/live links. |
| Native distribution | Engineering + founder | Pending after website | Android APK/AAB, EAS signing, Apple Team ID/TestFlight, Google Play testing, real Android-device and physical iOS verification. |

## Owner steps, in order

1. **Hosting:** in Vercel, open the team for `xoot` and upgrade to a plan permitting commercial use
   before paid launch if the current plan does not permit it. The last plan check, on 12 September,
   reported Hobby; current billing eligibility still needs confirmation. [Vercel plan rules](https://vercel.com/docs/plans/hobby).
2. **Database deployment access:** the saved GitHub token previously configured staging origins
   and deployed Edge Functions. The staging dry run on 16 October SAST failed during
   project linking because that token lacks privileges for the required endpoint
   ([run 38815125826](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/38815125826)). In Supabase account access settings,
   grant the deployment identity the required project/database-management access, then replace the
   GitHub Actions token through secure settings if needed. Keep separate
   `SUPABASE_DB_PASSWORD_PRODUCTION` / `SUPABASE_DB_PASSWORD_STAGING` values. The observed failure
   occurred before password validation; it does not prove either saved password is wrong.
   The GitHub secret is named `SUPABASE_ACCESS_TOKEN`. For local CLI work, `supabase login`
   starts the secure login flow; logging in locally does not update that GitHub secret.
   Follow the [short access-repair steps](evidence/2026-10-16/live-state/README.md#database-deployment-access).
3. **Business details:** confirm legal business name, registration/tax details if applicable, public
   support contact and invoice details. Engineering will insert approved values; no invented identity.
   Invoice generation reads protected server settings `XOOT_INVOICE_LEGAL_ENTITY`,
   `XOOT_INVOICE_LEGAL_ENTITY_REGISTRATION`, `XOOT_INVOICE_VAT_RATE` and, when applicable,
   `XOOT_INVOICE_VAT_NUMBER`; use approved details and verify the generated receipt.
4. **PayFast:** complete merchant verification, then place sandbox and live credentials in their
   separate Supabase environments. Engineering will check callback URLs, signatures and reconciliation
   before changing payment capability flags. [PayFast documentation](https://developers.payfast.co.za/).
5. **Helpers and operations:** recruit the first helpers; identify who verifies them, manages bookings,
   answers support and authorizes payouts. Prepare a small consenting customer/helper pilot.
   The unpaid helper-selection decision is still pending: either hold selected helpers for a
   15-minute checkout window, or treat selections as preferences confirmed after payment.
   Nonempty selected rosters currently fail closed in the disabled booking foundation; no
   reservation or confirmed availability is promised while this policy is undecided.
6. **Provider access:** connect email, Mapbox, Cloudflare/Turnstile, Sentry and PostHog.
   Restricted Mapbox tokens need a separate public browser token and native Expo token.
   URL restrictions apply only to the browser key; native SDKs require a separate public key
   without URL restrictions. A secret downloads token stays build-only if the pinned SDK requires it.
   Confirm monitored delivery/incident queues. Twilio Verify/voice/WhatsApp sender/regulatory setup is
   required only for enabled capabilities, never assumed from an installed plugin.
7. **Legal review:** approve policies and public commitments; complete applicable registrations in the
   [Information Regulator portal](https://eservices.inforegulator.org.za/services.aspx). Engineering can
   prepare content/consent records, but cannot supply business decisions or legal approval.
8. **Review tooling:** CodeRabbit sign-in is complete. Engineering can run its review and fix relevant
   issues; no review is counted before a result exists. Sign in again only if the session expires.
9. **Mobile:** provide Expo, Apple Developer and Google Play access, and an Android phone/iPhone for real
   device checks. Engineering handles builds, signing configuration, store materials and submissions.
   Select the matching EAS environment for `EXPO_PUBLIC_SUPABASE_URL`,
   `EXPO_PUBLIC_SUPABASE_PROJECT_ID`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `EXPO_PUBLIC_EAS_PROJECT_ID` and `EXPO_PUBLIC_SITE_URL`. Association-file generation
   on Vercel uses `XOOT_APPLE_TEAM_ID`, `XOOT_IOS_APP_ID` and
   `XOOT_ANDROID_SHA256_CERT_FINGERPRINTS`; rebuild and verify the real `/.well-known/`
   files after approved signing values are supplied. Keep `za.co.xoot.app`.

The engineer continues independent work while these are pending. Codex and connected agents can
prepare/configure authorized services and verify results once access is available. Identity checks,
contracts, business decisions, staffing and consenting participants still require the founder or
an authorized person; Dots cannot establish those real-world facts through code.

## Delivery and rollback sequence

1. Finish local implementation; run typecheck, lint, relevant/full tests, build, dependency review,
   artifact/secret scans and security review. Test the rendered built website.
2. Build a preview with explicitly selected staging public configuration. Verify it addresses staging.
3. Inspect live migration ledger and function metadata. Do not repeat historic metadata repair merely
   because an old guide says `MIGRATIONS_FAILED`. Use the guarded repair allowlist only for a measured
   mismatch. **Do not repair-mark split** migrations as applied without proving their schema effects.
4. Apply reviewed migrations through the Supabase CLI to staging, then deploy all affected functions
   including shared importers. Run customer/Xooter/admin journeys and money invariants.
5. Record migration/restore rollback options before production. Use backward-compatible staged schema
   delivery. Never apply a destructive migration and assume the old website/function bundle can run.
6. Satisfy owner gates, select the reviewed commit and exact production environment, deliver schema then
   functions in the tested order, and deploy Vercel. Recheck actual rendered production routes and APIs.
7. Publish private GitHub assets for the verified commit. Downloads require authorized GitHub access.
8. Run the pilot, monitor real errors and reconcile money before broad promotion. Load checks use
   `LOAD_TEST_ENV=staging` and `LOAD_TEST_SUMMARY_PATH`; a 10,000-request run alone proves no capacity
   claim. Test backup restoration and rollback against the release being shipped.

## Provider and feature follow-through

- Check leaked password protection and Supabase security advisors; provision admin `public.user_roles`
  through approved server operations with MFA. Never expose bank details or access instructions in logs.
- Concierge must verify `support-respond`, `report-concierge-answer` and the human handoff queue.
- Verify `ENCRYPTION_KEY` through an authorized staging save/read test before private access details
  are enabled. Use separate environment keys; do not rotate a key without a re-encryption/restore plan.
- Twilio names currently consumed by source include `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`,
  `TWILIO_API_KEY_SECRET`, `TWILIO_CONVERSATIONS_SERVICE_SID`, `TWILIO_VOICE_APP_SID`,
  `TWILIO_WEBHOOK_AUTH_TOKEN` (with `TWILIO_AUTH_TOKEN` fallback), and capability-scoped
  `TWILIO_CALLER_ID`. `TWILIO_PROXY_SERVICE_SID` is only relevant to the optional masked PSTN path;
  verify current provider support before investing in that path. Keep all secrets server-side.
  The in-app data call does not require purchasing a phone number. Provider usage may still be billed.
  For calling, `twilio.masked_voice` and `twilio.operational_messages` gate the phone-number fallback.
  The WebRTC token does not read these controls; changing them cannot fix its missing credentials.
- Care+, recurring, gifts, loyalty, property/business and Concierge remain separate feature gates.
  Insurance, SOS and paid bounty rewards need functioning providers and approved operations.
- Vercel is the chosen website host. Netlify/Hostinger are legacy configuration, not additional launch
  targets. Existing SEO/content stack and publish/sync workflow must produce supported claims; no
  additional WordPress infrastructure is required merely because an old checklist mentioned it.
- The integrated Vercel/static policy retains `frame-src 'none'`, `frame-ancestors 'none'`
  and restrictive defaults, allows only the PayFast sandbox/live `/eng/process` form
  targets plus the current Supabase/Mapbox and default PostHog connections. Payment
  gates remain disabled. Before enabling an environment-selected Sentry DSN, another
  PostHog host or a real Turnstile widget, review and add only its exact required
  connect/script/frame origins, then verify rendered provider behavior and headers.
- Native assistant tests, deep links, notifications, payment recovery and account deletion remain
  required in addition to emulator checks. Keep production application identity `za.co.xoot.app`.

## 20 September implementation checkpoint

This is a partial implementation checkpoint, not a production-readiness declaration.
All seven HTML references and all uploaded ZIP contents remain in scope.

- Original Caveat logo now appears in website navigation, footer, authentication and legal layouts.
- Homepage composition now includes the source Gift/Care+ bands, illustrated map, character artwork,
  service/trust/people/how-it-works sections and footer. Authentication and booking presentation,
  the shared legal layout and the security-reporting page have been ported.
- Native Today and Visits screens use actual profile/booking data, the handoff palette and bundled
  font weights. Remaining native screens, native device comparisons and distribution are unfinished.
- Local public-page checks covered home, auth, Care+, legal terms and security at
  320/390/768/1024/1440/1920. No horizontal overflow or page exceptions were observed.
  The real staging directory returned HTTP 200 with zero approved profiles; this renders an honest
  empty state. Booking deep links reached authentication at all six widths.
- Evidence: workspace outputs/xoot-visual-20260920/public-pages-check.json and associated screenshots.
  These checks prove those routes and widths only; they do not prove authenticated journeys,
  every legal document, browser zoom, landscape, native rendering or a pixel comparison of every section.
- Automated suite: 119 files / 1,220 tests passed on 19 September. The subsequent matching privacy
  regression and profile authenticity checks passed separately. Web/native type checks, lint,
  the staging build and the repository security checks also passed during this checkpoint.
- CodeRabbit attempt ended with `Connection failed: WebSocket closed`; there is no completed
  CodeRabbit report for this batch. A completed external review remains outstanding.

Outstanding: the gift recipient/payment flow still uses its older implementation and must preserve
website bundle choices and accepted server amounts. Authenticated account/booking/crew/payment/referral
journeys, native Search/Profile/remaining flows, remaining screen comparisons and production release
requirements are not closed by this checkpoint. Source visuals must remain intact while those real
contracts are completed.
