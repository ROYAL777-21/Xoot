# Customer and Xooter journey — delivery specification, 2 November 2026

The founder requests this extension. This is an implementation/acceptance backlog, not evidence
that every listed email, push, reward, payment or native feature is deployed. Current release
state remains in `docs/release/production-checklist.md`. Continue the bounded Xooter SMTP proof
before reusing that transport for customers. No price, reward cap or employment model changes.

## Event coverage and authority

| Journey | Actual server source | Treatment |
| --- | --- | --- |
| Signup | Confirmed, current Auth account | One welcome with safe first name; verification/security mail retains its separate Auth path |
| Incomplete customer setup | Deliberate setup start, still incomplete | In-app reminder after24h and72h; stop on completion; customer may explore without supplying an address |
| First booking | No current or completed booking, optional reminders enabled | One contextual first-booking prompt, one later follow-up maximum; no invented available worker or discount |
| Abandoned booking | Explicit saved draft/service choice | In-app resume prompt; external recovery only with consent, after24h; never send every field change |
| Booking requested | Committed booking transaction | Correct service/date route; request received does not mean a Xooter has accepted |
| Payment pending/failed | Actual current provider/payment state | One actionable status per revision; never claim receipt or invite duplicate payment after settlement |
| Receipt/invoice | Verified paid transaction and committed invoice | One payment receipt; private invoice route; exact legal identity; no invented VAT registration |
| Assignment/acceptance | Current assignment and worker acceptance | Specific booking route; no street address, private phone or access instructions in previews |
| Visit reminders | Latest active scheduled booking revision |24h/2h reminders where applicable; reschedule invalidates older reminders; cancellation suppresses them |
| En route/arrival/ETA | Authorised current worker GPS + route receipt | Real fresh status; coalesce changes; stop on withdrawal, cancellation, reassignment, completion or stale GPS |
| In-Xoot messages/calls | Authorised booking conversation/call | Generic prompt to open the booking; no chat text or missed-call accusation on lock screens |
| Reschedule/cancel/replacement | Committed lifecycle revision | One current, truthful update and next step; preserve genuine money/refund state |
| Completion/dispute | Actual checklist/completion/dispute state | Completion confirmation; secure issue route during the24h dispute window; feedback request once, without asking only satisfied customers |
| Routine/rebook | Own paid/completed history and explicit reminders | Suggest the customer's usual service/cadence; never create or charge for a booking automatically |
| Rewards/milestones | Committed qualifying-visit and reward ledger |12cleans, then24more/36total; no email promises a redeemable free clean before entitlement/value is implemented |
| Referral | Actual unique code and successful qualifying redemption | Share from own account; reward only when backend entitlement is earned; no provisional balance in external previews |
| Care+ | Actual trial, paid cycle, renewal mandate/cancel state | Respect the opening free month, one-time eligible credit and real next bill; no invented recurring mandate |
| Gifts | Paid gift receipt, claim/redemption/balance/refund ledger | Purchaser confirmation, recipient claim link/code, claim/booking/refund updates; no expiry; never treat payment return URL as paid |
| Support/safety | Actual authorised support status | Safe account route; no incident details or untested SOS/response promise |
| Promotions/retention | Separate active consent + genuine approved offer | Optional, simple unsubscribe, strict frequency cap; no historical email blast or invented campaign |
| Xooter signup/application | Current application and confirmed account | Welcome, incomplete24h/72h, submitted/attention and genuinely approved/active/role-complete updates |
| Xooter work | Current assignment/checklist/availability | Offer/accepted/reminder/route/check-in/finish updates; stale offers and reassigned jobs suppressed |
| Xooter earnings/payout | Actual earnings/dispute/beneficiary/provider ledger | Pending/cleared/weekly batch/paid/failed states; never call a pending balance a bank payment |
| Xooter development | Optional tips plus actual own completed visits | Useful profile/customer-care tips and earned milestones; no income guarantee or review manipulation |

Each event has one stable entity+revision key. Event+in-app record+outbox must commit atomically.
Recheck account, current revision, recipient, preferences and entitlement immediately before
external dispatch. Returning to a status cannot revive an older email. Unknown SMTP outcomes
remain uncertain without automatic resend; transport acceptance is not proof of inbox delivery.
Push likewise records provider receipt/errors and retires invalid device tokens safely.

