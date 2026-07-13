# Phase 1 Product Design Audit

Date: 2026-07-13
Status: governance ready; visual direction not approved
Production deployment: prohibited for this phase

## Evidence and limits

This audit uses repository source and configuration, route maps, Supabase migrations and Edge Functions, existing design documents, Figma MCP metadata, and one accepted 390 x 844 Expo web capture at `outputs/design-audit-2026-07-13/01-customer-home-viewport.png`.

The current Figma file exposes a `Native Widgets` page, but the Figma Starter-plan MCP quota was reached before full frame inspection. Browser automation became unstable after the accepted capture. No frame is recorded as owner-approved. Existing modified UI files are implementation candidates from earlier work, not approved design evidence.

## 1. Repository and platform findings

- Public website and browser web app: React, Vite, and TypeScript in `src/`.
- Native customer and Zooter app: Expo SDK 56, Expo Router, and TypeScript in `mobile/`.
- Web stack includes Tailwind, Radix, Lucide, React Router, Supabase, Mapbox, PostHog, and Sentry.
- Mobile includes SecureStore, native Mapbox, notifications, PostHog, Sentry, Expo Updates, and a development client.
- Supabase is shared. The repository contains 53 migrations plus Edge Functions for booking, payments, Care+, support, Concierge, notifications, sensitive access, Zooter onboarding, masked calls, and operations.
- Operations and administration are web routes in the React application, not separate packages.
- EAS profiles cover development, Android preview APK, iOS simulator preview, and production store builds.
- Native assistant, widget, and Live Activity scaffolding exists under `native/`; release claims still require current API and real-device validation.

## 2. Brand, typography, and colour findings

- Web uses warm neutral surfaces, cream, terracotta, sage, and near-black.
- Mobile tokens diverge: light neutrals and deep green in light mode, deep green or near-black with gold in dark mode.
- Web self-hosts Space Grotesk and DM Sans through Fontsource under OFL-1.1.
- Mobile mainly uses system fonts, improving native loading but creating cross-platform hierarchy drift.
- Web has extensive Liquid Glass CSS and a 1rem global radius without a controlled glass hierarchy.
- The wordmark must render as `Zoot` with normal letter spacing.

Provisional guidance pending Figma approval: retain a warm, optimistic identity; use light vibrant service colours; keep dark Care+ as a deliberate exception; prefer native system type on mobile unless approved evidence justifies a bundled font.

## 3. Design and interaction weaknesses

The accepted mobile capture shows a dark runtime despite light app configuration, four large service cards competing in the first viewport, letter placeholders instead of coherent iconography, excessive repeated rounded surfaces, and top and bottom navigation competing for space. The direct heading and booking CTA are clear, but lifestyle context is weak.

Repository-wide gaps:

- web and mobile tokens have drifted;
- no Figma approval registry existed;
- glass, motion, and haptics are not governed by shared named tokens;
- mobile lacks several complete payment, recurring, preferred-Zooter, issue-resolution, and recovery states;
- preview and production builds now share the visible app name `Zoot` while retaining separate preview bundle identifiers;
- the nested auth callback route now renders outside the root tab shell and has Expo web runtime evidence;
- staging Google, Apple, phone, and SMS providers remain disabled, and Google/Apple actions are now environment-gated so unavailable providers are not advertised;
- React Native web sign-in actions now expose button semantics and the email field has a persistent accessible label;
- loading, empty, offline, unauthorised, error, reduced-motion, and large-text states are not consistently specified.

## 4. Business logic to preserve

- Supabase PKCE authentication, session hydration, and server-authoritative roles.
- RLS ownership and role policies for customer, Zooter, support, operations, and admin data.
- Server-verified booking creation and status transitions.
- Payment success only after provider and backend confirmation.
- Backend-authoritative Care+, ZootCred, referral, and Booking Cover state.
- Zooter job acceptance, assignment, and sensitive-access timing with audit records.
- Address visibility after accepted assignment while access secrets remain separately controlled.
- Support and Concierge handoff records, notification outbox/retry/deduplication, feature flags, kill switches, and privacy scrubbing.
- No production mock data or silent required-config fallback.

