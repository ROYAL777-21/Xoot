# Growth log

Every experiment, including the ones that failed. Newest first.

Each entry: date, constraint, hypothesis, horizon, pre-registered threshold, what happened, verdict.

_No experiments yet — measurement is not instrumented. See `measurement-spec.md`._

---

## Setup log

Not experiments. Things that were built or measured, so the first experiment does not have to
rediscover them.

### 2026-09-02 (later) — MrBeast measured, and seven platforms answered with two

**MrBeast added as a sixth voice reference at the founder's request, and measured rather than
assumed.** 34.98M followers, 295 posts indexed, **1.09% average engagement**, median outlier 1.06×.

**The finding that matters: he is the least transferable reference supplied so far.** Four of his top
six posts are pure borrowed context — *"Can I be the new Twitter CEO?"* at 36.76×, *"I'll buy Tik
Tok"* at 24.49×, the $1,000,000 line at **43.25×**. Each works because of who is saying it. This is
the Musk problem with an extra layer: 35M followers **plus** demonstrated follow-through **plus**
capital.

**What transfers is one thing:** the mechanic is a **falsifiable claim** — *"exactly 1 like in 24
hours"* is checkable inside the post, structurally the same as quoting a real error message.

**Two measurements that confirm existing findings rather than adding new ones:**

1. His `promo` posts average **0.69× outlier, median 0.61×** — below his own baseline, his worst
   category, while Entertainment averages 12.24×. **Third independent confirmation** that big
   accounts publish most of what performs worst.
2. His lowest-reach top post ("Mr and MrsBeast", 19.6M) carries his **highest engagement rate at
   2.35%**. The View Trap, now **five accounts out of five**.

⛔ **The giveaway mechanic is not adoptable.** CPA s36 governs promotional competitions in South
Africa — written rules, no required consideration, records kept.

### Seven platforms, and why the answer is two

The founder asked for content across **YouTube, LinkedIn, Indeed, X, Instagram, TikTok and
Facebook**. The entry directly below this one already recorded, from Ralston, that the **four**
platform plan was diluted and that 73% of people who start making content quit inside a year.

**Decision: seven presences, two content engines.** Claim all seven handles — cheap, correct, stops
squatting. Produce for **TikTok primary, Instagram secondary**. X and LinkedIn carry founder text,
YouTube stays reserved and dormant, Indeed takes one job ad and is not a content channel at all.

**The Facebook finding is the one worth keeping.** Its value is not the feed — it is that **suburb
community groups are where South Africans actually ask for a cleaner**. *"Can anyone recommend
someone reliable?"* is demand with intent in a named suburb, which is exactly what gate 5 needs. It
is also the fastest channel to get banned from, so the rule recorded in `platform-playbooks.md` is
that the founder participates as a person and never pitches unprompted.

**Recorded here so it is not re-litigated in a month.** Full reasoning:
`platform-playbooks.md`, `content-calendar.md`.

### 2026-09-02 — 11 reference videos read, and a blocker that was my mistake

**The correction.** I reported that `ask-hormozi` "cannot retrieve anything" and recorded it as a
blocker. **It was wrong.** The repo clones fine and bundles the corpus — 2,039 episodes, 9,330
timestamped Markdown segments with citation URLs. Only `qmd`, the semantic indexer, is blocked
(`static.crates.io`, 403). `scripts/ops/ask-hormozi-search.mjs` now queries it without `qmd`, and
**exits 2 rather than 0 when no corpus is present**, because "I could not look" is not "there is
nothing there" — which is precisely the conflation that produced the false blocker.

The corpus stays out of the repo: redistributed with permission, copyright retained, explicitly not
under that repo's MIT licence.

**Findings** → `hormozi-findings.md`. Attribution-before-scaling independently supports the existing
Phase 1 ordering. The discount mechanics are **not adoptable** — BRAND_GUIDE bans the vocabulary,
CPA s30 bars a constructed "was" price, and the R47/R54 floors are legal minimums with nothing to
discount. The transferable half is "give something that other people charge for".

**The 11 videos** → `content-strategy-references.md`. Only Ralston's was read as a transcript
(~52K of 115K chars, plus targeted extraction); the rest are metadata and Eden's structural
analysis, and the doc says so per video rather than implying all eleven were watched.

**Two things that change existing plans:**

1. **Company platforms go sequential, not parallel.** Ralston: a solo creator runs **one primary +
   one secondary**, with an "Eye of Sauron" rotation innovating on one at a time. The four-platform
   plan in `company-social-playbook.md` is what he would call diluted — and 73% of people who start
   making content quit inside a year. Order is unchanged; simultaneity is not.
2. **Cadence is set against future capacity, not current.** Which argues against the daily-blog
   commitment: it would be made by someone with more free time than the person who has to keep it.

**The number worth remembering:** a client of Ralston's who switched from entertainment to
educational content went from 4–5K leads per video to **over 20,000** — and that video became their
**#3 of the year with over a million views**. Optimising for education did not cost reach. The
value-versus-reach trade-off did not appear.

