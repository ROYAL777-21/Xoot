# Care+ paywall — copy draft

Draft for review. Nothing built yet. Reference: Uber One's paywall, supplied 2026-08-02.

## What the reference does well, and what we should take

| Uber One does | Take it? | Why |
|---|---|---|
| Contextual strip tied to the action in progress ("earn 5% **on this ride**") | **Yes** | The single strongest element. Converts an abstract subscription into a number about the thing you are doing right now |
| Struck-through price beside the offer | **Conditional** | Only if the struck price was genuinely charged. See "The 50% framing" below |
| Benefit cards: icon, bold claim, one clarifying line | **Yes** | Scannable, and forces each benefit to be concrete |
| "Cancel at any time" as its own card | **Yes** | De-risking is a benefit, not fine print |
| Billing authorisation stated above the CTA | **Yes** | Also required — CPA s41 and ECTA s43 |
| "Members save R127 on average every month" | **No — replace** | See "The savings claim" below. An average is the wrong instrument for Xoot |

## The arithmetic, before the copy

New economics: R39 booking fee waived on **every** booking; R99/month.

| Booking rhythm | Fee saved / month | Net vs R99 |
|---|---|---|
| Monthly | R39 | **−R60** |
| Fortnightly | R85 | **−R14** |
| 3 a month | R117 | +R18 |
| Weekly | R169 | **+R70** |
| Twice weekly | R338 | +R239 |

**Break-even is 2.54 bookings a month.**

This is the most important fact about the paywall. A fortnightly customer — plausibly the
modal Xoot household — is **R14 a month worse off** on the fee waiver alone. So Care+ cannot
be sold as "you will save money" to everyone, because for a large segment it is not true, and
under **CPA s41** a representation that is false or misleading is prohibited regardless of
intent.

Three honest ways forward, and I recommend the third:

1. Sell Care+ on the non-monetary benefits and never quantify. Safe, weaker.
2. Show an average. **Do not do this.** An average across a bimodal population is true of
   almost nobody and is exactly the claim that draws a complaint.
3. **Show each user their own number, computed from their own history.** "Based on your last
   3 bookings, Care+ would have saved you R117." Server-computed, per user, defensible. Where
   the number is negative, do not show it — lead the card stack with continuity and priority
   instead. This is both the most persuasive version and the only one that is true for
   everyone who sees it.

Option 3 also means the paywall has two modes, which the copy below reflects.

## DECIDED 2026-08-02 — founding member price

The founder chose **"R99/month, locked for as long as you stay a member."** No struck-through
figure, no percentage, no comparison claim of any kind. A two-month free trial may be added
later, on request only — and if it is, the CTA becomes "Start free — then R99/month" and the
billing paragraph has to state the date the first charge lands.

This closes the section below. It is kept because the reasoning is worth not relearning.

## The 50% framing — flagging before it is built

An earlier instruction was to present R99/month as a 50% discount, with R198 as the original.

**If R198 has never been charged to anyone, this cannot ship.** Presenting a price as a
reduction from a price that was not the actual former selling price is prohibited under
**CPA s30** (bait marketing) and **s41** (misleading representations). It is one of the most
frequently enforced provisions in SA consumer law and the fine is calculated on turnover.

Compliant alternatives that are at least as persuasive:

- **"Founding member price. R99/month, locked for as long as you stay a member."** Loss
  aversion on the lock is stronger than a discount claim, and it is true the moment you
  decide it.
- **A genuine launch price** with a real end date and a real price after it — then the
  strike-through is legitimate, because R198 becomes the actual price.
- **"First month R49, then R99."** A real introductory price, no comparison claim needed.

I would use the first. Recommendation only — your call, and it is one line to change.

---

# THE COPY

## A. Contextual entry point (in the booking flow)

Shown as a strip above the fee line at checkout, in Care+ red.

> **Care+ members don't pay this.**
> Join and we'll drop the R39 booking fee — on this booking and every one after.

Alternate, for a member who is already saving:

> **R39 booking fee waived.** That's Care+.

## B. Paywall header

> ### Care+
> **R99/month · cancel any time**

With founding-price framing:

> ### Care+
> **R99/month — founding member price, locked for as long as you stay.**

This is the chosen header. The plain `R99/month · cancel any time` variant above is superseded.

