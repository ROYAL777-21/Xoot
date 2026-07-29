# Xoot — Master Build Brief

**Status:** authoritative. Supersedes v1 and v2 prompts where they disagree.
**Last updated:** 2026-07-29 (Phase 0)
**Kept in sync:** identical copy at `zoot-app-iteration./docs/xoot-master-brief.md`. Edit both.

This file exists so pricing logic, corrections and constraints survive across the many
sessions this project will take, instead of living in one context window.

> **Reading rule.** Anything tagged **`CONFIRM`** is *not settled*. Do not implement it, do
> not price it, do not design around it. Ask first. Several numbers below came from a
> speech-to-text transcript with audible corruption; where the transcript is unreliable the
> reconstruction is shown *and labelled as a reconstruction*.

---

## 1. Product

Xoot — South African on-demand home-services marketplace, competing with SweepSouth.
Two-sided: customers book, **Zooters** perform the work. iOS first, Android later.

| Term | Meaning |
|---|---|
| **Zooter** | The service professional. Customers can book **more than one Zooter per job** — booking flow must support multi-Zooter selection. |
| **Care+** | R99/month membership. |
| **XootCred** | Loyalty currency. |
| **Xoot Black** | Top tier — see `docs/concierge/knowledge/zoot-black-guide.md`. |
| **Zoey** | The mascot. Not "Zooey", not "Xoey". Component file is still `Zooey.tsx`. |

Brand line: **"Your home. Handled."**

Renamed from "Zoot" → "Xoot". The old name is still everywhere — codebase, docs, DB tables,
component paths, `ZootCred` in `src/data/`. Fix stray references opportunistically as you
touch each file; do not do a repo-wide rename as a side quest.

### Care+ benefits

Favourite-Zooter continuity, priority booking windows, Home Memory, 1.5× XootCred, priority
support, and the R30 credit described immediately below.

### ⚠️ The R30 credit — corrected

The R30 credit is **one-time, in the member's first month**, and applies **only if they did
not come through the onboarding free trial**. It is **not** a recurring monthly credit.

Every one of these currently says "monthly" and is **wrong**:

| File | Line |
|---|---|
| `src/data/care-plus.ts` | 26, 170, 258 |
| `src/pages/app/Plans.tsx` | 26 |
| `src/pages/care/CarePlus.tsx` | 433 |
| `src/pages/legal/CarePlusTerms.tsx` | ~27 (section "ZootCred and monthly credit") |
| `docs/BRAND_GUIDE.md` | 77 |
| `docs/CARE_PLUS_SPEC.md` | 34, 68, 87 |
| `docs/product/locked-commercial-facts.md` | 22, 53 |
| `docs/implementation/master-discovery-report.md` | 186 |
| `docs/release/app-store-play-store-checklist.md` | 97 |
| `docs/feature-completion-audit.md` | 30 |

This is wider than the brief implied — it is not just the paywall artifact. `CarePlusTerms.tsx`
is a **legal page**, so that correction is a legal-copy change, not a copy tweak.

---

## 2. Ground truth — read before building

| File | Repo | Why |
|---|---|---|
| `src/styles.css` | app-iteration | Real colour tokens, OKLCH, "Heritage editorial luxe". Source of truth for colour. |
| `docs/BRAND_GUIDE.md` | local-helpers | Positioning, copy rules, onboarding principles. **Conflicts with `styles.css` — see §3.** |
| `src/routes/onboarding.tsx` | app-iteration | Existing 4-chapter mascot onboarding, 295 lines. Being restructured in Phase 1 — extend, don't replace. |
| `src/components/zoot/mascot/Zooey.tsx` | app-iteration | Mascot, 148 lines, pose-driven SVG. |
| `src/lib/service-visual.ts` | app-iteration | Per-service accent + motion. 19 services already mapped. |
| `src/lib/pricing.ts` | app-iteration | Existing pricing engine — **multiplier-based, incompatible with §4. See §4.0.** |
| `docs/BOOKING_LOGIC.md` | local-helpers | Booking lifecycle, state machine, assignment rules, sensitive-access windows. Solid; build against it. |
| `docs/product/locked-commercial-facts.md` | local-helpers | Locked pricing — **conflicts with §4.** |
| `docs/implementation/phase-9-twilio-verify-masked-voice.md` | local-helpers | Masked calling, built and inactive. **Activate, don't rebuild.** |
| `docs/implementation/phase-2-booking-chat.md` | local-helpers | Booking-scoped chat, built and inactive. **Activate, don't rebuild.** |

