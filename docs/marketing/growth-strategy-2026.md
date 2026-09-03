# Xoot growth strategy — the supply-first rewrite

Written 2026-09-03 from five Hormozi references supplied by the founder, read as full transcripts
through Eden rather than recalled, plus the existing `ask-hormozi` corpus and this repo's own
measured findings.

> ⚠️ **Superseded in part, 2026-09-03.** This document was built from the five references the
> founder supplied. `hormozi-corpus-findings.md` then read the **full 2,039-video corpus** and
> measured the channel through Eden. It **corroborates** the central finding below — independently,
> using a cleaning business as the example again — and adds one thing this document gets wrong by
> omission: **recruiting content is the worst-performing topic on that channel** (0.59× outlier vs a
> 1.16× baseline). The strategy stands; the way its success is measured does not. Read both.

**This document changes the shape of the plan.** Everything before it treated growth as a demand
problem — channels, hooks, avatars, ad matrices. The references say that is the wrong constraint for
this kind of business, and they say it about *this* kind of business specifically.

---

## What was actually read

| Reference | Views | Outlier | Eng. rate | Length | Read |
|---|---|---|---|---|---|
| **How To Grow ANY Business FASTER (Masterclass)** | 407,945 | 10.71× | 3.14% | — | Service-business section **in full** |
| **My Best Sales Tactic** — ghost products | 862,795 | **22.66×** | **3.71%** | 8 min | **In full** |
| Watch This To Generate 1000s of Leads | 560,441 | 14.72× | 3.22% | 32 min | Transcript held, skimmed |
| Learn Email Marketing in 39 Minutes | 664,567 | 17.45× | 3.09% | 39 min | Transcript held, skimmed |
| The Ultimate Sales Training for 2026 | 1,106,236 | 29.05× | 2.92% | **154 min** | Transcript held, skimmed |

⛔ **The sixth link was the irrelevant one the founder flagged.** `TOnJl8W5Bo0` is *"Would You
Rather: The Boys Or Your Girlfriend"* by `@MakeshiftBrian` — a couples-games short, 188k views,
~2.3% engagement. Nothing to do with growth. Ignored, and named here so nobody re-fetches it.

### ⚠️ The View Trap holds a sixth time, and now within one creator

Across these five, on one channel, in one measurement:

- **Highest views** — the 154-minute sales course, 1.1M — has the **worst engagement rate, 2.92%**.
- **Highest engagement** — 3.71% — is the **8-minute** ghost-products video, at 78% of those views.

**An 8-minute video beat a 154-minute course on engagement by 27%.** Length is not the product.
Five accounts previously, and now within a single creator's own catalogue: reach and resonance are
different quantities and the first is the worse target.

---

# 🛑 The finding that reorders everything

From the masterclass, on service businesses — which is what Xoot is:

> *"Almost all service businesses, when they are done-for-you service businesses, almost never, if
> they're any good, **have a problem getting customers**. The difficulty they have is hiring good
> talent… you will almost always be **supply constrained** in this business model."*

And it names Xoot's exact trade as the hardest case:

> *"If we use **maids** as the lowest-skill labour for a service business as an example — finding
> people who speak English, show up on time, are competent, and actually do a good job cleaning, **and
> want to work for the amount of pay that the pricing package allows for some margin**, is
> difficult. That's the hard part."*

That last clause is the whole business in one sentence. It is also **exactly** why
`LONG_JOB_FLOOR_CENTS_PER_HOUR` exists in this repo: the R47/h floor was added because the ladder
went sub-linear and, at 35% commission, pushed a Xooter's return under the national minimum wage.
The reference and the codebase arrived at the same tension independently.

## What this means for Xoot, concretely

**The marketing plan has been pointed at the wrong side of the marketplace.**

`content-calendar.md`, the eight-channel plan, the ad matrix, the avatars — all of it is customer
acquisition. For a done-for-you service business the reference says customer acquisition is *not the
hard part*, and the binding constraint is Xooter supply.

⚠️ **This does not mean the demand work was wasted.** It means its priority was wrong, and the
existing gate order already knew:

> `launch-protocol.md` **gate 5 — supply before demand.** *"Named, activated Xooters per launch
> suburb. The one that looks compressible and is not."*

The gate was right. The content plan then ignored it. This document reconciles them.

---

# The strategy, in the order it must happen

## 1. Recruiting is the product, and it is a marketing channel

> *"If we take the position — which I do — that the supply of good talent is the hardest part about
> this business, then one of the core components of your business **must become your attraction, as
> in your recruiting process**."*

**Recruiting is not HR here. It is the primary marketing function**, and it should get the primary
marketing effort:

| Now pointed at | Should be pointed at |
|---|---|
| TikTok as customer acquisition | TikTok as **Xooter** acquisition — the earning story, the app the Xooter uses, the day |
| Instagram statics about booking | Same, plus "what a Xooter's week looks like" |
| Facebook suburb groups asking for cleaners | **Also** the groups where people look for work |
| The founder's X account | Unchanged — it recruits engineers and credibility, not Xooters |

⛔ **And it is completely blocked.** Nothing recruitment-facing may publish until employment
classification is settled under **LRA s200A** — `NEEDS-FOUNDER.md`. The most important growth channel
in the business is waiting on one legal decision.

