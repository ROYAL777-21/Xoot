# The full corpus, and the finding that argues against its own advice

Companion to `growth-strategy-2026.md`. That document was built from **five** references the founder
supplied. This one is built from the **entire local `ask-hormozi` corpus — 2,039 videos** — plus
Eden's measurement of how that channel's content actually performs.

Written 2026-09-03 at the founder's request: *"use Eden for all the ask-hormozi data as additional
reference."*

---

## ⚠️ How this was read, including what did not work

The `ask-hormozi` skill's search runtime **failed**:

```
$ bash scripts/hq-ask-hormozi search "..." --format json --limit 8
error: QMD is required to index and search the bundled corpus.
Install it from https://github.com/qntx-labs/qmd and retry.
```

**QMD is not installed, so the skill's retrieval engine is unavailable.** The corpus itself is
present and complete — `/root/.local/share/ask-hormozi/corpus`, **2,039 transcripts (20MB) and
2,039 metadata files**, plus 45MB of pre-cut segments each carrying its own `timestamp_url`.

So the data was searched directly with a term-scoring pass over the segment files. That is a weaker
retrieval method than semantic search and it is stated here so nobody reads these findings as
exhaustive: **strong term matches were found, weak ones were missed.** Every citation below is a
real segment with a real timestamp, and none is recalled from memory.

⛔ **Do not install QMD to fix this.** It is a third-party binary and this is a repository that
charges people money. The direct search worked.

---

# 1. 🥇 The supply-constraint finding is corroborated, independently, using cleaning again

`growth-strategy-2026.md` rests on one masterclass passage. **The corpus contains a second,
separate instance — and it also reaches for a cleaning business as the example.**

