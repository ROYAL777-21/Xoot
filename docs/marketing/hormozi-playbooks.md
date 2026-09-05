# The Hormozi playbooks, read against South African law

Ingested 2026-09-04 from eight documents the founder supplied as source of truth: the `$100M
Playbook` series — **Hooks**, **Pricing**, **Price Raise**, **Lead Nurture**, **Marketing Machine**,
**Retention** — and the book **`$100M Money Models`**.

> ⚠️ **This file is separate from `hormozi-corpus-findings.md` on purpose.** That one is the Eden
> *transcript* corpus — spoken material, indexed and ranked. This is the *written* playbooks. They
> are different sources at different confidence, and merging them would let a line from a podcast
> inherit the authority of a published play.

**How the text was extracted, so the next person can check it.** This image has no `pdftotext`,
`pdftoppm`, `pypdf` or `pymupdf`. The PDFs were decoded inline — zlib-inflate each content stream,
then read the `TJ` arrays, joining the strings inside each array with no separator because kerning
splits words across them. The EPUB is a zip and was simply unzipped. **Where extraction produced
digits I could not read with confidence, this file says so rather than quoting them.**

---

## ⛔ Read this before applying any play

Three things make a straight lift from these playbooks unsafe here, and none of them is a criticism
of the source.

### 1. Hormozi says so himself

From `Money Models`, in his own front-matter caveats:

> *"**Obey The Law.** I learned these plays in different situations from different people using
> different platforms, in different times, in different places, following different rules.
> Advertising laws change all the time. And they tend to only get tighter—especially when it comes
> to 'free.' Check with lawyers to see if an offer you want to make is legal or not. This book is
> intended to be Money Model **inspiration**. Use it that way."*

> *"**Be Transparent.** State the facts. And if the facts aren't compelling, change reality to make
> them compelling or learn to frame them in a way that is. **Don't lie.**"*

That second one is the same rule this repository already runs on. It is worth noticing that the
source and the compliance layer agree.

### 2. The plays are US-shaped and the CPA is stricter

| Play | Where it lands in SA law |
|---|---|
| **Giveaways** (Attraction) | **CPA s36** — a promotional competition needs written rules, prohibits requiring consideration to enter, and requires records be kept. It is a compliance exercise, not a post |
| **Decoy Offer** (Attraction) | A tier priced so nobody picks it risks **CPA s30** (bait marketing) and **s41** (misleading representation) |
| **"Pay Less Now or Pay More Later"** (Attraction) | A "was" price never actually charged is **CPA s30**. Xoot has already been bitten by phantom prices — see ZD-037 |
| **Waived Fee Offer** (Continuity) | See below — this one needs the most care, and it is the one most likely to be reached for |
| Any income figure in recruitment | **LRA s200A** and **CPA s41** — `xooter-hiring-ad.md` and `marketing-claim-rules.test.ts` already carry this |

### 3. The guard layer already enforces half of it

`marketing-claim-rules.test.ts` fails on any rand figure `basePrice()` does not produce, including
commission-derived earnings. So a pricing play cannot quietly reach a draft. **A structural play —
a commitment term, a fee, a giveaway — is not covered, and needs a human.**

---

## Money Models — the four offer types

> *"Attraction Offers turn strangers into customers. Upsell Offers get people to spend more cash.
> Downsell Offers get people to say yes when they would have said no. Continuity Offers keep people
> buying."*

> *"You can shear a sheep for a lifetime, but you can only skin it once."* — quoted as from an early
> mentor

**The continuity arithmetic, as the book gives it.** Offer a $1,000 thing to 100 people and 10 buy:
$10,000 now, nothing after. Offer the same value at $50/month and 40 of 100 buy; hold them 20 months
and each still pays $1,000 — **$2,000 now and $40,000 over time**. And the second case leaves *four
times as many customers to upsell later*.

The stated trade-off is explicit: continuity attracts more buyers but *"leaves you strapped for cash
today,"* which is why the book puts it last rather than first.

### ⚠️ The Waived Fee Offer is NOT what Care+ does

This is worth stating plainly because the names invite the mistake, and an earlier draft of this
file made it.

**Hormozi's Waived Fee Offer:** charge a startup fee of *3–5× the monthly rate*, then waive it
entirely if the customer commits to twelve months. Cancel inside the term and the fee becomes
payable. *"Customers will stay longer if leaving costs more than staying."*

**What Care+ does:** waives the **R39 per-booking fee** for members, every booking, no term, no
commitment, nothing owed on cancellation.

Those are different instruments. Care+ is closer to a **Continuity: Discount Offer** — an ongoing
price advantage for members. Filing it under the wrong name would invite someone to "complete" it by
adding the commitment term, which is the part that is legally loaded here:

