# Care+ unit economics, by cadence

Written 2026-08-09 at the R99 repricing to answer a direct question — **are fortnightly members our
least profitable, and if so why, and what do we do about it?** — and re-solved the same day once the
founder supplied the commission rule.

Short answer: **no — monthly members are the least profitable per head. But fortnightly is the
segment most likely to lose us money we have already spent, and it is probably the largest.** Those
are different problems and they need different fixes.

The commission answer changed one thing and left the rest standing: Care+ is comfortably positive at
every cadence and every rank. It was never at risk. What *is* at risk is something the earlier
version of this page could not see, and it is in the "who serves them" section below.

---

## The rule, and why there are two tables

Commission starts at **35%** for a new Xooter and **falls as they rank higher** on
`zooters.reliability_score` — ratings, quality of work, punctuality. The ladder lives in
`src/lib/xooter-commission.ts`:

| rank | reliability score | min completed jobs | commission |
|---|---|---|---|
| New | — | 0 | 35% |
| Bronze | ≥ 80 | 10 | 32.5% |
| Silver | ≥ 88 | 25 | 30% |
| Gold | ≥ 93 | 75 | 25% |
| Platinum | ≥ 97 | 200 | 20% |

So "what does a Care+ member contribute" has no single answer — **it depends on who cleans their
home.** Every table below is solved at both ends.

The old warning in `care-plus.ts`, that the membership might be margin-negative *"if Xoot's
commission is below ~15%"*, is retired. The floor is 20%.

## What a member costs and returns

Per member per month, on the R296 medium clean, at the rate the server actually applies (a **flat
10%**, see the divergence note):

| | bookings/mo | spend | returned to member | Xoot absorbs¹ |
|---|---|---|---|---|
| Weekly | 4.345 | R1 286 | R129 | R77 |
| Fortnightly | 2.173 | R643 | R64 | R39 |
| Monthly | 1.0 | R296 | R30 | R18 |

¹ `DISCOUNT_FUNDING = "shared"` with `XOOTER_SHARE_OF_DISCOUNT = 0.4`, so Xoot carries 60% of what is
returned. The Xooter carries the rest, floored by `MIN_XOOTER_PAY_*` — but see the pay-floor conflict
below, which is live.

**Contribution per member per month:**

| | served by a New Xooter (35%) | served by a Platinum Xooter (20%) | member's own position |
|---|---|---|---|
| Weekly | **R472** | **R279** | +R30 ahead |
| Fortnightly | **R286** | **R189** | −R35 down |
| Monthly | **R185** | **R140** | −R69 down |

**So fortnightly is not the least profitable — monthly is**, at both ends of the ladder. Fortnightly
sits in the middle on every line: middle contribution, middle spend, middle position for the member.

The member's own position does not move with commission at all, which is why the fortnightly argument
below survived the repricing unchanged. It was never about our margin.

Note the shape. The R99 fee is flat, so as cadence falls, membership revenue becomes a larger share of
a smaller total and *contribution* falls more slowly than *spend* does. A monthly member is a quarter
of a weekly member's spend and still 40–50% of the contribution. Care+ is doing real work at low
cadence — on a much smaller base.

## The thing the commission rule exposed: Care+ concentrates volume on our cheapest take rate

Commission falls with rank. **So our best Xooters are our lowest-margin supply** — and every matching
system we have is built to send them more work. `sortXootersForMarketplace` ranks high scores first,
`ai-match` weights `jobs_completed`, and Care+'s central promise is *the same Xooter every time*.

A weekly member matched to a Platinum favourite contributes **R279**; the same member on a new Xooter
contributes **R472**. The R99 fee does not move to compensate, and nothing in the product tries to.

**This is not a bug.** Paying excellent people more is the entire point of the ladder, and a
continuity promise served by whoever happened to be cheapest would be a worse product. But it has a
consequence worth stating plainly:

> **Size Care+ against the floor, not the average.** At maturity most Care+ bookings will be served by
> ranked Xooters and will pay close to 20%. The R279 / R189 / R140 column is the one to plan on. The
> 35% column is a start-up artefact that shrinks as the marketplace gets better at its job.

Read that way, Care+ is still comfortably positive everywhere:
the worst cell in the table is R140 a month against a R99 fee.
There is no cliff. But the trajectory is downward and it is *caused* by things going well, which is
the kind of trend that surprises people.

## ⚠️ The pay-floor conflict, unresolved

`CarePlusApply.tsx` tells households, on screen: *"Minimum pay enforced: R220 (half) / R300 (full) for
dignified work."* `care-plus.ts` imported those two numbers into `splitDiscount` as a per-booking
floor.

They do not survive contact with the ladder. On the standard R296 medium clean (5.5h regular):

| rank | Xooter earns | clears R220? |
|---|---|---|
| New (35%) | R192.40 | ✗ |
| Silver (30%) | R207.20 | ✗ |
| Gold (25%) | R222.00 | ✓ |
| Platinum (20%) | R236.80 | ✓ |

A new Xooter is **below the figure the product calls a minimum, before any Care+ discount is applied
at all.** `splitDiscount` degrades safely — it takes nothing rather than going further below — so
nothing is broken. The floor is simply unreachable at the bottom of the ladder.

Two readings, and they lead to different fixes:

