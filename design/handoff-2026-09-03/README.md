# Claude Design handoff — 3 September 2026

The founder's redesign of the Xoot website and mobile app, exported from Claude Design
(`claude.ai/design`) and committed here so it is version-controlled rather than living in a zip.

**This directory is a reference, not a build target.** Nothing in it is imported by the app, run by
a test, or read by a workflow. `vite build` does not see it. The port target is
`docs/implementation/design-port-plan.md`.

---

## What it is

| Path | What |
|---|---|
| `Xoot Website.dc.html` | **The primary artboard** — the page composition, and the one the founder had open at handoff |
| `Xoot App.dc.html` | The mobile app, 17 screens |
| `Xoot Components.dc.html`, `Xoot Foundations.dc.html` | The kit and the token specimens |
| `Xoot Legal.dc.html`, `Xoot Bug Bounty.dc.html`, `Xoot Responsive Check.dc.html` | Supporting pages |
| `xoot/tokens/*.css` | **10 token files** — colour, type, spacing, radii, elevation, motion, dark |
| `xoot/site/*.jsx` | 15 site components, ~5,400 lines |
| `xoot/app/*.jsx` | 17 app screens, ~6,300 lines |
| `xoot/quote.js`, `engine-bundle.js` | **The pricing service and its data.** Read these first — see below |
| `xoot/session.js`, `referral.js`, `nudges.js`, `concierge.js` | Runtime services |
| `xoot/ds-bundle.js` | The Claude Design system runtime. **Reference only — do not port it.** The repo has its own kit at `src/components/kit/**` |

### Deliberately not committed

- **`xooter-female-polo.png` (5.97 MB)** — the 159 KB `.webp` beside it is the same image.
- **`uploads/`** — the design session's copy of this repo's own `CLAUDE.md`, `NEEDS-FOUNDER.md`,
  `package.json`, `netlify.toml` and so on. ⚠️ Committing stale duplicates of load-bearing repo
  files is how a future session reads the wrong one.
- **`Campus IT Help.dc.html` and the Eduvos assets** — a different project that shared the canvas.

---

## ✅ The pricing matches this repo exactly, and that is the headline

Checked value by value against `src/lib/xoot-pricing.ts` on 2026-09-03:

| | Design (`engine-bundle.js`) | Repo (`xoot-pricing.ts`) |
|---|---|---|
| Regular ladder, all 14 rungs | `3.5:236 … 10:470` | **identical** |
| Office / Moving / Airbnb / Express ladders | | **identical** |
| Booking fee · add-on · cover | `39 · 30 · 22` | **identical** |
| Long-job floor | `47`/h from `5.5`h | **identical** |
| Hours by size | `{small:4, medium:5.5, large:8}` | **identical** |

It independently reaches the same conclusion the repo did — that **R280 is a stale display value**
which resolves to R250 plus the R30 add-on. Whoever built this had the repo as context and respected
the money layer. That is unusual and it is why a port is worth doing rather than a reinterpretation.

## ⛔ Three of its money features have no server side

Every one of these renders a number to a customer that `create-booking` cannot currently produce.

| Feature | Where | Direction of failure |
|---|---|---|
| **R100 two-sided referral** | `referral.js`, quote line in `quote.js` | 🔴 **Under-stating.** Site shows −R100; the server charges R100 more than displayed. This is the CPA s41 side of the line |
| **Crew pricing** | `crewOverhead: [1, 1.15, 1.25, 1.4]` | 🟠 Over-stating. Site quotes ~1.15× for two Xooters; server charges solo |
| **Service-fit re-pricing** | `serviceFit()`, `propertyTypes[].requires` | 🟠 Over-stating. A move-out booked as a regular clean is re-priced up client-side only |

**None of these ships until `supabase/functions/_shared/pricing.ts` can produce the same number**,
and `src/lib/pricing-parity.test.ts` pins them. That test exists because this repo has shipped a
screen showing one price and charging another **three times**.

## ⚠️ Do not trust `GO-LIVE.md` in this directory

It is dated 31 August and it is the design session's compilation of the repo's ledgers as they stood
then. Two of its claims were disproven on 2 September:

- *"Do not touch GoDaddy — DNS and TLS are already correct."* **False.** `xoot.co.za` is served by
  the GoDaddy Website Builder, and that is the entire reason nothing anyone deploys is visible. It
  is gate 2 and it is the first blocker.
- *"CI cannot allocate a runner."* Resolved — runners allocate again.

It is kept unedited because it is the handoff as received. **The live state is
`docs/release/go-live-requirements.md`.**
