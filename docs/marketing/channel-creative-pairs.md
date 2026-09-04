# Creative + post pairs, by channel

Written 2026-09-04. **17 rendered creatives in `marketing-assets/`**, each paired with the exact post
text, alt text, and what blocks it from publishing.

⚠️ **This is the artefact that makes the assets usable.** A folder of PNGs is not a campaign; a PNG
with the words that go beside it, and the date it may go out, is.

## What these are, and what they are not

✅ **Typeset, not AI-generated.** Rendered by `scripts/marketing/render-creatives.mjs` through
headless Chromium, from the real brand tokens and the real OFL font binaries.

⛔ **So they carry NO AI disclosure marker, deliberately.** A marker on a typeset asset would be a
false statement about its provenance. Only Higgsfield/Motion output gets one.

**Brand read at render time** from `design/handoff-2026-09-03/xoot/tokens/colors.css` — the script
throws rather than guessing if a token is missing. Violet is `#7C5CFC` and nothing else.

---

# 🟢 Instagram — primary company channel

### `IG-01-guilt.png` · 1080×1350
> **Post:** You've walked past that same pile for eleven days.
>
> It isn't laziness. It's Tuesday, and then it's Tuesday again.
>
> Xoot is a home-services app for South African homes. Pick your home size, pick your day, a Xooter
> comes. Fixed prices from R250, shown before you book.

**Alt:** *"Cream card. Large serif text reading 'You've walked past that same pile for eleven days.
It's not laziness. It's Tuesday, again.' Xoot logo above, tagline 'Your home. Handled.' below."*
**Publishes:** after gate 2 · **Blocked by:** DNS · **Tests:** avatar A × hook H1, no-presenter arm

### `IG-02-arithmetic.png` · 1080×1350
> **Post:** Four hours every Saturday is twenty-six full days a year.
>
> That's not a chore. That's a month of your life, annually, on your hands and knees.
>
> Pick your home size, pick your day. From R250.

**Alt:** *"Cream card. Large violet numeral 26 above serif text 'days a year.'"*
**Tests:** same avatar, different hook — isolates the hook from the format.

### 🥇 `IG-03-ladder.png` · 1080×1350
> **Post:** The price you see is the price you pay.
>
> Small home, 4 hours — R250. Medium, 5.5 hours — R296. Large, 8 hours — R376.
>
> No quote forms. No callbacks. No "we'll send someone to assess". You see the total before you
> book, and that total is what you're charged.

⚠️ **This creative could not have been made before 2026-09-03.** ZD-037 closed the pricing conflict
that had banned every price from every draft. It is now the most differentiated asset in the set.
**Alt:** *"Price list: Small home 4 hours R250, Medium 5.5 hours R296, Large 8 hours R376."*

### `STORY-01-guilt.png` · 1080×1920
9:16 cut of IG-01 for Stories and Reels covers. Same copy, trimmed to two lines.

---

# 🟢 TikTok — primary, and the covers matter more than the copy

### `TT-01-cover-flow.png` · 1080×1920
**Cover for the real screen-recording video.** ⚠️ Two separate briefs argue this is the strongest
asset available: it is the actual product, needs no marker, and cannot be accused of faking anything.
> **Caption:** This is the whole booking flow. No quote forms, no callbacks. From R250.

⛔ **POPIA: test data only.** No real name, address, phone number or photograph in any frame.

### `TT-02-cover-continuity.png` · 1080×1920
> **Caption:** Book the same Xooter again. They already know about the cat, the good glasses, and
> the door that sticks.

**Tests:** avatar C × hook H4. The objection here is *briefing cost*, not price.

---

# 🟡 Facebook Page

### `FB-01-mechanism.png` · 1200×628
> **Post:** Access opens when your booking starts. It closes when the job ends. You can revoke it at
> any time.
>
> Every one of those is a setting in the app, not a promise in a brochure.

⚠️ **Every claim on this card is true in code today** — `AccessWindowTimeline` implements the five
stages and the revoke switch. ⛔ **No SOS, no tipping** — both sit behind readiness constants.

### `FB-02-ladder.png` · 1200×628
The ladder in wide format. Same copy as IG-03, trimmed.

---

# 🟡 LinkedIn — founder register

### `LI-01-supply.png` · 1200×628
> **Post:** In a service marketplace, customers are not the hard part.
>
> Finding and keeping good people is. Every framework I read said to build demand first. The
> evidence said the opposite, so that's the side we're building first.

⚠️ **Reworded during review.** The first version of this card said *"We built the supply side
first"* — an **outcome claim, and false**: gate 5 is open and there are no activated Xooters yet.
Intent tense is both true and the only version CPA s41 permits. **The card was re-rendered.**

### `LI-02-defect.png` · 1200×628
> **Post:** Our deploy check passed for three weeks while checking nothing.
>
> It fetched a URL, got a 200, and reported success. It never looked at what came back — which
> happened to be someone else's placeholder page.

---

# 🟡 X

### `X-01-company.png` · 1600×900 — company
> Pick your home size. Pick your day. A Xooter comes. Fixed prices from R250, shown before you book.