## 5. Customer journey map

1. Discover Zoot through marketing, search, referral, or deep link.
2. Understand services, coverage, trust, price basis, and expectations.
3. Choose a service through progressive comparison, not a dense selector.
4. Provide location, property context, scope, date, and safe preferences.
5. Sign in or create an account at the latest safe point while preserving progress.
6. Review exact booking and payment terms.
7. Complete provider-hosted or server-verified payment.
8. Follow awaiting-assignment, assigned, en-route, in-progress, completed, or support-required status.
9. Use approved in-app client-contractor chat and support.
10. Review, rebook, manage recurring service, or escalate an issue.
11. Discover Care+, ZootCred, and referrals in context without blocking the core task.

Friction priorities: fewer early fields, persistent booking state through auth, one primary action per step, no duplicate confirmations, and honest unavailable-date or payment-state guidance.

## 6. Zooter journey map

1. Understand the opportunity, create an account, and verify contact details.
2. Complete profile, identity, screening, eligibility, documents, training, and assessment steps.
3. See an honest onboarding state and required action.
4. Receive appropriate job opportunities without private household data.
5. Accept a job and receive the service address needed for navigation.
6. Receive sensitive access data only through the approved time-bound workflow.
7. Navigate, update safe job status, and communicate in-app.
8. Complete the job, submit permitted evidence, and view earnings or payout status.
9. Raise safety, booking, or payout concerns through structured support.

The UI must not expose internal scores, customer private notes, unrelated bookings, fraud signals, or administrator actions.

## 7. Dashboard role map

| Surface | Role | Primary decisions | Never expose by default |
| --- | --- | --- | --- |
| Operations | dispatcher or support operator | assignment review, booking exceptions, queues | provider secrets, raw payment payloads |
| Support | authorised support | case triage and service recovery | household access secrets, raw fraud logic |
| Trust and safety | authorised specialist | urgent incident, privacy, conduct review | unrelated user data |
| Finance | authorised finance | reconciliation, invoice, payout review | access notes and unrelated chat |
| Zooter operations | authorised onboarding staff | eligibility and training review | unrelated customer account data |
| Administration | least-privilege admin | configuration and approved overrides | browser service-role access |
| Founder or owner | governance and release approval | policy, commercial, design gates | routine production-data access without need |

Every dashboard action requires explicit authorisation, audit attribution, complete loading/error states, and confirmation or reversibility where feasible.

## 8. Reference interpretation

- Figma is the visual approval authority; the repository is the behavioural authority.
- Apple influence means clarity, responsive motion, native controls, and tactile feedback, not visual cloning.
- Clear Liquid Glass may use a top-right highlight and edge response, but background text cannot remain readable through an interaction surface.
- Android must feel native through navigation, back behaviour, semantics, haptics, and widgets rather than receiving an iOS skin.
- Organic influence is translated into colour and gentle motion. Literal flowers remain excluded unless explicitly approved.
- Care+ may use premium dark styling while the public and customer core stays light.

## 9. Design foundation documents

This phase establishes brand and product principles, shared component states, glass/motion/haptic policies, icon and image guidance, content rules, accessibility and performance budgets, Figma traceability, and quality gates. These are governance documents, not a claim that every current screen conforms.

## 10. Figma structure and directions

Use these pages:

- `00 Brand and References`
- `01 Foundations`
- `02 Components`
- `03 Customer App`
- `04 Zooter App`
- `05 Operations`
- `06 Administration`
- `07 Marketing Website`
- `08 Motion and Interaction`
- `09 Accessibility and Responsive States`
- `99 Archive`

Create three meaningfully different directions:

1. `A - Vibrant Native`: light surfaces, service colours, minimal glass, fastest onboarding and booking.
2. `B - Clear Glass Concierge`: restrained clear glass for navigation and support, vibrant content, calm progressive booking.
3. `C - Editorial Trust`: stronger photography and trust evidence, quieter controls, with a small amount of A's tactile motion.

