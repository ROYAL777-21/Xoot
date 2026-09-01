# Growth log

Every experiment, including the ones that failed. Newest first.

Each entry: date, constraint, hypothesis, horizon, pre-registered threshold, what happened, verdict.

_No experiments yet — measurement is not instrumented. See `measurement-spec.md`._

---

## Setup log

Not experiments. Things that were built or measured, so the first experiment does not have to
rediscover them.

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
