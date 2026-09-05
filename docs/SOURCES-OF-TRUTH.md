# Sources of truth

Written 2026-09-05 at the founder's instruction to treat the Xoot design files, the mobile design
handoff and the Alex Hormozi playbooks as source of truth.

**Why this file exists.** Every one of these sources was already in the repository. What was missing
was a statement of *which one wins when two of them disagree* — and that gap is not theoretical. In
one week it produced eight claims that reached a component before being caught by hand, including a
comparison grid promising insurance cover that has not been placed.

---

## 1 · Design

### The 2026-09-03 handoff — `design/handoff-2026-09-03/`

| File | Governs |
|---|---|
| `Xoot Foundations.dc.html` | The 9 colour groups, 13-row type scale, space/radii/elevation/motion tokens, 28 semantic aliases |
| `Xoot Components.dc.html` | 137 component exports across 81 sources; the 80-icon set behind one `Icon` wrapper |
| `Xoot Website.dc.html` | Public-site composition and **section order** |
| `Xoot App.dc.html` | In-app screen map — 24 top-level screens, 17 "You ›" sub-screens |
| `Xoot Legal.dc.html` | **Twelve** legal documents and their drafting constraints |
| `Xoot Responsive Check.dc.html` | The **four viewports** the design is claimed to work at |
| `Xoot Bug Bounty.dc.html` | The disclosure programme — ⛔ see the warning below |
| `xoot/` | The compiled kit: `tokens/*.css`, `site/*.jsx`, `app/*.jsx`, `ds-bundle.js`, `rwd.js`, fonts, `assets/logo.svg` |

### The mobile design handoff — `design/Xoot_App.html`

**2.9 MB standalone UI kit** for the native app. ⚠️ **Distinct from the 15 KB
`Xoot App.dc.html`** in the handoff folder — same subject, different artefact, and confusing them
means porting a screen map when you wanted a component.

### The governance layer — `design/*.md`

`ACCESSIBILITY` · `BRAND` · `CONTENT-GUIDE` · `DESIGN-SYSTEM` · `FIGMA-WORKFLOW` · `GLASS-SYSTEM` ·
`HAPTICS` · `ICONOGRAPHY` · `ILLUSTRATION` · `MOTION` · `PERFORMANCE` · `PHASE-1-AUDIT` ·
`PHOTOGRAPHY` · `QUALITY-GATES` · `UX-PRINCIPLES` · `README`

Plus `screen-specs/`, `features/`, `prototypes/`, `references/REFERENCE-MAP.md`, and
`approved-frames.json` with its schema.

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

# ⚠️ Three things this register surfaced

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
