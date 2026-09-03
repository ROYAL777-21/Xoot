# Porting the 2026-09-03 design into the app — the plan, and the decisions it needs

The founder asked for the Claude Design handoff to be *"coherent and coded to the frontend and
backend"* and deployed. This is the step-by-step. It is written so the work can be picked up by
either session, or by the founder directing someone else.

**Source:** `design/handoff-2026-09-03/` — committed, 78 files, reference only.
**Live gate state:** `docs/release/go-live-requirements.md`.

---

## ⚠️ Read this before estimating anything

**Porting this design changes nothing a visitor sees, on its own.** `xoot.co.za` serves a GoDaddy
Website Builder page. Netlify and Vercel both hold correct builds of `main` and neither receives a
request. **Gate 2 is DNS**, it is founder-only, and it gates the entire value of this work.

The port is still worth starting — but it should not be sold to anyone, internally or externally,
as "the new site is live."

---

## What the design gets right, and why a port beats a reinterpretation

Checked value by value on 2026-09-03. The design's `engine-bundle.js` and
`src/lib/xoot-pricing.ts` **agree exactly**: all 14 regular rungs, all four other ladders, the R39
booking fee, the R30 add-on, the R22 cover, the R47/h long-job floor from 5.5h, and the
hours-by-size defaults. It independently reaches the repo's own conclusion that the higher headline
figure is a stale display value resolving to the ladder price plus the add-on.

It also carries the repo's doctrine in its comments — ZD-026, the CPA "displayed price is the
price" rule, and the minimum-wage reasoning behind the floor. Whoever built it had this repo as
context and respected the money layer.

**So the port is mostly mechanical. The exceptions are below, and they are the whole job.**

---

# ✅ Two decisions taken, one still open

**The founder decided both money questions on 2026-09-03.** Recorded as **ZD-035** (crew) and
**ZD-036** (referral) in `decision-log.md`, and written into `locked-commercial-facts.md` under
*Crew Bookings* and *Referrals*. ⛔ Both are **decided and not implemented** — the live server still
prices the old way.

## ZD-035 — a crew finishes one job faster

Adopted: `base × crewOverhead[n−1]`, `[1, 1.15, 1.25, 1.4]`; elapsed time `soloHours × overhead / n`;
max 4; caps by size `{small:2, medium:3, large:4}` and by service
`{airbnb:3, office:4, moving:4, express:3, laundry:1}`.

A 5.5h Airbnb at R342 base with 2 Xooters: **R684 live → R393**. Both are R62 per labour-hour.

### 🛑 It is a schema change, and this was not obvious from the pricing files

`create-booking/index.ts` builds `bookingTargets = selectedXooterIds.length ? selectedXooterIds :
[null]` and **inserts one `bookings` row per Xooter**, each priced as a whole job with its own
commission rate. **The data model is the old commercial model.** Swapping the multiplier alone would
produce N rows each at 1.15× — 2.3× the intended price, in the under-stating direction relative to
what the customer was shown.

So ZD-035 needs one of:

- **(a) A crew relation** — one `bookings` row for the job, a `booking_assignees` table carrying
  Xooter id and commission rate per member. Cleanest model, largest migration.
- **(b) One row, N assignees by split** — keep a row per Xooter but make exactly one the priced row
  and the rest zero-value participants. Smaller migration, and every earnings query has to know the
  difference, which is where this kind of thing rots.

**Recommend (a).** The repo already learned that a duplicated money rule drifts; a duplicated
*booking* row carrying implicit pricing semantics is the same failure one level up.

**In scope wherever `bookings` is read as one-Xooter-per-row:** the Xooter job list, tracking,
earnings, ratings, the replacement flow, and `xooterPayout`, which currently runs per row.

## ZD-036 — the referral is server-side or it does not exist

R100 two-sided, named line on the quote, funded from commission.

⚠️ **This is not merely good practice — it is an existing locked fact.**
`locked-commercial-facts.md` § *Financial And Trust Authority* already lists **"referral
qualification"** among the things the frontend is never authoritative for. The design implements
every check in `referral.js`, in the browser. Shipping that would breach a fact locked before the
design existed.

## Still open — Decision 3, service-fit re-pricing