**One honest caveat on scope.** Ralston's thesis is scoped to *high-ticket* offers, and he says
plainly that for mass-market low-ticket products virality genuinely is what you want. Xoot is not
high-ticket. The argument transfers on **geography** — three suburbs, so worldwide reach is close to
worthless — not on price. Same conclusion, different mechanism, and the mechanism matters for when
the rule stops applying.

### 2026-09-01 (latest) — build-in-public accounts measured, two earlier claims corrected

**`@TheRealSkosana` resolved:** 1 follower, 32 posts, following 23, never synced. The earlier entry
said it could not be resolved — Eden's index had it once the MCP reconnected. **The bio is the
binding constraint**, not the content: it is three jokes and does not say what the company is.

`build-in-public-accounts.md` measures `@levelsio` (945.1K) and `@jacobrodri_` (36.7K). Two
corrections to what I told the founder earlier today:

1. **`@jacobrodri_` is 36.7K followers, not ~21.6K.** The open-web figure was stale; Eden's is live.
2. **He does not win on building in public.** All six of his top posts are a short reaction line on
   *someone else's* artefact with a number attached. Good format, wrong label — and I gave it the
   wrong label first.

**The finding worth keeping:** on all four creators measured to date, the highest-reach post has the
worst engagement rate, and every account publishes most of what performs worst. levelsio's EU
politics post: 26.6M views at **0.06%**. His numbered bootstrapping list: 615K at **2.36%**. That
ratio is the argument for the format Xoot should use, and against chasing reach at 1 follower.

### 2026-09-01 (earlier) — handles supplied, company field researched

**Handles.** `@TheRealSkosana` is the founder's personal X account. `@jacobrodri_` added as a third
voice reference — Jacob Rodri, founder of appkittie.com, ~21.6K followers, building in public on X
since September 2024, resolved from the open web.

⛔ **`@TheRealSkosana` could not be resolved.** Not in Eden's index, nothing on the open web, and
`x.com` and `superx.so` are both `EGRESS_BLOCKED` from this container. Follower count and posting
baseline remain unknown, so every phase call in `founder-brand-strategy.md` is an estimate.

**The call that came out of the handles:** Musk is the *least* usable of the three references at
this account's size. His four-word posts are 89.76× outliers because 241.5M people already hold the
context those words sit in. Jacob Rodri at ~21.6K is the phase behaviour to copy; Musk supplies
shape, Hormozi supplies density. Written into `founder-voice.md` as a check on every draft.

**Company field research** → `company-social-playbook.md`. The two findings that change plans:

1. **TikTok has 29.1M SA users 18+ against Instagram's 8.6M.** Build TikTok first. The plan
   previously led with Instagram.
2. **SweepSouth workers reportedly spend up to 50% of pay on travel between jobs.** Xoot already
   matches on suburb-centroid proximity (`ai-match`, `create-booking`, `request-replacement`), so
   the thing eating half an incumbent's workers' pay is something Xoot's engine already optimises
   against. That is the strongest non-comparative differentiator found so far, it recruits, and it
   is true today.

⚠️ **Sourcing caveat on the whole playbook.** `instagram.com`, `ads.tiktok.com`, `x.com`,
`superx.so` and several SA marketing blogs are `EGRESS_BLOCKED` here, and **Eden's MCP was
disconnected for this turn**, so nothing in it is a measured competitor post. Everything is a
reported figure or a structural read. §6 of the playbook lists exactly what to re-measure once Eden
is back.

### 2026-09-01 — reference measurement and the Eden workspace

**Measured** Hormozi (YouTube), Musk (X) and top-performing Instagram productivity posts against
Eden Discover's index. Results in `reference-creators.md`. **Read** the founder's five YouTube
references in full via Eden's server-side transcript hydration — youtube.com is `EGRESS_BLOCKED`
from this container, but `eden_read_social_post` returns the transcript anyway. Distilled into
`personal-brand-doctrine.md`.

**Built in Eden** (workspace `6a91ee30`, folder `Xoot Growth`): four boards — Swipe File (17 saved
posts), Brand Strategy (two notes), Content Engine (the week-one drafts table), Weekly Strategist.

**Three things that did not go as planned, recorded because they change what happens next:**

1. **The five videos are not Musk or Hormozi content.** Four are Eden-channel personal-branding
   tutorials; one is a Craig Perry livestream. Useful — but they calibrate nothing about either
   reference figure, and nothing about the founder.
2. **The founder's handles were not in the message** that said they were sent. They gate
   `eden_resolve_creator`, the scoreboard, and voice calibration. Still outstanding.
3. **Eden scheduling is not on this workspace's plan.** `eden_schedule_post` returns HTTP 402
   *"Scheduling is not included in this workspace plan"* — for drafts too, and with zero social
   accounts connected. The week-one drafts therefore live in a table on the Content Engine board,
   not in a scheduler queue. Nothing was published; nothing could have been.

**Instagram data caveat, recorded so it is not re-derived:** Eden's `creatorTier` filter echoed
100K–1M but returned four accounts below it, and three outlier scores in the four digits (2,267×,
3,109×, 585×). Those are static posts on Reels-baselined accounts — the multiplier is measuring a
missing denominator. Ignore four-digit outliers on Instagram.
