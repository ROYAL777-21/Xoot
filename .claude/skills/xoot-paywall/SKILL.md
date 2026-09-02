---
name: xoot-paywall
description: >
  Design Xoot's Care+ membership conversion surfaces — paywall screens, trial mechanics,
  abandonment offers, price presentation and the benchmarks that judge them. Use when building
  or changing a Care+ upgrade flow, a trial, a membership screen, or any surface where a customer
  decides to become a member.
user-invocable: true
---

# Xoot paywall and membership conversion

Care+ is a membership, and `docs/BRAND_GUIDE.md` is explicit: **never call it a subscription and
never call it a subscribe button.** "Join Care+" / "Become a Care+ member".

## Multi-step beats single-screen

A single screen asking for money does one job badly: it presents a price before the value has
been established. A short sequence that establishes what the member gets, answers the objection,
*then* prices, converts materially better — commonly cited at 20–40% uplift.

A workable Xoot sequence:

1. **What changes for you** — continuity with the same Xooter, remembered preferences, priority.
   Outcome language, never labour or price.
2. **The objection, answered** — the honest maths (below), and what happens if they cancel.
3. **The choice** — tiers side by side, monthly and annual.
4. **Confirm** — exactly what is charged, when, and how to stop it.

## Reducing trial anxiety

If a trial is offered, the fear is not the duration — it is being trapped and forgotten. So:

- State **when it converts and what is charged**, in the same breath as "free".
- **Remind before charging.** A reminder costs a small share of conversions and buys back far
  more in refunds not requested and complaints not made.
- Make cancellation **one tap and visible**, not buried. A hard-to-cancel membership generates
  chargebacks and CPA complaints that cost more than the retained revenue.
- Mention the free period more than once. Anxiety is what suppresses trial starts.

⚠️ **Legal:** CPA s14 (fixed terms max 24 months, cancellable on 20 business days' notice) and
ECTA s42–43 (electronic-transaction disclosure and cooling-off) both apply. Auto-renewal must be
disclosed up front, not in terms. Get this reviewed before launch.

## Abandonment

When someone leaves the flow, a **single** better-value option — typically annual — captures
real remaining intent. Once. It is a second offer, not a pursuit; a flow that will not let you
leave reads as a trap and is remembered as one.

## Price presentation

- **Anchor against your own higher tier**, never a struck-through price that was never charged
  (CPA s30).
- Annual framed as months included rather than a percentage off — it avoids discount language
  the brand guide bans and is easier to verify.
- Round, confident numbers. Xoot is positioned premium; `.99` pricing fights that positioning.
- **Rand, with a space:** R450.

## ⚠️ The honesty gate — this overrides every technique above

**Care+ breaks even at 2.54 bookings per month.**

- **No savings claim unless it is true for that specific user's history.** No history → no claim.
- If their actual pattern means Care+ costs them more, **the flow must not imply savings.** Sell
  what is true for them instead: continuity, the same Xooter, remembered preferences, priority.
  Those are real and worth paying for at any frequency.
- **The cancellation screen shows the real number** — what they spent as a member, and what the
  same bookings would have cost otherwise. Including when that number is unflattering.

Converting someone into a membership that costs them money is churn you paid to create, plus a
s41 problem, plus the review that follows.

## Placement

Not only at onboarding. The highest-intent moments are **after a good first clean** and **at the
point of booking a repeat** — when the value is felt rather than described. Never mid-checkout:
interrupting a booking to sell a membership costs the booking.

## Benchmarks

| Metric | Healthy |
|---|---|
| Trial start rate | >15% |
| Trial → paid | >30% |
| Install → paid (no trial) | >4% below this means real headroom |

**These are US-app benchmarks.** Treat them as direction, not as targets, until Xoot has its own
numbers — a local services marketplace in South Africa is not a US utility app, and importing
someone else's conversion expectations is how teams conclude a healthy funnel is broken.

Measure per `docs/marketing/measurement-spec.md`, state `n`, and remember that at current volume
almost every difference is noise.