`serviceFit()` re-prices a booking upward when the property type does not match the service chosen —
a move-out booked as a Regular clean is charged as a move-out. The reasoning is sound and is in the
design's own comment: *a move-out booked as a Regular clean is 8 hours of work priced as 4; the
Xooter absorbs the difference or abandons the job.* It fails in the over-stating direction on
purpose.

⚠️ **Re-pricing a customer's explicit choice upward at the last step is CPA-sensitive even when the
arithmetic is right.** It must be visible and explained *before* the total changes. The design
returns a `mismatch` object for exactly this and the UI must use it. Needs a founder decision and a
server counterpart.

---

# The port, in order

Each phase is shippable on its own and leaves the app working.

## Phase 0 — the two-line unblock *(founder, ~35 min, blocks everything)*

1. **GoDaddy → unpublish the Website Builder site on `xoot.co.za`, then point DNS at the host.**
   Click-paths: `docs/release/domain-setup.md`.
2. **`SUPABASE_DB_PASSWORD_PRODUCTION`** in Actions secrets. ⚠️ Do not overwrite the shared
   `SUPABASE_DB_PASSWORD` — that one is staging's and staging works with it.

**Done when:** `verify-live-deploy` reports ✅ instead of failing on a foreign `generator` meta.

## Phase 1 — tokens *(no money, no behaviour, fully reversible)*

`design/handoff-2026-09-03/xoot/tokens/*.css` → `src/index.css` and `src/lib/design-tokens.ts`.
Ten files: base, colors, dark, elevation, fonts, motion, radii, semantic, spacing, typography.

⚠️ **This is Correctness & Safety's owned path** (`CLAUDE.md`: *"the design-kit port —
`src/index.css`, `src/lib/design-tokens.ts`, `src/components/kit/**`"*). Coordinate in the worklog
before starting; do not land it as a surprise.

Fonts: the design ships 7 variable TTFs (~1.9 MB). The repo already ships **subset WOFF2**. Subset
the new faces the same way rather than shipping TTFs — `scripts/` has the existing extraction.

**Done when:** `vite build` succeeds and the existing screens render unchanged except in colour,
type and spacing.

## Phase 2 — the sections that touch no price

Straight ports, `design/handoff-2026-09-03/xoot/site/*.jsx` → `src/components/xoot/**`:

`TrustedBy` · `ServiceAreaMap` · `HowItWorks` · `PeopleBand` · `NearbyXooters` · `Merch` ·
`Journal` · `FeedbackSection` · `HomeExpansion` · `SiteFooter` · `GapArrow` · `TextFlip` ·
`BugBounty` (its own route, footer-linked only — the design correctly moved it off the main page).

### Progress

- ✅ **`GapArrow`** — the section connectors, at the handoff's three positions. `486295f`
- ✅ **`PeopleBand`** — "Who turns up". **Two of four cards rewritten**; see below. `5ffbe9b`
- ✅ **`Journal`** — the teaser, linking `/blog/:slug` rather than the handoff's hash modal,
  because this repo has real routes and 31 real posts. **Two claims rewritten.** `f211d27`
- ✅ **`Merch`** — the coming-soon showcase. **Shipped without the handoff's email capture**, whose
  only destination was React state. `a3d6de2`
- ✅ **`TrustMechanisms`** — six mechanisms with their own stated limits. **SOS status is derived
  from `canArmSos()`** rather than hardcoded, so the copy cannot drift from the gate. `a3d6de2`
- ✅ **`AccessWindowTimeline`** — the interactive demo that opens the trust section. Five discrete
  stages, a revoke switch, and the panel labelled an illustration
- ✅ **`HeroWordFlip`** — the rotating half of the hero headline, with the measure-and-fit that
  keeps it on one line. ⛔ **"Affordable pricing" dropped** — it contradicts the locked premium
  position and is a price claim while the pricing conflict is open

### Still to port

| | |
|---|---|
| Restyles | `TrustedBy`, `HowItWorks`, `ServiceAreaMap`, `HomeExpansion`, `FeedbackSection` — copy already matches, so these are token-layer restyles, not rewrites |
| ⛔ `Reviews` | Stays out. Zero completed bookings; placeholder reviews are a fabricated testimonial |