The user's stated preference is A with remnants of C. That is design input, not frame approval. Selected frames must be labelled `APPROVED BY OWNER` and entered in `approved-frames.json` before implementation.

## 11. Device and state matrix

| Platform | Minimum audit sizes | Required evidence |
| --- | --- | --- |
| Mobile web | 320 x 568, 390 x 844, 430 x 932 | no overflow, keyboard-safe forms, complete navigation |
| Tablet web | 768 x 1024, 1024 x 1366 | adaptive navigation and booking layout |
| Desktop web | 1280 x 720, 1440 x 900, 1920 x 1080 | density, focus order, content width |
| iOS | supported small and large iPhone, Dynamic Type XL | safe areas, keyboard, reduced motion/transparency, VoiceOver |
| Android | compact phone, large phone, supported tablet | back behaviour, font scale, TalkBack, edge-to-edge layout |
| Widgets | supported iOS and Android families | redaction, stale/offline state, deep-link validation |
| Dashboards | 1280, 1440, 1920 widths | dense tables, permissions, audit, and empty states |

Critical screens require loading, empty, partial, success, validation error, server error, offline, unauthorised, expired-session, reduced-motion, high-contrast, and large-text coverage.

## 12. Missing information and assets

- Owner-approved Figma node IDs and comments
- Full Figma component and variable inspection after quota reset
- Final legal entity, support, privacy, refund, and information-officer details
- Approved pricing, Care+, ZootCred, Booking Cover, and service-area sources
- Licensed final photography and releases
- Final wordmark, app icon, splash, and widget masters
- Apple Team and Google Play organisation access
- Staging accounts for customer, Zooter, support, operations, and admin
- Final analytics consent, retention, localisation, and minimum OS decisions

## 13. Risks and contradictions

- Prior direction requests clear non-frosted glass while the attached brief mentions frosted surfaces. Clear glass is the safe default pending explicit approval.
- Prior direction removes flowers while the brief mentions organic influence. Use abstract colour and motion unless botanical assets are approved.
- Expo declares light style while the current runtime capture is dark. Theme needs one source of truth.
- Existing UI edits predate the Figma gate and must be reviewed rather than automatically accepted or reverted.
- Separate web and mobile tokens will continue to drift without a shared semantic source.
- One `main` branch should be the release source of truth, with short-lived reviewed branches for change control.
- Siri/App Intents, widgets, Live Activities, and Android assistant files are not release evidence until real-device and credential validation passes.

## 14. Phased plan

1. Audit and governance: finish these documents and freeze unapproved redesign work.
2. Figma directions: create A, B, and C for foundations and critical booking, auth, Concierge, status, and account-recovery flows; obtain owner approval.
3. Shared foundations: implement approved semantic tokens, primitives, accessibility states, motion/haptic tokens, and visual tests.
4. Customer flow: implement and prove low-friction onboarding, booking, sign-in, session restore, password recovery, and auth callbacks in staging.
5. Zooter flow: implement onboarding, training, jobs, address after acceptance, time-bound sensitive access, navigation, and support.
6. Operations and admin: implement permission-aware dense workflows, audit views, outbox/dead-letter operations, and safe overrides.
7. Marketing: implement approved home, service, Care+, trust, articles, legal, and conversion surfaces without fabricated claims.
8. Native extensions: validate widgets, notifications, Siri/App Intents, Android shortcuts, Live Activities, performance, and accessibility on devices.
9. Staging gate: run functional, security, visual, accessibility, performance, load, recovery, and observability tests before downloadable release builds.

## 15. Files created or proposed

Created in this pass:

- root and platform `AGENTS.md` governance files
- `design/README.md`
- `design/PHASE-1-AUDIT.md`
- `design/approved-frames.json` and schema
- the foundation files linked by `design/README.md`
- `design/references/REFERENCE-MAP.md`
- `design/screen-specs/README.md`
- test-evidence directory guidance under `tests/`

After owner approval, add screen-specific specs, a shared semantic-token source with generated adapters, approved visual baselines, widget specs, and approved product implementation changes.

No production deployment, store submission, provider change, payment action, customer communication, or live Supabase mutation is part of this design phase.
