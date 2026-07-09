# Care+ Specification

## Membership Positioning

Care+ is Zoot's premium household reliability, memory, priority, and loyalty layer. It must not feel like a discount subscription. It should feel like a calm concierge layer for homes that should not need constant managing.

Primary positioning:

`Care+ keeps your home remembered, protected, and ready.`

Public hero copy:

- Headline: `Care+ keeps your home ready.`
- CTA: `Join Care+ for R99/month`
- Secondary CTA: `See what is included`

Use `join Care+` or `become a Care+ member`. Do not use `subscribe` in user-facing Care+ copy.

## Primary Plan

- Name: Zoot Care+
- Price: R99/month
- Audience: busy households, professionals, recurring customers, families, Airbnb hosts, landlords, and small office operators who value continuity and support.
- Product type: membership, not a discount plan.

## Core Benefits

1. Home Memory: save pet notes, access instructions, parking, room priorities, fragile areas, product preferences, allergy notes, and favourite add-ons.
2. Favourite Zooter: save and rebook a preferred Zooter using `Book [Zooter Name] again`.
3. Priority Booking: earlier access to high-demand slots and recurring schedules.
4. Priority Replacement Support: prioritised replacement matching when a Zooter cancels or becomes unavailable. Do not say guaranteed replacement unless backend and operations support it.
5. One-Tap Rebook: repeat previous bookings using saved home, service, schedule, and preferred Zooter data.
6. ZootCred Boost: earn 1.5x ZootCred on completed bookings.
7. Monthly Add-On Credit: R30 monthly add-on credit usable only with a completed booking. It expires monthly and cannot be withdrawn.
8. Smart Home Reminders: AI-style prompts based on real booking patterns, home profile data, and availability.
9. Property Profiles: save multiple homes, access notes, turnover instructions, room priorities, and cleaning history.
10. Priority Support: faster handling for booking issues, cancellations, and service concerns.

## Premium Moat Features

These may ship as UI-ready components with typed mock data until backend support is complete:

- Home Readiness Score.
- Seasonal Home Reset perks.
- Before/after photo proof.
- Member-only peak slot access.
- Flexible reschedule window.
- Guest-Ready Mode.
- Care+ concierge prompts.

Any mock or preview state must not be treated as production authority.

## Smart Reminder Examples

- `Your home was cleaned 12 days ago. Want to book Nomsa again?`
- `Your usual Thursday slot is available.`
- `Guest arriving soon? Schedule an Airbnb turnover clean.`
- `You often add ironing. Save it as a default?`

Smart reminders must be based on real source-of-truth data in production. If data is missing, show a generic safe prompt or no prompt.

## Growth Loops

- Home Memory makes repeat bookings easier than starting over.
- Favourite Zooter creates emotional continuity and repeat usage.
- One-tap rebook turns completed bookings into the next action.
- ZootCred boost keeps value inside the Zoot ecosystem.
- Monthly add-on credit makes R99/month feel tangible without discounting core service value.
- Smart reminders convert once-off customers into recurring customers.
- Property profiles make Zoot operational infrastructure for hosts, landlords, and offices.

## Retention Systems

- Care+ onboarding sequence:
  - Day 1: welcome and what is included.
  - Day 3: lock in preferred Zooter before the week fills up.
  - Day 7: set recurring schedule and reduce future planning.
- Lapse prevention: if a regular customer misses their usual booking interval, send one warm in-app prompt using their own pattern.
- Post-clean satisfaction check: one-tap rating 30 minutes after completion, with human follow-up for low ratings.
- Favourite Zooter fallback: if preferred Zooter is unavailable, suggest the next best match with a clear reason.

## Exclusions And Guardrails

- Care+ does not guarantee contractor availability unless future backend and operations support a specific guarantee.
- Care+ does not guarantee replacement unless approved replacement logic and operational capacity exist.
- Care+ credits cannot be withdrawn as cash.
- Monthly add-on credit expires monthly and applies only to completed bookings.
- Sensitive Home Memory fields must be encrypted, access-controlled, and never sent in push, SMS, WhatsApp, or email.
- Priority support means faster handling and escalation, not guaranteed outcome.
- Avoid public competitor mentions or unsupported claims.

## Reusable Interfaces

Care+ implementation should expose typed reusable data structures for:

- `CarePlusMembership`
- `HomeMemoryProfile`
- `FavouriteZooter`
- `ZootCredBalance`
- `PropertyProfile`
- `SmartReminder`
- `CarePlusBenefit`
- `CarePlusPlan`

These interfaces should separate display-ready mock data from backend-authoritative production data.
