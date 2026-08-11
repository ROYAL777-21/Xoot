# Booking Logic

This document defines the expected booking lifecycle and business rules for Xoot. The frontend may present choices, but backend functions, Supabase RLS, and server-side checks must enforce the authoritative state.

## Lifecycle

1. Draft: customer selects service, property type, add-ons, home profile, and preferred time.
2. Estimate: system calculates estimated time, service fee, add-ons, booking cover, Care+ benefits, XootCred, and total price.
3. Pending payment: customer initiates payment through approved provider flow.
4. Payment verified: backend confirms payment via provider confirmation or verified webhook.
5. Matching: system selects eligible Xooter using assignment rules.
6. Confirmed: booking is confirmed, Xooter assigned, customer notified in-app and by email where appropriate.
7. Pre-job window: reminders, access-note window checks, and pre-job briefing are prepared.
8. En route: Xooter marks on the way; urgent real-time channel may notify customer.
9. Arrived: Xooter marks arrival; customer receives urgent real-time update where appropriate.
10. In progress: job starts; chat and masked calling remain booking-scoped.
11. Completed: job is marked complete, photo proof required where applicable, satisfaction check queued.
12. Review and loyalty: rating, XootCred, Care+ boost, support triggers, and reliability updates are processed.
13. Archived: sensitive access windows close and records remain available by role.

## State Transitions

Allowed transitions:

- `draft` -> `estimate`
- `estimate` -> `pending_payment`
- `pending_payment` -> `payment_verified`
- `payment_verified` -> `matching`
- `matching` -> `confirmed`
- `confirmed` -> `enroute`
- `enroute` -> `arrived`
- `arrived` -> `in_progress`
- `in_progress` -> `completed`
- any active pre-completion state -> `cancelled` when cancellation rules allow or operations applies it
- `confirmed`, `enroute`, or `arrived` -> `at_risk` when Xooter cancels, no-show risk is detected, or support intervenes
- `at_risk` -> `replacement_offered`
- `replacement_offered` -> `reassigned` when customer accepts and replacement is confirmed
- `replacement_offered` -> `rescheduled` when customer chooses a new slot
- `replacement_offered` -> `cancelled` when no acceptable replacement or reschedule exists

Invalid transitions must be rejected server-side.

## Cancellation Handling

When a Xooter cancels:

1. Mark booking `at_risk` immediately.
2. Revoke any sensitive access-note visibility for the cancelling Xooter.
3. Search replacements using assignment priority.
4. Send concierge-style customer communication within the operational target window.
5. If no replacement exists, offer reschedule and approved XootCred compensation where policy allows.
6. Log the cancellation against reliability scoring.
7. Notify operations when the booking is Care+, recurring, high-value, Airbnb, office, same-day, or trust-sensitive.

Customer-facing copy should be calm and specific, not generic. Do not promise a guaranteed replacement unless backend, staffing, operations, and legal wording support it.

## Replacement Handling

Replacement matching priority:

1. Suburb proximity.
2. Available time window.
3. Reliability score.
4. Skill fit.
5. Pet comfort where relevant.
6. Premium-home suitability.
7. Historical repeat-booking fit for the client.
8. Route efficiency.
9. Contractor utilisation.
10. Care+ priority status.

Care+ members receive prioritised replacement support, not an unsupported guarantee.

## Assignment Rules

A Xooter is eligible only when:

- verification and required screening status allow live work
- the Xooter is available for the full booking window
- the service type matches skills or badges where required
- location and travel timing are reasonable
- reliability flags do not block assignment
- pet comfort, supplies, transport, and premium-home requirements match the booking
- assignment does not violate rest, route density, or operational guardrails

Preferred Xooters should be selected first where availability and eligibility allow. If the favourite Xooter is unavailable, show the next best match and explain why.

## Sensitive Access Rules

- More than 45 minutes before booking start: no sensitive home access for Xooters.
- 45 minutes before booking start: access window may open for the assigned Xooter.
- During active booking: assigned Xooter may view required sensitive fields.
- 30 minutes after completion: access is revoked.
- Cancellation: access is revoked immediately.

Sensitive fields include gate codes, alarm codes, lockbox combinations, parking codes, entry notes, pet instructions tied to entry, and any field tagged sensitive in the home profile.

## Route Density

Route density should improve reliability and contractor outcomes from month one.

- Prefer assignments that cluster work by suburb and time window.
- Avoid inefficient cross-city routing when equivalent local Xooters are available.
- Preserve quality and skill fit over pure proximity.
- Use route efficiency as a ranking input, not the only decision.
- Keep customer promises inside realistic travel and arrival windows.

## Recurring Optimisation

Recurring bookings should reduce customer effort and improve Xooter consistency.

- Default to the customer's preferred Xooter when eligible.
- Save home profile, add-ons, property notes, and schedule pattern.
- Offer `Book [Xooter Name] again` or a recurring slot prompt when availability supports it.
- Waive or alter fees only according to approved pricing logic.
- If a regular customer misses their usual interval, send one helpful in-app prompt based on actual booking history.

## Booking Confidence Layer

Before final confirmation, show concise trust signals only when true:

- Verified Xooter assigned.
- Support available for booking issues.
- Payment and booking details protected in-app.
- Booking cover active only if selected and policy support exists.
- Care+ priority active only if membership status is active.

Do not show guarantees or coverage claims that the backend and policy documents do not support.

## Abuse Controls

Server-side rules must prevent:

- price tampering
- add-on or service fee manipulation
- fake payment confirmation
- cancellation-window manipulation
- replacement eligibility manipulation
- XootCred/referral abuse
- Care+ credit abuse
- booking ownership bypass
- contractor assignment spoofing
- off-platform payment or booking solicitation
- repeated fake bookings or no-show patterns
