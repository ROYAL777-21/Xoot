# Xoot Feature Completion Audit

> Historical snapshot from June 2026. Its “Done” labels are not current release evidence.
> Use the [production checklist](release/production-checklist.md) for launch status and
> owner steps, and the [handoff coverage map](implementation/app-handoff-coverage.md)
> for the remaining website and native screen work.

Branch: `codex/full-zoot-iphone-pwa-auth-security`
Date: 2026-06-08

Status key: `Done`, `Partial`, `Mock/UI only`, `Blocked by credentials`, `Not started`.

## Website and Web App

| Area | Status | Notes |
| --- | --- | --- |
| Premium public homepage | Done | Existing route `/` presents premium home-care positioning, service categories, trust cues, launch suburbs, Care+, and booking CTAs. |
| Care+ membership page | Done | `/care-plus` includes hero, problem, benefits, value pillars, comparison, Airbnb/landlord use case, XootCred, Home Memory, Favourite Xooter, and final CTA. |
| Care+ backend billing | Partial | Membership request/cancellation now routes through the `care-plus-membership` Edge Function, which creates pending payment records, subscription rows, admin review items, outbox events, and notifications server-side. Provider checkout and verified recurring payment webhooks remain required before activation can be live. |
| Trust Centre and legal routes | Done | `/trust-centre`, `/legal/privacy`, `/legal/terms`, and `/legal/trust-safety` are routed. |
| Guided booking app | Partial | Protected `/app` booking experience exists with pricing, trust signals, arrival tracking, Live Activity updates, native directions/ETA share actions, and masked-call request handoff. Booking creation uses `create-booking-request`; booking status changes, masked-call requests, trust incidents, low-rating follow-ups, Gift Clean payment requests, XootCred redemption, support routing, property ops routing, and Xooter job responses now use the `ops-workflow` Edge Function instead of browser-owned admin/outbox/payment mutations. Payment confirmation and dispatch automation remain provider/backend work. Production and preview must use real Supabase config; placeholder/mock mode is disabled. |
| Airbnb host dashboard | Done | `/app/properties/airbnb` is routed and uses typed UI data for portfolio/turnover operations. |
| Small office dashboard | Done | `/app/properties/office` is routed and uses typed UI data for office operations. |
| Protected client app routes | Done | Booking, bookings, profile, loyalty, gifts, support, insurance, plans, favourites, and property routes are protected by auth. |
| Contractor/Xooter portal | Partial | Xooter routes exist with role guards and UI. Application submission and job responses now route through `ops-workflow`; production screening/provider integrations remain operational setup. |
| Admin routes | Partial | Admin KYC/Ops routes are role-protected and use typed `ops-workflow` actions for payment confirmation, outbox completion, queue resolution, support follow-up closure, KYC verification, and application approval/activation. Production admin MFA and IP/device policies must be enforced in Supabase/app configuration. |

## Care+, Retention, and Premium Feel

| Area | Status | Notes |
| --- | --- | --- |
| Home Memory | Done | Preview and saved-profile UI patterns exist; sensitive fields must remain encrypted/backend-controlled in production. |
| Favourite Xooter | Done | UI uses the required `Book Nomsa again` pattern instead of generic rebook copy. |
| One-tap rebook | Mock/UI only | UI and haptic pattern exist; live availability and booking creation require backend booking mutation. |
| XootCred boost | Mock/UI only | 1.5x XootCred and R30 add-on credit are visible; ledger enforcement must be server-side before real value is issued. |
| Smart reminders | Done | Care+ and app surfaces show concierge-style reminders. |
| Property profiles | Done | Multi-property host/office dashboards and previews exist. |
| Moat features | Mock/UI only | Home Readiness Score, seasonal reset perks, before/after photo proof, member-only peak slots, flexible reschedule, Guest-Ready Mode, and concierge prompts are UI-ready but not all backend-enforced. |
| Haptics | Partial | Web-safe haptics utility exists for browser surfaces. The Expo mobile app should use Expo/native feedback during React Native feature implementation. |

## Auth, PWA, and iPhone

