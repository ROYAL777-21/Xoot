# Xoot production checklist

## 25 October 2026 — current verified state and remaining release gates

This section supersedes all older dated instructions below. **The live site is release
`e0c021e9fde328098f33fb216b1efa720eadf2f1`**, not the new signed-in design. Vercel production
`dpl_ASWQX8BSgase9gUDTAZLxiF5GwDn` is READY; fresh public `build-info.json` reads on
`xoot.co.za` and `xoot.vercel.app` both returned that exact revision on 25 October. It includes
PR88 Trust/Journal, PR89 address/auth corrections and PR90 public crawlability. Approved homepage,
`main`, unrelated PRs and production provider/tracking switches were preserved.

### Website source and verification

- [PR92](https://github.com/ROYAL777-21/xoot-your-local-helpers/pull/92), source `26bb0ea` plus
  the final spacing/documentation follow-up, carries signed-in booking flowers; handoff Care+
  red heart/plus and type; account links to Airbnb/office dashboards, rewards and widgets;
  server-issued referral sharing; customer/Xooter review composition with honest empty states;
  real browser install controls and a private in-app upcoming-visit summary. It does not publish
  prototype testimonials, invent ETA/rewards, or implement desktop OS widgets. Property dashboards
  remain partial implementations of the complete handoff journeys.
- Independent website cross-review closed both findings at `26bb0ea`: canonical accepted/payment/
  reassigned/replacement statuses remain visible, and invite validation matches the server's
  four-character minimum. Negative control: old source 9 failed/28 passed; corrected 37 passed.
  Independent checks passed new regressions; two unchanged tests needed a larger local timeout.
- Local serial unit-only suite at `26bb0ea`: **166 files, 1,674 passed, 7 existing skips**.
  Web TypeScript, scoped lint, explicit production build, 50-page prerender and artifact security
  scan and source/security checks passed. This does not include the separate rendered browser suite or live provider/device
  acceptance. Isolated synthetic visual checks covered 390px and 1280px layouts and loaded handoff
  fonts. A final 390px widget check found and corrected missing side padding.
- GitHub release/security/PostgreSQL jobs **did not start**. The actual check annotation reports
  failed recent account payments or a spending-limit issue. No budget, billing setting or plan was
  changed; the founder explicitly requested preserving the current plan and spending limit.
  Vercel preview success and local tests do not replace these required CI results. Keep
  the PR unmerged until the checks run; do not post a fabricated successful status.

### Email and authentication

- Brevo **Free** sends transactional email as **Xoot <no-reply@xoot.co.za>**, with separate
  production/staging SMTP keys saved privately by the founder. Staging's first authorised alias
  received its code and completed normal Auth sign-in. Production Email OTP length was saved and
  read back as **6**; the website placeholder is `000000`. The founder confirmed an earlier real
  email-code sign-in, but exact six-digit production acceptance has not been rerun here.
- Zoho **Free** has four actual users: `nkosinathi@xoot.co.za`, `tshepang.mahlase@xoot.co.za`,
  `support@xoot.co.za`, `newsletter@xoot.co.za`. The requested `tshepang@xoot.co.za` is a verified
  alias of Tshepang's existing mailbox; his longer primary login remains. Founder completed the
  three new passwords privately. MX, SPF and Zoho DKIM are verified; existing Brevo/DNS records
  remain. Mailbox send/receive acceptance and newsletter campaign/consent setup are still open.
  `no-reply` is Brevo's outbound sender, not an additional Zoho inbox. Branded email content does
  not guarantee a custom sender avatar in every mail client.
- Public production Auth settings returned **Google enabled, Email enabled, Apple disabled**.
  Search Console domain ownership is verified. Google branding review remains separate; the
  provider's ownership-propagation wait has not yet elapsed/retry has not been submitted. A paid
  custom Supabase Auth domain was not purchased, so universal Xoot-only provider URLs are not proven.
- [PR94](https://github.com/ROYAL777-21/xoot-your-local-helpers/pull/94) isolates native Apple
  nonce/state/session binding, official iOS button, Android browser flow and strict/coalesced PKCE
  callbacks. At `be3bd74`, 18 pure native-auth tests and web/mobile TypeScript pass. Independent
  native review cleared the ten changed paths with 21 synthetic assertions; these are not an Expo
  lifecycle or device test. Expo is actually signed in as `don-pacho777`, with existing `zoot`
  project ID `b4c6e0b8-e2e7-40c5-b259-3b34c79be30b` linked to the correct GitHub repository. That
  ID matches app config. PR94 now aligns its slug/owner with that existing project (`zoot` /
  `don-pacho777`), while keeping the displayed Xoot name, bundle IDs and callback schemes.
  The follow-up at `d7c84d8` independently cleared identity/override and all-environment comparisons;
  the existing identity suite passed 5/5 and local Expo configuration resolved the expected project.
  The Apple account has no active Developer Program membership, and the founder explicitly chose
  to keep Apple pending. Signing/associations, authorised devices and signed-build acceptance remain
  required; no project was renamed and no build or membership was purchased.

### Addresses, GPS/ETA and communications

- [PR81](https://github.com/ROYAL777-21/xoot-your-local-helpers/pull/81) reviewed source `0748885` and
  [PR71](https://github.com/ROYAL777-21/xoot-your-local-helpers/pull/71) source `8e491fd` safely include
  the approved release base. PR81's provider match regression passes 22 focused tests and received
  independent review. Exact Gauteng source geometry/licence/provenance is pinned in the PR; intended
  geography never asserts actual approved worker availability.
- Staging `check-service-coverage` **v8 ACTIVE, verify_jwt=true**, with all five returned runtime
  files byte-matched to submitted PR81 source. Missing/malformed bearer requests both returned 401.
  `xoot-job-location` remains **v11 ACTIVE, verify_jwt=true**. Staging's actual GPS table has RLS,
  zero client policies/rows, and no SELECT/INSERT/UPDATE/DELETE privileges for anon or authenticated;
  service_role retains its server privileges. These checks are not the four-session privacy test.
- Only **one** of four founder-approved staging aliases actually exists as a confirmed normal Auth
  user/session. Approval of the remaining identities is recorded separately from verification.
  The loopback helper is no longer running and no session tokens were persisted. Its 11 synthetic
  transport/cleanup tests pass. The parameterised synthetic fixture SQL received static review but
  **was not executed**. Real customer/Xooter isolation, STOP/purge, stale fixes, actual ETA/provider
  operation, admin AAL2 dispatch, separately verified workers and device acceptance remain open.
- Approved active service zones remain **0**. Paid Mapbox address suggestions and verified-coverage
  enforcement remain off; production address authenticity and live GPS/ETA are not accepted.
  Permanent Geocoding/Directions licensing, provider/budget acceptance, all shared-module importer
  delivery and exact schema migration checks must be completed before activation. Never blindly
  redeploy the two booking writers across the known pricing/schema drift.
- [PR93](https://github.com/ROYAL777-21/xoot-your-local-helpers/pull/93), reviewed source `d3e27d7`, binds voice
  identities to booking/actor and checks authoritative contact-window eligibility at mint/join;
  adds a separate disabled `twilio.in_app_voice` control, five-minute/two-party/rate limits and no
  recording. Eligibility is a bounded five-minute lease, not instantaneous mid-call cancellation.
  Unsupported Conversations returns unavailable without grants/provider/outbox writes;
  existing Supabase E2EE website text is retained. Old code failed 19/20 new synthetic checks;
  corrected expanded suite passes **68**, final actual-handler subset **28**, root TypeScript and
  four-handler Deno checks pass. Independent review found and closed an inherited signature-order
  defect; both validators now match Twilio's ordinal parameter order, with a published fixed-vector
  test independent of the request signer. The reviewer reran 28/28 successfully.
- Staging-only delivery: `twilio-voice-twiml` **v21**, `twilio-token` **v22**,
  `twilio-conversation` **v22**, `twilio-voice-status` **v21**, all ACTIVE. All 16 returned runtime
  files match submitted source exactly. JWT verification stays on for the two user endpoints;
  the webhooks retain their existing signature-based authentication. Missing bearer requests
  returned 401 and unsigned callbacks returned 403. The dedicated voice control still has zero
  rows / none enabled. New migration is **not applied**, production handlers are unchanged and
  genuine JWT/provider/device tests remain required. Existing Twilio operational/masked controls
  are enabled in staging and disabled in production; these do not gate the old WebRTC handler.
  Twilio remains Trial; no calls, SMS, credits, numbers or upgrade were purchased. Status correlation,
  callback retention and usage cost acceptance remain before real activation.

No production migration, admin-role grant, payment/voice/tracking activation or new native build
was performed. Preserve production-only migration `20261008011821`; no ledger repair/stamping or
blind `db push`. Standalone Laundry & Ironing and 52-visit gift fulfilment remain incomplete; current
laundry/ironing add-ons do not prove either standalone product. Home-first personalisation remains
planning only, with optional exploration before a verified booking address.

### Older dated checkpoints (historical evidence only)

## 23 October 2026 — founder website refinements published

PR [#85](https://github.com/ROYAL777-21/xoot-your-local-helpers/pull/85) merged into approved `release/xoot-production` as `81733006f3595f5f6a4ecce95265dd958fd0a898`, retaining the separate article/sitemap release #86. Vercel production `dpl_Bzu712eNxrcFQKYgdCEDWMxh3A4Y` is **READY** and assigned both `xoot.co.za` and `xoot.vercel.app`; independent public `build-info.json` reads returned that exact revision on both domains. The automatic Git build had been a preview because production Branch Tracking still selected `main`. The production environment now tracks **`release/xoot-production`** instead; Save and dashboard reload verified persistence. Custom-domain auto-assignment remains enabled. No `main` source or unrelated PR was changed.

Live website scope: guest Sign in opens **Create your account** using the unchanged sign-up copy, with returning-user controls still available; hover/focus uses company purple `#6440e8`. The release also publishes complete email-code entry, real sign-out/cache isolation and admin UI MFA guards, the handoff Journal/Trust layout, Xoot/Care+ web marks and icons, temporary Concierge removal, one narrow-navbar booking action, and removal of the reference map/internal coverage instruction from website booking. The heart splash was already removed by #84. Source-level native marks are not an installed app release.

Final source head `956139e6074fcdc78da993d1d357430bd4455f3b` passed the full website/design/security verification job and PostgreSQL referral privilege tests in [CI 39972657444](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/39972657444); public-directory and Vercel checks passed. Local follow-up TypeScript, targeted lint and 16 auth tests passed. Codex Security's immutable `805c02d` to `9b23875` static review completed with no introduced exploitable candidates; the subsequent auth/navbar/template/reset diff was independently reviewed. External Claude review **failed for unavailable provider credits**; CodeRabbit skipped this base branch. Neither is represented as a clean review. This is website publication, not a complete production acceptance of the marketplace.

Google is Enabled in production after founder-private credential entry, and the founder reports it works. Branded Brevo Free SMTP and the complete-code email template are saved; a secondary secure app link is retained. A fresh owner-completed eight-digit email sign-in still needs acceptance. Apple, audited admin role provisioning, verified-address enforcement, private GPS/ETA/zone activation, standalone Laundry & Ironing and 52-visit gift fulfilment remain unfinished. No database migration, role grant, paid plan, payment/voice/tracking switch or signed mobile build was delivered. Separately verified workers, genuine JWT/MFA journeys, provider/privacy/licensing and exact migration checks remain required. The requested four company inboxes are not created; outbound sender authentication is not inbound email hosting.

Personalisation is **planning only**. The founder selected their home and a clear first-booking step as the initial experience; no personalised dashboard, new collection of home data or recommendations were implemented. [Detailed scope and evidence](evidence/2026-10-22/founder-website-auth-and-brand.md). Earlier dated entries below describe their inspection time and are superseded by this status.

## 22 October 2026 — founder website/authentication refinements in review

The genuine production reference basemap now renders with roads, suburb names, controls and attribution; no paid address suggestion or booking was submitted. Production's Magic link or OTP email template uses **Your Xoot sign-in code** and the Token variable. Follow-up found the live Email OTP length is **8**, while the old client truncated to six. Preserve the provider's eight-digit setting; source now accepts complete 6–10 digit email codes and the template wording no longer claims six. Brevo Free (300/day), authenticated `xoot.co.za` and verified **Xoot <no-reply@xoot.co.za>** are confirmed. All four email DNS records were added while preserving the existing five website records. The founder saved custom SMTP; reload confirms enabled status and sender/host, without reading the stored password. Under the founder's explicit approval, SMTP IP restrictions are off and API IP restrictions remain on. Delivered-code/sign-in acceptance remains required after the client fix is released.

First-visit sign-up, real sign-in/out/cache isolation, all-admin MFA guards, handoff Journal/Trust layout, company Care+ marks and corrected website icons are prepared on `feature/founder-website-refinements-20261022`. This is source/browser-preview evidence until exact-head CI and release readback complete. The isolated database admin-AAL2 predicate migration is **not deployed**, and the chosen founder has not received an admin role. Standalone Laundry & Ironing still needs complete client/server/SQL delivery and acceptance using canonical repository bundles. Do not describe either as active. [Scope, checks and provider evidence](evidence/2026-10-22/founder-website-auth-and-brand.md).

Private GPS/ETA/service zones remain separate in PRs #71/#81. Genuine authorised JWT/MFA/provider/device checks, separately verified workers, privacy/licensing and exact production migration checks remain open. Paid suggestions, production tracking, SOS, payment and calling gates remain closed.

## 22 October 2026 — website opens directly without the floating-heart splash

The founder requested removal of the heart animation at website launch. This release removes the `AppLaunch` import and mount from `src/App.tsx`; the router, authentication providers and approved homepage remain in place. Native startup and the shared/video animation assets are outside this website-only change. Website TypeScript, targeted App lint, approved-design/negative-control checks and eight existing routing/splash-parity tests passed. [Scope and evidence](evidence/2026-10-22/website-launch-overlay-removal.md). Verify the production deployment and public [build record](https://xoot.co.za/build-info.json) against the merged release revision before claiming publication.

The public Mapbox website key is already saved in Production Config and its first published build was verified at `56d7c7386c1195b3bea398bb873a20c10f653176`, Vercel `dpl_38BF3JviceQi7hCfY3SkhycxFsx9`. The inspected entry/booking assets contain a public `pk.` token-shaped literal and no `sk.` token-shaped literal; no token was printed. The served booking route uses `strict-origin-when-cross-origin` and retains CSP support for Mapbox API/tiles/events and blob workers. Mapbox's official matching rules allow the configured exact origins to cover site subpaths; this is configuration evidence, not a successful provider request. Paid address suggestions remain explicitly off. **The entire GPS/ETA/service-zone integration is not yet production accepted:** real authorised JWT/MFA/provider/device checks, worker availability, privacy/licensing review and exact migration reconciliation remain required; PRs #71/#81 stay separate and disabled. No further browser key is needed from the founder for this web release.

---

## 22 October 2026 — monochrome map release and cost containment

Founder authorised a visual production release without another acceptance cycle and requested minimum Mapbox costs after a reported USD 6 invoice. The connected Mapbox billing notification identifies Permanent Geocoding; exact invoice quantities/tax remain uninspected. Web/native booking map source now uses a clean monochrome style and preserves attribution. Manual address entry remains available, and the paid suggestion/confirmation flow is **off by default**. Vercel's new `VITE_MAPBOX_ADDRESS_SUGGESTIONS_ENABLED` is saved as `false` for production and preview. Native changes require a separate signed build; no paid build was started.

This web release does not enable private GPS/ETA, activate Gauteng service zones, apply production migrations or change payment/voice flags. PRs [#71](https://github.com/ROYAL777-21/xoot-your-local-helpers/pull/71) and [#81](https://github.com/ROYAL777-21/xoot-your-local-helpers/pull/81) remain separate. The founder reports replacing both staging Mapbox credentials with the prepared public-scope token; the current browser connection cannot yet independently verify that replacement. Existing genuine-user JWT/MFA, physical-device, privacy/provider and exact production migration requirements remain open for tracking/coverage activation.

Web/native compilation passed. No new acceptance suite or real provider request was run under the founder's latest instruction. A source commit is not deployment proof: inspect the target production deployment and public `build-info.json` before describing the website as live. [Scope, cost rates and evidence limits](evidence/2026-10-22/monochrome-and-cost-controls.md).

---

## 15 October 2026 — guarded production referral predecessor prepared, not deployed

A new `20260903000000_referral_base_prerequisite_convergence.sql` precedes the untouched ZD035 migration and reconstructs the missing April referral baseline **only if both tables are absent**. It validates canonical keys/columns and refuses partial/unknown policies; it creates the missing `gen_referral_code()` only when absent and enforces owner-bound RLS and least-privilege grants. PostgreSQL 17.6 integration tests exercise both missing and already-migrated paths, the unchanged ZD035 migration, and planted failure cases.

**This is repository readiness, not production database delivery.** The older version needs a reviewed, exact-ordered migration operation; indiscriminate `--include-all` could apply other pending changes. Production's external `20261008011821` safety-PIN entry and GitHub database access still need reconciliation. No production migration has been dispatched. [Full dependency sequence and proof boundaries](evidence/2026-10-15/referral-baseline-reconciliation.md).

---

## 15 October 2026 — live referral privilege hardening (staging only)

Staging `fxmxyabdjqviqbcxmvlp` had effective client `TRUNCATE` privileges on both `public.referrals` and `public.referral_redemptions` despite RLS. The migration `20261015102137_referral_client_grants_least_privilege.sql` was **applied to staging** through Supabase, and post-apply SQL now confirms: `anon` no table privileges; `authenticated` SELECT only subject to RLS; `service_role` preserved. No staging customer data was modified by the privilege-only DDL. The same-source Postgres 17 negative controls now gate release CI. Full evidence: [15 October referral permission audit](evidence/2026-10-15/referral-privilege-verified.md).

**Production has not received this migration.** Its referral base tables AND `gen_referral_code()` are absent, although its signup handler exists. The new migration intentionally fails on missing tables and cannot substitute for reconstructing their canonical shape; do not repair-stamp it or run ZD035 blindly. Migrate the missing base tables in audited dependency order after reconciling the live-only `20261008011821` safety-PIN entry. Quote/checklist functions, production checkout/calling, live browser, and independent security gates remain open.

---


## 14 October 2026 — release status override
**Critical schema drift:** Production is also missing `public.referrals` and `public.referral_redemptions` entirely, even though staging contains them. This invalidates the ZD035 migration's assumption that the referral tables pre-exist, and blocks a reliable `get-booking-quote` deployment. Reconstruct and verify the full live referral schema first; never apply the current column-only migration blindly or mark it applied without equivalent data/catalog evidence.


**Latest follow-up:** Release-verification PR #51 passed its redesign CI and was merged into `release/xoot-production` as `250c2111`. Vercel production build `dpl_87WSF9AuX1g4yzZuunHqKerRQRQs` reports `READY`. The public, read-only `public-xooter-directory` function is now `ACTIVE` (version 1) in production, but its live HTTP response still requires runner verification. `get-booking-quote` and `xooter-job-checklist` remain missing in production. The latter also depends on `20261007150000_checklist_active_job_mutation.sql`, whose service-only RPC is missing in **both** Supabase projects. Apply missing staging migrations in correct order and reconcile the production-only safety-PIN entry before production schema rollout. Paid and voice flags stay off. The separate Claude security-review run has not passed. See `docs/release/evidence/2026-10-14/goal-continuation.md`.


This checkpoint supersedes dated **website deployment** claims below. It does not
replace the detailed backend and operational release gates or retroactively close
any phase in the founder's `docs/release/build-loop.md` goal.

- **Chosen website:** the September handoff redesign, isolated on
  `release/xoot-production`. It includes gift/Care+ public bands, designed
  homepage/navigation and a mobile input-focus correction.
- **Vercel release:** production deployment `dpl_AEAJE9CFoZRR991X81rsCCrngbk2`
  from commit `a89ddbbc2c78264717351f06c7df2b718f6eee9e`,
  `READY` and assigned `xoot.co.za` and `xoot.vercel.app`.
  This is Vercel API evidence, **not** a browser/DNS proof.
- **Automatic production build guard:** Vercel's Ignored Build Step was set to
  run production builds only from `release/xoot-production`. A simulated shell
  check correctly skips `main` and the Codex implementation branch while
  allowing release production and other preview builds. Recheck this host setting
  after project/Git integration changes. Manual promotion can still override it.
- **Visual release guard:** `npm run design:check` runs before `vite build`
  and checks the approved homepage and typing-focus fix, including negative
  controls. `scripts/ops/verify-approved-design.mjs` checks desktop/mobile
  rendering and text entry without falsely claiming a working backend; the
  `Verify approved Xoot redesign` GitHub Actions workflow runs on release
  branch updates. Full live browser and directory smoke checks remain required.
- **Do not merge ongoing work:** Codex PR #46 remains separate, draft and
  incomplete. No automatic merge into `main` should be inferred from the
  website release.
- **Payment and voice launch gates stay closed.** There is no proof of a PayFast
  sandbox payment confirmation or a real two-leg Twilio conference.
- **Backend:** the 14 October read-only Supabase check counted 82 migrations
  and 57 deployed functions in production; the production project still lacks
  `public-xooter-directory`, `get-booking-quote` and
  `xooter-job-checklist`. Staging has all three. Schema ledger reconciliation,
  tested migrations, owner-authorized database deployment identity and typed
  contract verification precede deployment.
- **Independent security review:** failed due Anthropic account credit; do not
  mark this security gate passed. Supabase currently advises enabling leaked
  password protection. Existing private `/xooter/*` header policy is improved
  but still requires an actual served-header check.
- **Routing risk:** the older Netlify project still advertises `xoot.co.za`.
  Vercel aliases by themselves do not establish where public DNS routes. If
  `xoot.co.za` and `xoot.vercel.app` display different versions, resolve
  DNS/custom-domain ownership; do not republish or reset the older `main`
  version. The approved website host is Vercel.

Full recorded provider/branch evidence:
`docs/release/evidence/2026-10-14/README.md`. Keep the release stable while
implementing unfinished app source screens, booking/crew/referral/payment
fulfilment and mobile capabilities on isolated review branches.

---


Current register: **8 October 2026**. This replaces the status claims in `blocker.md`,
`NEEDS-FOUNDER.md`, `founder-todo.md`, `next-session.md`, `go-live.md` and the old readiness guide.
Historical investigations remain in Git; they are not instructions to repeat migrations or change DNS.

Approved sequence: [production implementation plan](../implementation/production-plan-2026-09-11.md).
Engineering source: this private repository. Visual source: `design/handoff-2026-09-03/`.

## Verified state

| Area | Evidence and date | Status / next closing condition |
|---|---|---|
| Website hosting | On 8 October, `xoot.co.za` reports main commit `9504c11`; an actual browser check fails with the missing `VITE_APP_ENV` configuration overlay. [Evidence](evidence/2026-10-08/README.md). | Domain resolves; the public deployment is unusable. The reviewed implementation preview renders correctly. Do not import the old GoDaddy zone export. |
| Rendered startup | [Current preview](evidence/2026-10-08/README.md), commit `8aca3d8`, renders home/sign-in at 1440 and 390 pixels on 8 October without page/console errors or overflow. Real staging directory response: zero approved profiles. The repaired browser gate detects the missing production endpoint rather than navigating away before it fails. | Correction and reviewed main integration are published and verified on staging. Deliver the reviewed production backend before launch. Use the configured stable preview origin. |
| Vercel access | Connector lists project `xoot`, `prj_tz7Ai5SwguPd645qBnnDn4wxu3Jw`, on 12 September. Team plan is Hobby. | Preview configuration possible; commercial hosting plan required for paid launch. |
| Design references | Seven HTML files match; seven newly supplied ZIPs contain identical Xoot sources. [Receipt](../implementation/design-source-receipt-2026-09-13.md). | Header/hero compared at six widths; remaining layouts require the same source-based port. |
| Staging schema | 7 October read-only metadata: 83 versions, latest `20261003140000`. Exact-version lookup confirms gift, quote, benefit, notification, October 4 hardening and October 7 path migrations absent. | Reconcile the complete prepared migration sequence; a newer latest timestamp does not prove older additions were delivered. |
| Production schema | 8 October read-only metadata: 82 versions, latest `20261008011821`, an externally applied safety-PIN change absent from repository migrations. The earlier exact-version lookup found none of the eight prepared September/October versions. | Reconcile the new external ledger entry with its actual statements and reviewed PIN contract. Crew/referral and subsequent prepared delivery remain incomplete; a newer timestamp does not establish their delivery. |
| Backend delivery | 7 October inventory: staging 54 functions, production 57. Production lacks `public-xooter-directory`, `get-booking-quote` and `xooter-job-checklist`; staging has active v1 of all three. | Production delivery is incomplete. Compare source versions, migrate first and redeploy affected importers. Do not hide missing dependencies in the browser gate. |
| Notification delivery/security | 7 October catalog still shows missing notification publication and eight excess client TRUNCATE/TRIGGER grants. [Prepared migration evidence](evidence/2026-10-02/notification-database.md) and [CI](evidence/2026-10-07/integration-preflight.md): 23 groups/30 expected denials pass on PostgreSQL 17.6 and 17.11; independent review passed. | Migration is prepared, not deployed. Apply through the audited CLI and verify signed-in delivery. Client subscriptions/local SQL alone are not hosted delivery evidence. No private hosted rows were read or changed. |
| Dependencies | 8 October reviewed compatible patches: web npm audit zero; mobile 26 package findings, representing three remaining advisories (23 high, 3 moderate, zero critical with parent attributions). [Disposition](../security/dependency-advisories-2026-10-07.md). | Mobile braces/node-forge lack supported patches; the fixed decoder needs compatible Expo/Metro integration proof. Native release gates remain open. No forced framework downgrade or unsupported clean-scan claim. |
| PayFast | Hosted checkout disabled; provider verification flags false in both environments at audit. | Signed webhook smoke tests, amount matching and reconciliation evidence required. |
| Supply | Production aggregate counts: zero Xooters and zero bookings, rechecked 21 September. | Recruit/verify helpers and run consenting pilot; no invented availability/reviews. |
| Supabase CLI | GitHub credentials previously configured staging origins and deployed directory/matching functions. Fresh read-only staging preflight on 8 October, [run 37711711676](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/37711711676), passed credential-presence/setup checks but failed at `supabase link`: access token/project pair lacks the required endpoint privileges. No database changes were attempted. | Correct the deployment identity's database-management access and keep separate database credentials. Local `supabase login` is optional for local CLI work; it does not replace the GitHub secret. |
| Reviews | CodeRabbit retry completed 20 September with 11 findings: eight addressed and three rejected with rationale in the visual ledger. Gift/native slices and the 26 September dependency/runtime slice passed scoped reviews. | Whole-branch release/security review still required before production. |

These are timestamped observations, not continuing monitoring. A checked build or a reachable domain
does not prove booking, payment, data access, or operational readiness.

Latest reviewable checkpoint: [draft PR 46](https://github.com/ROYAL777-21/xoot-your-local-helpers/pull/46).
The [8 October integration checkpoint](evidence/2026-10-08/README.md) verifies `8aca3d8`
on the actual hosted preview. Required Tests CI passed 152 files / 1,559 tests and all SQL/
PostgreSQL jobs. Production directory, schema comparison, external review and deployment
access remain failed gates; source coverage and paid/native journeys are still incomplete.
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
The isolated SQL contract covers 50 groups, but independent-connection PostgreSQL
contention and actual hosted role journeys remain required before applying this change.
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
| Auth and account deletion | Engineering + founder | Pending | Supabase Auth redirect allowlists; `xoot://auth/callback`; email, password reset, MFA for Admin Access; Google OAuth/Apple Sign in only when configured. |
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
   and deployed Edge Functions. The read-only staging preflight on 8 October failed during
   project linking because that token lacks privileges for the required endpoint
   ([run 37711711676](https://github.com/ROYAL777-21/xoot-your-local-helpers/actions/runs/37711711676)). In Supabase account access settings,
   grant the deployment identity the required project/database-management access, then replace the
   GitHub Actions token through secure settings if needed. Keep separate
   `SUPABASE_DB_PASSWORD_PRODUCTION` / `SUPABASE_DB_PASSWORD_STAGING` values. The observed failure
   occurred before password validation; it does not prove either saved password is wrong.
   The GitHub secret is named `SUPABASE_ACCESS_TOKEN`. For local CLI work, `supabase login`
   starts the secure login flow; logging in locally does not update that GitHub secret.
   Follow the [short access-repair steps](evidence/2026-10-08/README.md#restore-database-deployment-access).
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
6. **Provider access:** connect email, Mapbox, Cloudflare/Turnstile, Sentry and PostHog.
   Follow [Mapbox production runbook](mapbox-production-runbook.md): the browser token can use URL restrictions, but native iOS/Android tokens **cannot**; Expo native token must be public `pk.`, and real-device tile load is a release gate. Native SDK downloads tokens are only necessary when a pinned build demonstrably requires one.
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

**14 October founder UX request:** A correct full year of weekly cleaning is 52 visits, not 12 (or 32). Gift UI must not advertise unsupported annual gifting; it can describe 12 cleans as about three months weekly. Every bookable service defaults to once weekly, with one matching first-visit repeat weekday and an explicit one-off alternative. These are frontend defaults, not proof of a recurring booking contract or gift payment capability. Review isolated PR `feature/weekly-default-gift-design-20261014` before production promotion. Full website/native design source comparison still outstanding.