## Service-specific content

Use the canonical service attached to that booking, never a guess from an email/address.
Regular: routine/preparation/rebook. Express: its booked short-visit scope and actual schedule.
Office: authorised workspace manager, agreed visit/access route and workday cadence. Airbnb:
host turnover schedule, real checkout/check-in times if supplied, and agreed linen add-ons.
Moving: move-in/move-out scope and actual vacant-property instructions inside the account.
Laundry/ironing: actual selected services/add-ons and confirmed quantities/rules; no invented
load weight, collection, delivery or treatment promise. Keep private home notes in the app.
Only office/Airbnb may have a crew under the current approved policy.

## Personal timing

Use explicit category/channel preferences and the customer's own booking history. Optional
routine suggestions may use the median gap of at least3paid/completed visits of the same service
within90days. No cross-account data, message text, ID/bank documents, sensitive household notes,
ad profiles or email tracking pixels. Record a broad reason such as `usual_weekly_regular`, not
the private source values in provider/analytics logs. A cold-start account gets the calm default.

Johannesburg is the default; honour an explicit supported timezone. Optional sends only07:00–21:00,
at most1per7days and2per30days across channels, and suppress when the account recently resumed
the target task. Essential booking/payment/security updates are separate and event-driven; group
rapid non-urgent changes rather than sending one email for every GPS or form update. Users can
stop routine/tips/promotions independently; authentication/security are never marketing opt-ins.
Receipt and operational updates must remain accessible in-app even when optional email is off.

Marketing requires a reviewed consent/unsubscribe path under the Information Regulator's
[direct-marketing guidance](https://inforegulator.org.za/guidance-notes/). The new Xooter sender
currently refuses all optional external tips/promotions. In-app optional tips are a separate
consent choice. Do not enable those email categories just because an SMTP key exists.

## Email and native presentation

Use the actual Xoot wordmark, five-petal handoff flowers, lilac/petal/honey/mist palette,
Newsreader/Georgia heading and Plus Jakarta Sans/Arial body fallbacks. Static images and a plain
text alternative must work when images/web fonts are blocked. Sender Xoot <no-reply@xoot.co.za>,
reply-to support@xoot.co.za; verify domain authentication and real delivered headers. No secrets,
precise address, private review notes or financial references in subject/preheader/lock screen.

Live Activities are for a booked visit's defined start/end: en route, fresh ETA, arrival and
visit progress. They are not a marketing channel. End stale/reassigned/cancelled activities;
the lock screen shows a safe summary, with authenticated details inside Xoot. Apple's
[ActivityKit requirements](https://developer.apple.com/documentation/activitykit/displaying-live-data-with-live-activities)
require a native WidgetKit/SwiftUI extension and APNs/device acceptance. Its
[design guidance](https://developer.apple.com/design/human-interface-guidelines/live-activities)
excludes advertisements/promotions. The current JavaScript bridge is not that implementation.
The founder has an iPhone12 for lock-screen testing; it has no Dynamic Island. Native signing,
Apple Developer enrolment and a compatible Dynamic Island phone/simulator are still outstanding.

## Ordered delivery and acceptance

1. Finish reviewed Xooter event/preferences/SMTP staging proof with a genuine authorised user
   and the founder's inbox; use the same20attempt, nonrenewing test budget.
2. Build customer preferences/events with the same atomic, private recipient/revision boundaries;
   wire actual service/booking records first, never drain unrelated historical outbox rows.
3. Prove consent removal, quiet hours, status cycles, duplicates, concurrency, provider rejection,
   uncertainty, abandoned/rescheduled/cancelled cases and first-booking suppression.
4. Add optional unsubscribe and actual server timing/collector scheduling only after delivery
   acceptance; bounded batches, shared Free-plan limits and authentication capacity take priority.
5. Add money-related templates when their genuine settlement/entitlement workflows pass. Gift52
   remains unavailable: actual production RPC and source allow only1/3/4/6/12;0gift orders exist.
6. Test customer/worker isolation and iPhone/Android foreground/background/tap/logout/reinstall;
   native build, push and Live Activity proof precede any native production claim.
7. Apply reviewed production schema, generate actual types, pass all release gates, deploy/read
   back exact source and run a bounded production acceptance before broad notification activation.
