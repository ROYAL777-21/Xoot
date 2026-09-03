# The prompt pack — one block per deliverable, copy-paste ready

Written 2026-09-03. Every deliverable the founder asked for: **launch video, company documentary,
logo animation, the six ad cells, and the launch text posts** — each with the exact call, the exact
prompt, and what it was checked against.

## ⛔ Read this before running anything

**Measured 2026-09-03:**

| Service | State | Consequence |
|---|---|---|
| **Higgsfield** | `credits: 2, plan: free` | Generation refused — *"Requires basic plan or higher"*. The founder is activating the 3-day trial (100 credits) |
| **Motion.so** | `balance: 0, plan_family: none` | Connector enabled; **no credits**. Cheapest is $5 / 200 credits (≈1–2 videos); Pro is $29/mo / 1,250 (≈8–10) |

⚠️ **I was wrong about Motion earlier and corrected it here:** Motion.so **is** a video generator
(`create_video`), not a calendar tool. It takes a **brief, not a shot list** — it does its own
research and production — which makes it the better route for the launch video and the documentary,
and Higgsfield the better route for the ad cells and the logo sting.

### Pre-flight, every time, in this order

1. `mcp__Higgsfield__balance` / `mcp__Motion_so__get_credit_balance` — ⛔ **do not generate on an
   assumption.**
2. ⚠️ **Arm the trial-cancel reminder before the first generation.** $49/month auto-renews inside
   three days.
3. `show_marketing_studio(action='presets')` — confirm the preset slug still exists. A prompt naming
   a dead slug is not a deliverable.
4. `get_cost: true` on the first call of each kind.

---

# The claim rules every prompt below was checked against

| Rule | Status |
|---|---|
| ✅ **Prices permitted** since ZD-037 — R250 / R296 / R376, R39 fee, R30 add-on, R22 cover, R99 Care+ | ⚠️ Intended to rise. **Use "from R250" in anything evergreen** |
| ⛔ No customer story, testimonial or outcome claim | Zero completed bookings. CPA s41, intent irrelevant |
| ⛔ No giveaway or competition mechanic | CPA s36 |
| ⛔ Nothing recruitment-facing | LRA s200A unsettled |
| ⛔ No identifiable real person without written, withdrawable consent | POPIA |
| ⛔ Never `cheap` / `budget` / `discount` / `bargain`; no competitor named | `BRAND_GUIDE` |
| ⛔ No capability behind a readiness constant | Tips and SOS are gated in code |
| ⛔ **Every AI asset carries a burned-in marker** | Meta + TikTok both require disclosure |

⚠️ **The line that lets the presenter speak at all: stylised, never nearly photoreal.** *If a frame
could be mistaken for a photograph at thumbnail size, it is rejected.*

## Brand facts every prompt uses

- **Violet `#7C5CFC`** — `colors.css` says *"500 is THE violet; never invent another."*
- Ink `#151515 / #242424 / #3C3A38`; warm greys `#FFFFFF / #F5F3F2 / #EFEDEB`
- **Newsreader** editorial serif for display, **Plus Jakarta Sans** for UI, **DM Mono** for numbers
- Locked brand line: **"Your home. Handled."** ⛔ Do not invent a second.
- Logo: `design/handoff-2026-09-03/xoot/assets/logo.svg` — 512×512, `rx=115`, `#7C5CFC`, two white
  outlined circles

---

# D1 · Launch video — 30–45s

**What it is for:** the one asset that says what Xoot *is*. Everything else assumes it exists.
**Route:** 🥇 **Motion.so** — it researches and structures from a brief, which is what a launch video
needs. Higgsfield `tv_spot` is the fallback if Motion has no credits.

### Call

```
mcp__Motion_so__create_video({
  prompt: "<below>",
  aspect_ratio: "16:9",     // then repeat at "9:16" for TikTok/Reels
  duration: "30s-1min",
  design_system_id: "linear"  // closest to the restrained violet/serif system; override with design_md
})
```

### The brief, verbatim

