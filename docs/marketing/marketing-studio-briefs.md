# Higgsfield Marketing Studio — the brief pack

Written 2026-09-02, at the founder's request to *"use the marketing studio on higgsfield."*

Everything here is **ready to run the moment the plan clears**. The thinking is done; what is left is
a paste. That is deliberate — the expensive part of generation is deciding what to generate, and
deciding it while a credit meter runs is how budgets disappear.

---

## Two blockers, both real, both measured today

### 1. The free plan refuses to generate

`generate_image` returns **`Requires basic plan or higher`**. Balance is 2 credits and
`get_cost` is 0.12/image, so it looks like a credit problem and **is not** — the plan is the gate.

The founder chose the **3-day MCP trial**: $0 today, 100 credits, card required, auto-renews at
**$49/month** unless cancelled inside three days. Checkout is a Stripe link the founder clicks; I
cannot purchase it. Loop 3 in `automation-loops.md` is the cancel reminder, armed on confirmation.

### 2. ⚠️ Twenty of the twenty-six presets are for physical products, and the other six need care

Marketing Studio is built for things in boxes: `ugc_unboxing`, `ugc_unboxing_asmr`, `reboxing`,
`crush_test`, `mystery_box`, `ugc_virtual_try_on`, `ugc_virtual_try_on_sneakers`,
`product_showcase`. **Xoot is a service.** There is no box, no product in hand, nothing to try on.

**Six presets survive contact with a service business:**

| Preset slug | Why it fits | Risk |
|---|---|---|
| `mess_to_fresh` | Near-purpose-built for cleaning. A room transforms | 🔴 **Highest** — see below |
| `ugc_before_and_after` | Same shape, more general | 🔴 High |
| `ugc_how_to` | Explain the booking flow | 🟢 Low |
| `tv_spot` | Brand film, no claim | 🟢 Low |
| `ugc_direct_to_camera` | A person speaking | 🟠 Medium — depends entirely on what they say |
| `wild_card` | Custom | 🟠 Depends |

---

## ⛔ The boundary this pack exists to hold

**Marketing Studio's default output is the exact thing the founder ruled out this afternoon.**

`ugc_selfie_testimonial` and `ugc_direct_to_camera` generate *photoreal people delivering
testimonials*. Commit `906ff73` settled that a photoreal figure making a first-person customer claim
is a **fabricated testimonial under CPA s41**, where intent is irrelevant — because **Xoot has
completed zero bookings**. The preset library does not know that. This document does.

### The three rules, and they are not negotiable

**1. An AI before/after is an illustration, not evidence.** `mess_to_fresh` output shows a room that
never existed being cleaned by nobody. Presented as "a Xoot job", it is a misleading representation
of a service Xoot has not yet performed. It may be used to show **what the service is**, never **what
the service did**.

**2. Every asset carries a visible AI marker.** Not only the platform's disclosure toggle — a marker
burned into the frame. Meta and TikTok both require disclosure; the burned marker survives a
re-upload, and a re-upload is how a clip escapes its disclosure.

**3. No generated person is a customer, a Xooter, or a specific individual.** The presenter may speak
as a brand character — she is **visibly illustrated** for precisely this reason, see
`ai-presenter-brief.md` — and she may never claim to have used the service, give a rating, or
describe an outcome. *"I love how fast this books"* is fine. *"My Xooter arrived in ten minutes"* is
not.

⛔ **Not in this pack, and not by oversight:** `ugc_selfie_testimonial`, `ugc_addiction`,
`ugc_secret_hack_reveal`, `couple_sharing_home`. Each is a testimonial format. Every one of them
would need a real customer to be honest, and there is not one yet.

---

## How to run these

The Higgsfield server's own instruction is to call **`get_workflow_instructions`** first — with no
argument to see the catalogue, then again with the matching workflow name — because the parameter
shape is owned by the server and changes. **Do that rather than trusting a parameter list written
here in September.** What is durable is below: the preset, the prompt, the negatives, the aspect, and
the marker.

Run order when credits are live: **B1 first.** It is the cheapest, the lowest-risk, and it tells you
whether the style is right before anything expensive is generated.

---

## B1 — "How a booking actually works" · `ugc_how_to` · 9:16

**The safest possible first generation**, and the reason it leads: it makes **no claim at all**. It
shows a flow that exists.

- **Prompt:** `Stylised editorial illustration, flat vector shapes, warm South African
  interior light. A phone screen showing a home-services booking app: choosing a home size,
  choosing a date, confirming. Calm, premium, uncluttered. Muted terracotta and deep green
  palette. No text baked into the image.`
