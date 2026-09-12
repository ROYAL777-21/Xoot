# Xoot production checklist

Current register: **12 September 2026**. This replaces the status claims in `blocker.md`,
`NEEDS-FOUNDER.md`, `founder-todo.md`, `next-session.md`, `go-live.md` and the old readiness guide.
Historical investigations remain in Git; they are not instructions to repeat migrations or change DNS.

Approved sequence: [production implementation plan](../implementation/production-plan-2026-09-11.md).
Engineering source: this private repository. Visual source: `design/handoff-2026-09-03/`.

## Verified state

| Area | Evidence and date | Status / next closing condition |
|---|---|---|
| Website hosting | On 11 September, `xoot.co.za` served Vercel headers and build commit `02bb284`. | Domain resolves. Do not import the old GoDaddy zone export. |
| Rendered startup | Browser at that commit threw missing `VITE_APP_ENV` while its deployment check passed. | Repair in progress; require homepage and sign-in browser assertions. |
| Vercel access | Connector lists project `xoot`, `prj_tz7Ai5SwguPd645qBnnDn4wxu3Jw`, on 12 September. Team plan is Hobby. | Preview configuration possible; commercial hosting plan required for paid launch. |
| Design references | Seven uploaded HTML files hash-match the committed handoff, checked 11 September. | Remaining layouts/interactions require screen comparison, not a fresh design. |
| Staging schema | Supabase migration list: 82 versions, including `20260903120000`, checked 11 September. | Recheck before delivery of new migrations. |
| Production schema | Supabase migration list: 81 versions, missing `20260903120000`, checked 11 September. | One known migration behind at audit; new implementation may add more. |
| Backend delivery | 51 source functions plus six obsolete production endpoints at audit. Shared code is bundled per function. | Compare versions/source, migrate first and redeploy every affected importer. |
| PayFast | Hosted checkout disabled; provider verification flags false in both environments at audit. | Signed webhook smoke tests, amount matching and reconciliation evidence required. |
| Supply | Production aggregate counts: zero Xooters and zero bookings, checked 11 September. | Recruit/verify helpers and run consenting pilot; no invented availability/reviews. |
| Supabase CLI | `projects list` reports missing access token on 12 September. Read-only MCP works. | Complete secure login flow; configure separate database credentials. |
| CodeRabbit | Old `.exe` was an ELF Linux binary. Signed Windows 0.7.6 installed in task tooling; authenticated on 12 September. | Ready for review; no CodeRabbit review result yet. |

These are timestamped observations, not continuing monitoring. A checked build or a reachable domain
does not prove booking, payment, data access, or operational readiness.

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
2. **Backend login:** run `supabase login` in your own terminal and finish browser sign-in. Do not paste
   its token here. Store `SUPABASE_ACCESS_TOKEN` and separate `SUPABASE_DB_PASSWORD_PRODUCTION` /
   `SUPABASE_DB_PASSWORD_STAGING` in secure environment settings. Never reuse staging's password as
   a production fallback. Engineering can then run CLI migration preflight and audited delivery.
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