⛔ **CPA s14** governs fixed-term consumer agreements. A consumer may cancel early on 20 business
days' notice, and the supplier may charge only a **reasonable cancellation penalty** — it cannot
simply claw back the full waived fee as of right. s14 also caps the term. So "commit to 12 months or
owe the fee" is not portable as written, and the size of the clawback is the exact thing a tribunal
would look at. **This needs an attorney before it is designed, not after.**

### The three Continuity Offers

Bonus Offers · Discount Offers · Waived Fee Offer. Care+ sits in the second.

---

## Hooks

> *"After you've written your headline, you've spent eighty cents of your advertising dollar."* —
> David Ogilvy, quoted at the top of the playbook

> *"If you have ten hours to advertise, focus your first eight hours on the hooks."*

**A hook has exactly two parts:**

1. **The call-out** — the part that makes the right person think *"this is for me."* The playbook
   grounds this in the **cocktail-party effect**: in a room of noise, your own name still cuts
   through. The call-out is the name.
2. **The condition for value** — *if you consume this, you get that.* Sometimes explicit
   (*"watch this video and you'll know how to get your kids to behave"*), sometimes implicit (the
   mother showing the calm child, then turning to camera: *"look how I did it"*).

**Verbal hook types**, with the playbook's own examples:

| Type | Shape | Example given |
|---|---|---|
| **Labels** | Name the avatar outright | *"Local business owners, I have a gift for you"* |
| **Yes questions** | A question whose answer is obviously yes | *"Would you pay $1,000 to have the business of your dreams in 30 days?"* |
| **Open questions** | Force a choice, not a yes/no | *"Which would you rather be?"* |
| **Conditionals** | A scenario or condition leading to a result | — |

**Nonverbal hooks** are visuals and sound — the first frame, the first noise.

The opening story is the argument: Dean Graziosi recut an infomercial in a Larry King interview
style. *"The price didn't change. The website to buy the book didn't change."* Only the opening did,
and it sold millions.

### ⚠️ What this means for Xoot's existing ad set

`ad-matrix-and-avatars.md` holds the hook library, and the hooks in it are **almost all condition-
for-value with no call-out**. *"You've walked past that same pile for eleven days"* is a good
promise addressed to nobody in particular. The playbook's claim is that the call-out is the half
that decides who stops.

That is a testable change, not a rewrite: the same hooks with a suburb or an avatar label in front.
⛔ A suburb call-out must name a **real launch suburb** — `launch-protocol.md` gate 5 exists because
recruiting or advertising outside the service area produces people who cannot be served.

---

## Pricing

The playbook opens by comparing three ways to double a business — double new customers, double
purchase frequency, double price — and shows they are not equivalent once margin is included,
because a price rise carries no delivery cost with it.

> *"Even a 4% increase in revenue can sometimes mean 20%+ increases in profits."*

**Plays, as named in the contents:** monthly → 28-day billing cycles · processing fees and a second
form of payment · annual renewal fee on top of monthly · guarantee/warranty sold as its own product
(with take-rate and refund-rate columns) · and others.

**Two are directly applicable to Care+ at R99/month:**

- **28-day cycles.** Billing every 28 days rather than monthly yields **13 cycles a year, not 12** —
  an ~8.3% revenue increase with no change to the advertised figure.
- **Annual fee on top of monthly.** Advertise the low monthly rate, add a once-a-year fee. The
  playbook's worked example advertises one rate and collects a materially higher effective one.
  ⚠️ *The source's own figures came through the PDF extraction partly unreadable, so they are not
  quoted here.* The mechanic is the point, and the arithmetic for Xoot is ours to do.

### "Rules of Pricing I Follow"

1. **Raising prices makes money twice.** More gross profit per customer, *and* less cost to deliver
   because there are fewer customers. The worked example: **$99 → $299 lost 30% of customers**, so
   200 × $99 became 140 × $299 — *"revenue more than doubled while my costs dropped by 30%."*
   (Checked: $19,800 → $41,860.)
2. **Price for lifetime money, not for the most customers or the biggest first purchase.**
   *"I used to say the highest price I could get people to buy at. But now I want the price that
   people will keep paying at."*
3. **Higher prices win fewer customers but often more money.** Doubling $10 → $20 usually does not
   halve conversion. *"This is fundamentally what all price increases take advantage of."*
4. **A high close rate means the price is too low.** ⚠️ *The threshold percentage did not survive
   PDF extraction cleanly and is deliberately not quoted here.* The rule stands without it: if
   almost nobody says no, the price is not doing any filtering.

⚠️ **Rule 2 is the one that bears on Xoot**, and it cuts both ways against the cheap-ladder plan —
see Price Raise below.