### Already built — do not re-create

`ProgressStepper`, `PermissionCard`, `Confetti`, `ChoiceGrid`, `ChatQuestion`, `StoryScene`,
`Wallpaper`, `haptic()` in `src/lib/prefs`, `rise-in` stagger (55ms), `AnimatedIcon` with a
named motion vocabulary (`bounce`, `twinkle`, `sweep`, `drive`, `pop`, `wag`, `flicker`,
`wave`, `drip`, `flip`, `ring`). Phase 1 and Phase 8 should compose these, not reinvent them.

---

## 3. Unresolved design conflicts

### 3.1 Fonts and colours have drifted between repos

| | `docs/BRAND_GUIDE.md` (local-helpers) | `src/styles.css` (app-iteration) |
|---|---|---|
| Display | Space Grotesk | Cormorant Garamond |
| Body | DM Sans | Inter |
| Palette | Terracotta + sage | Cream / ivory / gold / brown / charcoal |

Still unresolved. app-iteration has been treated as current. **Do not silently pick one.**

This now collides with a third input: the user is open to replacing the design system
outright, aligned to images shared in the "dispatch conversation".

> **`CONFIRM` — blocking for Phase 1.** Those images are not in this repo and are not
> reachable from a Claude Code session. Phase 1 cannot resolve the palette without them.
> They need to be committed to the repo (suggest `docs/design/references/`) or re-shared.

### 3.2 Zoey

- **Default fill → red.** Currently `var(--gold, #E88E6A)` (warm coral) at `Zooey.tsx:65`.
  Change the *default* state; themed variants may keep their own fills.