**Running total: 1114 tests, up from 1102 when the port started.** Every new guard was planted
against its own defect and watched fail before being kept.

### ⚠️ The pattern that has held for three sections running

**Every section ported so far has contained at least one claim that does not survive a check.**
Not carelessness in the handoff — it was written to read well, and it does. But it promises an
on-time turnover, a real person answering, authorship by "people who do this work", and questions
"customers actually ask". With **zero completed bookings** and no SLA, support hours or response
time anywhere in `locked-commercial-facts.md`, none of those are available.

**Budget claim-checking time for every remaining section, and grep before rewriting.** The pattern
is strong enough that a section arriving with no claim problem should itself be suspicious.
- **Existing sections are a restyle, not a rewrite.** The repo's `TrustedBy` is already
  word-for-word identical to the handoff's; only the visual treatment differs. The same is likely
  true of `HowItWorks`, `ServiceAreaMap`, `HomeExpansion` and `FeedbackSection` — check before
  rewriting any of them.

### ⚠️ `PeopleBand` — port the layout, change one line

It uses `XootCharacter`, an illustration, so there is **no POPIA question** — it does not use the
`xooter-female-polo` photo.

But its sub-line reads *"Every Xooter is vetted before their first visit and rated after every
one."* The bare word **"vetted"** is the one `SafetyTrust` deliberately qualified on 2026-09-02,
because naming or implying a third-party screening bureau asserts a commercial relationship nothing
in this repo evidences. The approved wording is **"Admin-reviewed vetting"** — *"No Xooter is
activated until an admin has reviewed their ID, selfie, proof of address, banking details and
references."*

**Use the repo's phrasing.** The claim underneath is compatible — activation does precede a first
visit — so this is a wording change, not a lost section.

⚠️ `Reviews` and `SafetyTrust` are **not** in this list. `Reviews` renders customer reviews and
**zero bookings have completed** — shipping it with placeholder content is a CPA s41 fabricated
testimonial. `SafetyTrust`'s claims were reworded on 2026-09-02 after they overstated screening;
port the design's *layout*, keep the repo's *words*.

## Phase 3 — the money surfaces *(ZD-035, ZD-036, and service-fit still open)*

`BookingHero` · `BookingModal` · `Services` · `CarePlusBand` · `GiftClean` · `GiftCheckout` ·
`ReferSection` · `ReferralWelcome`.

**Order is not negotiable, and it is the repo's own §3a/§3b rule:**

1. Migration first — the crew relation (ZD-035), the `referrals` table (ZD-036).
2. `_shared/pricing.ts` and `create-booking` — the crew model, and the referral checks
   that `locked-commercial-facts.md` already says the frontend may never own.
3. `src/lib/xoot-pricing.ts` — mirror it.
4. `pricing-parity.test.ts` — extend to pin the new rules. **Plant the bug, watch it fail, restore.**
5. Redeploy **every** function importing `_shared/pricing.ts`. A deployed function carries its own
   frozen copy — changing the shared module reaches nothing until each importer redeploys. 28 of 43
   were once behind for this reason alone.
6. Web app **before** the two booking writers (§3b).

## Phase 4 — the mobile app *(deferred by founder decision, 2026-09-03)*

17 screens in `design/handoff-2026-09-03/xoot/app/`. `mobile/` is Expo — React Native, not React
DOM — so this is a **rewrite, not a port**. Deferred until the site is live, and it cannot reach
users before gate 3 (PayFast) anyway.

⚠️ Capture the screens as a spec before the design context goes cold. The `.dc.html` and the JSX are
committed, so nothing is lost, but the *reasoning* in the comments is the valuable part.

---

## Verification, at every phase

```bash
npx vitest run          # 101 files, 1102 tests
npm run security:scan   # 4/4
npx vite build          # what Netlify runs
```

And the ones specific to this work:

- **`pricing-parity.test.ts` must stay green.** If it goes red, the client and server disagree about
  money — stop, do not allowlist.
- **Every new guard gets planted first.** A test that has not been watched failing is a comment with
  a green tick.
- **Read the deployed function body** to confirm a pricing change is live, not the repo file. The
  deployed server is the authority on money, and it can be wrong.