1. **The floor is a placement figure, misfiled.** `CarePlusApply` is a *household hiring a domestic
   worker* for standing days (07:00–16:00, chosen weekdays) at a `daily_pay_rate`. A full working day
   is not a 5.5-hour clean, and `splitDiscount`'s `hours >= 6 ? full : half` maps one onto the other.
   On this reading, per-booking work needs its own floor and R220/R300 should stop being cited here.
2. **The floor is real for all Xoot work.** Then 35% is incompatible with the regular ladder, and
   either the ladder rises or the starting band falls.

**Corroboration for the first reading:** `approve-zooter` writes `hourly_rate: 35`, and 65% of R296
over 5.5 hours is exactly R35/hour. The 35% band and the hourly rate already in the database agree
with each other. It is the R220 that is the outlier.

`xooter-commission.test.ts` pins the exact break-even — **25.68%** on a R296 clean — so a ladder or
rate change moves a number rather than passing quietly. **Founder decision required.**

## Why fortnightly is still the segment to worry about

Three reasons, none of which show up in a contribution table, and none of which commission changed.

**1. It is the cadence where the maths nearly works and does not.** A weekly member is ahead and knows
it. A monthly member is obviously not buying on price and knows that too — nobody books one clean a
month and expects a membership to pay for itself. **Fortnightly is the only cadence where someone can
plausibly believe the membership washes out, do the sum three months in, and find it does not.** R64
back against R99 is close enough to feel like a mistake and far enough to be one. That is the churn
most expensive to us, because it happens *after* acquisition and after the free month.

**2. We have already paid for them when it happens.** The free first month costs Xoot the R99 plus the
returned value with no membership revenue against it: about **R138 for a fortnightly member** (R99 +
R39 absorbed). At the floor that is roughly three-quarters of a month's contribution to recover; at
35% it is about half. A member who leaves in month three has been marginally profitable; one who
leaves in month two has not.

**3. It is probably our biggest segment.** Fortnightly is the common cadence in South African domestic
cleaning. We do not have the data to confirm that inside this repo — no booking-cadence distribution
exists yet — but if it holds, our largest segment is the one with the weakest honest pitch. **That
combination, not the contribution figure, is the actual risk.**

## What we should do about it

Ordered by cost to us. The first two are done; the rest are decisions, not code.

**Done — say it plainly before they work it out.** `CarePlusPaywall.tsx` shows the fortnightly and
monthly branch a sentence that leads with the shortfall rather than burying it: *"At your cadence the
member rate returns about R64 a month, so Care+ won't cover itself on price. It covers itself the day
someone walks in already knowing your home — and the first month is free either way."* A member who
joins having read that cannot feel misled later, which is the whole failure mode. It also matches
`BRAND_GUIDE.md`: Care+ "is not a discount plan", and "discount" is a forbidden word in user-facing
copy.

**Done — quote the rate the server actually gives.** The paywall was advertising 15% while
`create-booking` applies 10%.

**Decide — align the server with the cadence tiering, or drop the tiering.** `CADENCE_DISCOUNT`
intends 15/10/5; `getCarePlusDiscount` returns a flat 0.1. Aligning it would *lower* weekly
contribution and *raise* monthly. It leaves fortnightly untouched at exactly 10%. So tiering is not a
fortnightly lever at all — it is a weekly-versus-monthly lever, and right now we are quietly running
the flat version. **Pick one on purpose.**

**Consider — weight a benefit toward fortnightly rather than money.** The continuity promise is worth
*most* at fortnightly and we do not say so. A weekly member sees the same Xooter often enough to build
the relationship regardless of Care+; a monthly member barely builds one either way. Fortnightly is
precisely the gap where "the same person every time" changes the experience and where the platform
default would otherwise rotate. That is a copy and matching-priority change, not a pricing one, and it
costs us nothing per member.

**Consider — a mid-cycle top-up at member rate.** Something small between visits (an express hour, a
targeted room) offered only to members below weekly. It raises spend on the segment with the most
headroom, and it is the one lever that improves fortnightly contribution without touching the fee or
widening what we return.

**Do not — introduce a cheaper tier for low cadence.** That was the old R99/R199 split, and it made the
pitch about price at exactly the segment we cannot win on price. It also produced the false "half the
price of Premium" claim we have removed.

## The divergence this document assumes

`create-booking`'s `getCarePlusDiscount` returns **0.1 flat** for every active member, ignoring
cadence. `care-plus.ts`'s `CADENCE_DISCOUNT` describes 15/10/5. `pricing-parity.test.ts` pins both so
neither can move silently, and the paywall quotes the server's figure.

Every number on this page uses the flat 10%, because that is what a member is actually charged.

## What is not modelled here

Stated rather than glossed, because a unit-economics page that hides its gaps is worse than none:

- **The commission floor.** 20% is an assumption, not a founder figure. It is now the single largest
  input, because it is what the mature marketplace pays.
- **Rank mix.** How Care+ bookings distribute across the ladder decides where in the R472–R279 range we
  actually land, and nothing measures it. This replaces "commission rate" as the unknown that moves
  the answer most.
- **Servicing cost per member.** Support contacts, replacement handling, priority matching. Care+
  promises priority support, a real cost that scales with members and not with spend — so it hurts
  low-cadence members' contribution more than this table shows.
- **Churn.** The argument above is about churn and the table does not contain it. Contribution per
  month means little without expected lifetime.
- **Cadence distribution.** No data in this repo. The claim that fortnightly is the largest segment is
  an assumption from the South African market, flagged as one.
- **XootCred at 1.5×,** and the once-off R30 welcome add-on credit. Both are real costs of membership
  and neither is in the table.