## C. Contextual value strip (the Uber pattern, adapted)

**Mode 1 — user has booking history where the maths works:**

> Based on your last 3 bookings, Care+ would have saved you **R117**.

**Mode 2 — new user, or maths does not favour them:**

> Care+ removes the R39 booking fee from every booking, and keeps the same Xooter coming
> back to your home.

## D. Benefit cards

Six cards, two-column grid, matching the reference layout.

**1. No booking fee. Ever.**
We waive the R39 booking fee on every booking — not just your first.

**2. Keep your Xooter**
Book the same person every time. No re-explaining where the mop lives.

**3. First pick of the diary**
See and book priority slots before they open to everyone else.

**4. Home Memory**
Your preferences, your pets, your quirks — remembered, so you never repeat yourself.

**5. 1.5× XootCred**
Earn one and a half times the credit on every booking. Spend it on future cleans.

**6. Cancel any time**
No lock-in, no notice period, no cancellation fee.

## E. The R30 credit — new structure

Your revision: unlocked after the first completed booking, redeemable on the second.

Presented as a seventh card, or as a strip beneath the grid:

> **R30 back, on us**
> Complete your first booking as a member and we'll add R30 to your account. Use it on your
> next one.

Copy discipline that matters here: it is **R30 once**, not monthly. The whole codebase was
corrected on 2026-07-30 because thirteen surfaces including a legal page called it monthly.
Nothing in this paywall may reintroduce that word.

Post-booking-1 state, on the home screen:

> **R30 unlocked.** It comes off your next booking automatically.

## F. Social proof — replacing the average

Only render when the underlying claim is measurable and true. Until there is data, omit the
band entirely rather than estimate.

Candidates, in order of preference:

> **8 in 10 Care+ members book the same Xooter again.** ⓘ

> **Care+ members book 3× more often.** ⓘ

Both are behavioural rather than monetary, both are verifiable from your own tables, and
neither is a price representation — so neither carries CPA s41 exposure the way a savings
average does. The ⓘ opens the basis for the claim, which is what makes it defensible.

## G. Billing authorisation — above the CTA

> By joining Care+ you authorise Xoot to charge R99 to your selected payment method today
> and monthly thereafter until you cancel. Cancel any time in Account → Care+; cancellation
> takes effect at the end of the current billing month and no further amounts are charged.
> The R39 booking fee waiver applies to bookings made while your membership is active.
> **See Care+ terms.**

This paragraph is not decoration. **ECTA s43** requires the supplier, price, and cancellation
terms to be disclosed before the transaction, and **CPA s14** governs what a subscription may
do on cancellation. It sits above the button, as in the reference.

## H. Primary CTA

> **Join Care+ — R99/month**

Not "Try for free" unless there is genuinely a free period. If there is a trial:

> **Start free — then R99/month**

## I. Decline path

> Not now

Never "No thanks, I don't want to save money." Confirmshaming is a dark pattern, it reads as
contempt, and it is the kind of thing that ends up screenshotted.

## J. Expanded "see all benefits" view

Same six cards in a scrollable grid, plus:

> **See terms and benefit details** ›

and the honest-claim band from §F if it is available, then:

> **Go back**

---

## Open decisions before this can be built

1. **Founding price, launch price, or introductory price** — pick one; "50% off R198" is not
   available unless R198 is or was real.
2. **Does the R39 waiver apply to Booking Cover too?** Booking Cover is R22 and is a
   separate, insurer-underwritten product. If it is waived, that is Xoot paying a premium on
   the member's behalf and it needs to be said precisely. If not, the copy must not imply
   "no fees".
3. **Is there a free trial?** Changes the CTA and the billing paragraph, and interacts with
   the existing trial-exclusion rule on the R30 credit.
4. **Does the R30 credit still exclude users who came through the onboarding free trial?**
   The current rule says yes. Your new structure — unlock on booking 1, redeem on booking 2 —
   does not mention it. If both rules apply, some members will be told about a credit they
   cannot get, which is the exact failure mode of the "monthly" wording.
5. **Priority booking windows and Home Memory** — are both live today? Card 3 and card 4 are
   claims. Under the pattern in `src/lib/tipping.ts`, each needs a readiness constant and a
   test that stops it rendering before the feature exists.