From *Helping a $50M Trucking Company Double Revenue*
([01:30](https://www.youtube.com/watch?v=ElFaBWRlquc&t=90s), 2026-04-16):

> *"A good friend of mine had a cleaning business, like a Molly Maid style business… he was like,
> 'Dude, it's so easy to get customers.' … The problem is getting people to show up on time, who
> speak English, who are willing to work really hard… What we basically shifted with him was:
> **you're actually not in the cleaning business. You're in the recruiting cleaners business.**"*

And in the same segment, on why marketing services fail to sell to these businesses:

> *"Sell marketing services to a supply constrained business, they're like, **I don't have an issue
> getting customers.**"*

And a third, generalising it, from *You Need to Hire Better Talent*
([00:00](https://www.youtube.com/watch?v=I3r6aupilBk&t=0s), 2026-02-17):

> *"**Very quickly almost all business becomes recruiting.**"*

⚠️ **Two independent passages, both choosing a domestic-cleaning business as the illustration, is
no longer an interesting quote — it is a pattern.** The strategy document's central claim survives
contact with the wider corpus. Nothing found in 2,039 videos contradicts it.

---

# 2. 🛑 The finding that argues against acting on the finding

**This is the most useful thing on this page, and it only exists because Eden measured what the
transcripts cannot see.**

Eden's analysis of `@MoreMozi` — **3,597 posts indexed, 121K followers, library complete** — breaks
performance down by topic. Against a channel baseline of **6,775 average views** and a **1.16×
average outlier**:

| Topic | Posts | Avg views | Engagement rate | Avg outlier |
|---|---|---|---|---|
| Content creation | 169 | 7,554 | 1.52% | **1.44×** |
| Self-improvement | 287 | 7,341 | 1.39% | **1.40×** |
| Business and Finance | 684 | 7,713 | 2.50% | **1.35×** |
| Startups | 448 | 6,693 | 1.68% | 1.28× |
| **Careers** *(hiring, recruiting, talent)* | **94** | **3,081** | **0.75%** | **0.59×** |

⛔ **"Careers" is the worst-performing topic on the channel.** 45% of the average views, **30% of the
engagement rate**, and an outlier score barely half the baseline.

**So the single most commercially important thing this creator teaches about service businesses is
the least popular thing he makes.** The advice that recruiting is the constraint is delivered in the
category the audience ignores.

### What this means for Xoot, and it is not "skip the recruiting content"

`growth-strategy-2026.md` said to re-point TikTok and Instagram at **Xooter** stories rather than
customer stories. Eden's numbers say to expect that content to **underperform on every public
metric** — fewer views, half the engagement.

⚠️ **That is a reason to change the measurement, not the plan.** Recruiting content is not judged by
reach; it is judged by **applications**. A Xooter-recruitment post that gets 400 views and two good
applicants beat a customer post with 40,000 views and no bookings, and the dashboard will say the
opposite.

**This is the seventh measurement of the View Trap in this repository, and the sharpest.** The
previous six showed reach and resonance diverging. This one shows **reach diverging from commercial
importance** — the numbers actively punish the correct strategy.

⚠️ **Also measured, and worth pre-empting:** `promo` content averages a **0.49× outlier** on this
channel, the worst of any content type, on a 3,597-post sample. When Xoot's own promotional posts
underperform its other posts by half, that is the normal shape of the thing, not a failure of the
copy.

---

# 3. ⚠️ The corpus contains a business almost exactly like Xoot, and it answers a question we have open

From *Helping a Home Services Business Get to $3M/Year*
([00:00](https://www.youtube.com/watch?v=KG5QJ3FuwA8&t=0s), 2026-03-24) — a cleaning company selling
to **homeowners and vacation-rental hosts**, which is Xoot's residential/Airbnb split:

> *"I sell cleaning services to homeowners as well as vacation rental hosts… about 60% of our
> business is recurring for the homeowners and then about 15% is the vacation rental hosts. So I'm
> not sure which one to focus on."*

The numbers he gives, and the answer:

| Segment | LTV:CAC | Volume |
|---|---|---|
| **Recurring homeowners** | **9:1** | "a lot more" |
| Vacation-rental hosts | 6:1 | fewer |

> *"I've got a ton of these customers and it costs me less and they're super sticky, and then I have
> these other ones that are super price conscious and I have lower LTV to CAC and there's fewer of
> them. Which one should I do?"*

He was drawn to vacation rentals because of **higher frequency** — and higher frequency was the wrong
tiebreaker. Recurring residential won on stickiness, cost and volume.

### ⛔ What this does NOT license

**This is one business's numbers, in a different country, and Xoot has zero completed bookings.**
Xoot's own LTV:CAC is unmeasurable today — both terms are undefined. Copying a segmentation decision
from someone else's ratios would be exactly the avatar-narrowing the strategy document says not to do
until $1–3M.

⚠️ **What it does justify is a hypothesis worth being ready to test:** Xoot currently treats `airbnb`
as one of the premium multi-Xooter services, and the design's crew model extends that. If the same
pattern holds here, **recurring residential is the better-margin, stickier half**, and the Airbnb
segment is the price-conscious one. `ad-matrix-and-avatars.md` should carry this as a named
hypothesis with the ratio to watch, not as a decision.

---

# 4. 🔒 Two findings that critique the referral programme shipped today

ZD-036 went in this session: a flat credit, customer-to-customer, one per person. The corpus
disagrees with it in two specific ways, and both are worth recording before the first redemption.

## a) Referrals do not distribute evenly — they come from nodes

From *Helping a $1.7M Medical Clinic Scale*
([00:00](https://www.youtube.com/watch?v=uMgNfgPPMCQ&t=0s), 2026-04-23):

> *"The way word of mouth works is there's always **nodes**. It's not like every customer brings us
> one customer. It's really **one out of 10 customers brings you 10 and the other nine bring you
> nothing.** That's typically how it works. And so we need to identify who these nodes are."*

⚠️ **A flat per-referral credit assumes a distribution that does not occur.** If one in ten
customers produces all the referrals, then the programme's entire cost is spent discovering which
one — and the nine who refer nobody cost nothing, while the tenth is under-rewarded relative to what
they deliver.

**This is not a reason to change the reward today.** `REFERRAL_REWARD_CENTS` is already documented as
provisional, and with zero bookings there is no distribution to measure. It is a reason to make sure
the *data* can answer it later — and it can: `referral_redemptions.referrer_user_id` makes
"referrals per referrer" a one-line query the moment there are any. **Recorded so the question gets
asked rather than the flat rate being assumed correct by default.**

## b) The higher-leverage referral programme is for Xooters, not customers

From *"Why Can't I Scale My PT Business?"*
([03:00](https://www.youtube.com/watch?v=O1yxi-QILII&t=180s), 2026-03-25), on acquiring
physical therapists — a supply-constrained service business:

> *"You've got headhunters, which is basically recruiters. And you have **word of mouth from your
> existing staff**… we have to approach this the same way we approach getting customers. **They are
> just now the customer.**"*

> *"I would probably bet that if you had a really good **referral incentive**, over time that would
> compound. Now, small, not as much — you'll probably need to do this to start. As you get bigger
> there's going to be enough of a base where a few percentage every month of referrals is
> material."*

And the framing that sizes the reward — take annual gross profit per staff member, and ask what
you would pay to add one.

⛔ **Xoot built the customer referral and not the Xooter referral.** Given that supply is the
constraint, a **Xooter-refers-a-Xooter** programme is the higher-leverage version of the exact
mechanism just shipped — and the schema already supports it, because `public.referrals` is keyed on
`user_id` and the signup trigger issues a code to **every** user, Xooters included.

⚠️ **It is also completely blocked.** A Xooter referral incentive is recruitment-facing, and
**LRA s200A** classification is unsettled. It joins the queue behind the same single legal decision
that blocks the entire primary channel.

⚠️ **And note the honest caveat in the quote itself:** *"Now, small, not as much."* At Xoot's size a
staff referral programme compounds from a base of nearly nobody. It is the right mechanism at the
wrong moment — build it when there is a base, not before.

---

# 5. What was searched and found nothing worth reporting

Stated because a search that returns little is a result, and because it stops the same ground being
re-covered:

| Query | Candidate segments | Verdict |
|---|---|---|
| recruiting / hiring / talent | 196 | 🥇 Rich — §1 |
| cleaning / maid / home service | 28 | 🥇 Rich — §1, §3 |
| referral / word of mouth | 27 | 🥇 Rich — §4 |
| churn / retention / turnover | 70 | ⚠️ **Almost entirely SaaS churn** — subscription cohorts, net negative revenue retention, onboarding checklists. Little on *staff* retention, which is the version Xoot needs. The corpus does not establish an answer here |

⚠️ **That last row is the honest gap.** The corpus is strong on why talent is the constraint and
weak on how to *keep* talent once hired. Xoot's `training_modules` and the cleaning-school
partnership are, on this evidence, more original than they looked — there is no ready-made playbook
being ignored.

---

## Sources

All citations are segments from the local corpus at `/root/.local/share/ask-hormozi/corpus`,
channel `MoreMozi` (`UCrvchO1h6lWZAuGaa1LqX9Q`), transcripts marked `automatic_captions`.

⚠️ **Automatic captions contain errors.** Quotations above are kept short for that reason, and each
carries a timestamp link so the original can be checked in seconds.

Performance figures in §2 are from Eden `eden_analyze_creator` against the YouTube channel on
2026-09-03: 3,597 posts indexed, library reported complete.

⚠️ **Never compare `outlierScore` across creators** — it is a multiple of that creator's own
baseline. Every comparison in §2 is within this one channel, which is the only comparison the number
supports.
