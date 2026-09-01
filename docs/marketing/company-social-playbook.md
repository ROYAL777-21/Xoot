# Company social playbook — curated for Xoot's field

Researched 2026-09-01 from the open web. Covers X, Instagram, TikTok and YouTube for on-demand home
services in South Africa.

**Sourcing note, so nothing here is over-trusted.** `instagram.com`, `ads.tiktok.com`, `x.com`,
`superx.so` and several SA marketing blogs are all `EGRESS_BLOCKED` from this container, so
per-post metrics for specific competitor accounts could not be read directly. Everything below is
either (a) a figure reported by a named source, or (b) a structural observation. **Nothing here is
a measured competitor post.** When Eden's MCP is back, re-run the sweep against its index and
replace the reported figures with measured ones.

---

## 1. The market picture

| Fact | Number | Why it matters to Xoot |
|---|---|---|
| **TikTok, SA users 18+** | **29.1M** | Larger than Instagram by ~3.4×. If Xoot builds one short-form account first, **TikTok is the one**, not Instagram |
| **Instagram, SA users** | 8.6M | Still the right home for the trust-and-craft content, and the feeder for Facebook |
| **#CleanTok, lifetime views** | **150 billion+** | The demand for this content category is not in question. The question is only whether a *service brand* can earn any of it |
| **Reels vs static engagement** | 2.7% vs 0.4% | ~7× the reach for the same effort. Static posts are not a strategy |
| **Reels performance band** | avg 475 likes, 91 shares | A reference point for judging a Xoot Reel, not a target |
| **Best-performing IG video length** | **under 15 seconds** | Matches the strongest artefact in the personal-brand sweep: Ben Meer's 12-second Reel, 1.93M views |

### The SA-specific finding that should change the creative brief

South African audiences are reported to be **actively wary of over-polished advertising** and to
respond to raw, candid material. Combined with Higgsfield credits being unavailable, this is
convenient rather than limiting: **a real phone video of a real job beats a generated one here**,
and that is the cheaper option anyway.

---

## 2. The competitor set

### SweepSouth — the direct comparison

Founded 2014, Cape Town. The first end-to-end home-cleaning booking platform in Southern Africa.
Accounts on Facebook, Instagram, YouTube, TikTok and X. `@sweepsouth_sa` on Instagram is reported at
**29K followers**, running "R100 off your first booking" promotions.

**Two things to take from this, and they point in opposite directions:**

1. **29K followers after eleven years is a low ceiling**, and it says the category does not
   accumulate an audience by default. Nobody follows a cleaning marketplace because they enjoy
   cleaning marketplaces. Whatever Xoot builds has to be worth following for a reason other than the
   service.
2. **Their lead offer is a discount** — "R100 off your first booking". `docs/BRAND_GUIDE.md` bans
   `cheap / budget / discount / bargain` outright, so Xoot cannot follow them there even if it
   wanted to. That is a constraint that happens to be strategically correct: discounting trains
   negotiation, invites CPA s30 exposure, and anchors a service brand on price against a competitor
   with an eleven-year cost advantage.

### ⚠️ The strongest competitive fact found in the whole sweep

> **SweepSouth workers earn above minimum wage, but travel to jobs can consume as much as 50% of
> their pay.**

This is the single most useful thing in this document. Xoot has already built proximity ranking and
suburb-centroid distance (`src/lib/`, wired into `ai-match`, `create-booking` and
`request-replacement`) — which means **the thing that eats half a competitor's workers' pay is a
constraint Xoot's matching engine already optimises against.**

That is a real, defensible, non-comparative content pillar: *how far a Xooter travels is part of
what she earns, so we match on distance.* It recruits, it differentiates, and it is true today. It
is also the correct answer to "what do we say that SweepSouth cannot" — and it never has to mention
SweepSouth.

### Urban Company (India) — the mature analogue

The best global model for a two-sided home-services marketplace. What they did that transfers:

- **"The Professional You Deserve"** — a campaign built entirely on the *training and
  professionalism of the providers*, reported to have spiked first-time conversions. This is Xoot's
  "the record" pillar with a bigger budget. It is the proof that leading with the worker, not the
  price, converts customers.
- **How-to tutorials, service demonstrations and behind-the-scenes** as the standing content diet —
  trust built through operational transparency rather than claims.
- Partnerships with lifestyle, beauty and home-décor creators, plus a celebrity endorsement.
  **The celebrity tier is irrelevant at Xoot's stage. The micro-creator tier is not.**

---

## 3. The formats that actually perform, ranked for Xoot

Ordered by *what Xoot can honestly produce in the next 60 days*, not by raw reach.

### Tier 1 — build these first

**1. The before/after transformation.** Reported as "the bread and butter of viral cleaning content"
because it delivers a complete narrative arc in seconds. Carpet, upholstery, and bathroom
tile/grout are named as the highest-performing subjects because the colour change is dramatic.
> ⚠️ **The honesty constraint is not negotiable here.** `company-social.md` already says
> before/after "only where honest". A staged mess is a misleading representation under CPA s41, and
> in a market this small it is also the kind of thing a competitor's customer notices. Film real
> jobs, with written consent, or do not run the format.