```
A launch video for Xoot, a South African on-demand home-services marketplace. Customers book a
clean; the people who do the work are called Xooters.

Goal: make a first-time viewer understand what Xoot is and what makes it different, in under 45
seconds. This is a brand film, not a performance ad.

What Xoot is: you pick your home size, you pick your day, and a vetted Xooter comes. Pricing is
fixed and shown before you book — from R250 for a four-hour clean. Xooters are matched by suburb
proximity so they are not spending half their pay getting to you.

Tone: calm, premium, restrained, warm. Adult. Confident without shouting. The opposite of a
discount cleaning advert.

Visual direction: stylised editorial illustration — flat vector shapes, warm South African interior
light, muted terracotta / deep green / cream with violet #7C5CFC as the single accent. Real South
African homes: a Cape Town flat at dawn, a Johannesburg townhouse at noon, a Durban house at dusk.
Calm, ordered, unoccupied interiors.

Close on the wordmark and the line: "Your home. Handled."

HARD CONSTRAINTS — these are legal, not stylistic:
- Do NOT show or imply a completed job, a happy customer, a testimonial, a review, or a star
  rating. This company has completed zero bookings and any such claim is a misleading
  representation under South African CPA s41.
- Do NOT show photorealistic people. Illustration only. If a frame could be mistaken for a
  photograph at thumbnail size it is unusable.
- Do NOT use the words cheap, budget, discount or bargain.
- Do NOT name or compare to any competitor.
- Do NOT show a cleaner in uniform being supervised, or any framing of cleaning as a woman's duty.
- The only price that may appear is "from R250". No other number.
```

**Marker:** `AI-generated` bottom-left, 5% of frame height, full duration.
**Checked against:** s41 (no outcome), BRAND_GUIDE (vocabulary, no competitor), pricing (from R250
only, because a launch video is evergreen and prices are intended to rise).

---

# D2 · Company documentary — 2–4 min

**What it is for:** the long-form case for the company, and the founder's build-in-public spine.
**Route:** 🥇 **Motion.so**, or Higgsfield `faceless-video` workflow.

## ⛔ The single most important constraint in this whole pack

**It must be the documentary of a company that has NOT launched.** Xoot has zero completed bookings.
A documentary implying an operating business with customers is a CPA s41 problem stretched over four
minutes, and it is the easiest mistake to make in this format because documentaries imply history.

⚠️ **Which is also why it is good.** *"Here is a company being built, and here is everything that
has gone wrong so far"* is true, rare, and unavailable to any competitor.

### Call

```
mcp__Motion_so__create_video({
  prompt: "<below>",
  aspect_ratio: "16:9",
  duration: "1-5min",
  design_system_id: "linear"
})
```

### The brief, verbatim

```
A short documentary about building Xoot — a South African home-services marketplace that has not
launched yet.

CRITICAL FRAMING: this is a film about a company mid-build, not a company operating. Xoot has zero
completed bookings. Nothing in this film may imply customers, jobs completed, reviews, or a
track record. That is a legal constraint under South African consumer law, not a stylistic one.

The story, in order:

1. The problem. In South Africa, domestic work is the most common job and one of the worst
   organised. Workers routinely lose a large share of their pay getting to the job. Customers
   have no way to tell a good service from a bad one before someone is in their home.

2. What is being built. A marketplace where the price is fixed and shown before booking; where
   Xooters are matched by suburb proximity so travel does not eat their earnings; where a
   commission floor exists so that a long job cannot pay under minimum wage.

3. The honest part — this is the heart of the film. Building it has gone wrong repeatedly and in
   public: a deploy check that reported success for three weeks while checking nothing; a domain
   that served a placeholder page while two correct builds sat unreachable; a pricing document
   that named a number the software had never charged. Each was found by measuring rather than
   assuming.

4. Where it is now. Not launched. Supply comes before demand — the constraint is finding and
   training good people, not finding customers.

Tone: quiet, serious, unsentimental. Closer to a well-made engineering documentary than a startup
sizzle reel. No triumphant music. No hero founder shot.

Visual direction: stylised editorial illustration, flat vector shapes, muted terracotta / deep
green / cream, violet #7C5CFC as the single accent. South African settings.

HARD CONSTRAINTS:
- No customer, no testimonial, no completed job, no review, no star rating, no revenue figure,
  no user count.
- No photorealistic people.
- No cheap / budget / discount / bargain. No competitor named.
- Do not state a price. This film will outlive the current price list.
- Do not show or mention recruitment, hiring, or joining as a Xooter — employment classification
  is unsettled and nothing recruitment-facing may publish yet.
```

**Marker:** `AI-generated illustration` bottom-left, full duration.
⚠️ **Note the last constraint.** The supply story is the most interesting part of Xoot and the film
may describe the *problem* — it may not issue a call to join. That is LRA s200A.

---

# D11 · Logo animation — 2–4s sting

