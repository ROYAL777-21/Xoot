# Feature Roadmap

This roadmap is ordered for execution. Each stage should leave the product more reliable, safer, and easier to use than the last. Do not expand into new geography or service breadth until the trust, booking, and recurring systems are stable.

## 1. Governance And Security Foundation

- Maintain this `/docs` governance layer as the source of truth for product, brand, security, Care+, agents, and booking rules.
- Complete the website-wide security hardening audit before new production behavior ships.
- Verify Supabase RLS, auth redirects, role access, edge functions, storage rules, payment readiness, and audit logging.
- Remove or block preview/mock data paths from production builds.
- Add safe rate limits, secret scans, dependency checks, and security headers.

## 2. Website Stability And Premium Public Experience

- Fix site-wide scroll, layout, and interaction blockers across desktop, mobile, and iPhone PWA views.
- Ensure homepage, Care+, Trust Centre, legal/privacy, auth, and booking entry routes feel premium and work without lag.
- Keep public copy warm, trustworthy, and outcome-led.
- Avoid unsupported guarantees or public competitor mentions.
- Verify all public routes with browser and mobile viewport checks before merge.

## 3. Auth, Account Protection, And iPhone PWA

- Complete forgot password, reset password, Google OAuth, Apple OAuth, and safe auth callback flows.
- Keep OAuth credential setup in Supabase dashboard and environment configuration, never source code.
- Add PWA manifest, iOS meta tags, app icons, offline fallback, install guidance, and standalone launch behavior.
- Prepare native iOS path later only after Apple Developer access, bundle IDs, and signing details exist.

## 4. Booking Flow And Pricing Authority

- Keep booking flow guided and concierge-like: service, property type, add-ons, estimate, slot, Xooter match, confidence layer, confirmation.
- Move final price, fees, add-ons, Care+, XootCred, referral credits, booking cover, and high-demand slot pricing to backend or Supabase Edge Functions.
- Add one-tap rebook for completed bookings using the actual preferred Xooter name.
- Ensure `Book [Xooter Name] again` appears only when availability is valid or likely.
- Add booking confidence signals above confirmation actions.

## 5. Trust, Xooter Quality, And Sensitive Access

- Show verification timelines and real reliability numbers on customer-facing Xooter profiles.
- Build contractor-facing reliability dashboards and milestone progression.
- Enforce sensitive access-note windows at the API/RLS level.
- Add access reveal audit logs and masked display for gate codes, lockbox codes, parking codes, and sensitive pet/access notes.
- Add before/after photo proof for Airbnb, moving, and deep-clean workflows.

## 6. Care+, Household Memory, And Retention

- Keep `/care-plus` premium and not discount-led.
- Implement Home Memory, favourite Xooter, smart reminders, priority support, priority replacement support, monthly add-on credit, and XootCred boost as reusable typed components.
- Add Care+ onboarding prompts and lifecycle reminders through in-app and email channels only where appropriate.
- Keep Care+ exclusions clear: no guaranteed replacement unless backend and operations support it.

## 7. Property And Office Infrastructure

- Give Airbnb hosts, landlords, property managers, and small offices dedicated dashboards.
- Support property profiles, access notes, cleaning history, invoices, Xooter assignments, recurring schedules, photo proof, and turnover deadlines.
- Add Guest-Ready Mode and office-readiness views using mock data only where backend support is incomplete.
- Keep sensitive access notes encrypted and role/time-scoped.

## 8. Notifications, Support, And Operations

- Make in-app notifications the primary channel.
- Use Brevo for records and detailed email summaries.
- Use WhatsApp only for urgent real-time events such as on-the-way, arrival, cancellation, no-show, and critical trust/safety alerts.
- Use Twilio voice only for masked active-booking calls.
- Add support queues, escalation paths, cancellation playbooks, replacement matching, and admin review workflows.

## 9. Payments, XootCred, Referrals, And Abuse Controls

- Complete Stitch/Ozow webhook verification and payment reconciliation.
- Add referral and XootCred abuse detection.
- Confirm Care+ credits and boosts are server-side and audited.
- Keep all meaningful credit issuance tied to completed qualifying bookings.
- Prevent frontend tampering with prices, credits, and cancellation/refund outcomes.

## 10. Scale, Monitoring, And Release Readiness

- Add load tests for frontend routes, auth-adjacent flows, booking functions, and database-facing reads.
- Document measured readiness instead of claiming unconditional capacity.
- Add Sentry-ready error reporting, operational alerts, and rollback steps.
- Run lint, tests, type/build checks, browser verification, mobile viewport checks, security scans, and advisor checks before each production release.
