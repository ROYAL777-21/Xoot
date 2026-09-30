# Xoot production checklist

Current register: **30 September 2026**. This replaces the status claims in `blocker.md`,
`NEEDS-FOUNDER.md`, `founder-todo.md`, `next-session.md`, `go-live.md` and the old readiness guide.
Historical investigations remain in Git; they are not instructions to repeat migrations or change DNS.

Approved sequence: [production implementation plan](../implementation/production-plan-2026-09-11.md).
Engineering source: this private repository. Visual source: `design/handoff-2026-09-03/`.

## Verified state

| Area | Evidence and date | Status / next closing condition |
|---|---|---|
| Website hosting | On 11 September, `xoot.co.za` served Vercel headers and build commit `02bb284`. | Domain resolves. Do not import the old GoDaddy zone export. |
| Rendered startup | Hosted commit `105b926` renders home/sign-in at 1440 and 390 pixels on 30 September, without page errors or horizontal overflow. | Staging repair verified. Production still requires launch gates; this is not a production promotion. |
| Vercel access | Connector lists project `xoot`, `prj_tz7Ai5SwguPd645qBnnDn4wxu3Jw`, on 12 September. Team plan is Hobby. | Preview configuration possible; commercial hosting plan required for paid launch. |
| Design references | Seven HTML files match; seven newly supplied ZIPs contain identical Xoot sources. [Receipt](../implementation/design-source-receipt-2026-09-13.md). | Header/hero compared at six widths; remaining layouts require the same source-based port. |
| Staging schema | Read-only query on 21 September: 82 versions, latest `20260903120000`; gift RPC absent. | New `20260920200000_gift_order_contract.sql` not deployed. |
| Production schema | Read-only query on 21 September: 81 versions, latest `20260902120000`. | Crew/referral and new gift migration still absent. |
| Backend delivery | 51 source functions plus six obsolete production endpoints at audit. Shared code is bundled per function. | Compare versions/source, migrate first and redeploy every affected importer. |
| PayFast | Hosted checkout disabled; provider verification flags false in both environments at audit. | Signed webhook smoke tests, amount matching and reconciliation evidence required. |
| Supply | Production aggregate counts: zero Xooters and zero bookings, rechecked 21 September. | Recruit/verify helpers and run consenting pilot; no invented availability/reviews. |
| Supabase CLI | GitHub credentials configured staging origins and deployed the directory/matching functions (runs 34786060963, 34829457465, 35498593092). Database linking was denied in run 34786290645. | Correct the deployment identity's database-management access and keep separate database credentials. Local `supabase login` is optional for local CLI work; it does not replace the GitHub secret. |
| Reviews | CodeRabbit retry completed 20 September with 11 findings: eight addressed and three rejected with rationale in the visual ledger. Gift/native slices and the 26 September dependency/runtime slice passed scoped reviews. | Whole-branch release/security review still required before production. |
| Dependency audit | Full npm audits on 26 September: website zero; mobile three moderate, zero high/critical. | Mobile `expo-router → query-string → decode-uri-component` remains open; do not force an Expo downgrade or incompatible module override. |

These are timestamped observations, not continuing monitoring. A checked build or a reachable domain
does not prove booking, payment, data access, or operational readiness.