### `X-02-founder-godaddy.png` · 1600×900 — founder
> Two correct production builds sat unreachable for three weeks while the domain served someone
> else's page. Both hosts green. Zero traffic. The dashboard was never going to tell me.

### `X-03-founder-price.png` · 1600×900 — founder
> Our pricing doc named a number the software had never charged. Three sets of prices — the locked
> doc, what the doc claimed the code did, and what the code actually did. None agreed, and no test
> compared any of them to any other.

⚠️ **All founder cards are `VOICE: UNCALIBRATED`.** No writing samples exist, so these ship for
**correction, not approval**.

---

# 🟡 Substack

`SUB-01-header.png` and `SUB-02-header.png` · 1200×600 — headers for the drafted essays in
`drafts/substack-month-one.md`. ⛔ **Manual paste, permanently** — Substack has no public posting API.

---

# ⚪ YouTube — claim the handle, post nothing

`YT-banner.png` · 2560×1440 · ⚠️ **all legible content sits inside the central 1546×423 safe area**,
which is the only region visible on every device.
`YT-avatar.png` · 800×800 · the mark, full bleed.

**About text:** *"Xoot is a home-services app for South African homes. Pick your home size, pick your
day, a Xooter comes. Fixed prices, shown before you book."*

⛔ **Channel stays dormant until gate 6.** The handle is claimed so nobody else takes it.

---

# ⛔ Facebook Groups — copy only, no creative, and that is the design

`platform-playbooks.md` requires the founder to participate **as a person, from the personal
account**. Branded artwork in a suburb group is what gets a member removed.

⚠️ **A channel map with every cell filled is a map that has stopped being honest.** Reply templates
live in `drafts/facebook-groups-replies.md`. `agent-orchestration.md` records this channel as
deliberately unowned.

---

# ⛔ Indeed — nothing, and not for a design reason

Blocked on **LRA s200A**. Nothing recruitment-facing publishes until employment classification is
settled.

---

# Publishing order

| When | What |
|---|---|
| **Today** | Founder channels — X, LinkedIn, Substack. They do not depend on the domain |
| **Today** | Claim the YouTube handle with the banner and avatar |
| **After gate 2 (DNS)** | Every company channel — Instagram, TikTok, Facebook Page, company X |
| **After LRA s200A** | Indeed, and anything recruitment-facing |

⛔ **Nothing publishes without the founder approving that exact text.**

# Pre-publish check

- [ ] Price is R250 / R296 / R376 / R39 / R30 / R22 / R99 — nothing else
- [ ] No testimonial, outcome claim, rating or completed-job implication
- [ ] No `cheap` / `budget` / `bargain`; no competitor named
- [ ] No capability behind a readiness constant (no SOS, no tipping)
- [ ] Alt text set
- [ ] AI marker on generated assets only — **never on the typeset set**

---

# 🛑 The AI attempt, measured — what actually happened

The founder asked to *"use motion free usage and higgsfield 2 credits for now."* Both were tried.
Recording the outcomes because "we tried and it didn't work" is only useful with the numbers.

## Higgsfield — ✅ produced one asset, and spent the entire balance

| Step | Result |
|---|---|
| `get_cost` preflight | **exactly 2 credits** — the whole balance |
| Generation | ✅ **completed** — `nano_banana_2`, 1536×2752, 2K |
| Job | `67e2b25a-b5a1-468a-9194-cbf996653001` |
| Download into the repo | ⛔ **BLOCKED** — the egress proxy refused CloudFront with **403, organization policy** |

⚠️ **The image exists in the Higgsfield gallery and is downloadable by the founder** — it just
cannot be pulled into this repo from this session. Per policy a 403 from the egress proxy is
reported, not retried.

⛔ **If it is used, it needs a burned-in AI marker** — it is generated, unlike everything else in
`marketing-assets/`.

## Motion — ⛔ no free usage. It starts, then stops at 10%

⚠️ **I got this wrong mid-session and am correcting it.** The first call was accepted with
`status: queued, insufficient_credits: false`, and I said that meant free usage existed. It did not.
Eighty seconds later:

```
status: awaiting_user_input
progress_percent: 10
insufficient_credits: true
```

**Motion queues the job, begins, and stalls on credits.** A `queued` acceptance is not evidence of
an allowance — only a terminal status is.

Also measured: **`design_system_id` is Pro-only** (`motion_pro_feature_required`). The first attempt
passed `linear` and was rejected outright; the retry without it is the one that ran.

**To finish the launch video:** Motion Flex is **$5 for 200 credits** (≈1–2 videos); Pro is **$29/mo
for 1,250**. The queued job is at `motion.so/agent?chat=ffbf4fdc-6348-49e8-bbb0-bd37c5d12417` and
**resumes from 10% once credits exist** — it does not need to be re-briefed.

## What this changes about the plan

⚠️ **Nothing, and that is the point.** The 17 typeset creatives were produced first precisely
because they depend on no credit pool. **Every channel has usable artwork today.** The AI assets
were always the enhancement, never the floor.
