# X drafts — week one, `@TheRealSkosana`

**`VOICE: UNCALIBRATED`.** No founder writing samples have been received, so these are calibrated
against structure (brevity, specificity, one idea, no hedging, payload in the first line) and not
against the founder's actual voice. **Correct them rather than approving them** — a wrong voice on a
personal account is worse than no post, because it is your name on it.

⛔ **Nothing here is scheduled, queued or posted.** `founder-voice.md` is explicit: there is no path
in this repo by which a draft reaches a timeline without you saying yes to that exact text. Eden
scheduling also returns HTTP 402 on this workspace plan and no social accounts are connected, so
even the mechanism does not exist.

**Account baseline:** 1 follower, 32 posts, following 23. This matters. Musk's four-word posts are
89× outliers *because 241.5M people already hold the context those words sit in*. The same brevity
from an account with one follower is not sharp, it is empty. **Every draft below carries its own
context.**

---

## The week as a grid, not a list

Three formats × two topics, plus one thread. A winning format transfers across topics; a winning
topic does not transfer across formats. Post one idea in one format and a good result tells you
nothing about which caused it.

| Day | Format | Topic | Testing |
|---|---|---|---|
| 1 | Single post + artefact | The defect | Does a real error message earn replies? |
| 2 | Numbered list | The rule | levelsio's highest-engagement shape, on our material |
| 3 | Single post, no artefact | The defect | Is it the screenshot or the story? |
| 4 | Question | The rule | Does asking beat telling at 1 follower? |
| 5 | Numbered list | The build | Same shape, different topic |
| 6 | Thread (4) | The defect | Does sequence earn more than compression? |
| 7 | Single post + artefact | The build | Repeat of day 1's format, new topic |

**Measure at 72h:** impressions, profile visits, replies, saves. **Rank on profile visits per 1,000
impressions.** No thresholds — there is no baseline, and a threshold without one is an invented
number graded against itself.

---

## Day 1 — single post + screenshot

> Our deploy check polled the live site for 3 minutes.
>
> The comment above it said "~10 minutes total".
>
> `attempts=12`, `delay=15`. Eleven sleeps of fifteen seconds. The build takes longer than that, so
> the check had never once confirmed a deploy — and it exited green every time.
>
> Go and count the sleeps in yours.

**Visual:** the two lines of code beside the comment claiming ten minutes.
**Why this week:** it is arithmetic anyone can check in their own repo this afternoon.
`APPROVE / EDIT / KILL`

---

## Day 2 — numbered list

> Three weeks debugging a deploy that was never broken:
>
> 1. Netlify said `state: ready`, `commit_ref` correct.
> 2. Vercel said `target: production`, `state: READY`.
> 3. The site served a GoDaddy Website Builder page.
>
> A host's API tells you what it would serve **if traffic arrived**. It tells you nothing about
> where DNS points.
>
> I read that as proof twice.

**Why this shape:** levelsio's numbered list of hard-won rules is his highest-engagement post — 615K
views at 2.36%, against his politics post at 26.6M views and 0.06%. 43× less reach, ~39× better
engagement.
`APPROVE / EDIT / KILL`

---

## Day 3 — single post, no artefact

> The comment in our docs read: "DNS is fine. Do not touch GoDaddy."
>
> It had been there since August. It was wrong in every clause.
>
> Nobody looked at DNS for three weeks because a confident sentence written by someone competent
> said not to.
>
> I've left it in the file, struck through, with the date.

**Testing:** day 1 and day 3 are the same topic in different formats. That pair is the week's real
experiment.
`APPROVE / EDIT / KILL`

---

## Day 4 — question

> Genuine question for anyone running a monitored deploy:
>
> when your check goes green, do you know whether it *verified* something — or whether it just
> couldn't find anything to fail on?
>
> Ours exited 0 for three weeks down a branch that meant "I couldn't read the site".

**Testing:** does a question earn replies at 1 follower, where a statement gets none?
`APPROVE / EDIT / KILL`

---

## Day 5 — numbered list

> Four things I now check before believing a deploy is live:
>
> 1. Does the check *fail* against the defect it describes? Plant it and watch.
> 2. Does it print evidence, or only a verdict?
> 3. Does the timeout actually match the comment above it?
> 4. Has it ever passed — or has it only ever *not failed*?
>
> Number 4 caught three separate checks in one repo.

`APPROVE / EDIT / KILL`

---

## Day 6 — thread, four posts

> **1/** A GoDaddy placeholder served our domain for three weeks while two correct production
> builds sat behind it, and every dashboard said everything was fine.
>
> **2/** Netlify: `ssl_url: https://xoot.co.za`, `context: production`, `state: ready`.
> Vercel: `target: production`, `state: READY`.
> Both true. Neither relevant.
>
> **3/** Those fields mean "configured to serve this domain **if** a request arrives". Where the
> request goes is DNS, and no host's API can see that.
>
> **4/** The only thing that answers it is fetching the URL from outside. Our agent environment
> blocks that host, so we could not — and did not — until CI printed the body.
>
> The fix was one setting in a registrar nobody had opened.

**Testing:** threads outperformed tweets 4.09× to 0.78× on levelsio's account. Whether that holds at
one follower is the question.
`APPROVE / EDIT / KILL`

---

## Day 7 — single post + screenshot

> Shipped today: our deploy check now **fails** when the domain serves someone else's site, instead
> of warning.
>
> Planted the bug before keeping the fix — it fires on the captured GoDaddy body and stays silent on
> our own `index.html`.
>
> A guard you haven't watched fail is a guard you haven't tested.

**Visual:** the two-line test output, one exit 1, one exit 0.
`APPROVE / EDIT / KILL`

---

## What was deliberately not drafted

| Not written | Why |
|---|---|
| Anything announcing the launch | The site is not reachable. Announcing it would be the post people check |
| Anything about revenue, users or traction | Zero completed bookings. CPA s41 aside, it would be false |
| A hot take on a competitor | `founder-voice.md`: never subtweet a competitor, never a take you would not defend in front of a Xooter |
| Musk-style four-word compression | 1 follower. The brevity works on borrowed context, and there is none |

## Before day 1

**Fix the bio.** `@TheRealSkosana`'s bio is three jokes and never says a company exists.
`@levelsio`'s bio *is* his revenue; `@jacobrodri_`'s is who / what / what-you-get in 14 words. At one
follower the bio converts more profile visits than any post will. It is one hour and it gates
everything — `founder-brand-plan.md` Phase 0.
