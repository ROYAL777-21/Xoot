# Xoot Production Blockers

Reviewed: 2026-08-02

This file lists unresolved blockers only. Resolved implementation history lives in git
commits, Supabase migration history, and phase reports. Items closed at each review are
listed once under "Closed at review" at the foot of the file, then dropped.

Everything dated 2026-08-02 in this file was re-verified live against both Supabase
projects on that date, not carried forward on trust.

## Live security holes — fix before anything else

- **The client is the source of truth for facts the business is supposed to decide.**
  Confirmed against production on 2026-08-02 by joining table GRANTs to permissive policies
  — a write is only reachable when a role holds both. `FOR ALL USING (user_id = auth.uid())`
  was written across the schema to mean "this row is yours"; Postgres reads it as "you may
  write anything in this row", because RLS is row-level and has no opinion about columns.
  Reachable by any signed-in user, today, with one PATCH and no UI:

  | Table | What the client can set about itself |
  |---|---|
  | `zooter_applications` | `status`, all seven `*_verification_status` columns, `background_check_status`, `behavioural_screening`, plus `reviewed_by`/`reviewed_at` — self-approve **and** stamp an admin's UUID on the approval |
  | `zooter_documents` | `status` — mark own ID documents verified |
  | `zooter_training_completions` | `passed`, `score` — self-certify safety training |
  | `loyalty_points` | `points`, `free_credits` — mint ZootCred, which `redeem-zootcred` spends on real services |
  | `care_plus_applications` | `status`, `admin_fee_paid` — self-approve membership, mark the fee paid |
  | `gift_clean_orders` | `amount`, `status`, `payment_record_id` — issue a paid gift order without paying |
  | `booking_status_events` | insert/update/**delete**, including `actor_id` — forge or erase the booking audit trail |
  | `booking_completion_photos`, `trust_incidents` | update/delete — destroy the evidence of an incident you are party to |
  | `zooter_jobs` | `state` — accept a job never offered, un-decline a declined one |
  | `post_job_reviews` | update/delete — rewrite or remove reviews after the fact |

  Worst of these is `zooter_applications`: for a company whose product is sending vetted
  people into homes, a self-assignable vetting badge is the whole trust model.

  Also: **`anon` held INSERT/UPDATE/DELETE grants on roughly twenty tables**, including
  `zooter_applications`, `loyalty_points` and `sensitive_access_logs`. RLS blocked it
  because `auth.uid()` is null for anon — but the anon key ships inside the web bundle and
  the app binary, so that is one permissive policy away from being live.

  Fixed by `supabase/migrations/20260802120000_client_write_surface_lockdown.sql`, which
  uses **column-level GRANTs** — unlike RLS, GRANT is column-aware and is checked before
  any policy runs. **Applied and verified on staging 2026-08-02; NOT applied to
  production.** Production needs a founder go-ahead because two follow-ups below will
  break client flows that currently rely on writing these columns.

- **Correction to the 2026-08-02 entry that previously headed this file.** It claimed a
  customer could PATCH their own booking price to zero. That is **not** reachable:
  `authenticated` holds only SELECT on `public.bookings` — no UPDATE grant — so the
  `update own bookings` policy cannot be exercised. The same is true of
  `zooters_update_self_or_admin`: `authenticated` has no UPDATE grant on `public.zooters`,
  so a Xooter cannot set their own `verified` or `background_checked` flag either. Both
  policies are still wrong and should be narrowed, but as latent hazards, not live holes —
  they become exploitable the moment anyone grants UPDATE.
  `20260730083000_booking_price_author_guard.sql` is still worth applying as the
  defence-in-depth that makes the grant safe to add later.

- **Two client flows will fail closed once the lockdown reaches production**, and each
  needs an Edge Function before that happens:
  1. **Training completion** — grading must move server-side. Until it does, no completion
     can be recorded from the client. That is the correct failure; a false record of safety
     training is worse than no record.
  2. **Xooter job accept/decline** — must go through `ops-workflow` or a sibling function.
- **Six Edge Functions are live in production with no source in this repository**:
  `sensitive-access-read`, `sensitive-access-save`, `twilio-token`, `twilio-conversation`,
  `twilio-voice-status`, `twilio-voice-twiml`. Diffed live against `supabase/functions/`
  on 2026-08-02. Two of them read and write the sensitive-access table — gate codes, alarm
  codes, access instructions — with service-role reach, and `twilio-voice-status` and
  `twilio-voice-twiml` run with `verify_jwt: false`, so they are publicly invocable. None
  of the six can be reviewed, diffed, rolled back, or redeployed from the repo, and if the
  platform copy is lost the code is gone. Pull each one's source from the dashboard,
  review it, commit it, and redeploy from the repo — or delete it if it is dead. Until
  then, treat the production function surface as partially unaudited.
- Staging and production Supabase security advisors both report leaked password protection
  disabled. Re-verified 2026-08-02: this is now the **only** security-advisor finding on
  either project. It is one Auth-settings toggle per project. Enable it, or record an
  explicit launch risk acceptance before public launch.

## Supabase

- Live Supabase Auth redirect allowlists still need API/dashboard configuration and
  verification for local web, staging, production, Expo dev client, `zoot://auth/callback`,
  Google OAuth, and Apple Sign in callbacks. Local `supabase/config.toml` contains the
  intended redirects, and `scripts/ops/set-supabase-auth-config.ps1` dry-runs passed on
  2026-07-01 for production project `mvlrkelahhsyjrwgsxaf` with `https://zoothome.co.za`
  and staging project `fxmxyabdjqviqbcxmvlp` with `https://staging.zoothome.co.za`. Live
  apply still requires a rotated local `SUPABASE_ACCESS_TOKEN`, target project ref, and
  explicit `-SiteUrl` so localhost is not applied to staging/production accidentally.
- Supabase MCP is configured for read-only inspection. Supabase CLI `2.108.0` is installed,
  but separate CLI auth still requires a local `SUPABASE_ACCESS_TOKEN` or secure login flow
  before live Auth config can run. Rechecked 2026-08-02: no `SUPABASE_ACCESS_TOKEN`,
  `ZOOT_PRODUCTION_SUPABASE_DB_URL`, `ZOOT_STAGING_SUPABASE_DB_URL`, or `SUPABASE_DB_URL`
  is available in the working shell. Migration repair can instead use the guarded
  `-PromptDatabasePassword` mode after the matching rotated database password is entered
  locally.
- **Schema source of truth is undecided (ZD-005).** Production and staging migration
  histories still diverge: re-listed 2026-08-02, production starts from the 2026-05-19
  launch squash (33 recorded migrations) while staging follows the local chain from
  2026-04-21 (49 recorded migrations). Runtime app-schema drift for
  `booking_zooter_profiles`, saved-address fields, Care+ application fields, Zooter
  application fields, booking event metadata, and the Zooter application `user_id`
  uniqueness constraint was fixed and verified on 2026-07-01 through
  `live_schema_convergence_app_runtime`; see
  `docs/implementation/live-schema-convergence-20260701.md`. Four local migrations are
  written and unapplied behind this decision — the two Concierge migrations below and the
  two from 2026-07-30 above. Future deploys must use the controlled migration scripts
  rather than assuming a clean `supabase db push`.
- The production `main` branch still reports `MIGRATIONS_FAILED` through Supabase branch
  metadata; re-confirmed 2026-08-02. Read-only migration inspection on 2026-07-09 confirmed
  that both projects contain the equivalent booking action, Concierge, payment/payout, and
  Twilio migrations under Supabase-generated timestamps. The guarded repair allowlist is
  therefore still valid for local versions `20260629113000`, `20260629200351`,
  `20260630005420`, and `20260630102715`, while known split migrations remain blocked. Both
  environment planners passed again on 2026-07-09. A repo-level drift manifest and
  non-destructive checker exist at `supabase/migration-drift-allowlist.json` and
  `scripts/ops/check-supabase-metadata-drift.ps1`; run
  `npm run ops:supabase:drift-check -- -Environment production` and
  `npm run ops:supabase:drift-check -- -Environment staging` before any future repair. Live
  dry-run and repair remain blocked only by the absence of locally loaded rotated database
  access. Do not repair-mark split storage-owner migrations.
- A working PostgreSQL client is available at the local Scoop extraction path used by the
  provider-auth diagnostic. Docker is still unavailable on the founder's Windows host, so a
  full local Supabase database reset still requires Docker or a separate ops shell.
- Supabase performance advisors still report workload-dependent unused-index candidates in
  staging and production. Direct catalog checks show no missing public FK-covering indexes,
  no targeted legacy policy residues, no missing expected advisor-cleanup policies, no raw
  `auth.uid()` predicates in public policies, no duplicate-permissive groups for the
  targeted tables, and no duplicate public index groups.
- Phase 2 booking chat blocker is role-based smoke testing with real staging/production
  booking participants: direct `messages` inserts revoked, participant sends through the
  Edge Function, read receipts written, and reports queued for admin review. The functions
  themselves are deployed and active in both environments with JWT verification enabled.
- Phase 4 completed-booking invoicing: `generate-booking-invoice` and
  `resend-booking-invoice` exist in the repo and are **not deployed to either project**
  (verified 2026-08-02). The private PDF read policy on `storage.objects` also still
  requires Supabase CLI/dashboard access with the correct storage policy owner role.
- Completed-booking invoice generation requires final reviewed legal/VAT values in Supabase
  Edge Function secrets: `ZOOT_INVOICE_LEGAL_ENTITY`,
  `ZOOT_INVOICE_LEGAL_ENTITY_REGISTRATION`, `ZOOT_INVOICE_VAT_RATE`, and
  `ZOOT_INVOICE_VAT_NUMBER` when VAT applies. The same VAT answer decides how tips are
  treated on an invoice — see the tipping item below.
- Concierge governance (`20260703150828_concierge_governance_controls.sql`) and structured
  human handoff (`20260703153056_concierge_structured_handoff.sql`) are implemented locally
  and **verified unapplied in both projects on 2026-08-02**. `report-concierge-answer` and
  `create-concierge-handoff` are also undeployed in both. `support-respond` is deployed and
  active, but at a version that predates the governance work, so the grounded metadata,
  client-redacted reporting, and safer Care+ fallback wording are not live. Handoff controls
  additionally need support-owner approval, enablement in staging only, and smoke tests
  proving redaction, booking ownership checks, urgent routing, and no external provider
  messages.
- Concierge production readiness still requires approval of draft commercial/high-risk
  knowledge files, especially `docs/agents/source-of-truth/care-plus-policy.md`,
  `care-plus-guide.md`, `booking-cover-guide.md`, and `zoot-black-guide.md`. Until those are
  approved, Concierge must route rather than promise pricing, benefits, Booking Cover
  outcomes, or Zoot Black availability.
- Concierge safe account-support tools remain intentionally disabled. Before enabling
  `concierge.authenticated_account_support`, `concierge.booking_status`,
  `concierge.support_case_creation`, `concierge.human_handoff`, or
  `concierge.model_answers`, Xoot still needs RLS/role smoke tests, support owner approval,
  human handoff testing, PostHog/Sentry privacy verification, and staging evidence that the
  bot cannot perform booking, payment, refund, Care+, ZootCred, Booking Cover, payout,
  admin, or sensitive-access actions.
- Anonymous Concierge Turnstile enforcement must stay disabled until a production domain and
  restricted Cloudflare Turnstile widget exist. When available, set
  `support.turnstile_required` or `ZOOT_REQUIRE_CONCIERGE_TURNSTILE=true` only after the
  rotated Turnstile secret is stored in Supabase Edge Function secrets.
- Zoot Black remaining database blocker is the private certificate PDF read policy on
  `storage.objects`, which requires Supabase CLI/dashboard access with the correct storage
  policy owner role.
- Zoot Black activation remains blocked by founder, operations, supplier, and legal
  approvals. Do not enable `zoot_black.enabled`, `zoot_black.area_pilot`, or
  `zoot_black.certificates`, expose a customer purchase path, or publish availability claims
  until approvals, pilot areas, equipment evidence rules, line-item amount, certificate
  wording, and smoke tests are complete.
- Phase 7 live payment/payout activation remains blocked by Stitch/Ozow production
  credentials, provider callback configuration, signed webhook smoke tests, finance
  approval, legal approval, payout account verification workflow, payout hold policy, and
  production reconciliation runbook. Do not enable `payments.provider_checkout`,
  `payments.hosted_checkout.stitch`, `payments.hosted_checkout.ozow`, or `payouts.enabled`
  until all approvals and tests are complete.
- Phase 9 Twilio live function deployment/smoke execution still requires Supabase
  CLI/session access or dashboard function deployment for `create-masked-call` and the
  relevant `ops-workflow` paths.
- Phase 10 Siri/App Intents and Android assistant shortcut foundation is implemented locally
  through `mobile/plugins/withXootAssistantIntents.cjs`. EAS development builds and physical
  iOS/Android assistant tests are still required before native release use.

## Tipping

- `supabase/migrations/20260730090000_booking_tips.sql` is written and **unapplied in both
  projects** (verified 2026-08-02). It creates `public.booking_tips` with `settled_at` as
  the visibility gate, five policies, the `enforce_tip_settlement_author()` trigger, and
  adds `'tip'` to `payment_records_payment_kind_check`. Tips live on their own table
  because RLS cannot hide a column (ZD-023).
- **No tip payout path exists.** ZD-023 records the founder decision that Xoot takes no cut
  of tips and that a Xooter cannot see a tip before rating the customer, but the money still
  has to reach the Xooter. That depends on the payment provider decision below, and on
  whether a tip is a payment to Xoot that is passed on, or a payment collected on the
  Xooter's behalf. Those two have different VAT and disclosure consequences.
- Tipping is claim-gated in code and cannot render a promise the system cannot honour:
  `TIP_READINESS` in `src/lib/tipping.ts` is `"schema_pending"`, `canOfferTip()` returns
  false, and `tip-policy.test.ts` fails the build if the UI offers a tip while it is unset.
  Advance it to `"capture_only"` only after the migration is applied, and to `"settled"`
  only after payout works end to end.

## Design and mobile app

- **The design source of truth changed on 2026-08-02** to `design/Xoot_App.html` — the
  Claude Design UI kit, 197 components across 35 screens, unpacked per `design/README.md`.
  Adopting it changes three things at once, and **the founder needs to say yes or no to all
  three** because together they supersede the recorded red/white direction:
  1. **Brand colour becomes violet** (`--xoot-violet-500` `#7C5CFC`) for emphasis,
     selection and progress, with **ink** `#151515` as the primary commit button.
  2. **Red is scoped, not dropped.** The kit reserves its red family for Care+ alone —
     "Xoot's UI is violet; Care+ is red, always. Use only for subscription surfaces: badge,
     paywall, the '+' mark, plan savings." `--xoot-careplus-500` `#E63329` is within a hair
     of the shipped `#e42a21`, so the company red becomes the membership colour rather than
     the colour of every button. `--zoey-fill` stays separate, so the mascot is unaffected
     either way.
  3. **Default scheme flips to light.** The kit is light-default with a
     `[data-theme="dark"]` opt-in; the native app is pinned dark. Changing it touches
     `app.config.ts`, the splash background, and the generated launch screen together —
     `ios-build-setup.test.ts` fails if one moves without the others.

  Colour is the only part of the port blocked by this. It is one file to change either way
  (`src/index.css`), because `design-tokens.test.ts` forces every other copy to follow.
- The deferred design queue in `docs/xoot-master-brief.md` §3.7 is still open by founder
  instruction ("deal with this at a later stage"): Zoey approaching and filling the screen
  red on first onboarding; a distinct company-red splash with "Xoot" written in cursive as
  handwriting; de-glossing the mascot; keeping the mascot in a dedicated company red via the
  existing `--zoey-fill` token; and an overall UI direction the founder said they would
  decide and communicate. The cursive splash no longer needs a typeface sourced — the kit
  embeds **Caveat Regular** as `--xoot-font-script` — only the letterforms converted to a
  stroke path so they can be drawn on.
- The display typeface needs a founder confirmation. The brief records **Georgia** on the
  founder's instruction; Georgia is a system font that cannot be licensed into an app
  bundle. The kit ships **Newsreader** as `--xoot-font-display` with Georgia as the CSS
  fallback only, which is the same register and is embeddable. Confirm Newsreader is an
  acceptable stand-in before the port hardcodes it.
- The Android preview APK (`114d0c10-c754-4426-9a90-9fdfeadb8a06`, versionCode 5) and the
  iOS simulator archive (`d4de44a1-d827-4045-b1a6-e427066fcd64`) were both built on
  2026-07-01 and **predate every change to `mobile/` since**: the native splash animation,
  the design-token rewrite, the Apple Sign-In module, and the two iOS build fixes. They no
  longer verify the current app. Rebuild before any device testing and do not cite the old
  artifacts as evidence.
- Physical iOS preview install readiness is still blocked because EAS has no
  internal-distribution iOS credentials suitable for non-interactive preview builds. iOS
  device verification is still required for normal launch, reduced-motion static launch,
  urgent route bypass, and safe Siri/Gemini deep links.
- No Mac is available in any current working environment, so nothing here can run an iOS
  simulator. `expo prebuild --platform ios` and `expo export --platform ios` verify
  configuration and bundling only — they do not verify that the app looks or performs
  correctly on device. Frame rate during app start and Dynamic Type at the largest settings
  will first be observable on real hardware.

## Provider secrets and external dashboards

- Real production secrets for Stitch, Ozow, Twilio, Brevo, KIE, OpenAI, Airtable, Hostinger,
  Cloudflare, Sentry, Expo/EAS, Apple, Google, Mapbox, and WordPress still need to be set in
  their correct secret stores.
- Private secrets must not be committed or placed in frontend/mobile env files. Store them
  only in Supabase Edge Function secrets, EAS secrets, GitHub/environment secrets, provider
  dashboards, or the approved password manager.
- Secrets pasted into chat, including Supabase, Cloudflare, Expo, PostHog private API,
  Mapbox token values, and CodeRabbit API values, must be rotated before production launch or
  long-lived production use. A Supabase CLI access token was also pasted into chat on
  2026-06-30 and must be rotated before it is used for production operations. The Twilio
  secret values previously pasted in chat were reported rotated on 2026-06-28; keep using
  only rotated values in approved secret stores.
- Provider secret verification and signed smoke tests still require an authenticated Supabase
  CLI/session, dashboard secret setter, or real provider dashboard access.
- Brevo invoice templates and delivery worker wiring still need live provider setup for
  outbox events `booking_invoice_created` and `booking_invoice_resend`.

## Domain registration

- No production domain is registered yet. The founder reconfirmed this on 2026-06-30, so
  domain-dependent setup cannot be completed without the final domain and registrar/DNS
  access.
- Pending until domain registration: Cloudflare zone/DNS/TLS/WAF/Turnstile restrictions,
  production Supabase Auth redirect allowlists, Google/Apple OAuth origins and callbacks,
  Brevo sender-domain DNS, Hostinger custom-domain SSL, WordPress production/canonical URLs,
  Mapbox URL-restricted browser tokens, Apple AASA, Android assetlinks, privacy/support/
  account-deletion URLs, and store listing URLs.
- Use localhost, staging project URLs, and Expo development URLs for preview only. Do not
  mark production launch ready until the final domain is registered, configured, and
  verified.

## Legal and POPIA

- **No legal entity is named and no POPIA Information Officer is registered.** This blocks a
  truthful privacy policy, truthful App Store privacy nutrition labels, invoice legal
  entity fields, and store submission. It is not a documentation task — the Information
  Officer must be a registered person at the Information Regulator.
- A POPIA section 72 assessment is required for any personal information leaving South
  Africa. Supabase project regions, Sentry, PostHog, Brevo, Twilio, and Mapbox all need to
  be checked against it and the answer written into the privacy policy.
- Consent recording is not implemented. ZD-021 accepts terms implicitly at sign-up behind a
  visible linked notice, which requires storing which version of the terms was accepted and
  when, per user. Without it there is no defensible record of consent.
- Breach notification obligations under POPIA have no generous risk exemption. A documented
  detection, assessment, and notification runbook is required before launch, not after a
  breach.

## Twilio

- Phase 9 local controls exist for `twilio.verify_otp`, `twilio.masked_voice`, and
  `twilio.whatsapp_urgent`, with Verify attempt redaction, masked-call eligibility, direct
  client write revocation for `masked_call_sessions`, and no-recording/no-transcription
  metadata. These controls remain disabled until provider setup and signed staging smoke
  tests pass.
- The Twilio account still needs production readiness work: trial status removal, approved or
  ported phone number, WhatsApp sender approval, Messaging Service classification corrected
  to transactional/operational use, sender verification, webhook assignments, regulatory
  registrations, and approved message templates (ZD-009).
- Twilio SMS, WhatsApp, voice, phone, Verify OTP, and email-adjacent flows must remain
  disabled through `twilio.operational_messages` until dashboard channel setup, rotated
  secret verification, and signed webhook smoke tests are complete.
- The Twilio tooling exposed in the current session is documentation search only, not account
  management, so dashboard configuration still cannot be completed from the repo alone.

## Mapbox

- Restricted Mapbox tokens are not configured.
- A Mapbox secret token was supplied in chat. It must not be used as a public `VITE_` or
  `EXPO_PUBLIC_` token, and it must be rotated before production use because chat exposure
  makes it unsuitable as a long-lived production secret.
- Required tokens remain:
  - browser token restricted to approved Xoot HTTPS origins;
  - native Expo token for iOS and Android builds;
  - secret downloads token stored only in EAS or CI for native SDK build access;
  - optional server-side `MAPBOX_SECRET_TOKEN` stored only in Supabase Edge Function secrets
    or CI/server secret storage if backend geocoding/routing is implemented.

## Cloudflare

- The connected Cloudflare account still has no `zoothome.co.za` zone. On 2026-06-29, listing
  zones returned zero matches and the create-zone attempt failed because the connected token
  lacks `com.cloudflare.api.account.zone.create`.
- WAF, bot/rate-limit rules, Turnstile, DNS, TLS, and origin protection cannot be activated
  until the zone exists and the connected token has the required scoped permissions.
- Cloudflare Turnstile widgets are not verified. Create restricted web/mobile widgets in the
  dashboard or with a rotated token that has the required Turnstile permissions.

## Apple, Google, Expo, and stores

- Apple Team ID, App Store Connect app record, Google Play app record, Android signing
  fingerprints, store privacy declarations, and final legal/business metadata remain
  unavailable. `npm run verify` confirms the effect on every run: "Skipped
  apple-app-site-association: set ZOOT_APPLE_TEAM_ID or ZOOT_IOS_APP_ID" and "Skipped
  assetlinks.json: set ZOOT_ANDROID_SHA256_CERT_FINGERPRINTS".
- EAS Android internal preview credentials exist on Expo's remote credential store. EAS iOS
  internal-distribution credentials are still missing for non-interactive preview builds.
  Private `SENTRY_ORG` and `SENTRY_AUTH_TOKEN` are required only for native source-map
  upload, not for installing preview builds. Final iOS credentials, Play/App Store submit
  credentials, store records, and privacy/legal metadata still need provider-backed setup.
- Latest pasted Expo public Supabase values mix a staging project reference with a production
  Supabase URL. Keep the currently configured production GitHub variables as-is, and define
  separate EAS/GitHub environment profiles before adding staging mobile values.
- Store submission cannot proceed until developer-console access, signing credentials,
  privacy/data-safety answers, account deletion URLs, support URLs, and legal review are
  complete.

## Admin access

- There are no shared admin sign-in credentials in the repo, app, or env templates. Admin
  access is granted by a Supabase Auth account plus an `admin` role in `public.user_roles`.
- Staging admin smoke credentials must be supplied only through local env vars before running
  `npm run ops:smoke:staging -- --all`; see `docs/ADMIN_ACCESS.md`.
- Production founder/admin accounts still need secure creation, MFA enrollment, and audited
  role assignment before production operations.

## WordPress SEO stack

- WordPress has been added as a target SEO/content stack, but the production WordPress host,
  domain/subdomain, security hardening, editorial roles, backup policy, API access model, and
  publish/sync workflow are not provisioned yet.
- WordPress must not become a path for unaudited plugins, fake testimonials, weak content, or
  leaked credentials. Any headless integration must use read-only public APIs for published
  content and server-side secrets for protected actions.

## Netlify, Hostinger, and hosting

- Netlify project `zoot-home-care` exists, but dashboard/build readback is still required
  before treating Netlify environment configuration as production-verified.
- Hostinger production deployment credentials and final domain wiring still need dashboard
  verification.

## Verification still needed

- Level 3 company-wide user-data hardening is defined in
  `docs/security/level-3-company-wide-security-hardening.md`, but it cannot be marked passed
  until live Supabase, provider, domain, mobile-device, load, monitoring, privacy,
  incident-recovery, and approval evidence is attached or explicitly risk-accepted.
- Configure Supabase Auth redirects in both environments and verify web, mobile, and OAuth
  callbacks.
- Run signed Twilio webhook smoke tests after Twilio dashboard channels and Edge secrets are
  verified with the rotated values.
- Smoke-test the Phase 2 booking chat action layer in staging/production with real booking
  participants.
- Deploy the Phase 4 invoice storage-object policy and both invoice Edge Functions with
  storage-owner/CLI credentials, then smoke-test: a completed paid booking generates exactly
  one immutable invoice, uploads a private PDF, queues Brevo delivery, owner/admin can read
  it, and resend queues the original PDF path without regenerating.
- Smoke-test the Phase 9 Twilio layer after Edge Functions and Twilio account resources
  exist: Verify rate-limit/redaction tests, unsigned webhook denial, signed webhook
  acceptance, masked-call denial outside the window, non-participant denial, terminal-booking
  denial, no-recording/no-transcription metadata, and provider-gated queue creation.
- Run Phase 10 assistant-device tests after EAS development builds exist: Siri and Android
  assistant shortcuts open booking, Concierge, Care+, booking status, and Xooter jobs; unsafe
  params are ignored; no booking or payment is completed from speech or deep-link input
  alone.
- Run authenticated booking-chat public-key lookup smoke tests against
  `get-booking-public-keys` with real staging client/Xooter booking participants.
- k6 `2.1.0` is installed locally. The staging-only 10,000-request harness exists at
  `scripts/load/zoot-staging-10k-readiness.js` and is wired to `npm run load:test:10k:staging`;
  fail-closed behaviour was verified on 2026-07-03 when the command refused to run without
  `BASE_URL`. Run it against a confirmed staging/preview target with `LOAD_TEST_ENV=staging`,
  `BASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
  `LOAD_TEST_SUMMARY_PATH=outputs/k6-staging-10k-summary.json` before claiming 10,000-request
  readiness.
- Run `npm run ops:provider-auth:setup`, `npm run ops:supabase:auth-config`,
  `npm run ops:github-vars`, `npm run ops:supabase:repair-migrations`,
  `npm run ops:supabase:deploy:staging`, `npm run ops:supabase:deploy:production`,
  `npm run ops:supabase:secrets:staging`, and `npm run ops:supabase:secrets:production` from
  a local shell that has approved provider credentials.
- Run `scripts/ops/verify-production-readiness.ps1 -IncludeExternal -RequireLive` after
  provider access is configured. It must pass before the production-readiness blockers can be
  closed.
- Confirm Cloudflare WAF/rate-limit/Turnstile rules after the zone is added.

## Closed at review — 2026-08-02

Removed from the ledger above because they are no longer unresolved. Listed once here, then
dropped at the next review.

- **Supabase function search-path and public SECURITY DEFINER RPC advisor warnings.** Closed
  by `security_advisor_rpc_hardening`, which is recorded in both projects. Live security
  advisors on 2026-08-02 return exactly one finding per project — leaked password protection
  — so nothing else in that category is open.
- **Phase 2 booking chat migration and Edge Functions.** `send-booking-message`,
  `report-booking-message`, and `mark-booking-message-read` are deployed and ACTIVE in both
  projects with JWT verification enabled. Only the role-based smoke test remains, and it is
  kept above.
- **Phase 4, 5, 6, 7, 9, 10 migration application.** All are recorded in both projects under
  Supabase-generated timestamps. What remains is function deployment, storage policies, and
  approvals, all of which are kept above as their own items rather than as "migration"
  items.
- **`support-respond` deployment.** Deployed and ACTIVE in both projects. The governance
  version is not live, which is kept above as a distinct item rather than implying the
  function is missing entirely.
- **The live Edge Function inventory check.** Superseded by the diff at the top of this file,
  which is more specific: it names which functions are missing source and which sources are
  undeployed.
- **`mobile/plugins/withZootAssistantIntents.cjs`.** Renamed to `withXootAssistantIntents.cjs`
  in the company-wide rename; the path in the old entry no longer existed.
- **Android Platform Tools availability and the preview-artifact smoke check.** `adb` is
  installed and the artifact check passed on 2026-07-09. That is no longer what blocks
  Android device testing — the blocker is that the artifact itself is stale, which is kept
  above under "Design and mobile app".
