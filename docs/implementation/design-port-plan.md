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

# 🛑 Three decisions only the founder can make

Work on the money layer should not start until these are settled. Each changes what a customer is
charged, so each needs a `decision-log.md` entry and a `locked-commercial-facts.md` update.

## Decision 1 — the crew model. **This is the big one.**

The repo and the design both price multiple Xooters, coherently, and **they model different
products.**

| | Repo (live, server-mirrored, parity-pinned) | Design |
|---|---|---|
| What "2 Xooters" means | Two people each working the full duration — **more labour** | Two people splitting one job — **same labour, done faster** |
| Price | `base × count`, less 10% at ≥3 | `base × crewOverhead[n-1]` — `[1, 1.15, 1.25, 1.4]` |
| Elapsed time | Unchanged | `soloHours × overhead / n` |
| Max | 5 | 4 |
| Allowed on | `airbnb`, `office`, `moving` | those **plus `express`, `lux`, and regular via size caps** `{small:2, medium:3, large:4}` |

**A 5.5-hour Airbnb turnover at R342 base, with 2 Xooters:**

| | Charged |
|---|---|
| Repo today | **R684** |
| Design | **R393** |

**74% apart.** Both are internally consistent — each is R62 per labour-hour, which is the same
number. They differ only in how much labour "2 Xooters" buys.

⚠️ **Neither is a bug.** Do not "fix" one to match the other. The design's version is the better
customer proposition — *finish my turnover before check-in* is a real reason to want two people,
and it is what an Airbnb host actually wants. The repo's version bills more per crew booking.

**This also decides Xooter earnings.** Commission is a percentage of booking value, so halving the
crew price halves what two Xooters split for the same job. Under the design's model each Xooter
takes ~57% of a solo job's value for roughly half the elapsed time — consistent per hour, lower per
job.

⛔ **Blocked until the founder picks.** Then: `decision-log.md` entry →
`locked-commercial-facts.md` → `src/lib/xoot-pricing.ts` → `_shared/pricing.ts` →
`pricing-parity.test.ts` → redeploy every importing function.

## Decision 2 — the R100 two-sided referral

`design/handoff-2026-09-03/xoot/referral.js`. R100 to the referrer in credit, R100 off the
referee's first booking, rendered as a **line on the quote**.

🔴 **This is the one that fails in the illegal direction.** The site would show −R100 and
`create-booking` would charge R100 more than displayed. Under the CPA the displayed price is the
price, and under-stating is the side that is not survivable.

The design's own client-side guards are good — it refuses self-referrals and existing customers,
and burns the code on redemption — but **all of that is in the browser**, which means it is a
suggestion.

**Needs, before any of it ships:**
1. A `referrals` table: code, owner, issued-to, state, burned-at, booking id. RLS so a user reads
   only their own.
2. Server validation inside the booking write, in one place: the code exists, is not the buyer's
   own, is unburned, and the buyer has no completed booking.
3. The credit applied **server-side**, so the discount on the quote is one the server produced.
4. `DISCOUNT_FUNDING` — this comes off commission, never Xooter pay. The repo already has that
   constant and the rule.

⚠️ **Also a commercial question, not only an engineering one.** R100 against a ~R335 first clean is
roughly a third off, funded by Xoot. `referral.js` says so itself and argues it pays back on
first-visit-to-second-visit conversion — a conversion rate **Xoot cannot measure yet**, because zero
bookings have completed.

## Decision 3 — service-fit re-pricing

`serviceFit()` re-prices a booking when the property type does not match the service chosen — a
move-out booked as a Regular clean is charged as a move-out.

The reasoning is sound and is in the design's own comment: *a move-out booked as a Regular clean is
8 hours of work priced as 4; the Xooter absorbs the difference or abandons the job.* It fails in the
over-stating direction on purpose.

⚠️ **But re-pricing a customer's explicit choice upward, at the last step, is a CPA-sensitive
interaction** even when the arithmetic is right. It must be visible and explained before the total
changes, not after. The design returns a `mismatch` object for exactly this — the UI must use it.

⛔ Needs a server counterpart, or the client and server disagree by design.

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

⚠️ `Reviews` and `SafetyTrust` are **not** in this list. `Reviews` renders customer reviews and
**zero bookings have completed** — shipping it with placeholder content is a CPA s41 fabricated
testimonial. `SafetyTrust`'s claims were reworded on 2026-09-02 after they overstated screening;
port the design's *layout*, keep the repo's *words*.

## Phase 3 — the money surfaces *(gated on Decisions 1–3)*

`BookingHero` · `BookingModal` · `Services` · `CarePlusBand` · `GiftClean` · `GiftCheckout` ·
`ReferSection` · `ReferralWelcome`.

**Order is not negotiable, and it is the repo's own §3a/§3b rule:**

1. Migration first — `referrals` table, any pricing columns.
2. `_shared/pricing.ts` — crew model, serviceFit, referral validation.
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