⛔ **Neither may be implemented from this file.** Care+ pricing is a **locked commercial fact**
(`docs/product/locked-commercial-facts.md`), and CLAUDE.md says those move only through a
decision-log entry. Both also touch **CPA s41**: a rate advertised as monthly while billed every 28
days must say so, or the advertised price is not the price.

---

## Price Raise

The playbook opens on a business owner with three symptoms, all from underpricing:

1. *"These are the absolute worst customers I've ever had. I thought they'd be grateful for these
   rates, but it has created a customer service nightmare."*
2. *"I got more customers, but I still lose money. My savings are gone."*
3. *"I can get sign ups at these rates, but I lose so much money each month I have to pay employees
   out of what's left of my savings. **I can't afford to run paid ads.**"*

### The Perfect Price Raise Letter — **RAISE**

Five sections, and the acronym is the running order:

| | Section | What it does |
|---|---|---|
| **R** | **Remind** | Restate the value already delivered — *before* any mention of price |
| **A** | **Address** | State the change directly. No burying it |
| **I** | **Invest** | Frame it as investment in their future outcome |
| **S** | **Soften** | A loyalty reward for existing customers |
| **E** | **Explain** | The reasoning |

Also covered: what to do about **incoming** customers during a raise (Eden's outlier corroborates —
*"raise on new clients first"*), a worked gym letter, a checklist, and a template appendix.

⚠️ **For Xoot the S is the legally loaded one.** A loyalty reward that is really a retained old
price must be described accurately: under **CPA s30** a "was" price that was never charged, or a
"discount" off a price nobody paid, is a prohibited representation. A grandfathered rate is fine —
calling a raise a discount is not.

### ⚠️ This bears directly on a decision the founder has already made

The founder's instruction was: *"Use the cheaper pricing ladder for now as we will eventually
increase the prices as time progresses."*

That is a normal, defensible sequencing choice. The playbook's opening pages are the argument
against the specific failure mode it invites, and **two independent Eden outliers say the same
thing** (see below). Recorded here so the decision is made with the counter-argument visible, not to
overturn it.

---

## Lead Nurture

> *"If they do not show, they cannot buy."*

**Four pillars, each with the playbook's own one-line law:**

| Pillar | The law | The playbook's line |
|---|---|---|
| **I — Availability** | *"If leads cannot schedule, they do not show."* | The more availability you have, the higher the chance leads take one |
| **II — Speed** | *"Money loves speed. Wealth loves time. Poverty loves indecision."* | The faster you contact them, the more likely they schedule |
| **III — Personalization** | *"Personalize, don't pressure."* | The more you make it for them, the more likely they respond |
| **IV — Volume** | *"Volume negates luck."* | The more times you reach out, the more likely they answer |

⚠️ An earlier draft of this file listed only three pillars because the fourth had not been read out
of the source yet. It is **Volume**, and it is named here from the text rather than inferred.

The playbook's origin is COVID: gyms — the entire customer base — were closed, and the response was
software called ALAN (Artificial… Nurture) built to work the leads that already existed.

**Where this binds on Xoot.** A booking is a scheduled appointment with a stranger entering a home.
Speed-to-first-response and availability are not marketing niceties here; they are the difference
between a booking and a no-show. Nothing in the repo currently measures time-to-first-response.

---

## Marketing Machine

Turning a business into an ads machine, with the operative move being **promotion of organic
outliers into paid**: *"here are four that my team pulled from social media of me that did great as
ads."*

Xoot already has the measurement half — the growth layer ranks posts by outlier score against a
creator baseline. What it lacks is the **promotion rule**: the threshold at which an organic post
becomes an ad.

⚠️ **The View Trap applies and has been measured seven times in this repo.** Reach and resonance are
different quantities, and "Careers" content is the channel's worst topic by engagement while being
the most important by business outcome. **A promotion rule keyed to views alone would promote the
wrong posts.** Recruitment output is judged on applications, never reach.

---

## Retention — the most immediately usable playbook here

> *"It costs five to twenty-five times more to acquire a new customer compared to retaining one."*

Structure: the **Four Horsemen of Retention**, what churn is, price/value/churn, and the **Churn
Checklist**.

### 🥇 The leading indicator, and why it is the whole idea

The worked example is a gym, and the mechanic transfers exactly:

> Members attending **three sessions a week or more stuck**. Members at **two or fewer churned**.
> The pattern was always the same — 3, 2, 2, 1, cancel.
>
> *"The good news: if you talked to them when their attendance goes down to two sessions, you could
> rescue them."* With the intervention: 3, **2 (reach out)**, 3, 3, 3.

**The point is not attendance. It is that churn announces itself before it happens**, and there is a
threshold where an intervention still works.

