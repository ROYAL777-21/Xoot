# Port inventory — app-iteration → consolidated repo

Companion to `docs/repo-consolidation-plan.md` (Option A, approved 2026-07-29: local-helpers
is the base, app-iteration's design layer ports in, consolidate **before** Phase 1).

---

## ⚠️ The stacks diverge further than the consolidation plan assumed

The plan costed the port as "React 19 → 18 plus router rewrites." That was incomplete. The
actual gap:

| | local-helpers (base) | app-iteration (source) |
|---|---|---|
| React | 18.3 | 19.2 |
| Router | react-router-dom 6.30 | TanStack Router 1.170 |
| **Tailwind** | **3.4.17, `tailwind.config.ts`** | **4.2.1, CSS-first `@theme inline`** |
| **Token format** | **HSL triplets** (`--primary: 14 51% 53%`) | **OKLCH** (`oklch(0.895 0.036 62)`) |
| **framer-motion** | **absent** | 12.42.2 |
| lucide-react | 0.462 | 0.575 |
| tailwind-merge | 2.6 | 3.5 |

Tailwind 3 → 4 is not a version bump, it is a different architecture: v3 is
`tailwind.config.ts` + `@tailwind base/components/utilities`; v4 is CSS-first with
`@import "tailwindcss"` and `@theme inline`. Every ported component's classes assume one or
the other.

**This does not change the choice of base.** The reason for Option A was the backend
asymmetry — 52 migrations, Expo, native iOS, ops tooling, 146 docs — and none of that moved.
It changes the *method*, and it needs a decision. See "The Tailwind fork" below.

**A mitigating fact:** the palette is being replaced with red/white anyway. So app-iteration's
cream/gold OKLCH *values* do not need porting at all — only the token *architecture*. That
removes most of the apparent conflict, because the token layer is being rewritten either way.

---

## The Tailwind fork — decision needed

### Option 1 — keep local-helpers on Tailwind v3, express the new palette in HSL
Ported components get their classes adjusted to v3 conventions. The 221 existing src files are
untouched. No upgrade risk on a repo with live deploys.

*Cost:* class adjustments on ~20 ported components. Lose OKLCH (v3 can hold OKLCH values in
vars, but not the `@theme` ergonomics). OKLCH's real benefit is perceptually-even lightness
ramps — genuinely useful when generating tints of a single brand red, which is exactly what
this palette needs.

*Risk:* low.

### Option 2 — upgrade local-helpers to Tailwind v4 as part of consolidation — *recommended*
Run `npx @tailwindcss/upgrade`, then port components essentially as-is.

*Why:* the token layer is being rewritten for red/white regardless, so the upgrade lands at
the one moment its cost is lowest. It keeps the OKLCH system, which suits a
single-hue-plus-tints palette. It converges the two codebases instead of translating between
them forever. v4 is where Tailwind is going.

*Cost:* a codemod pass over 221 files plus manual fixes. Mechanical and reviewable, but not
free, and it touches every screen.

*Risk:* moderate, and entirely front-loaded — it either builds or it doesn't. Do it on its own
branch with a visual pass before merging.

### Option 3 — defer
Port only the framework-agnostic files now (below), leave components until after Phase 1's
design directions are chosen.

*Why it is tempting:* Phase 1 will rewrite most of these components' markup anyway.
*Why it is weak:* it leaves the repo split for longer, which is the thing being fixed.

---

## What ports cleanly today, regardless of the fork

Zero or near-zero Tailwind coupling. Safe to move now.

| File | Notes |
|---|---|
| `src/lib/service-visual.ts` | **Pure data.** Zero `className`. Needs lucide-react (both repos have it). 19 service accents — see caveat below. |
| `src/lib/glass.ts` | React hooks + CSS custom properties. No Tailwind. Ships the clear/frosted/solid presets. |
| `src/lib/prefs.ts` | Includes `haptic()`, which Phase 8 depends on. |
| `src/lib/format.ts` | Money/date formatting. |
| `src/lib/onboarding-state.ts` | Answer shape + completion. |
| `src/components/zoot/mascot/Zooey.tsx` | One SVG, pose-driven. Only **3** `className` uses. **Needs framer-motion added to local-helpers.** |

**Caveat on `service-visual.ts`:** its 19 accents are vibrant and unrelated to each other
(teal, magenta, indigo, orange…). Against a red-primary system they will read as noise. Port
the file for its structure and motion vocabulary; treat the colour values as pending a Phase 1
decision — re-map to the new palette, or keep deliberately as a second layer.

## What needs adaptation

| File | Blockers |
|---|---|
| `src/routes/onboarding.tsx` | TanStack Router → react-router-dom; Tailwind fork; being restructured in Phase 1 anyway |
| `src/components/zoot/onboarding/parts.tsx` | `StoryScene`, `ChatQuestion`, `ChoiceGrid`, `PermissionCard`, `Confetti` — framer-motion + Tailwind fork |
| `src/components/zoot/onboarding/Wallpaper.tsx` | Tailwind fork |
| `src/components/zoot/AnimatedIcon.tsx` | The named motion vocabulary Phase 8 builds on. framer-motion. |
| `src/components/zoot/ProgressStepper.tsx` | Tailwind fork |
| `src/components/zoot/BottomTabBar.tsx` | Becomes the glassy dock (§3.2) |
| `src/components/zoot/NotificationsPrimer.tsx` | **Permission priming already exists** — restyle to the Zocdoc pattern (§5.5), don't rebuild |
| `src/components/zoot/ReviewTipCard.tsx` | **Port with the two fixes in §6.1** — no pre-selected tip, rand not percentages |
| `StatusPill`, `StatusTimeline`, `LiveActivityPill`, `RouteProgress` | Tracking UI the widgets spec (Phase 5) refers to |
| `src/styles.css` | Port the token *architecture*, not the cream/gold values |

## What does NOT port

- `src/lib/pricing.ts` — superseded by §4's ladders (`ZD-020`). Do not carry the multiplier
  model across; it would become a fourth competing pricing implementation.
- The 11 app-iteration migrations — **gated on `ZD-005`** (schema source of truth unresolved).
  `tip_cents` and its RLS guard are wanted; they need re-issuing as a fresh migration against
  local-helpers' 52-migration chain, not a history transplant.
- `src/integrations/lovable/*`, `lovable-error-reporting.ts` — Lovable-specific.
- `.env` — see §9; do not carry it over. Add to `.gitignore` in the consolidated repo.

## Dependencies to add to local-helpers

`framer-motion` (absent, and required by most of the above). Bump `lucide-react` if the ported
components use icons newer than 0.462.

---

## Suggested order

1. Decide the Tailwind fork. **Everything visual waits on this.**
2. Add framer-motion.
3. Port the six clean files above.
4. If Option 2: run the v4 upgrade on its own branch, visual-pass it, merge.
5. Port components.
6. Re-issue `tip_cents` + RLS as a fresh migration once `ZD-005` closes.
7. Reconcile the duplicated `xoot-master-brief.md` to one copy.
8. Archive app-iteration read-only. Do not delete — 271 commits of design history.
