# Zoot Locked Commercial Facts

Reviewed: 2026-06-24
Authority: Zoot Master Phased Implementation Program

> ⚠️ **SUPERSEDED IN PART — see ZD-020 (2026-07-29).** The pricing table below is stale.
> Pricing moved from flat per-home-size to per-half-hour ladders per service; Booking Cover
> moved R21 → R22. Authoritative pricing now lives in `docs/xoot-master-brief.md` §4.
> The Care+ "R30 monthly add-on credit" line is also wrong — the credit is **one-time in the
> member's first month**, and only when they did not arrive via the onboarding free trial.
> Everything else in this document (brand, positioning, recurring rules pending confirmation)
> still stands.

These values and policies are locked. Code, copy, agents and provider configuration must not contradict them without an approved decision-log entry.

## Brand

- Position: premium managed home-care infrastructure.
- Promise: Your home. Handled.
- Professionals are called Zooters.
- Do not describe Zoot as cheap cleaning or a loose gig marketplace.

## Pricing

| Item | Locked value |
| --- | --- |
| Small home clean | R280 for 4 hours |
| Medium home clean | R325 for 5.5 hours |
| Large home clean | R400 for 8 hours |
| Standard add-on | R30 |
| One-time booking service fee | R39 |
| Recurring booking service fee | Waived |
| Booking Cover by Genric | R21, optional and only preselected when legally and commercially approved |
| Care+ membership | R99 per month |

Recurring rules:

- 1-2 days per week: no service fee.
- 3-4 days per week: up to 15 percent off.
- 5 or more days per week: up to 28 percent off.

All authoritative pricing, credits and discounts are server-controlled.

## Current Pricing Conflict

`supabase/functions/create-booking/index.ts` currently contains:

- small R270;
- medium R315;
- large R390;
- service multipliers, service-length factors and a high-demand premium not approved by this locked document.

No silent code change is permitted. Phase 1 must define the canonical server pricing contract, migration and rollout approval.

## Care+

Customer-facing term: membership.

Care+ includes:

- R30 monthly add-on credit;
- 1.5x ZootCred multiplier;
- priority booking windows;
- favourite-Zooter continuity support;
- home-memory benefits;
- priority service recovery support.

Care+ does not guarantee a specific Zooter.

## Launch Geography

Bookings and launch marketing are limited to:

- Sandton
- Bryanston
- Midrand
- Fourways
- Rosebank
- Bedfordview
- Hyde Park
- Parkhurst
- Melville
- Waterfall
- Dainfern
- Braamfontein
- immediate surrounding areas explicitly enabled in launch-area configuration.

Mapbox-backed service-area validation is required before checkout.

## Standard Cleaning

The customer provides ordinary cleaning materials and equipment unless an approved option is selected.

## Zoot Black

Zoot Black is:

- Elite Verified only;
- explicit and never preselected;
- limited by area, supply and feature flags;
- performed with Zoot-approved equipment and supplies;
- eligible for a Zoot-issued service completion certificate.

Do not claim government, insurer, medical or independent certification without evidence.

## Booking Cover

Required wording:

`Booking Cover by Genric`

Rules:

- Zoot is not the insurer.
- Claim approval is never guaranteed.
- Zoot does not interpret policy wording.
- Internal commission is recognized only after verified payment, confirmed selection and successful activation.

## Booking States

Only these future authoritative states are permitted:

- `draft`
- `pending_payment`
- `payment_confirmed`
- `awaiting_assignment`
- `assigned`
- `contractor_accepted`
- `en_route`
- `in_progress`
- `completed`
- `rated`
- `cancelled`
- `replacement_required`
- `replacement_offered`
- `reassigned`

Legacy values require a migration plan, not new business meaning.

## Sensitive Access

Zooters may access approved household access information:

- from 45 minutes before scheduled start;
- until 30 minutes after verified completion;
- never after cancellation.

Sensitive access details must not appear in ordinary chat, email, SMS, WhatsApp, analytics, Sentry, widgets or Live Activities.

## Notification Hierarchy

1. Zoot app and in-app notifications.
2. Brevo transactional email.
3. WhatsApp for approved urgent operational events only.
4. Twilio Verify for OTP and step-up verification.

Allowed WhatsApp uses:

- approved Verify OTP flow;
- Zooter on the way;
- Zooter arrived;
- same-day cancellation with replacement offer;
- safety alert;
- no-show alert.

Disallowed WhatsApp uses:

- marketing;
- routine Care+ reminders;
- routine rebooking;
- ZootCred or badge updates;
- normal support;
- client-to-Zooter chat;
- payment, refund or insurance support.

## Repeat Booking Copy

Use:

`Book [Zooter first name] again`

Do not use:

`Book again`

Show the CTA only when availability is genuine or reasonably likely.

## Financial And Trust Authority

The frontend and agents are never authoritative for:

- price;
- payment success;
- refund approval;
- Care+ state;
- ZootCred;
- booking state;
- referral qualification;
- contractor verification;
- insurance activation;
- payout eligibility.

## Legal Review

Legal pages in the repository are operational drafts. South African counsel must review:

- Terms of Service;
- Privacy Policy and POPIA notice;
- Care+ terms;
- Zooter terms;
- refund and cancellation policy;
- Booking Cover wording;
- account/data deletion;
- AI Concierge notice;
- store privacy and data-safety declarations.