⚠️ **Xoot's equivalent is booking frequency, and nothing currently watches it.** `retention-analyst`
owns churn and cohorts; there is no trigger on a customer's cadence falling. That is the single
cheapest retention mechanism in this file and it is unbuilt.

### Exit interviews — the specific claim

> *"If a person says they want to leave then **talk to them before they do**. Do this right, and save
> about HALF the phone and email cancellations. Yes, really."*
>
> Set the expectation **at onboarding** that an exit interview is part of cancelling. Then use the
> cancellation notice as the trigger. *"Realistically you'd cut churn by 25% (assuming half show).
> That's a respectable 33% increase in LTV."*

✅ `retention-analyst`'s own description already says it may be asked to *"design a retention
intervention or exit-interview flow."* This is the source for that work.

⚠️ **Under the CPA, cancelling must not be made difficult.** Setting an expectation and offering a
conversation is fine; making the interview a *condition* of cancelling is not. Design it as an
offer, not a gate.

### The rest of the checklist

Reach out twice a week praising participation and solving small problems · handwritten cards at
signup and at the 3/6/12-month referral asks · member events on an internal calendar, *"regular to
you and random to them"*, every 21/42/63 days.

⚠️ Handwritten cards and events are a **supply-side cost per customer**. They work in a gym with one
location. Xoot's Xooters travel between homes, so the analogue is more likely the Xooter than the
customer — worth deciding deliberately rather than porting the tactic.

---

## Marketing Machine — and ⛔ why almost none of it is usable yet

The playbook's engine is **proof-based marketing**: turning customers into ad creative.

- A **testimonial competition**, judged not by taste but by performance: *"we measure the best by —
  drum roll — its performance as an ad. The one with the most conversions over 30 days wins."*
- A **weekly proof harvest**: names of people with results, scraped social tags, chat screenshots,
  community comments, new 5-star reviews, unboxing and reaction videos.
- *"The most important part of the testimonial is the hook."* Have them record several hooks before
  they get into the story — which is the Hooks playbook applied to customer footage.

### ⛔ The honest position

**Every mechanism above requires customers, and Xoot has zero completed bookings.** There is no
testimonial to harvest, no review to screenshot, no result to name. This is the playbook the
`growth-orchestrator` owns and it is **gated on Gate 6**, not on effort.

Recorded plainly because a knowledge base that lists tactics without their preconditions is how a
team ends up fabricating the input. `docs/marketing/held-content/customer-proof.md` holds the
scripts and the POPIA consent wording, ready for the day the gate clears.

⚠️ **One part is usable now:** *"the most important part of the testimonial is the hook"* generalises
to every asset, and `render-ads.mjs` already A/B-pairs each ad's hook with and without a call-out.

---

## Eden, as a cross-check

`eden_list_custom_ai` returns **empty** for this workspace, so there is no ask-hormozi Custom AI to
query. The indexed social corpus was searched instead.

⚠️ **Reported honestly: the price-raise query returned 2 useful results out of 8.** The rest were
politics, an AI-industry essay and a Buffett explainer — semantic search on a business phrase pulls
a lot of noise. The two that landed both corroborate the playbook:

| Source | Finding |
|---|---|
| **@tibo_maker** · 205K followers · **3.52× outlier** | Tweet Hunter went $9 → $19 → $29 → $39 → $49 over roughly 12 months. **Price up 400%, and churn went *down*.** *"Churn is decided at signup, not at cancellation. Your pricing is a psychological filter on who comes in."* |
| **@small.business.planner** · 62.9K · **5.81× outlier** | *"Raise on new clients first,"* then existing customers on six weeks' notice. *"The wrong clients stay because the price was already too low."* |

**Both point at the same risk in the cheap-ladder-first plan:** a low entry price does not just earn
less, it *selects* for the customers most likely to churn and complain — which is symptom #1 in the
Price Raise playbook's opening. For a business whose unit of delivery is a person entering a
stranger's home, customer quality is a safety variable, not only a margin one.

⛔ Not a recommendation to change the ladder. The ladder is a locked commercial fact and the founder
has decided. This is the counter-evidence, filed where a decision-log entry can cite it.

---

## Ownership

Which agent reads which playbook. See `agent-orchestration.md`.

| Playbook | Owner | Why |
|---|---|---|
| Hooks | `creative-director` | Hooks are creative's core unit |
| Marketing Machine · Money Models | `growth-orchestrator` | Both are about sequencing across channels |
| Retention · Lead Nurture | `retention-analyst` | Same problem, both ends |
| **Pricing · Price Raise** | **🔒 Correctness & Safety** | These touch locked commercial facts and CPA s30/s41. Not a marketing decision |
