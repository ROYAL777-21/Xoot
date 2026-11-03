# Customer notifications — bounded first slice, 3 November 2026

This is reviewed-source preparation, not hosted delivery or a complete notification journey.
Current production status remains in `docs/release/production-checklist.md`.

## First confirmed customer entry

Production's existing `handle_new_user` creates a generic in-app welcome before confirmation
and seeds the ordinary `user` role. Adding a second Auth trigger would duplicate that welcome
and could mistake a future worker application for a customer. This slice leaves Auth/signup
and its trigger untouched. The authenticated customer app explicitly enters its own journey.
The server requires current confirmed Auth, the authoritative `user` role, no admin/Xooter
role, no Xooter record and no Xooter application. Editable metadata is only used for a safe
display greeting, never authorization.

Only an account created after the immutable migration installation timestamp is eligible for
the new first-entry welcome. Existing confirmed accounts can read/save preferences without a
welcome/email backfill. A unique exact legacy welcome is adopted once, with truthful copy and
no unearned-credit claim. Multiple or unfamiliar legacy rows are left untouched and no welcome
email is queued. In-app history is never evidence of SMTP delivery.

The journey event, adopted/new notification and identity-only outbox row are one transaction.
An outbox failure rolls back the event and the adoption; it does not block Auth/signup. The
existing inbox continues to show owner-bound records through normal RLS.

## Customer choices and reminders

Account welcome email is a separate choice from sign-in/security messages. Optional setup and
first-booking reminders start OFF and require explicit strict-boolean consent plus optimistic
revision checks. Setup begins only after the customer deliberately starts it. An actual own
saved place can mark setup complete; this does not label an address as provider-verified.

The private owner-only collector is unscheduled. It checks current Auth/role/application,
consent, explicit setup state, saved places, real booking history, recent return and Johannesburg
quiet hours. At most one optional notification per seven days and two per thirty days across
these categories. The latest due slot wins; 24h/72h are opportunities, not guaranteed repeated
nudges. A missed24h slot expires at72h and the72h slot expires after7days. A customer may explore
without setting up a place. Any booking history suppresses first-booking prompts, including a
cancelled booking; rebooking is a separate future journey.

No optional external email is eligible in this slice, even when a reminder preference is ON.
A reviewed unsubscribe/campaign path is required before that can change. No marketing opt-in
is inferred from account creation. No tips, promotions, prices, worker availability, rewards,
gift balance, payment receipt or subscription entitlement is invented.

## Closed independent delivery

`private.customer_email_policy` begins disabled, project unset, allowlist empty, zero of a
maximum20attempts, no automatic renewal and no schedule. It is independent of the existing
Xooter allowance. A real Free-plan/shared-provider-capacity review and a founder-authorized
test identity are required before an operator enables a bounded staging proof. An SMTP key
does not open the sender, renew attempts or constitute release acceptance.

Only `customer_welcome` can reach the proposed customer SMTP dispatcher. Claim, final authorize
and receipt have their own role-only public RPCs. They bind the event, nonce,20second lease,
current confirmed recipient hash, preferences, live role/application eligibility and exact
outbox identity. The allowlist rejects NULL elements and membership must be explicitly TRUE;
even a corrupt NULL-containing replacement cannot revive a removed recipient. Late/unknown SMTP outcomes become terminal uncertainty; they are never
automatically resent. Success requires the deterministic customer Message-ID and the actual
outbox status `completed`. No customer recipient, full name or household detail is copied into
outbox payloads, logs or lock-screen previews.

The source customer dispatcher retains a frozen local copy of the independently reviewed
SMTP transport and handoff email presentation. Its own kind/route allowlist, Message-ID
namespace and customer RPCs prevent accidental reuse of worker-only recipients or receipts.
Any later shared transport change requires redeploy/readback of every importing handler.

## Customer app and delivery order

The source `Your updates` page is reachable from You and returns there with its Back control.
It shows actual own saved preferences, a link to the existing private notification inbox and
the handoff flowers/fonts. It makes unscheduled reminders and unavailable optional email
clear. No default consent or success is invented when the server fails. A failed/stale save
requires reload, and former-owner responses are discarded on account/session changes.

The AppShell entry runs after normal Auth and does not delay the customer screen. Route
remounts share one in-memory promise for the actual Auth session; the cache retains no DTO,
profile, token or address. Its failure is retryable while the rest of the app remains usable.
The customer API passes the presented bearer unchanged to the self-bound RPC. Both new
handlers retain gateway JWT verification; the mail worker additionally requires actual
service-role authority and the disabled independent customer policy. New SDK imports pin the
installed locked Supabase2.108.1; SMTP uses reviewed Nodemailer10.3.1. Frozen source file hashes
and redacted isolated checks are recorded in
[`customer-first-slice-source.json`](../release/evidence/2026-11-04/customer-first-slice-source.json).

Review source/SQL first, then deliver the closed staging schema and handlers, verify exact
runtime imports, and exercise a consenting new customer's normal JWT. A bounded Free-plan
SMTP proof must match actual inbox headers and the exact receipt. Production requires the
same safe migration/type/runtime sequence before the UI is promoted. Do not skip schema
checks, hand-write generated production types or enable schedules to get a source PR green.

## Checks and remaining gates

The actual isolated PostgreSQL runner is `scripts/ops/verify-customer-journey.mjs`; pass the
pinned PGlite0.5.8 module path. It tests real RLS/grants, account ownership/confirmation, exact
legacy adoption, deduplication, strict consent/revision, quiet hours, stale slots, cadence caps,
real saved-place/booking suppression, separate budgets, role/application/recipient changes,
exact completion receipts and terminal uncertainty. It plants the duplicate-welcome defect,
the NULL-membership authorization defect, checks outbox-failure rollback and repeats against
production's unconstrained status column.

The isolated static Vite/Chromium check runs the actual compiled customer page at320/390/1024
light and390/1024dark. It verifies no overflow, actual private-theme backgrounds, Newsreader,
44px tap labels, keyboard toggle/save, Back to You and inbox routes, with no external request
or runtime error. The original desktop label was shorter than44px; that actual regression
fails before the minimum target fix. SDK/Deno and web typechecks,34new API/SMTP cases,10new UI
owner/acknowledgement cases and60existing Profile/AppShell/inbox cases pass. The first dev-server
harness encountered cold optimizer/outside-entry resolution issues; the static build avoids
that dependency on HMR rather than weakening the check deadline. Scoped lint passes.

This is not real JWT/provider/inbox/device/concurrent-session acceptance. No hosted migration,
actual generated production type, SMTP delivery, schedule or broad activation is claimed.
Booking/payment/invoice/assignment/ETA/routine/service-specific/reward/gift/payout events,
one-click unsubscribe, native push and Live Activities remain the separate full-journey backlog.
Maps, GPS/ETA, provider budgets, pricing, matching, verified supply and the public homepage are
unchanged by this slice.
