# Dynamic pricing: what Xoot will and will not vary a price on

Written 2026-08-09, in answer to a founder question: *"perhaps include dynamic pricing on algorithms
depending on the spending habits of the user."*

This page recommends **against half of that**, so the reasoning lives here rather than in a chat
message somebody has to remember. It also proposes three things worth building instead, all of which
extend mechanisms already in the code.

---

## The line

> **Rewarding frequency with a better rate is fine. Surcharging perceived affluence is not.**

Both are "pricing on spending habits". They are not the same thing, and the difference is not a
matter of degree.

The first prices a **fact about the job**: a customer who commits to fifty-two cleans a year is
cheaper to serve than one who books once, and the discount is the customer's own reward for the
commitment. Anyone can get it by doing the same thing. It is legible, it is symmetric, and a customer
who learns exactly how it works is *more* likely to book, not less.

The second prices a **guess about the person**: this household's history suggests they will pay R380
for the clean we would sell someone else for R296. Nothing about the work changed. The customer
cannot get the lower price by doing anything, because the input is who they appear to be. And a
customer who learns how it works never books again.

Every existing Xoot mechanism sits on the first side of that line. Nothing needs to move; the point
of writing it down is that the second side has to stay empty on purpose.

## What we already price on, and why each is defensible

| mechanism | where | what it prices |
|---|---|---|
| `HIGH_DEMAND_SLOT_RATE` — 15% after 16:00 | `src/lib/operations.ts` | Slot scarcity |
| Multi-Xooter 10% | `src/lib/xoot-pricing.ts` | Efficiency of one visit, several workers |
| `CADENCE_DISCOUNT` — 15/10/5 | `src/lib/care-plus.ts` | Committed volume |
| Care+ member rate | `create-booking` | Committed volume, paid for up front |
| Commission ladder — 35% → 20% | `src/lib/xooter-commission.ts` | Supply quality, on the pay side |

Each varies with a fact about the job or an explicit commitment the customer chose. None varies with
an inference about the customer's wallet.

## What we will not build

**Personalised pricing derived from a customer's spend history, home value, device, suburb affluence,
or any proxy for what they can afford.**

Three reasons, in the order they would actually bite:

**1. It is very hard to defend under the Consumer Protection Act.** The CPA is built around a price
being the price, disclosed and not misleading. A model that quotes two customers different amounts for
an identical clean, on grounds neither can see or contest, is the kind of arrangement that has to be
explained convincingly to a regulator after a complaint, not before.

**2. POPIA s71 constrains automated decisions.** Building a profile from behavioural history and using
it to set what someone is charged is automated decision-making with a substantial effect on the data
subject. That triggers obligations we would have to meet — and meeting them means telling the customer
the model exists, which is also what destroys it commercially.

**3. In a domestic-work marketplace it is a story that writes itself.** "Cleaning app charges richer
suburbs more" needs no investigation to run and no malice to be true. Xoot's whole brand position is
that this industry is usually done badly and we do it properly. That position does not survive the
first screenshot of two quotes for the same clean.

Note that the legitimate version of what was asked for **already exists**. Care+ and
`CADENCE_DISCOUNT` are precisely "pricing that responds to spending habits" — they respond to how much
someone books, transparently, in the customer's favour. If the goal is to extract more from
high-frequency customers, that is a Care+ pricing question, not a personalisation question.

## Worth building instead

All three price supply, all three extend something that exists, and none needs a profile of anyone.

**1. Lead-time pricing.** Tomorrow morning costs more than a fortnight out. It is the most standard
form of dynamic pricing there is, customers already expect it from every travel and delivery product
they use, and it does real work: it pulls demand off the days we cannot staff and rewards planning.
Implementation is the same shape as `isHighDemandSlot` — a function of the booking, evaluated in
`calculateBookingQuote` and mirrored server-side.

**2. Travel-zone pricing.** A job forty minutes outside a Xooter's coverage costs more to serve than
one down the road, and `zooters.suburb_coverage` plus `resolveLaunchRegion` already carry enough
geography to compute it. This is a genuine cost difference, which is exactly what makes it defensible
— and it is *not* suburb-affluence pricing, which uses the same input for the opposite purpose. The
test is whether the surcharge tracks distance or tracks postcode wealth. It must track distance.

**3. A demand curve on the slot, replacing the 16:00 cliff. — built, switched off.** Today
`isHighDemandSlot` is binary: `hour >= 16`, 15% or nothing. On the actual bookable grid the nearest
pair is 15:00 and 16:00 — an hour apart, 0% against 15% — so there is no 15:59/16:01 absurdity, but
there is still a single step carrying the entire premium, and no explanation available to a customer
who notices beyond "that is where we drew the line". `SURGE_SLOT_RATE_RANGE` (0.10–0.15) has sat in
`operations.ts` since it was written with nothing reading it, which looks like a range that was
intended and never built.

`SLOT_PREMIUM_CURVE` now grades it — 5% at 15:00, 10% at 16:00, 15% at 17:00 — leaving the latest
slot exactly where it is and splitting the one big step into two smaller ones.

**`GRADED_SLOT_PRICING` is `false`, so no price has changed.** `slot-pricing.test.ts` proves the
flag-off path is identical to the old rule at every bookable slot, in rands and not just in rates.
Turning it on changes what customers are charged, which is a founder decision rather than a side
effect of a refactor — it is one boolean in `src/lib/operations.ts` and one in `create-booking`, held
together by `pricing-parity.test.ts`.

## The guard

Reasoning in a document decays. `.semgrep/rules/xoot.yaml` carries
**`xoot-pricing-from-user-spend-history`**, which fails any pricing input derived from a customer's
historical spend, lifetime value, or affluence proxy. It is not a complete defence — nothing catches
an intent expressed in a variable named `x` — but it means crossing this line requires an argument in
a pull request rather than a quiet commit, which is the realistic goal.

`.semgrep/rules/xoot.tsx` carries a case proving the rule fires and a near-miss proving it does not
fire on cadence or slot pricing, so the guard is not decoration.
