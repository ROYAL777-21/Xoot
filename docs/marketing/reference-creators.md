# Reference creators — what the data actually says

Measured 2026-09-01 against Eden Discover's index. Every number here came from a tool call, not
from memory. Re-measure before citing any of it after 2026-12-01.

`outlier` throughout means **a multiple of that creator's own baseline**. It is comparable within
a creator and meaningless across creators. A 3× on a 250K-follower account and a 3× on a
250M-follower account are not the same event.

---

## Alex Hormozi — YouTube

`@alexhormozi` · 4.45M followers · **2,476 posts indexed** (the platform reports 5,556; the
difference is replies and other types that are not ingested) · avg 202,474 views · avg engagement
rate 3.97% · median outlier 1.97×.

### He publishes most of what performs worst

| Slice | n | Avg views | Median outlier |
|---|---|---|---|
| Shorts | 1,962 (79%) | 146,972 | **1.59×** |
| Long-form video | 514 (21%) | 414,329 | **5.09×** |
| Mood: inspirational | 1,235 | 176,376 | **1.85×** |
| Mood: educational | 517 | 277,294 | **3.11×** |
| Type: story | 1,065 | 166,276 | **1.81×** |
| Type: tutorial | 786 | 294,795 | **2.87×** |

Long-form beats shorts **3.2× on median outlier and 2.8× on raw views**, and he ships four shorts
for every long-form. Educational beats inspirational 1.7×, and inspirational is his single largest
bucket. By topic: Self-improvement 8.03× avg (n=140) and Content creation 6.10× (n=99) beat
Startups 4.19× (n=973 — his most-posted topic is his weakest).

Read it as: the volume is a distribution tax; the compounding asset is the long educational piece.

### The five title mechanics

Derived from the top twelve by outlier (104.57× down to 55.03×).

1. **Price the watch up front** — "in 90 Mins", "in 79 Mins", "these 55 minutes". Three of the top
   twelve. Converts a vague time cost into a stated one, which is the objection long-form loses to.
2. **Dated conditional** — "If I Wanted to Become a Millionaire In 2024, This is What I'd Do".
   Borrows his credibility without making a claim about the viewer.
3. **Deliberately low-status address** — "watch this if you're tired of being broke". Lowercase, no
   authority, names a *state* rather than a topic. The viewer self-selects.
4. **Credential compressed to a number** — "13 Years", "500 Times", "$46.2M". Never an adjective
   where a number will do.
5. **Quoted client question as the entire title** — *"Should I Sell My Company?"* The quote marks
   assert *someone actually asked me this*, which is a proof claim wearing a topic's clothes.

**Transfers to Xoot:** the time-price, number-over-adjective, one idea per piece, and the
long-educational finding. **Does not transfer:** dollar anchoring, get-rich framing, hard CTAs —
all collide with `docs/BRAND_GUIDE.md`'s ban on `cheap / budget / discount / bargain`.

---

## Elon Musk — X

`@elonmusk` · 241.5M followers · 3,113 posts indexed · avg 26.8M views · median outlier 3.45×.

### Eight of his top ten are political

| Outlier | Post |
|---|---|
| 133.83× | (image, no text) — rally photo |
| 104.77× | "🇺🇸🇺🇸The future is gonna be so 🔥 🇺🇸🇺🇸" |
| 94.69× | "It is morning in America again" |
| 91.94× | "I fully endorse President Trump and hope for his rapid recovery" |
| 89.76× | "the bird is freed" |
| 88.92× | "Let that sink in" |
| 84.70× | (video, no text) — Olympics |
| 72.60× | "Haters will say this is AI 🕺🕺" |
| 67.68× | "They say red light helps you sleep better" (electoral map) |
| 56.78× | "The future is gonna be fantastic" (rocket) |

By mood his best register is *critical* (9.60× median) ahead of *inspirational* (9.36×) and
*comedic* (8.71×). By topic, **Politics 11.44×** is his best category outright.

This is the measured form of the warning already in `.claude/agents/founder-voice.md`: **the thing
that makes his account perform is the one thing Xoot cannot copy.** Xooters and customers are South
Africans across every political line, and a founder's hot take costs *them* bookings.

### What is transferable, and it is a lot

- **Median length in the top ten is four words.** "the bird is freed". "Let that sink in".
- **The image carries the argument; the text carries the turn.** An electoral map captioned "They
  say red light helps you sleep better" never states the claim. The reader completes it — and a
  reader who completes your joke has engaged more deeply than one who read your conclusion.
- **No hedging, ever.** Declarative or silent.
- **Lowercase as a status move**, from the largest account on the platform.
- **Forward-tense optimism as a repeatable form** — "The future is gonna be fantastic" is one of the
  two non-political posts in his top ten, and it is exactly the founder's stated register. Copy
  that one.

---

## Instagram — productivity, last 30 days

Scope: global index, `minOutlierScore: 3`, `creatorTier: mid`, `since: month`.

> ⚠️ **Data caveat, because it changes the conclusion.** The echoed filters claim 100K–1M
> followers, but four returned accounts sit below it (28.1K, 43.1K, 86.6K, 21.9K), and three
> outlier scores are absurd (2,267× / 3,109× / 585×). Those are static posts on accounts whose
> baseline is Reels — the multiplier is measuring a missing denominator, not a hit. **Ignore every
> four-digit outlier.** Two rows survive scrutiny.

### The one to study — @benmeer, 859.8K followers

> **"The best morning routine starts the night before."**

**1.93M views. 3.92× his own baseline. A 12-second Reel. That sentence is the entire caption.**

- One sentence, containing a reversal. The subject is the morning; the answer is the night.
- The value is delivered **inside the hook**. There is no "keep watching to find out".
- 12 seconds, so completion rate is near-guaranteed and the algorithm sees it.
- No CTA, no link, no "comment X". The post asks for nothing, which is why it travels.

### The runner-up — @drgavingcook, 255.2K followers, 9.86× outlier, 3.22% engagement

> "how to become unrecognizable in 6 months summarized in 10 steps — **in 60 seconds or less**"

Hormozi's time-price mechanic, one platform down. And note: 3.22% engagement on 64K views beats
@benmeer's 0.32% on 1.93M. **Reach and engagement are separate variables** — this pair is a clean
example of the View Trap in `growth-doctrine.md`.

### Comment-bait produces the wrong numbers

`Comment "playbook"` (542 comments) and `Comment "SMARTER"` (42.4K likes) work as mechanics. They
harvest strangers. Xoot's equivalent — "comment CLEAN for a quote" — would collect people outside
the three launch suburbs, into a business whose ceiling is Xooter coverage. Do not build on it.

---

## The one line that covers all three

Every top post across all three creators says **one specific thing and stops.** Hormozi prices the
watch and delivers. Musk states four words. Ben Meer puts the whole payload in the first sentence.
Not one of them makes the reader wait for the value.
