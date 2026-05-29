# Zoot Feature Completion Audit

Branch: `codex/full-zoot-iphone-pwa-auth-security`
Date: 2026-05-29

Status key: `Done`, `Partial`, `Mock/UI only`, `Blocked by credentials`, `Not started`.

## Website and Web App

| Area | Status | Notes |
| --- | --- | --- |
| Premium public homepage | Done | Existing route `/` presents premium home-care positioning, service categories, trust cues, launch suburbs, Care+, and booking CTAs. |
| Care+ membership page | Done | `/care-plus` includes hero, problem, benefits, value pillars, comparison, Airbnb/landlord use case, ZootCred, Home Memory, Favourite Zooter, and final CTA. |
| Care+ backend billing | Mock/UI only | Membership purchase paths are safe UI routes until payment/subscription backend is approved and connected. |
| Trust Centre and legal routes | Done | `/trust-centre`, `/legal/privacy`, `/legal/terms`, and `/legal/trust-safety` are routed. |
| Guided booking app | Partial | Protected `/app` booking experience exists with pricing and trust signals; live payment confirmation and dispatch automation remain backend/provider work. |
| Airbnb host dashboard | Done | `/app/properties/airbnb` is routed and uses typed UI data for portfolio/turnover operations. |
| Small office dashboard | Done | `/app/properties/office` is routed and uses typed UI data for office operations. |
| Protected client app routes | Done | Booking, bookings, profile, loyalty, gifts, support, insurance, plans, favourites, and property routes are protected by auth. |
| Contractor/Zooter portal | Partial | Zooter routes exist with role guards and UI, while production screening/provider integrations remain operational setup. |
| Admin routes | Partial | Admin KYC/Ops routes are role-protected; production admin MFA and IP/device policies must be enforced in Supabase/app configuration. |

## Care+, Retention, and Premium Feel

| Area | Status | Notes |
| --- | --- | --- |
| Home Memory | Done | Preview and saved-profile UI patterns exist; sensitive fields must remain encrypted/backend-controlled in production. |
| Favourite Zooter | Done | UI uses the required `Book Nomsa again` pattern instead of generic rebook copy. |
| One-tap rebook | Mock/UI only | UI and haptic pattern exist; live availability and booking creation require backend booking mutation. |
| ZootCred boost | Mock/UI only | 1.5x ZootCred and R30 add-on credit are visible; ledger enforcement must be server-side before real value is issued. |
| Smart reminders | Done | Care+ and app surfaces show concierge-style reminders. |
| Property profiles | Done | Multi-property host/office dashboards and previews exist. |
| Moat features | Mock/UI only | Home Readiness Score, seasonal reset perks, before/after photo proof, member-only peak slots, flexible reschedule, Guest-Ready Mode, and concierge prompts are UI-ready but not all backend-enforced. |
| Haptics | Done | Web-safe haptics utility and Capacitor dependency support premium actions with no-op fallback on unsupported browsers. |

## Auth, PWA, and iPhone

| Area | Status | Notes |
| --- | --- | --- |
| Email/password auth | Done | Login/sign-up stays Supabase-backed with safer error handling. |
| Password visibility | Done | Login page supports viewing/hiding password. |
| Forgot password | Done | `/auth` supports generic forgot-password requests. |
| Reset password | Done | `/auth/reset` handles recovery links and updates passwords with policy checks. |
| Google OAuth | Blocked by credentials | Code path and button are present; Supabase Google provider credentials and redirect allow-list must be configured. |
| Apple OAuth | Blocked by credentials | Code path and button are present; Apple Services ID/private key/team config and Supabase redirect allow-list are required. |
| OAuth callback | Done | `/auth/callback` exchanges PKCE codes and uses safe redirect handling. |
| iPhone PWA | Done | Manifest, iOS meta tags, service worker fallback, and `/install` guidance are present. |
| Native iOS/TestFlight | Blocked by credentials | Capacitor scripts exist; Apple Developer access, final bundle ID, signing, and native review assets are required. |

## Security and Compliance

| Area | Status | Notes |
| --- | --- | --- |
| Static security headers | Done | `_headers` and Hostinger-compatible `.htaccess` set CSP, HSTS, frame denial, referrer, permissions, and COOP/CORP headers. |
| Crash boundary | Done | App-level error boundary prevents blank-screen crashes and shows a recovery action. |
| Route code splitting | Done | Public/protected routes are lazy-loaded behind a loading fallback. |
| Secret scan | Done | `npm run security:scan` added and wired into the preview workflow. |
| Dependency audit | Partial | CI installs and builds; full `npm audit` triage still needs routine operational review because advisories change. |
| Supabase RLS | Partial | RLS checks/advisors are required before merge. Public table RLS was previously verified; run advisors again before release. |
| Supabase leaked-password protection | Blocked by credentials | Must be enabled in Supabase Auth settings; current connector exposes advisor visibility, not the dashboard toggle. |
| Sensitive access window | Partial | Existing edge functions support sensitive access flows; final production verification requires Supabase policy smoke tests. |
| Payments | Blocked by credentials | Stitch/Ozow credentials and verified webhook secrets are needed before real payment confirmation can be production-ready. |
| Notifications | Partial | App hierarchy and Twilio voice-only constraints are represented; Brevo/Twilio production credentials and webhook validation are still required. |
| AI usage compliance | Partial | Checklist docs cover disclosure, moderation, privacy, and unsupported claims; live AI agent permissioning needs production tool scoping. |

## Scale and Deployment

| Area | Status | Notes |
| --- | --- | --- |
| 10,000-request readiness | Partial | k6 smoke/load script exists. Do not claim capacity until it is run against staging/production and database metrics are reviewed. |
| Hostinger deployment | Partial | Static build, SPA fallback, and Apache headers are prepared. Final deployment needs Hostinger domain/environment configuration. |
| Vercel/Netlify/GitHub Pages preview | Partial | GitHub Actions build artifact is available for preview; production target remains Hostinger unless changed. |
| Figma dashboard | Partial | Blank file created at https://www.figma.com/design/vsT7yHn1OPxKgKpVzLryo3 as `Zoot Care+ Host & Office Dashboards`. Populating the dashboard frames is blocked by the Figma Starter-plan MCP tool-call limit. |
