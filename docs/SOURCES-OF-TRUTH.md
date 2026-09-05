# Sources of truth

Written 2026-09-05 at the founder's instruction to treat the Xoot design files, the mobile design
handoff and the Alex Hormozi playbooks as source of truth.

**Why this file exists.** Every one of these sources was already in the repository. What was missing
was a statement of *which one wins when two of them disagree* — and that gap is not theoretical. In
one week it produced eight claims that reached a component before being caught by hand, including a
comparison grid promising insurance cover that has not been placed.

---

## 1 · Design

> ⚠️ **Read-depth is stated on every row, and that column exists because of a real failure.** The
> first version of this register (2026-09-04) named ten HTML files as source of truth when **three
> had never been opened** — including the 2.8 MB mobile handoff, listed on the strength of its first
> 400 bytes. A register that does not record its own confidence is the documentation equivalent of a
> green check that reviewed nothing, which this repository has already shipped.
>
> **full** = read end to end · **substantive** = the parts that carry rules · **inventory** = names
> and structure counted, contents not read.

### The 2026-09-03 handoff — `design/handoff-2026-09-03/`

| File | Depth | Governs |
|---|---|---|
| `Xoot Foundations.dc.html` | **substantive** | The 9 colour groups, 13-row type scale, space/radii/elevation/motion tokens, 28 semantic aliases |
| `Xoot Components.dc.html` | **inventory** | 137 component exports across 81 sources; the 80-icon set behind one `Icon` wrapper |
| `Xoot Website.dc.html` | **substantive** | Public-site composition and **section order** |
| `Xoot App.dc.html` | **inventory** | In-app screen map — 24 top-level screens, 17 "You ›" sub-screens |
| `Xoot Legal.dc.html` | **substantive** — constraints + titles; ⚠️ the twelve documents' bodies unread | **Twelve** legal documents and their drafting constraints |
| `Xoot Responsive Check.dc.html` | **full** | The **four viewports** the design is claimed to work at |
| `Xoot Bug Bounty.dc.html` | **substantive** | The disclosure programme — ⛔ see the warning below |
| `xoot/` | **substantive** | The compiled kit: `tokens/*.css`, `site/*.jsx`, `app/*.jsx`, `ds-bundle.js`, `rwd.js`, fonts, `assets/logo.svg` |

### The mobile design handoff — `design/Xoot_App.html`

**2.8 MB standalone UI kit** for the native app — **36 screens and flows**, depth: **inventory**.
⚠️ **Distinct from the 16 KB `Xoot App.dc.html`** in the handoff folder — same subject, different
artefact.

📋 The measured comparison against `mobile/` and `src/pages/app/` is
[`docs/design/handoff-delta.md`](./design/handoff-delta.md). Headline: **7 screens shipped in
`mobile/` against 36 designed**, and six designed surfaces — `TodayScreen`, `SiriScreen`,
`WidgetsScreen`, `CalendarScreen`, `SearchScreen`, `XooterGrowthScreen` — have **no counterpart on
any platform**.

### The prototypes — `design/prototypes/customer-sign-in-first-booking/`

Depth: **substantive**. `index.html` (40 K) and `selected-bc.html` (8 K), plus a 124-line screen
spec and a `features/…/BRIEF.md`. **The only end-to-end flow anyone has specced**, and it covers the
path the product needs to work: guest browses, prepares a booking, authenticates only when the draft
becomes account-owned, and the draft survives the callback.

⚠️ Its status line reads *"exploration handoff; Figma approval required before production UI
implementation"* — consistent with `approved-frames.json` being empty. **Whether the shipped
`Book.tsx` satisfies it has never been checked.**

### The governance layer — `design/*.md`, 804 lines total, all read

The shortest and most consequential part of the corpus. **Two of these overturned decisions after I
had already made them**, and three more turned out to have been violated by components that shipped
this week.

