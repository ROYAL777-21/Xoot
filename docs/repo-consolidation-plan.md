# Repo consolidation — options and recommendation

**Status:** plan only. Nothing executed. Needs a decision before Phase 1 finishes, ideally
before it starts.

The founder wants **one repository holding all company information**. Today there are two,
and they are not two halves of one app — they are two different applications.

---

## What is actually in each

| | `zoot-your-local-helpers` | `zoot-app-iteration.` |
|---|---|---|
| package name | `zoot-home-care` | `tanstack_start_ts` |
| React | **18.3** | **19.2** |
| Router | react-router-dom 6.30 | **TanStack Router 1.170** (TanStack Start) |
| Commits | 96 | 271 |
| `src/` files | 221 | 150 |
| Docs | **146** | 4 |
| Supabase files | **106** (52 migrations) | 12 (11 migrations) |
| Mobile (Expo) | **64 files** | — |
| Native iOS | **17 files** | — |
| Ops/security scripts | **31** | — |
| CI workflows | 3 | 0 (until Phase 0) |

**They share almost nothing mechanically.** Different React majors, different routers,
different build setups, separate and non-overlapping migration histories. There is no
straightforward `git merge` here.

### What each one uniquely holds

**local-helpers** — effectively the whole business:
the 52-migration Supabase schema, edge functions, RLS, the Expo mobile app (ZD-001 names
Expo the approved native path), the native iOS work, 146 docs including `BOOKING_LOGIC.md`,
`CARE_PLUS_SPEC.md`, the concierge knowledge base, the security programme, secret scanners,
release checklists, and the readiness tooling.

**app-iteration** — the product design:
`Zoey.tsx`, the 4-chapter onboarding, `service-visual.ts`, the OKLCH token system and glass
tokens in `styles.css`, `AnimatedIcon`, the `rise-in` stagger, `ProgressStepper`,
`PermissionCard`, `Confetti`. Newer stack. Almost no docs or backend.

---

## Options

### A. local-helpers becomes the single repo; port the design in — **recommended**

Keep local-helpers as the base. Port app-iteration's design layer across: mascot, onboarding,
token system, animation utilities, service visuals.

**Why this one.** The asymmetry is decisive. local-helpers holds the schema, the migrations,
the mobile and native apps, the ops tooling and 146 documents — none of which are portable in
any cheap sense, and all of which are what "all company information in one repository"
actually means. app-iteration's value is concentrated in perhaps a dozen component files and
a stylesheet, which *are* portable. Move the small, valuable, portable thing toward the large
immovable thing, not the reverse.

It also happens to be the moment Phase 1 rewrites the design layer anyway — the palette is
changing to red/white, onboarding is being restructured, Zoey is being restyled. Porting
components you are about to rewrite is much cheaper than porting a backend you are not.

**Costs.** React 19 → 18 back-compat when porting components (mostly minor; watch `use`,
form actions, ref-as-prop). TanStack Router → react-router-dom route rewrites for the
onboarding routes. 271 commits of app-iteration history become an archived reference rather
than live history.

> ⚠️ **Updated 2026-07-29 — the cost above was understated.** The repos also differ on
> **Tailwind: v3.4 with a config file versus v4.2 CSS-first**, on token format (HSL vs OKLCH),
> and local-helpers has **no framer-motion at all**. Tailwind 3→4 is an architecture change,
> not a version bump. This does **not** change the choice of base — the backend asymmetry
> that decided it is unaffected — but it adds a decision about method.
> See `docs/port-inventory.md` for the full gap and the three options.

### B. app-iteration becomes the single repo; port the backend in

Newer stack, and the design work stays put.

**Why not.** It means relocating 52 migrations, edge functions, RLS policies, the Expo app,
the native iOS project, 31 ops scripts and 146 docs. The migration history is the dangerous
part — `ZD-005` already records that the schema source of truth is unresolved between
staging/local and production. Moving migration history while that is unresolved risks the one
class of mistake that is genuinely hard to undo. Not worth it to keep a router.

### C. Monorepo — both as workspaces under one root

`apps/web`, `apps/mobile`, `apps/native`, `packages/ui`, `docs/`, `supabase/`.

**Why not yet.** It is the tidiest end state and the most work to reach. It does not remove
the React-major and router split — it just houses both, and you would still eventually
converge them. Reasonable to grow into after A; a poor place to start.

### D. Leave as two, sync docs only

Status quo plus discipline. Rejected — it is what the founder asked to stop doing, and the
duplicated master brief in this session is already a live example of the drift cost.

---

## Recommended sequence for A

Each step is independently revertible. Nothing here is destructive to app-iteration, which
stays intact on GitHub as the archive.

1. **Freeze scope.** Confirm nothing new lands in app-iteration from the point work starts.
2. **Inventory the port list.** Explicitly: `Zoey.tsx`, `components/zoot/onboarding/*`,
   `AnimatedIcon`, `service-visual.ts`, `styles.css` token structure, `prefs.haptic`,
   `ProgressStepper`, `routes/onboarding.tsx`. Confirm nothing else is wanted before moving.
3. **Port the token system first**, on its own branch — it has no routing dependencies and
   Phase 1 needs it regardless. This doubles as the React-19→18 canary.
4. **Port components**, adjusting for React 18 and react-router-dom.
5. **Port the 11 app-iteration migrations** only after checking for collisions with the 52 in
   local-helpers. Do this against a Supabase branch, never straight at production.
   `ZD-005` is unresolved — that ambiguity must close first or this step waits.
6. **Move the 4 app-iteration docs** in; reconcile the duplicated master brief to one copy.
7. **Archive app-iteration** — README pointing at the single repo, mark read-only. Do not
   delete: 271 commits of design history stay useful.

**Do not** attempt steps 3–5 mid-Phase-1. Either consolidate first and build Phase 1 once in
the merged repo, or finish Phase 1 in app-iteration and port the result. Doing both at once
means every Phase 1 review is entangled with a migration diff.

---

## Recommendation on timing

**Consolidate before Phase 1 builds.** Phase 1 touches exactly the files that would be ported
— onboarding, mascot, tokens. Building it twice, or building it in the repo that is about to
be archived, is the expensive path. The token port in step 3 is Phase 1's first task anyway
under the new red/white palette.

Cost estimate: steps 1–4 and 6 are a session's work. Step 5 (migrations) is gated on `ZD-005`
and should be scoped separately once that is resolved.

---

## Decision needed

1. Option A, B, C or D.
2. If A: does the consolidated repo keep the name `zoot-your-local-helpers`, or get renamed to
   something Xoot-branded? (Renaming is cheap now, expensive after CI, deploy hooks and
   integrations point at it.)
3. Consolidate before or after Phase 1.