**What it is for:** the end-card of D1, D2 and every ad, plus the app splash. **The highest reuse
per credit in the pack — generate it early.**

**Route:** Higgsfield `generate_video`, image-to-video from the real SVG. ⛔ **This is animation of
an existing mark, not a redesign.**

### Call

```
1. mcp__Higgsfield__media_upload  →  design/handoff-2026-09-03/xoot/assets/logo.svg
   (rasterise to 1024×1024 PNG first; keep #7C5CFC exact)
2. mcp__Higgsfield__generate_video({ params: {
     model: "seedance_2_5",
     medias: [{ role: "start_image", value: "<media_id>" }],
     prompt: "<below>", duration: 4, aspect_ratio: "1:1", get_cost: true
   }})
```

### Prompt

```
The Xoot logo mark — a rounded violet square, corner radius roughly 22% of its width, containing
two white outlined circles side by side — animating on a clean off-white background. The two
circles draw themselves in as strokes, then settle. The rounded square breathes once, subtly.
Motion is calm, precise and premium: ease-out, no bounce, no overshoot, no spin, no particle
effects. The mark ends perfectly centred, static and legible. Violet is exactly #7C5CFC and must
not shift hue across any frame.
```

### Negative prompt

```
gradient, glow, bevel, drop shadow, 3d extrusion, metallic, chrome, lens flare, sparkles, particles,
confetti, bounce, elastic easing, spin, rotation, text, letters, wordmark, tagline, background
imagery, colour shift, hue shift, multiple logos, distorted geometry
```

⚠️ **Deliver on solid off-white AND on a matte for transparency.** An end-card that can only sit on
white is an end-card that cannot be used on the vertical cuts.

---

# The six ad cells

⛔ **Do not invent new criteria.** `ad-matrix-and-avatars.md` already fixes four avatars, five hook
families with 14 written lines, six form factors and this exact grid. These are Higgsfield prompts
for cells that already exist.

⚠️ **Dedupe first:** `TT-05/06/07/08` in `drafts/tiktok-month-one.md` are the same four assets as
`B1–B4` in `marketing-studio-briefs.md`. Reconcile in `creative-queue.md` before producing, or you
will produce the same four videos twice.

## 🥇 D4 · Cell 2 — avatar A × hook H1 × text-on-still — **zero credits**

**Produce this today.** No generation, no marker needed, no AI involved.

- **Static:** cream `#F5F3F2` ground, Newsreader display type in ink `#151515`, violet rule.
- **Line 1 (the hook, verbatim from the matrix):** *"You've walked past that same pile for eleven
  days. It's not laziness. It's Tuesday, again."*
- **Line 2:** "Xoot. From R250." · **Line 3:** "Your home. Handled."
- **Testing:** the same hook as D3, without a presenter — **is the presenter adding or costing?**

## 🥇 D6 · Cell 4 — avatar C × hook H4 × screen recording — **zero credits**

⚠️ **Two separate briefs already argue this is the strongest asset available**, and it needs no AI
marker because nothing is generated.

- **Shoot:** a phone screen recording of the **real booking flow** — pick home size, pick a day,
  see the real total, confirm.
- **Voiceover / on-screen:** *"Book Nomsa again. She already knows about the cat, the good glasses,
  and the door that sticks."*
- ⛔ **POPIA: test data only.** No real name, address, phone number or photograph in any frame.
- **Testing:** does the real product out-perform produced creative?

## D8 · Cell 6 — avatar B × hook H4 × screen recording — **zero credits**

Same method, Airbnb turnover path. **Testing: is the Host avatar real, or a distraction?**

## D3 · Cell 1 — avatar A × hook H1 × AI presenter

```
mcp__Higgsfield__generate_video({ params: {
  model: "higgsfield_preset", preset_id: "<ugc_direct_to_camera>",
  prompt: "<below>", aspect_ratio: "9:16", duration: 15, get_cost: true }})
```

**Prompt:**
```
Stylised editorial illustration of a South African woman in her early thirties speaking directly to
camera in a warm, uncluttered living room. Flat vector shapes, visible linework, muted terracotta
and deep green palette with violet #7C5CFC accents. Warm afternoon light. She is animated and
clearly illustrated — never photorealistic. Calm, friendly, unhurried delivery.
```

**Negative:** `photorealistic, photograph, realistic skin texture, 3d render, uncanny, stock-photo smile, cleaning uniform, mop, bucket, branded products, text, numbers, currency symbols`