| Document | The clause that binds | Consequence |
|---|---|---|
| **`ACCESSIBILITY.md`** | WCAG 2.2 AA · **44×44 iOS / 48×48 Android touch targets** · *"Status never conveyed by colour, motion, sound, or haptic alone"* | ⚠️ `GiftClean`'s occasion buttons were **~40px — below minimum**. Fixed 2026-09-05 |
| **`ICONOGRAPHY.md`** | *"Status icons always include text."* · *"Do not use letters as service icons"* · *"Icons do not imply a provider, partner, guarantee, or certification that Zoot cannot verify"* | ⚠️ `CarePlusBand`'s grid showed a bare tick with only an `aria-label`. Fixed. ✅ The letters rule retroactively justifies replacing the "X"-in-a-box lockup with the real mark |
| **`ILLUSTRATION.md`** | ⛔ *"Do not create fake logos, certification marks, partner marks, maps, reviews, **people**, or product screenshots"* | 🔴 **See below — this changes the hero question** |
| **`BRAND.md`** | *"Do not use certainty language unless the backend verifies the state"* · *"Local and human, **never fabricated**"* · *"Optimistic, never overpromising"* | ✅ Exactly the principle behind the eight dropped claims |
| **`UX-PRINCIPLES.md`** | **#4 Backend truth** — *"does not infer payment, membership, assignment, referral, credit, or payout success"* · **#3** *"Each step has one primary action"* | ✅ #4 is the gift claims; #3 justifies removing the second Services CTA |
| **`CONTENT-GUIDE.md`** | *"Begin buttons with a clear verb: `Book a clean`…"* · *"Do not fabricate demand, scarcity, ratings, guarantees, background-check outcomes, or response times"* | ✅ Shipped buttons comply |
| **`DESIGN-SYSTEM.md`** | Component contract: all interactive states, keyboard + screen-reader semantics, 44/48 targets, reduced-motion, large-text | ⚠️ Partly superseded by the export per ZD-030; the contract still stands |
| **`MOTION.md`** | *"celebration: restrained, only after backend-verified success"* · reduced-motion renders resting state | ✅ `HeroWordFlip` already honours `prefers-reduced-motion` |
| **`HAPTICS.md`** | *"success feedback only after backend-confirmed booking, payment, or saved change"* | Mobile; recorded for Phase 4 |
| **`GLASS-SYSTEM.md`** | Glass is for controls, nav and overlays — *"not the default treatment for page sections"* | ✅ New sections use flat surfaces |
| `PHOTOGRAPHY` · `QUALITY-GATES` · `PERFORMANCE` · `FIGMA-WORKFLOW` · `PHASE-1-AUDIT` · `README` | See the findings section | |

Plus `screen-specs/`, `features/`, `prototypes/`, `references/REFERENCE-MAP.md`, and
`approved-frames.json` with its schema.

⚠️ **Two governance documents still say "Zoot".** `BRAND.md` — *"Render the brand as `Zoot`"* — and
`REFERENCE-MAP.md` rule 3. Both survived the rename, inside the files that define how everything
else is read.

## 2 · Commercial and legal truth, inside the repository

| Source | Governs |
|---|---|
| `docs/product/locked-commercial-facts.md` | Every price, fee and commercial term. Changes only through a decision-log entry |
| `docs/implementation/decision-log.md` | The ZD-nnn record. **The only way a locked fact moves** |
| `src/lib/xoot-pricing.ts` · `supabase/functions/_shared/pricing.ts` | The ladder, mirrored. `pricing-parity.test.ts` fails if they drift |
| `src/lib/care-plus.ts` | Care+ economics — **and its own header records a live server divergence** |
| `src/lib/operations.ts` | `approvedLaunchRegions` — the only list an ad may name a suburb from |
| `docs/release/go-live-checklist.md` | What is still required for a functional app |
| `NEEDS-FOUNDER.md` | Open questions only the founder can close |

## 3 · Marketing method — the Hormozi corpus

Seven `$100M Playbook` PDFs — **Hooks · Pricing · Price Raise · Lead Nurture · Marketing Machine ·
Retention** — and the book **`$100M Money Models`**, extracted into
[`docs/marketing/hormozi-playbooks.md`](./marketing/hormozi-playbooks.md), with per-agent ownership
in `agent-orchestration.md` §6.

⚠️ Kept separate from `hormozi-corpus-findings.md`, which is the Eden *transcript* corpus. Different
sources at different confidence; merging them would let a line from a podcast inherit the authority
of a published play.

---

# ⛔ Precedence — which source wins

**This rule is not new and I did not invent it.** It is already written, at
`design/references/REFERENCE-MAP.md` rule 6:

