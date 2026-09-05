# Prompt — Port the 2026-09-03 design into the Xoot frontend

Copy everything between the rules into a session, fill the **TASK** block at the bottom, and the
session starts correctly with no re-derivation. It is written to be handed over cold: it names the
files, states the decisions that are already taken, and describes the mistakes this repo has
actually made so they are not made again.

Companion to `docs/implementation/design-port-plan.md`, which is the *plan*. This is the *briefing*.

> ⚠️ **The one thing to re-check every time.** The port plan goes stale — it has already been
> caught listing ZD-036 as "decided, not implemented" when `_shared/referrals.ts` existed and
> `create-booking` imported it. **Verify every "not implemented" against `git log` before
> repeating it.** Trusting a status line in prose is how a session rebuilds something that shipped.

---

## THE PROMPT

Port the founder's Claude Design handoff into the Xoot frontend so the design ships and every
number on screen is one the server will actually charge. `design/handoff-2026-09-03/` is the
design. This repository is the authority on fact.

### What source of truth means here

**The design wins on form. The repo wins on fact, money and claims.**

The design is authority for layout, hierarchy, component anatomy, spacing, type scale, radius,
elevation, motion timing and easing, iconography, empty and loading states, and responsive
behaviour. Where the design and the shipped code disagree about any of those, the design is right.

The repo is authority for every price, fee, discount, credit, membership rule, safety claim,
capability claim and legal statement. Where the design and the repo disagree about any of those,
**the repo is right and the design is a drawing of a product that does not exist yet.**

### Read these before writing code, in this order

1. **`CLAUDE.md`** — the two roles, the five rules, the facts both roles must know.
2. **`docs/implementation/agent-worklog.md`** — who holds what. Two Claude sessions work on this
   repo and cannot message each other; this file is the only channel. **Claim before you code,
   and push the claim.** An unpushed claim is invisible and therefore useless. Release the claim
   when you stop, whether you finished or not — a stale `HOLDING` is worse than no claim.
3. **`docs/implementation/design-port-plan.md`** — the governing plan and the phase order.
4. **`docs/implementation/decision-log.md`** — ZD-030 / 032 / 033 / 034 are the design decisions;
   ZD-020, ZD-026, ZD-035, ZD-036, ZD-037 are the money ones.
5. **`docs/product/locked-commercial-facts.md`** — changes only through a decision-log entry.
   Never change a price in code and leave this document saying something else.
6. **`design/handoff-2026-09-03/`** — the design itself:
   - `xoot/tokens/*.css` are the token **source**.
   - `xoot/styles.css` is the flattened delivery bundle and is **not** the source. After the token
     sections it re-declares four motion tokens in seconds (`dur-fast` 170ms → .18s and friends);
     reading it imports an app-specific override into the shared token layer and
     `kit-tokens.test.ts` fails on `.18s` not matching `/^\d+ms$/`.
   - `xoot/ds-bundle.js` is **reference only — never port it.** The repo has its own kit at
     `src/components/kit/**`.
   - `xoot/site/*.jsx` are the website sections; `xoot/app/*.jsx` are the 17 app screens.

### The architectural rule that governs every line

**There are two colour systems and the split is deliberate and test-enforced.**

- `--xoot-*` — the raw kit palette, generated into `src/styles/kit-tokens.css` and
  `src/lib/kit-tokens.ts`. Use it for **shape, spacing, elevation, motion, and the decorative
  tint washes** (`--xoot-sage-wash` and friends — surfaces behind icons, not behind text).
- The audited `:root` HSL triplets → `@theme inline` → Tailwind utilities. Use it for **every
  colour that sits behind or under text.**

The audited palette darkened four kit colours because the kit's raw values fail WCAG AA at body
sizes — `violet-500` measures 4.38:1 on white, `violet-600` measures 6.10:1. So:

> **"Adopt the design system" must NOT mean repointing `@theme inline` at `--xoot-*`.** That reads
> like progress in a diff and silently drops the whole app below AA.