- **Stars → white, 4-pointed, twirling, each leaving a visible trace of its path.**
  A 4-pointed star path already exists at `Zooey.tsx:129`, currently gold and static. The
  work is: recolour white, multiply, animate orbit, add motion trails.
  (v1's "three pointed" is superseded. 4-pointed is confirmed.)
- Silhouette is **not** being redesigned. Restyle around her.

### 3.3 Flowers

Flowers wanted in the splash screen and elsewhere, to make the app feel more vibrant.
Fits the existing Care+ bloom motif. Scope not yet defined — treat as a Phase 1/6 design
input, not a standalone task.

---

## 4. Pricing and service logic

**Global rule: no price is shown to the user at any point until the end of the booking flow,
on every service.** This includes the onboarding-embedded booking setup.

> ⚠️ `src/routes/onboarding.tsx:35` currently promises *"see the price instantly"*. That copy
> directly contradicts this rule and must change in Phase 1.

**Recommended hours = the default preselected value.** Not a label — the picker starts there.

### 4.0 ⚠️ Three-way pricing conflict — resolve before writing any pricing code

There are currently **three incompatible pricing models** in play:

1. **`docs/product/locked-commercial-facts.md`** — flat per home size: R280 small / R325
   medium / R400 large, + R39 one-time service fee, + **R21** Booking Cover *by Genric*.
2. **`supabase/functions/create-booking/index.ts`** — R270 / R315 / R390, plus service
   multipliers and a high-demand premium that the locked doc says were never approved.
3. **`src/lib/pricing.ts`** (app-iteration) — a different model again: base price ×
   bedroom/bathroom/property-type multipliers, recurrence discounts, surge.
4. **This document, §4.1–4.7** — per-half-hour price ladders, Booking Cover at **R22**.

`docs/implementation/decision-log.md` **ZD-007** states these prices are locked and *"Do not
change silently; create an approved server-pricing migration and release plan."*

**The §4 ladders below are lower than the locked prices** (4h small = R250 here vs R280
locked; 5.5h medium = R296 vs R325; 8h large = R370 vs R400).

> **`CONFIRM` — blocking.** Does §4 supersede ZD-007 and the locked commercial facts? If yes
> this needs a new decision-log entry and a server-pricing migration, not an edit. Nothing in
> §4 should reach code until that entry exists.

### 4.1 Regular indoor cleaning

| Size | Bedrooms | Min | **Default** | Max |
|---|---|---|---|---|
| Small | 1–2 | 3.5h | 4h | 10h |
| Medium | 3–4 | 3.5h | 5.5h | 10h |
| Large | 5+ | 3.5h | 8h | 10h |

**Price ladder (one-time booking):**

| Hours | Price | Hours | Price |
|---|---|---|---|
| 3.5 | R236 | 7.0 | R340 |
| 4.0 | R250 | 7.5 | R356 |
| 4.5 | R266 | 8.0 | R370 |
| 5.0 | R280 | 8.5 | R386 |
| 5.5 | R296 | 9.0 | R400 |
| 6.0 | R310 | 9.5 | R416 |
| 6.5 | R326 | 10.0 | R430 |

Source said the medium and large ladders follow "the same" logic.

> **`CONFIRM`.** "Same logic" reads two ways: (a) *identical* prices — price is a pure
> function of hours and home size only sets the default; or (b) same *shape*, different base.
> Reading (a) is assumed above because it is the only one the transcript fully supports, and
> because it collapses cleanly to one ladder. But (a) contradicts the locked R280/R325/R400
> tiering, where size *did* change price. Worth an explicit yes/no.

**Hours picker:** slider/toggle, movable down from default to minimum. Below default, show a
non-blocking disclaimer that the home may not be cleaned to the standard we'd want.

**Add-ons — R30 each:** inside fridge, inside oven, inside cabinets, interior windows,
interior walls, water plants, ironing, laundry, small flatlet.
→ **Interior windows is preselected by default.**

**Booking Cover (insurance): R22 flat, preselected.** On deselect, show a confirmation banner
("Are you sure?") listing what they lose, worded to honestly encourage keeping it.
Buttons: **Remove** / **Keep**.

### 4.2 Last-minute pricing

Prices are elevated for last-minute bookings. Worked example given: at **11:44**, booking a
4-hour small-home clean for **07:00 the next morning** → **R360** instead of R250 (+R110,
≈1.44×).

The booking flow must show a **last-minute tag/banner** so the user knows prices may be
elevated — shown at selection time, even though the number itself stays hidden until the end.

> **`CONFIRM`.** One data point does not define a rule. Needed: the cutoff window (hours
> before start), whether it is a multiplier or a flat uplift, whether it varies by service,
> and whether Care+ members are exempt.

### 4.3 Frequency / recurring

Users can save more by booking frequently. Weekly and every-2-weeks must be easy to pick in
the UI. `docs/BOOKING_LOGIC.md` and the locked facts define recurring discounts as: 1–2
days/week no service fee; 3–4 days/week up to 15% off; 5+ days/week up to 28% off.

> **`CONFIRM`.** Do those recurring discounts survive the §4 repricing, and do they apply to
> the ladder price, the service fee, or both?

### 4.4 Office cleaning

No size selector — no room or bedroom input at all. Min 2h, **default 5h**, max 10h.
Plus a frequency selector.

| Hours | Price | Hours | Price |
|---|---|---|---|
| 2.0 | R324 | 6.5 | R518 |
| 2.5 | R324 | 7.0 | R540 |
| 3.0 | R324 | 7.5 | R558 |
| 3.5 | R374 | 8.0 | R592 |
| 4.0 | R424 | 8.5 | R618 |
| 4.5 | R442 | 9.0 | R638 |
| 5.0 | R452 | 9.5 | R646 |
| 5.5 | R476 | 10.0 | R660 |
| 6.0 | R504 | | |

Flat R324 across 2–3h, then it starts climbing.

> **`CONFIRM`.** No add-on list was specified for office. Is that deliberate (office has no
> add-ons) or just not covered yet? **Do not invent one.**

### 4.5 Moving cleaning

Sized by square meterage. **Medium is preselected.**

| Size | Range | Min | **Default** | Max |
|---|---|---|---|---|
| Tiny | under 50m² | 4.5h | 4.5h | 10h |
| Small | 50–93m² | 4.5h | 6h | 10h |
| Medium | 93–186m² | 4.5h | 8h | 10h |
| Large | 186–325m² | 4.5h | 10h | 10h |
| Extra large | 325m²+ | 4.5h | 10h | 10h |

**Price ladder — applies to all five sizes:**

| Hours | Price | Hours | Price |
|---|---|---|---|
| 4.5 | R320 | 7.5 | R404 |
| 5.0 | R330 | 8.0 | R430 |
| 5.5 | R344 | 8.5 | R448 |
| 6.0 | R364 | 9.0 | R462 |
| 6.5 | R376 | 9.5 | R468 |
| 7.0 | R390 | 10.0 | R478 |

> **`CONFIRM` — this table is a reconstruction.** The transcript recited five separate
> ladders. Tiny, small and medium came through identical to the above. The large-home ladder
> came through with hours 5.0–7.0 exactly R100 lower (R230/R244/R264/R276/R290) before
> rejoining the same values from 7.5h up; extra-large had similar isolated dropouts. A
> uniform R100 gap on a contiguous run that then re-converges is characteristic of
> speech-to-text dropping a leading syllable ("three hundred" → "two hundred"), not of real
> pricing — no sane ladder is R100 cheaper in the middle and identical at both ends.
> **One shared ladder is the assumption. Confirm before implementing.**

**Pet indicator:** yes/no toggle.

**Add-ons — R30 each:** balcony/patio, clean windows, clean appliances, wipe furniture,
unpack boxes, pack boxes.

### 4.6 Airbnb cleaning

**Booking window: any day, 07:00–14:00 only.** Cap the time picker to that window.

Base hours: min 3h, **default 4h**, max 8h.

| Hours | Price | Hours | Price |
|---|---|---|---|
| 3.0 | R304 | 6.0 | R362 |
| 3.5 | R304 | 6.5 | R362 |
| 4.0 | R304 | 7.0 | R372 ⚠️ |
| 4.5 | R318 | 7.5 | R400 |
| 5.0 | R324 | 8.0 | R426 |
| 5.5 | R342 | 8.5 | — (above max) |

⚠️ 7.0h was recited twice, once as R372 and once as a garbled value that decodes closer to
R388. **`CONFIRM` the 7-hour price.**

**Linen handling — required, single-select, four options:**

1. Replace linen, do not wash
2. Wash linen, leave to hang dry
3. **Wash, dry and repack linen on-site** — raises the **whole service** minimum to **5 hours**
4. Do not replace the bedding at all

Confirmed from the follow-up: exactly four options, user picks **one only**, it is required,
and option 3 raises the entire service minimum to 5h (the earlier v2 ambiguity is resolved).

**Linen pricing —** ⚠️ **`CONFIRM`, contradictory in source.** The transcript first states
option 3 is a **R20** add-on with the other three at **R0**, then later says *"just make that
a thirty rand add on for now"* — **R30**. R20 and R30 cannot both be right, and it is also
unclear whether the charge attaches only to option 3 or to any non-default option.
**Do not price linen until this is answered.**

**Add-ons — R30 each:** clean appliances, restock supplies, restock toiletries.

### 4.7 Express cleaning

Designed as a very quick clean. Min 1h, **default 1h**, max 3h.

**Flat R220 across the entire range** — 1.0, 1.5, 2.0, 2.5 and 3.0 hours all price at R220.
(The transcript's initial "R202" was self-corrected to R220 in the same breath.)

**Add-ons — R30 each:** inside fridge, inside oven, inside cabinets, interior windows,
interior walls, ironing, laundry, water plants. *(No small flatlet on express.)*

### 4.8 Laundry & ironing — new dedicated service

A standalone service, not only an add-on.

**Machine wash bands:** 0 · 1–2 · 3–4 · 5–6 · 7–8 · 9–10 · more than 10 loads

**Ironing bands:** 0 items · 1 load (10–15) · 2 loads (16–30) · 3 loads (31–45) ·
4 loads (46–60) · 5 loads (61–75) · 6 loads (76+)

**Combined time + price:**

| Selection | Est. hours | Price |
|---|---|---|
| 1 load (wash *or* ironing) | 3.5h | R268 |
| up to 3–4 loads | 3.5h | R268 (unchanged) |
| 5–6 loads | 4.5h | R314 |
| 7–8 loads | 5.5h | R338 |
| 9–10 loads | 6.5h | R368 |
| 10 loads wash + 2 loads ironing | 7.5h | R396 |
| + 3 loads ironing | 8.5h | R440 |
| + 4 loads ironing | 9.5h | R460 |
| + 5 loads ironing | 10h | R468 |
| + 6 loads ironing | 10h | R468 (capped) |

> **`CONFIRM` — most degraded section of the transcript.** The band boundaries above are
> reconstructed: "four loads, which is forty six plus items" and "five loads, which is sixty
> one to fifty seven items" cannot both be literal, since 46+ would swallow every higher band
> and 61–57 is not a range. 46–60 and 61–75 are inferred from the surrounding pattern.
> Also unconfirmed: whether wash and ironing are two independent selectors that compose into
> one estimate (assumed), and what happens between 1 and 4 loads where price is flat.

---

## 5. Onboarding, booking setup and paywall

### 5.1 Shape

Onboarding *is* account setup *is* booking setup, in one motion: profile, home details and
service frequency are all captured during onboarding, so the first real booking is a single
confirmation rather than a fresh multi-step form. Care+ paywall sits immediately after,
before payment.

### 5.2 First screen — specified directly by the user

- **Split layout:** card fills half the screen, animated creative fills the other half.
- **Staggered entrance** (the existing `rise-in` 55ms utility already does this).
- **Header:** "Let's handle your home"
- **Below, smaller:** benefits and outcome of signing up.
- **Four buttons:** `Continue with phone` · `Continue with Email` · Apple logo · Google logo.

### 5.3 Language

Never "Sign up" / "Sign in". Warm, not transactional:

| Instead of | Use |
|---|---|
| Create account | "Let's get your home sorted" |
| Log in | "Pick up where you left off" |
| Account created | "You're in" |

Write more in this register, then run everything through `humanizer` before shipping.

### 5.4 Paywall

Persuasive-but-transparent, the Blinkist pattern: chart out **exactly** when the free trial
ends and when the card is charged. The user is still charged for **the booking** during a
trial — only the **membership** is free.

**Decline follow-up:** if the user declines Care+ at the paywall, show one additional
screen noting they won't get the free first month if they don't take it now.

> ⚠️ **Judgement flag, not a refusal.** A hard-to-dismiss second ask after a decline is the
> pattern app-store review teams and consumer-protection regulators look at most closely, and
> it is the single most common source of "dark pattern" complaints. It usually *does* lift
> trial starts, and it can absolutely be built honestly — one screen, one clear decline
> control, no pre-checked boxes, no fake countdown. Build it that way. Worth A/B testing
> (`marketing-ab-testing`) against no-follow-up, measuring **retained paid conversion at
> day 30**, not trial starts — a downsell that lifts trials but raises cancellations is a
> loss the trial-start metric hides.

### 5.5 Flow requirements

- **Progress indicator** throughout — step count or bar, never an open-ended scroll.
- **Social proof** embedded in the flow (live reviews / user stats), not a separate screen.
- **Permission requests** never bare system prompts. Always a screen explaining the benefit
  first: *"Enable notifications so you never miss an update on your Zooter."*
- **Every non-essential step gets Skip.** Secondary data can be collected later in-app.

**North star:** the user should come away feeling Xoot has thought of everything, that their
home is in careful hands, and that the language is warm rather than transactional.

---

## 6. Micro-interactions, haptics, gamification

- **Phone fields:** real-time green check on valid, red shake on error.
- **Buttons:** visible state shift on press / loading / disabled — colour, size or elevation,
  not just a spinner.
- **Haptics:** paired with visual feedback; intensity scales with the weight of the action
  (light = selection, stronger = confirmation / success / error). `haptic()` already exists in
  `src/lib/prefs`.
- **Toasts:** brief animated banners for background success (booking confirmed, payment processed).
- **Reaction animations:** micro-explosions of hearts / emoji / thumbs, **inside customer↔Zooter
  chat** — Phase 2, once chat is live.
- **Dynamic icons:** morph or small "dance" on selection, not a static colour swap.
  `AnimatedIcon` already has the motion vocabulary for this.
- **Gamification:**
  - Customer — celebration at milestones: tier upgrades, loyalty milestones.
  - Zooter — completed-job counts, bonus tiers, and a **streak counter** for consecutive
    active days/jobs.

---

## 7. File upload — corrected scope

**v1 got this wrong twice. To be unambiguous:**

- **Not** a request to copy SweepSouth's upload feature, and **not** its look.
- SweepSouth is a **booking-flow UI/UX reference only** — study its flow structure, not its
  visual style. Reference screenshots were shared earlier in the project.
- The actual ask: build the supplied `FileUpload` drag-and-drop React component pattern for
  two real use cases:
  1. **Zooter onboarding** — uploading application/onboarding documents.
  2. **Pre/post-service photos** — proof-of-work images after a booking completes.
- **Build on the website AND the app.** This is the one deliberate exception to the
  "don't touch website code" constraint.

`docs/BOOKING_LOGIC.md` already requires "photo proof required where applicable" at the
Completed state, and a `cleaner_documents` table already exists in the schema — so this has
backing structure to build against.

---

## 8. Legal

Keep all existing legal terms **except Booking Cover**. The insurance provider is changing —
the locked facts still name **Genric at R21**, while §4.1 specifies **R22**.

> 📌 **PINNED — raise with the user before ship.** Booking-cover terms are a placeholder on
> hold. Do not let them go live with stale provider terms. New provider details, new terms
> text, and the R21→R22 change all need to land together.

`src/pages/legal/CarePlusTerms.tsx` also carries the incorrect "monthly credit" wording
from §1 — a legal-copy fix, not just marketing copy.

---

## 9. Hard constraints

- iOS first. No Android work yet.
- Don't touch website code — **except** the Phase 4 file-upload web half.
- Supabase: use the connected MCP / project config. **Never raw pasted keys.** Flag
  hardcoded secrets rather than working around them.
- Don't guess on anything tagged `CONFIRM`.
- **One phase at a time.** Stop after each, show a preview, wait for explicit approval.
- Design-facing phases ship **either 3 full directions, or 1 best-of per relevant skill**
  (one led by `impeccable`, one by `huashu-design`, one by `brandkit`) so influence can be
  compared, not just aesthetics. Run `impeccable` critique on all options before presenting.
  Optimise for conversion, not only aesthetics.

### Known security items

- Leaked-password protection is **off** on both production and staging Supabase projects.
  One Auth-settings toggle each. Cheap; do them early.
- `zoot-app-iteration./.env` is **committed to git** and `.gitignore` does not list `.env`.
  The values are Supabase *publishable* keys (designed to be public), so this is not a live
  key leak — but the file is a loaded gun: the moment anyone adds a service-role key it goes
  straight to the remote. Add `.env` to `.gitignore` and untrack it.
  Verified clean: no service-role keys, Stripe live keys or Twilio SIDs are committed in
  either repo. local-helpers already has `scripts/security/secret-scan.mjs` and
  `scan-build-artifacts.mjs` — app-iteration has no equivalent.

---

## 10. Phases

| # | Phase | Notes |
|---|---|---|
| **0** | Install + verify skills, load this document | ✅ Done 2026-07-29. See `.claude/skills/VENDORED.md`. |
| **1** | Onboarding + booking setup + paywall | 3 directions. Fix the R30 copy error. **Blocked on §3.1 palette images + §4.0 pricing conflict.** |
| **2** | Activate calling + chat | Read both implementation docs fully first. Add chat reaction animations. |
| **3** | Airbnb calendar sync (iCal) | Search `docs/` first. |
| **4** | File upload per §7 | Web **and** app. |
| **5** | Widgets | Already specified in a prior session — implement to that spec. |
| **6** | Logo | |
| **7** | Zooter quality-standard training modules | Cleaning, presentation, conduct, pet handling. Content task — run `humanizer`. |
| **8** | App-wide haptics + micro-interactions + gamification | Last, once screens exist. |

---

## 11. Open questions

| # | Question | Blocks |
|---|---|---|
| 1 | Does §4 supersede ZD-007 / locked commercial facts? Needs a decision-log entry + server-pricing migration. | **All pricing work** |
| 2 | Palette/design-system reference images from the dispatch conversation — commit to repo or re-share. | **Phase 1** |
| 3 | Regular cleaning: is the hour ladder identical across small/medium/large, or same-shape-different-base? | Phase 1 pricing |
| 4 | Moving cleaning: is the single shared ladder correct (§4.5 reconstruction)? | Phase 1 pricing |
| 5 | Airbnb linen: R20 or R30? Option 3 only, or any non-default option? | Phase 1 pricing |
| 6 | Airbnb 7.0h: R372 or R388? | Phase 1 pricing |
| 7 | Laundry band boundaries + whether wash/ironing compose into one estimate. | Laundry service |
| 8 | Last-minute surcharge: cutoff window, multiplier vs flat, per-service, Care+ exempt? | Phase 1 |
| 9 | Office cleaning add-ons: none by design, or not yet specified? | Phase 1 |
| 10 | **"Accommodate all industries"** — meaning still unclear. Could mean expanding beyond cleaning into the 19 verticals already in `service-visual.ts` (plumbing, electrical, gardening, pest, pool, pet, painting…), or supporting commercial/B2B clients. **Do not build architecture around a guess.** | Architecture |
| 11 | Recurring discounts (1–2 / 3–4 / 5+ days per week) — do they survive the repricing? | Phase 1 |
| 12 | Full legal terms text, apart from the pinned booking-cover terms. | Pre-ship |
| 13 | Insurance provider details once sorted. | Pre-ship §8 |
| 14 | Services list beyond those specified here, if any. | Architecture |

**Resolved and closed:** Zoey stars (white, 4-pointed, twirling, trailing) · Airbnb linen
option count and single-select · option 3 raises whole-service minimum to 5h · express default
= 1h · recommended hours = preselected default · R30 credit is first-month-only, not monthly ·
file-upload scope (§7) · multi-Zooter booking.