## 2. Xoot is a teaching business that happens to sell cleaning

> *"Fundamentally, if you're in a service business, you're actually **in a teaching business**. You
> have to teach your talent how to do what they do."*

> *"People expect — oh, I'm going to train some guy in a weekend to do something that's taken me ten
> years — and then get upset that he's not that good. Ridiculous."*

This repo already has `training_modules` seeded, and `SafetyTrust.tsx` was reworded in September
precisely because the site described *screening questions* as though they were *completed training*.

**The strategic reading:** that wasn't only a compliance fix. Training is the asset. A Xooter who
completes real training is a higher-margin, longer-retained unit — and the training is the thing a
competitor cannot copy by scraping the site.

**→ The cleaning-school partnership proposal (`cleaning-school-partnership-proposal.md`) is not a
side quest. It is the supply pipeline, and it should be the founder's second-highest-value
conversation after the DNS fix.**

## 3. Narrow the avatar and the deliverables — but not yet

> *"Most service businesses, especially in the beginning, do any kind of work for any kind of person
> with a pulse. Very normal… **This happens usually in the $1M–$3M range**, when you start to have to
> make those decisions."*

⚠️ **Explicitly do not do this now.** Xoot has **zero completed bookings**. Narrowing an avatar on
zero data is guessing with extra steps. The reference puts the decision at $1–3M of revenue; the
honest instruction for today is *take the work, watch what is good, decide later*.

This directly contradicts the impulse to over-specify avatars in `ad-matrix-and-avatars.md`. Those
avatars are **hypotheses for testing**, not a segmentation strategy. Labelled as such there now.

## 4. Ghost products — the one tactic to adopt immediately

From the highest-engagement reference (22.66× outlier, 3.71%), and it costs nothing:

> *"I said: hey, by the way, you can get this one cheaper down the street at Costco… As soon as I
> made that switch, **everyone bought what I recommended afterwards**."*

> *"The difference between manipulation and help is intention."*

**The Xoot version, and it fits the brand exactly:**

- Tell a customer when they **do not need** the add-on they selected.
- Tell an Airbnb host that a **smaller** turnover slot is enough for their unit.
- Tell someone with a two-room flat that they do not need the medium tier.
- When the property genuinely does not need a Xooter this week, say so.

⚠️ **And this repo already built the mechanism without calling it that.** `serviceFit()` in the
design handoff re-prices a booking when the property does not match the service — it fails in the
**over-stating** direction on purpose. The honest inverse is the ghost product: *this is less than
you asked for, and it is what you need.*

**Highest-trust, lowest-cost, and it is the single most transferable thing in all five references.**
⛔ It needs the concierge and the booking flow to be able to say it, so it is a product change, not
a copy change — logged as a decision below.

## 5. Reinvest in talent quality before anything else

> *"Where do you invest your cash? Number one is going to be **talent** — better, smarter people
> coming in… if you're training a genius versus training a dodo…"*

Concretely, ahead of ad spend: pay above the floor, not at it. The R47/h floor is a **legal
minimum, not a positioning**. A premium brand paying the legal minimum is a contradiction that
Xooters will notice before customers do.

⚠️ **This is a founder decision with a real cost**, and it is the direct trade against `DISCOUNT_FUNDING`
and the R100 referral: money spent attracting customers is money not spent attracting Xooters, and
the reference is unambiguous about which is scarcer.

## 6. The goal state, named

> *"The goal you want to have is an amazing reputation and actually get to the point in a service
> model where **your demand is the constraint**. Very rare but doable."*

That is the target: a business where finding customers is hard again because supply is abundant. It
is the opposite of how the marketing plan was written, and it is the correct destination.

---

# Execution — what changes on Monday

| # | Action | Owner | Blocked by |
|---|---|---|---|
| 1 | **Settle LRA s200A classification** — unblocks the entire primary channel | Founder + attorney | Nothing but time |
| 2 | GoDaddy DNS | Founder | Nothing |
| 3 | Re-point TikTok/Instagram production at **Xooter** stories, not customer stories | Marketing | #1 |
| 4 | Cleaning-school conversations — the supply pipeline | Founder | #1 |
| 5 | Ghost-product capability in the booking flow and concierge | Engineering | Founder decision |
| 6 | Pay above the R47/h floor | Founder | Commercial decision |
| 7 | Customer-side content continues, at **lower** priority than it had | Marketing | Gate 2 |

⚠️ **Nothing here is a reason to stop the customer-side work.** It is a reason to stop treating it as
the main event. The drafts in `drafts/` stand; their sequence changes.

---

## What was deliberately not adopted

| Reference material | Why not |
|---|---|
| The 154-minute sales course's closing frameworks | Xoot has **no sales team and no sales calls**. A booking is self-serve. Revisit if Xoot ever sells B2B contracts to estate agents |
| Email marketing sequences | Real, and premature — **zero subscribers, zero customers**. Kept for when the Substack list exists |
| Lead-generation volume tactics | They generate demand. Demand is not the constraint. Filed for when item 6 flips |
| Avatar narrowing | Correct at $1–3M revenue. Xoot is at R0 |

⚠️ **The pattern in what was rejected:** four of five references are about getting more customers,
and the fifth explains why that is the wrong problem for this business. That asymmetry is the most
useful thing in the set, and it is only visible because all five were read together.