**2. The process video with a stated outcome and a stated time.** The reported case: a Texas plumber
posting *"How we unclogged this drain in under 10 minutes"* booked **21 jobs in 14 days**. And a
California carpet-repair business built **762K followers and 19.2M likes** filming its actual repair
process with no studio production.
This is the single most transferable finding in the sweep, and note *why* it works: it is Hormozi's
**time-price mechanic** ("in 90 Mins") applied to a service. "How we got this kitchen done in 90
minutes" is the same move, costs nothing, and is true.

**3. Recruitment content.** Bolt/Uber driver-earnings content is already a live, high-volume format
on SA TikTok — "how much do Bolt drivers earn in South Africa" is an established search behaviour.
The Xooter equivalent is the same format with a better answer, and it relieves the binding
constraint. **This is the cheapest acquisition channel Xoot owns.**

### Tier 2 — once there are real bookings

**4. Real Xooter profiles.** Urban Company's highest-converting campaign was this. Requires written
consent (POPIA, and it is her livelihood on a billboard) and a consent artefact that does not yet
exist — see the plan's §13b.3.

**5. Evergreen YouTube search content.** "What is actually included in a deep clean." Search hits
beat viral hits for a service business: a viral clip earns a spike; an evergreen answer earns
bookings and AI citations for years. This is also the AEO layer's best raw material.

### Tier 3 — do not build

**6. Comment-bait** (`Comment "playbook"` — 542 comments in the IG sweep). It works as a mechanic
and produces the wrong people: strangers outside the three launch suburbs, into a business whose
ceiling is Xooter coverage. **Reach you cannot serve is worse than no reach**, because it converts
into cancellations and one-star reviews.

**7. Trend-chasing audio for its own sake.** SA audiences are reported to be wary of the polished
and the borrowed. A cleaning marketplace doing a dance trend reads exactly as what it is.

---

## 4. Partnerships — the three tiers, honestly priced

### Tier A — creator partnerships (do this, small)

The infrastructure is mature: TikTok Creator Marketplace, Insense (~70K creators, 35+ countries),
Influee, Billo, JoinBrands, and Tribe (creators pitch to brands rather than the reverse, which
produces better material).

**But:** the named cleaning influencers are global, not South African — Vanesa Amaro at 5.6M and the
CleanTok tier generally sit in the US and UK, and they sell *cleaning products*, not local services.
**A US cleanfluencer cannot book a Bryanston household.**

What Xoot actually wants is a **micro-tier of SA home, family and property creators** — the
`#cleaningsouthafrica` and "Monday reset" corners of SA TikTok — at a few thousand to a few tens of
thousands of followers, in the launch suburbs. Cheaper, local, and their audience can actually
convert.

### Tier B — structural partnerships (the higher-leverage ones, and nobody is doing them)

These are worth more than creator spend at Xoot's stage because each one is a repeatable supply of
bookings rather than a spike:

- **Airbnb hosts and short-let property managers** — already one of the four target markets, and a
  turnover clean is a *recurring, scheduled, predictable* booking. The best unit economics on the
  platform.
- **Estate agents and rental managers** — move-in/move-out cleans, at the exact moment of need.
- **Security estates and body corporates** — one relationship, a whole suburb's density, and Xooter
  travel collapses. This directly compounds with the proximity advantage in §2.
- **Office parks and co-working spaces** — the small-office market, same argument.

⚠️ **These need Phase 0 cleared first.** A partnership that sends bookings into a site that cannot
take one is worse than no partnership — you spend a relationship you cannot get back.

### Tier C — paid press and features

Insist on `rel="sponsored"` and a visible disclosure label. Undisclosed paid links breach Google's
spam policies and carry manual-action risk; in SA, undisclosed paid endorsement runs into ARB
standards. It also barely dents what you are actually buying, which is **branded mentions** (the
strongest AI-visibility signal) and referral traffic — neither of which needs a followed link.

---

## 5. What this means for the four company accounts

**None of these exist yet.** Build in this order.

| Platform | Priority | What it is | First format |
|---|---|---|---|
| **TikTok** | **1st** | 29.1M SA users. Where the category's attention actually is | Process video, time-priced. Then Xooter-earnings recruitment |
| **Instagram** | 2nd | Reels first, under 15 seconds. Cross-post to Facebook — same assets, older demographic, and SA community groups are a genuinely strong local-services channel | Before/after, real jobs only |
| **YouTube** | 3rd | Shorts repurposed from TikTok; long-form evergreen for search and AI citation | "What's actually included in a deep clean" |
| **X (company)** | 4th | A changelog with a personality. Low volume, high honesty. Not a reach play | Shipped changes, dated |

**The give:ask floor holds throughout: at most one post in five contains a call to book.**

---

## 6. What to re-measure when Eden is back

This document is built on reported figures and structure. Replace with measured data:

1. `@sweepsouth_sa` and `@domestly` — real follower counts, real post-level outliers, which of their
   formats actually performs rather than which they post most (the Hormozi lesson: those are
   usually different).
2. SA `#cleantok` / `#cleaningsouthafrica` creators in the mid and micro tiers — the actual
   partnership shortlist, with outlier scores.
3. Urban Company's YouTube — the campaign claims above are from marketing write-ups, not from
   post-level data.
4. `@jacobrodri_` — currently resolved from the open web only, and he is a voice reference for the
   founder account, not this one.
