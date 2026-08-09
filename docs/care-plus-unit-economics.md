# Care+ unit economics, by cadence

Written 2026-08-09, at the R99 repricing, to answer a direct question: **are fortnightly members
our least profitable, and if so why, and what do we do about it?**

Short answer: **no — monthly members are the least profitable per head. But fortnightly is the
segment most likely to lose us money we have already spent, and it is probably the largest.** Those
are different problems and they need different fixes.

---

## The one number that decides this, and we do not have it

Everything below is a function of **Xoot's commission rate on a booking**, and that rate is not
established anywhere in this repository. `care-plus.ts` has carried the warning since it was
written:

> ⚠️ CONFIRM before this charges anyone: the percentages are sized to make the membership wash out
> at weekly cadence, not derived from a known take rate. If Xoot's commission is below ~15% these
> are margin-negative on every weekly member.

So the tables use **c** for commission and are solved at c = 15% as an illustration. **Fixing c is
the highest-value thing on this page.** Until it is fixed, "which cadence is most profitable" is a
question about the shape of the curve, not the value.

## What a member actually costs and returns

Per member per month, on the R296 medium clean, at the rate the server actually applies (a **flat
10%**, see the divergence note below):

| | bookings/mo | spend | returned to member | Xoot absorbs¹ | contribution |
|---|---|---|---|---|---|
| Weekly | 4.345 | R1 286 | R129 | R77 | **R22 + 1286c** |
| Fortnightly | 2.173 | R643 | R64 | R39 | **R60 + 643c** |
| Monthly | 1.0 | R296 | R30 | R18 | **R81 + 296c** |

¹ `DISCOUNT_FUNDING = "shared"` with `XOOTER_SHARE_OF_DISCOUNT = 0.4`, so Xoot carries 60% of what
is returned to the member. The Xooter carries the rest, floored by `MIN_XOOTER_PAY_*`.

Solved at **c = 15%**:

| | contribution / month | member's own position |
|---|---|---|
| Weekly | **R215** | +R30 ahead |
| Fortnightly | **R157** | −R35 down |
| Monthly | **R126** | −R69 down |

**So fortnightly is not the least profitable — monthly is.** Fortnightly sits in the middle on
every line: middle contribution, middle spend, middle position for the member.

Note the shape though. The R99 fee is flat, so as cadence falls, membership revenue becomes a larger
share of a smaller total and the *contribution* falls more slowly than *spend* does. A monthly
member is a quarter of a weekly member's spend and still over half the contribution. Care+ is doing
real work at low cadence — it is just doing it on a much smaller base.

## Why fortnightly is still the segment to worry about

Three reasons, none of which show up in a contribution table.

**1. It is the cadence where the maths nearly works and does not.** A weekly member is ahead and
knows it. A monthly member is obviously not buying on price and knows that too — nobody books one
clean a month and expects a membership to pay for itself. **Fortnightly is the only cadence where
someone can plausibly believe the membership washes out, do the sum three months in, and find it
does not.** R64 back against R99 is close enough to feel like a mistake and far enough to be one.
That is the churn most expensive to us, because it happens *after* acquisition and after the free
month.

**2. We have already paid for them when it happens.** The free first month costs Xoot the R99 plus
the returned value with no membership revenue against it: about **R138 for a fortnightly member**
(R99 + R39 absorbed). At c = 15% that is roughly one month of contribution to recover. A member who
leaves in month three has been marginally profitable; one who leaves in month two has not.

**3. It is probably our biggest segment.** Fortnightly is the common cadence in South African
domestic cleaning. We do not have the data to confirm that inside this repo — no booking-cadence
distribution exists yet — but if it holds, our largest segment is the one with the weakest honest
pitch. **That combination, not the contribution figure, is the actual risk.**

## What we should do about it

Ordered by cost to us. The first two are done; the rest are decisions, not code.

**Done — say it plainly before they work it out.** `CarePlusPaywall.tsx` now shows the fortnightly
and monthly branch a sentence that leads with the shortfall rather than burying it: *"At your
cadence the member rate returns about R64 a month, so Care+ won't cover itself on price. It covers
itself the day someone walks in already knowing your home — and the first month is free either
way."* A member who joins having read that cannot feel misled later, which is the whole failure
mode. It also matches `BRAND_GUIDE.md`: Care+ "is not a discount plan", and "discount" is a
forbidden word in user-facing copy.

**Done — quote the rate the server actually gives.** The paywall was advertising 15% while
`create-booking` applies 10%. See the divergence below.

**Decide — align the server with the cadence tiering, or drop the tiering.** `CADENCE_DISCOUNT`
intends 15/10/5; `getCarePlusDiscount` returns a flat 0.1. Aligning it would *lower* weekly
contribution (R215 → R176) and *raise* monthly (R126 → R135). It leaves fortnightly untouched at
exactly 10%. So tiering is not a fortnightly lever at all — it is a weekly-versus-monthly lever, and
right now we are quietly running the flat version. **Pick one on purpose.**

**Consider — weight a benefit toward fortnightly rather than money.** The continuity promise is
worth *most* at fortnightly and we do not say so. A weekly member sees the same Xooter often enough
to build the relationship regardless of Care+; a monthly member barely builds one either way.
Fortnightly is precisely the gap where "the same person every time" changes the experience and where
the platform default would otherwise rotate. That is a copy and matching-priority change, not a
pricing one, and it costs us nothing per member.

**Consider — a mid-cycle top-up at member rate.** Something small between visits (an express hour,
a targeted room) offered only to members below weekly. It raises spend on the segment with the most
headroom, and it is the one lever that improves fortnightly contribution without touching the fee or
widening what we return.

**Do not — introduce a cheaper tier for low cadence.** That was the old R99/R199 split, and it made
the pitch about price at exactly the segment we cannot win on price. It also produced the false
"half the price of Premium" claim we have just removed.

## The divergence this document assumes

`create-booking`'s `getCarePlusDiscount` returns **0.1 flat** for every active member, ignoring
cadence. `care-plus.ts`'s `CADENCE_DISCOUNT` describes 15/10/5. `pricing-parity.test.ts` pins both
so neither can move silently, and the paywall quotes the server's figure.

Every number on this page uses the flat 10%, because that is what a member is actually charged.

## What is not modelled here

Stated rather than glossed, because a unit-economics page that hides its gaps is worse than none:

- **Commission rate (c).** The single largest input, unconfirmed.
- **Servicing cost per member.** Support contacts, replacement handling, priority matching. Care+
  promises priority support, which is a real cost that scales with members and not with spend — and
  it therefore hurts low-cadence members' contribution more than this table shows.
- **Churn.** The argument above is about churn and the table does not contain it. Contribution per
  month means little without expected lifetime.
- **Cadence distribution.** No data in this repo. The claim that fortnightly is the largest segment
  is an assumption from the South African market, flagged as one.
- **XootCred at 1.5×,** and the once-off R30 welcome add-on credit. Both are real costs of
  membership and neither is in the table.