| Area | Status | Notes |
| --- | --- | --- |
| Email/password auth | Done | Login/sign-up stays Supabase-backed with safer error handling when real credentials are configured. |
| Preview auth and mock data | Done | Placeholder Supabase and production mock data are disabled. Preview/staging builds must use real Supabase public config and real staging users. |
| Password visibility | Done | Login page supports viewing/hiding password. |
| Forgot password | Done | `/auth` supports generic forgot-password requests. |
| Reset password | Done | `/auth/reset` handles recovery links and updates passwords with policy checks. |
| Google OAuth | Blocked by credentials | Code path and button are present; Supabase Google provider credentials and redirect allow-list must be configured. |
| Apple OAuth | Blocked by credentials | Code path and button are present; Apple Services ID/private key/team config and Supabase redirect allow-list are required. |
| OAuth callback | Done | `/auth/callback` exchanges PKCE codes and uses safe redirect handling. |
| iPhone PWA | Done | Manifest, iOS meta tags, service worker fallback, and `/install` guidance are present. iPhone-sized viewport was verified for homepage and protected app layout. |
| Native iOS/TestFlight | Partial | `/mobile` Expo app scaffold, EAS profiles, SecureStore session storage, and mobile release docs are present. Apple Developer access, final Team ID/bundle ID/signing, EAS project credentials, native App Intents/Live Activity integration, TestFlight build, and review assets remain required. |
| Android native shell | Partial | `/mobile` Expo app scaffold, EAS Android profiles, Expo push-token readiness, and app-link config are present. Final package signing, Play Console record, release certificate fingerprint, Play Integrity/App Check strategy, internal testing build, and Play review assets remain required. |

## Security and Compliance

| Area | Status | Notes |
| --- | --- | --- |
| Static security headers | Done | `_headers` and Hostinger-compatible `.htaccess` set CSP, HSTS, frame denial, referrer, permissions, COOP/CORP, and native association-file JSON headers. |
| Crash boundary | Done | App-level error boundary prevents blank-screen crashes and shows a recovery action. |
| Route code splitting | Done | Public/protected routes are lazy-loaded behind a loading fallback. |
| Secret scan | Done | `npm run security:scan` added and wired into the preview workflow. |
| Dependency audit | Partial | CI installs and builds; full `npm audit` triage still needs routine operational review because advisories change. |
| Supabase RLS | Partial | A production hardening migration removes old self-delete/self-mutation paths for bookings, loyalty, subscriptions, referral codes, and job offers. Supabase advisors and role smoke tests are still required before release. |
| Supabase leaked-password protection | Blocked by credentials | Must be enabled in Supabase Auth settings; current connector exposes advisor visibility, not the dashboard toggle. |
| Sensitive access window | Partial | Existing edge functions support sensitive access flows; final production verification requires Supabase policy smoke tests. |
| E2EE booking chat | Partial | Booking chat now uses device-generated ECDH keys, a Supabase public-key registry, and encrypted message envelopes in `messages.body`. Native Keychain/Keystore storage and migrated legacy-message handling still need release hardening. |
| Payments | Blocked by credentials | Stitch/Ozow credentials and verified webhook secrets are needed before real payment confirmation can be production-ready. |
| Notifications and voice | Partial | In-app notification routing, Live Activity events, native booking action events, and Twilio masked-call queue handoff are represented without exposing phone numbers. Masked-call queue creation now runs through `ops-workflow`. Brevo/Twilio production credentials, native bridge wiring, webhook validation, and provider smoke tests are still required. |
| AI usage compliance | Partial | New support tickets call the `support-respond` Edge Function, which can use OpenAI Responses API with server-only secrets, redaction, human escalation, and deterministic fallback. Final production verification requires deployed Edge Function smoke tests, provider key setup, and support-agent policy review. |

## Scale and Deployment

| Area | Status | Notes |
| --- | --- | --- |
| 10,000-request readiness | Partial | k6 smoke/load script exists. Do not claim capacity until it is run against staging/production and database metrics are reviewed. |
| Hostinger deployment | Partial | Static build, SPA fallback, Apache headers, and native association-file content types are prepared. Final deployment needs Hostinger domain/environment configuration and release signing values. |
| Vercel/Netlify/GitHub Pages preview | Partial | GitHub Actions build artifact is available for preview; production target remains Hostinger unless changed. |
| Figma dashboard | Partial | Blank file created at https://www.figma.com/design/vsT7yHn1OPxKgKpVzLryo3 as `Xoot Care+ Host & Office Dashboards`. Populating the dashboard frames is blocked by the Figma Starter-plan MCP tool-call limit. |