- **Negative:** `photorealistic, photograph, realistic skin texture, 3d render, childlike,
  cartoon mascot, cluttered, neon, stock-photo smile, price tags, numbers, currency symbols`
- **On-screen text:** three cards — *"Pick your home size"*, *"Pick your day"*, *"Done"*
- **Marker:** `AI-generated illustration` bottom-left, 5% frame height, full duration
- **⛔ Never:** a price on the screen. `locked-commercial-facts.md` §Current Pricing Conflict is
  **open** — the document locks R280/R325/R400 and `create-booking` charges R270/R315/R390. Until
  that is resolved, **no generated frame contains a number**.

## B2 — "The room, illustrated" · `mess_to_fresh` · 9:16

The preset that fits best and carries the most risk. The mitigation is in the framing: it is
**openly a drawing**, so nobody can mistake it for a photograph of a job.

- **Prompt:** `Stylised editorial illustration, flat vector shapes, no people. A Johannesburg
  apartment living room, cluttered and lived-in, transitions to the same room calm and ordered.
  Warm afternoon light through a window. Muted terracotta, deep green, cream. Premium magazine
  illustration style.`
- **Negative:** `photorealistic, photograph, people, faces, hands, before-after split screen with
  timestamps, sparkles, cleaning product bottles, brand logos, text, numbers`
- **On-screen text:** *"Your home. Handled."* — the locked brand promise, and nothing else
- **Marker:** `AI-generated illustration — not a photograph of a completed booking` bottom-left,
  full duration. **The long marker is the point on this one.**
- **⛔ Never:** a suburb name, a duration, a "before" timestamp, or any framing implying this
  happened. No *"this took 4 hours"*. No *"a real Xoot clean"*.

## B3 — Brand film · `tv_spot` · 16:9 and 9:16

- **Prompt:** `Stylised editorial illustration, flat vector shapes. A sequence of South African
  homes at different times of day — a Cape Town flat at dawn, a Johannesburg townhouse at noon, a
  Durban house at dusk. Calm, ordered, unoccupied. Warm muted palette, premium and restrained.`
- **Negative:** `photorealistic, photograph, people, faces, cleaning imagery, uniforms, logos,
  text, numbers, aspirational-lifestyle stock imagery`
- **On-screen text:** *"Xoot"* then *"Your home. Handled."*
- **Marker:** `AI-generated illustration` bottom-left
- **Note:** no claim, no capability, no price. This is the one asset that stays true whatever the
  pricing conflict resolves to.

## B4 — The presenter speaks · `ugc_direct_to_camera` · 9:16

⚠️ **Generate this last, and only after `ai-presenter-brief.md` has been re-read in full.** It is the
one brief where a wrong word is a legal problem rather than a bad ad.

- **Governed by:** `docs/marketing/ai-presenter-brief.md` and
  `docs/marketing/personas/01-street-presenter.md`. Those files are authoritative; this entry is a
  pointer, not a summary.
- **She must be visibly illustrated.** Photorealism is what turns a brand character into a fake
  customer. `photorealistic, photograph` lead the negative prompt.
- **Script — the only approved line for the first generation:** *"Xoot is a home-services app.
  You pick your home size, you pick your day, and a Xooter comes. That is the whole thing."*
- **⛔ She may never:** say she used Xoot, describe a clean, give a rating, name a suburb she was
  in, or state a price.
- **Marker:** `AI-generated character` bottom-left, full duration.
- ⚠️ `soul_cast` / `soul_2` are the **wrong models** now that she is illustrated rather than
  photoreal. Confirm the model against the brief before spending a credit.

---

## What to measure, and it is not views

**Profile visits per 1,000 impressions at 72 hours.** On five accounts measured — levelsio, Hormozi,
Musk, MrBeast, and the Instagram sample — **the highest-reach post had the worst engagement rate
every single time**. A Marketing Studio asset that gets 40,000 views and no profile visits has cost
credits and taught nothing.

⚠️ **And do not generate the second batch before the first has 72 hours of data.** Four assets is a
test. Sixteen is a spend.

---

## The cheaper thing that needs none of this

⚠️ Worth stating plainly, because it is the highest-value creative available today and it costs zero
credits: **a screen recording of the real booking flow, shot on a phone.**

It cannot be accused of faking anything, it needs no AI marker, no plan, no preset and no consent
form, and it shows a product that genuinely exists. `drafts/tiktok-month-one.md` leads with four of
them for exactly that reason. Marketing Studio is the supplement, not the substitute.
