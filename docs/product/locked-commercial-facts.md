# Xoot Locked Commercial Facts

Reviewed: 2026-06-24
Authority: Xoot Master Phased Implementation Program

> ⚠️ **SUPERSEDED IN PART — see ZD-020 (2026-07-29).** The pricing table below is stale.
> Pricing moved from flat per-home-size to per-half-hour ladders per service; Booking Cover
> moved R21 → R22. Authoritative pricing now lives in `docs/xoot-master-brief.md` §4.
> The Care+ "R30 monthly add-on credit" line is also wrong — the credit is **one-time in the
> member's first month**, and only when they did not arrive via the onboarding free trial.
> Everything else in this document (brand, positioning, recurring rules pending confirmation)
> still stands.
>
> ⚠️ **THE BOOKING FEE CHANGED — see ZD-026 (2026-08-12).** R39 is no longer a one-time fee.
> It is charged on **every** booking, and Care+ membership is the only thing that waives it.
> The two fee rows below are updated accordingly; the recurring-rules block that gave a free
> booking to 1-2 days per week no longer applies to the fee.

These values and policies are locked. Code, copy, agents and provider configuration must not contradict them without an approved decision-log entry.

## Brand

- Position: premium managed home-care infrastructure.
- Promise: Your home. Handled.
- Professionals are called Xooters.
- Do not describe Xoot as cheap cleaning or a loose gig marketplace.

## Pricing

| Item | Locked value |
| --- | --- |
| Small home clean | R280 for 4 hours |
| Medium home clean | R325 for 5.5 hours |
| Large home clean | R400 for 8 hours |
| Standard add-on | R30 |
| Booking fee, every booking | R39 (ZD-026) |
| Booking fee for Care+ members | Waived, at every frequency (ZD-026) |
| Booking Cover by Genric | R21, optional and only preselected when legally and commercially approved |
| Care+ membership | R99 per month |

Recurring rules (**the fee clause is superseded by ZD-026** — cadence no longer waives the
booking fee, only Care+ does; the discount tiers below still stand pending confirmation):

- 1-2 days per week: ~~no service fee~~ — the R39 booking fee applies, per ZD-026.
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

- R30 welcome add-on credit, one-time (see the banner above);
- 1.5x XootCred multiplier;
- priority booking windows;
- favourite-Xooter continuity support;
- home-memory benefits;
- priority service recovery support.

Care+ does not guarantee a specific Xooter.

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

## Xoot Black

Xoot Black is:

- Elite Verified only;
- explicit and never preselected;
- limited by area, supply and feature flags;
- performed with Xoot-approved equipment and supplies;
- eligible for a Xoot-issued service completion certificate.

Do not claim government, insurer, medical or independent certification without evidence.

## Booking Cover

Required wording:

`Booking Cover by Genric`

Rules:

- Xoot is not the insurer.
- Claim approval is never guaranteed.
- Xoot does not interpret policy wording.
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

Xooters may access approved household access information:

- from 45 minutes before scheduled start;
- until 30 minutes after verified completion;
- never after cancellation.

Sensitive access details must not appear in ordinary chat, email, SMS, WhatsApp, analytics, Sentry, widgets or Live Activities.

## Notification Hierarchy

1. Xoot app and in-app notifications.
2. Brevo transactional email.
3. WhatsApp for approved urgent operational events only.
4. Twilio Verify for OTP and step-up verification.

Allowed WhatsApp uses:

- approved Verify OTP flow;
- Xooter on the way;
- Xooter arrived;
- same-day cancellation with replacement offer;
- safety alert;
- no-show alert.

Disallowed WhatsApp uses:

- marketing;
- routine Care+ reminders;
- routine rebooking;
- XootCred or badge updates;
- normal support;
- client-to-Xooter chat;
- payment, refund or insurance support.

## Repeat Booking Copy

Use:

`Book [Xooter first name] again`

Do not use:

`Book again`

Show the CTA only when availability is genuine or reasonably likely.

## Crew Bookings

**Decided 2026-09-03 (ZD-035). ⛔ Decided, not yet implemented — the live server still prices the
old way.**

- A crew **finishes one job sooner**. It is not N separate jobs.
- Price: `base × crewOverhead[n−1]`, where `crewOverhead = [1, 1.15, 1.25, 1.4]`.
- Elapsed time: `soloHours × overhead / n`.
- Maximum crew 4. Caps by size `{small: 2, medium: 3, large: 4}`; by service
  `{airbnb: 3, office: 4, moving: 4, express: 3, laundry: 1}`.
- **Laundry is 1 in every size** — machine-bound; a second person cannot shorten a wash cycle.

⚠️ **Until ZD-035 ships, the live charge is the old model** — `base × count`, less 10% at ≥3,
available only on `airbnb`, `office` and `moving`. A 5.5h Airbnb with 2 Xooters is **R684 live** and
**R393 under ZD-035**. Both are R62 per labour-hour; they sell different amounts of labour.

⛔ **No surface may quote the ZD-035 number while the server charges the old one.** That is the
defect this repository has shipped three times.

## Referrals

**Decided 2026-09-03 (ZD-036). ⛔ Decided, not yet implemented.**

- Two-sided, **R100 each**: credit to the referrer, R100 off the referee's **first** booking.
- Shown as a **named line** on the quote — *"Thandi's invite"*, not "Discount".
- Funded from **commission, never Xooter pay**.
- Not combinable with itself: one code per buyer, burned on redemption.
- Ineligible: the buyer's own code, and any buyer with a completed booking.

⚠️ **Every one of those checks is server-side or it does not exist.** *Referral qualification* is
already listed below as something the frontend is never authoritative for, and the design's
`referral.js` implements all of it in the browser.

⚠️ **The amount is provisional.** R100 against a ~R335 first clean is roughly a third off, funded
by Xoot, justified by a repeat rate that cannot be measured until bookings complete.

## Financial And Trust Authority

The frontend and agents are never authoritative for:

- price;
- payment success;
- refund approval;
- Care+ state;
- XootCred;
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
- Xooter terms;
- refund and cancellation policy;
- Booking Cover wording;
- account/data deletion;
- AI Concierge notice;
- store privacy and data-safety declarations.