**Script — the only words she may say:**
> *"You've walked past that same pile for eleven days. It's not laziness — it's Tuesday, again.
> Xoot is a home-services app. Pick your home size, pick your day, a Xooter comes. From R250."*

⛔ **She may not** say "my Xooter", describe a completed clean, give a rating, or be presented as a
customer. She is a **brand character**, and that is only permissible because she is visibly
illustrated.
**Marker:** `AI-generated character` bottom-left, full duration.

## D5 · Cell 3 — avatar A × hook H2 × AI presenter

Same call, same presenter, **different hook only** — that is the whole experiment.

> *"Four hours, every Saturday. That's twenty-six days a year. Xoot is a home-services app — pick
> your home size, pick your day, a Xooter comes. From R250."*

**Testing:** cell 1 vs cell 3 isolates **hook**; cell 1 vs cell 2 isolates **presenter**.

## D7 · Cell 5 — avatar D × hook H3 × trust walkthrough

```
preset_id: "<ugc_how_to>", aspect_ratio: "9:16", duration: 20
```

**Prompt:**
```
Stylised editorial illustration, flat vector shapes, no people. A sequence showing a trust
mechanism as a diagram: a booking, a time-limited access window opening, then closing and being
revoked. Calm, premium, uncluttered. Muted terracotta, deep green, cream, violet #7C5CFC accent.
```

**Negative:** `photorealistic, photograph, people, faces, hands, padlocks, shields, security-guard imagery, alarm imagery, fear imagery, text, numbers`

**On-screen (three cards):** "Access opens when your booking starts" → "It closes when the job
ends" → "You can revoke it at any time"

⚠️ **Every one of those is true in code today** — `AccessWindowTimeline` implements the five stages
and the revoke switch. ⛔ **Do not add SOS or tipping**: both sit behind readiness constants and are
not live.

---

# D9 · Launch-week company posts

**Register: warm, calm, practical.** ⛔ Never blurred with the founder register.

| # | Channel | Post |
|---|---|---|
| 1 | TikTok / Reels | D6 screen recording + *"This is the whole booking flow. No quote forms, no callbacks."* |
| 2 | Instagram static | D4 still |
| 3 | Facebook Page | *"Xoot is open in [suburb]. Fixed prices from R250, shown before you book. Your home. Handled."* |
| 4 | Instagram carousel | The three trust mechanisms from D7, one per card |

⚠️ **Give:ask floor — at most one in five posts contains a call to book.** `company-social.md` sets
this because reach outruns Xooter coverage, and a booking Xoot cannot serve is worse than no booking.

# D10 · Founder launch thread

⚠️ **`VOICE: UNCALIBRATED`.** No founder writing samples exist, so this ships for **correction, not
approval**. A wrong voice on a personal account is worse than silence — it is your name on it.

Five posts, build-in-public register, futuristic and sharp:

1. The domain that served someone else's page while two correct builds sat unreachable.
2. The deploy check that passed for three weeks while checking nothing.
3. The pricing document that named a number the software had never charged — and how it was found.
4. Why supply comes before demand in a service marketplace, and what that changed.
5. What is actually live, stated plainly, with nothing claimed that is not.

⛔ **No launch-day triumph post.** Gate 2 is not closed and gate 3 is not closed. A launch
announcement is a claim, and the claim is not yet true.

---

# Production order — because credits are finite

| Order | Deliverables | Credits | Why here |
|---|---|---|---|
| **0** | **D4, D6, D8, D9, D10** | **zero** | Producible today. The screen recordings are argued twice over to be the strongest assets available |
| **1** | **D11 logo sting** | low | Highest reuse per credit — it ends D1, D2 and every ad |
| **2** | **D1 launch video** | medium | Everything assumes it |
| **3** | **D3, D5, D7** | medium | The grid's actual experiment |
| **4** | **D2 documentary** | ⚠️ highest | Multi-scene and narrated. **Last, and only if credits remain** |

⚠️ **If credits run out, this pack is still complete** and every remaining deliverable runs unchanged
later. That is why it was written before anything was generated.

# Verification before any asset is published

- [ ] Grep the copy for `cheap|budget|discount|bargain` — zero hits
- [ ] Every price is R250 / R296 / R376 / R39 / R30 / R22 / R99, or "from R250"
- [ ] No competitor named
- [ ] No testimonial, outcome claim, rating or completed-job implication
- [ ] No recruitment call-to-action
- [ ] AI marker present and burned in, not just the platform toggle
- [ ] Registers not blurred
- [ ] **The founder has approved that exact text**