Latest reviewable checkpoint: [draft PR 46](https://github.com/ROYAL777-21/xoot-your-local-helpers/pull/46).
The [28 September preview evidence](evidence/2026-09-28/README.md) records the verified application
commit, hosted screenshots, responsive checks and CI results. This is not the completed production release.
The [30 September checkpoint](evidence/2026-09-30/README.md) adds current hosted screenshots,
real PostgreSQL concurrency results and the passing production-configured browser build.

The 28 September production schema check is red for pending gift/referral changes and generated
differences. The Claude security action did not run its scan because the Anthropic API credit balance
was too low; its nominal success is not review evidence. A result guard now exposes that failure.

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
did not recur and its URL remains unknown. Production CORS has not been loosened.
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

ZD-038 approves the handoff's shared-job crew price: Airbnb 5.5 hours with two Xooters is R393 base,
plus the separate R39 fee for a standard customer. The new server quote and clients use this rule.
Do not connect it to the legacy per-person booking writer. Atomic single-job creation, accepted-quote
recalculation, retries and complete crew earnings/lifecycle changes remain required before checkout.

The additive private SQL calculator `20260928003000_booking_quote_calculator.sql` is prepared
locally and not deployed. Eight executable checks cover 1,332 complete SQL/server quote pairs,
67 invalid cases, caller grants and read-only behavior; a planted R684 regression is detected.
The calculator does not itself authenticate, lock account facts, reserve workers or create a booking.
The forthcoming transaction must enforce those boundaries. A separate required CI job is being
added so SQL execution cannot be mistaken for an ordinary-suite skip.

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
| Auth and account deletion | Engineering + founder | Pending | Supabase Auth redirect allowlists; `xoot://auth/callback`; email, password reset, MFA for Admin Access; Google OAuth/Apple Sign in only when configured. |
| Customer and worker operations | Founder + engineering | Blocked / verification pending | Real approved helpers, monitored support and notification queue, booking chat role-based smoke testing via `send-booking-message`. |
| Receipts and private files | Engineering + founder | Pending | Approved invoice entity; private PDF read policy; `generate-booking-invoice` and `resend-booking-invoice` role checks and delivery. |
| Monitoring and recovery | Engineering + founder | Pending | Sentry/PostHog production data minimization, real failure alert, backup restore, rollback exercise and measured load test. |
| Legal/security commitments | Founder | Unconfirmed | Approved entity, contacts, policies, privacy/POPIA obligations and security response commitments. |
| GitHub release | Engineering | Pending | Reviewed tag, source ZIP, deployable website ZIP, SHA-256 checksums, setup/rollback notes and tested preview/live links. |
| Native distribution | Engineering + founder | Pending after website | Android APK/AAB, EAS signing, Apple Team ID/TestFlight, Google Play testing, real Android-device and physical iOS verification. |

## Owner steps, in order

1. **Hosting:** in Vercel, open the team for `xoot` and upgrade to a plan permitting commercial use
   before paid launch. The account currently reports Hobby. [Vercel plan rules](https://vercel.com/docs/plans/hobby).
2. **Database deployment access:** the saved GitHub token successfully configures staging origins
   and deploys Edge Functions. Database preflight failed during project linking because that token
   lacks privileges for the required endpoint (run 34786290645). In Supabase account access settings,
   grant the deployment identity the required project/database-management access, then replace the
   GitHub Actions token through secure settings if needed. Keep separate
   `SUPABASE_DB_PASSWORD_PRODUCTION` / `SUPABASE_DB_PASSWORD_STAGING` values. The observed failure
   occurred before password validation; it does not prove either saved password is wrong.
   The GitHub secret is named `SUPABASE_ACCESS_TOKEN`. For local CLI work, `supabase login`
   starts the secure login flow; logging in locally does not update that GitHub secret.
3. **Business details:** confirm legal business name, registration/tax details if applicable, public
   support contact and invoice details. Engineering will insert approved values; no invented identity.
4. **PayFast:** complete merchant verification, then place sandbox and live credentials in their
   separate Supabase environments. Engineering will check callback URLs, signatures and reconciliation
   before changing payment capability flags. [PayFast documentation](https://developers.payfast.co.za/).
5. **Helpers and operations:** recruit the first helpers; identify who verifies them, manages bookings,
   answers support and authorizes payouts. Prepare a small consenting customer/helper pilot.
6. **Provider access:** connect email, Mapbox, Cloudflare/Turnstile, Sentry and PostHog.
   Restricted Mapbox tokens need separate browser token and native Expo token; a secret downloads token stays build-only.
   Confirm monitored delivery/incident queues. Twilio Verify/voice/WhatsApp sender/regulatory setup is
   required only for enabled capabilities, never assumed from an installed plugin.
7. **Legal review:** approve policies and public commitments; complete applicable registrations in the
   [Information Regulator portal](https://eservices.inforegulator.org.za/services.aspx). Engineering can
   prepare content/consent records, but cannot supply business decisions or legal approval.
8. **Review tooling:** CodeRabbit sign-in is complete. Engineering can run its review and fix relevant
   issues; no review is counted before a result exists. Sign in again only if the session expires.
9. **Mobile:** provide Expo, Apple Developer and Google Play access, and an Android phone/iPhone for real
   device checks. Engineering handles builds, signing configuration, store materials and submissions.

The engineer continues independent work while these are pending. Identity checks, contracts, business
decisions, staffing and consenting participants cannot be completed through code alone.

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
