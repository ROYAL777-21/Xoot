# Growth log

Every experiment, including the ones that failed. Newest first.

Each entry: date, constraint, hypothesis, horizon, pre-registered threshold, what happened, verdict.

_No experiments yet — measurement is not instrumented. See `measurement-spec.md`._

---

## Setup log

Not experiments. Things that were built or measured, so the first experiment does not have to
rediscover them.

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