`theme-consumes-audited-palette.test.ts` guards the Tailwind layer. **It cannot see a component
that reaches for `var(--xoot-…)` directly.** That gap is yours to respect manually.

### The rules you must not break

- **Large surfaces are ink, not violet** (ZD-034). The founder chose
  `hsl(20 8% 16%) → hsl(20 10% 9%)` for the 29 large surfaces from three screenshotted builds.
  Violet keeps emphasis, selection, focus rings and progress. Repainting a big panel violet to
  match the handoff **reverts a founder decision**, and `palette-derives-from-kit.test.ts` pins
  both halves (gradient saturation ≤ 15 and lightness ≤ 25; `--brand` saturation > 40).
- **The frontend is never authoritative for** price · payment success · refund approval · Care+
  state · XootCred · booking state · referral qualification · contractor verification · insurance
  activation · payout eligibility. If a screen needs one of these, it reads it from the server.
- **No typed rand figure** under `src/components/xoot`, `src/pages/care`, `src/pages/legal`,
  `Index.tsx`, `Welcome.tsx`, `Onboarding.tsx`, `Blog.tsx`, `BlogPost.tsx`. Render from a
  constant — `src/lib/xoot-pricing.ts`, `src/lib/care-plus.ts`, `src/lib/referral-display.ts`.
  `marketing-claims.test.ts` enforces it and **its allowlist is empty on purpose.**
- **Never quote a size price without its hours.** R250 is R250 *for 4 hours*. Quoting the number
  alone is quoting half a fact, and the ladder is per-hour, not per-size.
- **Prefer "from R250"** in anything with a long life. These prices are deliberately low and are
  intended to rise.
- **Forbidden copy.** "XootCover" · "insured" · "R5 000 cover" · bare "vetted" (use
  **"Admin-reviewed vetting"**) · "affordable" / "cheap" / "budget" / "bargain" anywhere near a
  service word · any SLA, response time or support-hours promise · any testimonial, review, rating
  or count (zero bookings have completed — CPA s41) · "you set the pay" / "100% of" / "never
  deducts" · any email capture without a table, RLS and a stated POPIA purpose.
  Cover is **`Booking Cover by Genric`**, R22, **optional**, and Xoot is not the insurer.
  The referral renders as a **named line** — *"Thandi's invite"* — never "Discount".
- **Generated files are never hand-edited:** `src/styles/kit-tokens.css`, `src/lib/kit-tokens.ts`,
  `mobile/src/generated/**`. Edit `design/handoff-2026-09-03/xoot/tokens/*.css`, then
  `npm run kit:tokens`. `kit-tokens.test.ts` shells out to the extractor with `--check`.
- **Do not reformat `src/index.css`.** Several tests parse it by exact string offset — `"  :root {"`,
  `"  .dark {"`, `--xoot-ease-spring:`. Changing the indentation throws rather than failing
  informatively.
- **A new component in `src/components/kit/`** must name at least one declared `var(--xoot-*)`,
  stay inside the nine-entry raw-palette allowlist, and use `--xoot-dur-*` rather than a literal
  `ms` in any transition. `kit-primitives.test.tsx` enforces all three.
- **Deploy ordering is real and was derived from failures.** Migrations before functions
  (§3a); web app before the two booking writers (§3b). A deployed Edge Function bundles its own
  frozen copy of `_shared` — changing a shared module reaches **nothing** until every importer
  redeploys; 28 of 43 were once behind for this reason alone. **Production deploys are a human
  act.** `deploy-edge-functions.yml` is `workflow_dispatch` and requires typing the project ref.
  Prepare the list; never trigger it unasked.
- **Plant every new guard against its own defect and watch it fail before keeping it.** Several
  tests here were written asserting rules nobody had implemented and passed for weeks meaning
  nothing.

### Things the design shows that the server cannot do

Check these before building the screen that depends on one. Each is measured, not assumed:

| The design shows | The server says |
|---|---|
| Care+ "14-day trial" / "first month free" | **No trial exists** — `grep -i trial` across every edge function and all 82 migrations returns nothing. The only route to `active` is a `paid` payment record |
| "Save up to 15%" on weekly cadence | `_shared/care-plus-membership.ts` returns a flat `0.1` to every active member, cadence-blind |
| Laundry as a bookable service | Empty client ladder, no server `laundry` ServiceId. Cannot be priced or booked |
| XootCover included, no separate charge | The server bills `BOOKING_COVER_CENTS` = R22 as an optional line |
| "Use XootCred" at checkout | The server accepts `xootcredRedemption`; `Book.tsx` never sends it |
| Tipping | `TIP_READINESS = "schema_pending"`; `TipCard` renders `null` |
| A 13:00 slot | The allow-list is `07:00–12:30`, then `14:00`–`17:00`. There is no 13:00 |
| Gifting end to end | A gift can be bought; nothing ever marks it `sent` or `redeemed`, and nothing grants `gift_credit` |
| Crew pricing (ZD-035) | Arithmetic mirrored in both pricing files, wired into neither. Two absence guards assert it is not live |

**A screen may not quote a number the server will not charge.** This repo has shipped a screen
showing one price and charging another **three times**. Over-stating is survivable; under-stating
is a Consumer Protection Act problem, because the displayed price is the price.

### Design approval

`design/approved-frames.json` is `{"frames": []}`, so `QUALITY-GATES.md` Gate 1 is structurally
unsatisfiable — it assumes a Figma project this repository does not have. **ZD-030 overrode it
explicitly: the founder's instruction is the approval.** Cite ZD-030; do not claim Gate 1.

### Responsive

The design does this with `minmax(min(100%, Npx), 1fr)` auto-fit grids and `clamp()` gutters,
padding and type — reflow first, media queries only for what reflow cannot express (collapsing the
nav, dropping a decoration that needs a second column, reacting to *short* viewports rather than
narrow ones). Reproduce that approach rather than adding breakpoint soup. Check the four sizes in
`design/handoff-2026-09-03/Xoot Responsive Check.dc.html`: **390×844, 844×390, 834×1112, 1280×800.**

### The mobile app is a rewrite, not a port

`mobile/` is Expo / React Native. There are no CSS variables, so every `var(--xoot-*)` becomes a
lookup in `mobile/src/generated/design-tokens.ts`, and `native-design-system.test.ts` fails on any
hex or `rgb()` literal in `mobile/src`. A web palette change is not finished until
`npm run shared:sync` has run and the mobile file is committed.

### Verify before claiming anything works

```bash
npx vitest run && npm run typecheck && npm run lint && npx vite build && npm run security:scan
```

`npm run typecheck` is not redundant with the build — Vite does not typecheck, and a Tailwind v4
codemod once rewrote three `variant="outline"` props to `"outline-solid"` past both lint and build.

`pricing-parity.test.ts` must be **green**. Red means the client and the server disagree about
money: stop, do not allowlist.

**Report what the run said, including failures.** Do not write "works", "fixed", "verified" or
"done" without the output that shows it. If a check fails, say so with the output. If something is
deployed and stale, read the deployed copy rather than assuming the repo reflects it — but check
the cheap way first (`docs/release/go-live.md` §3-0: compare a function's `version` and
`updated_at` against `git log`).

### What this work cannot make true

Porting the design changes nothing a visitor sees, on its own. `xoot.co.za` serves a GoDaddy
Website Builder page; both hosts hold correct production builds and neither receives traffic.
**Gate 2 is DNS and it is founder-only.** Do not describe this work as "the new site is live."

---

## TASK

- **Phase / sections:**
- **Copy policy:** port verbatim and flag · repo wording wins · ask me per claim
- **May I touch the server (migrations, `_shared/**`, `create-booking`)?** yes / no
- **Anything decided since this file was written:**