> *"Any conflict between a reference and security, accessibility, legal, payment, or role controls
> is resolved in favour of the control."*

Stated as an order:

```
1. South African law            CPA · POPIA · LRA · ECTA
2. Security, payment and role controls
3. Locked commercial facts      only movable by a decision-log entry
4. What the code actually does  the deployed server is the authority on money
5. The design handoff           composition, tokens, components, copy
6. The Hormozi playbooks        method, never authorisation
```

## What that meant in practice, this week

Eight statements in the handoff were dropped because a higher tier contradicted them:

| Design said | Beaten by |
|---|---|
| "XootCover included" | `Xoot Legal.dc.html` — *"not as cover in force, because it is not placed yet"* — and `locked-commercial-facts.md` |
| 15% / 10% / 5% cadence discounts | `create-booking` applies a flat 10% and ignores cadence |
| "The same person week after week" | `STANDARD_OUTCOMES` hedges it, and gate 5 is open |
| "Free rescheduling" | No such rule exists anywhere in the codebase |
| "You pay once, now" | PayFast is not connected |
| "They get a card, not a code" | No delivery path |
| "Unused credit comes back to you" | No refund path |
| "It never expires" | **CPA s63**, undecided |

**Tier 5 losing to tiers 1–4 is the system working**, not the design being wrong. A handoff is
written before the constraints are known.

---

# ⚠️ What this register surfaced

## 0. 🔴 `ILLUSTRATION.md` forbids creating fake people — and the hero is one

> *"Do not create fake logos, certification marks, partner marks, maps, reviews, **people**, or
> product screenshots."*

**`src/assets/hero-xoot.jpg` is an AI-generated photorealistic person.** So is the handoff's
`xooter-female-polo.webp`.

This escalates the hero question. On 2026-09-04 it read as *"an unmarked AI image needs a marker"*,
and the marker was added. Read against this clause it is different: **the repository's own rules say
the image should not have been created.** `BRAND.md` says the same thing from the other side —
*"Local and human, never fabricated"* — and its trust rules require *"photographs that show the
service and environment clearly."*

⛔ The marker stays as harm-reduction, but it is not compliance. **This is a founder decision and
`NEEDS-FOUNDER.md` carries it.**

## 1. `PHOTOGRAPHY.md` requires an image provenance record that does not exist

> *"Every image records source, licence, release/consent, owner, permitted channels, expiration
> where applicable, crop variants, focal point, and alternative text."*

**`src/assets/hero-xoot.jpg` records none of these.** Marking it `AI-generated illustration` on
2026-09-04 was necessary and not sufficient.

The same clause is why the handoff's `xooter-female-polo.webp` cannot simply be swapped in: no
licence record, no permitted-channels record — and a **"HIGGSFIELD AI" watermark** burned into the
frame. The file also says to avoid *"generic stock poses, staged luxury that misrepresents the
product"*.

## 2. By the repo's own Gate 1, nothing is approved

`QUALITY-GATES.md` defines six gates and **Gate 1 is design approval**. `approved-frames.json` is:

```json
{ "version": 1, "updatedAt": null, "frames": [] }
```

**Empty.** Every surface built this week — mine included — is unapproved under the repository's own
contract.

⛔ **A session must not populate this file.** Design approval is the founder's signature. Recorded in
`NEEDS-FOUNDER.md` instead.

## 3. `REFERENCE-MAP.md` still says "Zoot"

Rule 3 reads *"**Zoot** remains recognisably one product."* A pre-rename survivor, in the file that
defines how every other reference is read.

---

## ⛔ Sources that are NOT authoritative

| Not a source of truth | Why |
|---|---|
| **`Xoot Bug Bounty.dc.html`'s `HALL_OF_FAME`** | It names **six researchers with findings, months and severities. They are fabricated.** Publishing invented researcher credits is the class of defect the `Reviews` section is excluded for, and worse because it names people |
| `dist/` | A build artefact compiled against **production** Supabase |
| Any status document's claim about another system | `founder-todo.md` says the site both is and is not live (§65 vs §109). **Verify against the system, not the document** |
| A green CI check | This repo has shipped a green check that reviewed nothing, and a fixture that could not fail |
