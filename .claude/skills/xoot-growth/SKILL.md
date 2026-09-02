---
name: xoot-growth
description: >
  Run Xoot's growth programme as a coordinated team — decide the binding constraint, dispatch
  the marketing agents, and keep every channel honest against what the product can actually
  do. Covers X, LinkedIn, Instagram, YouTube, the blog, AEO, ad creative, retention and
  app-store listing work. Use when asked to plan or run marketing, write social posts, decide
  what to work on for growth, review performance, or build campaign or launch assets.
user-invocable: true
---

# Xoot growth

The orchestration layer. It does not replace `xoot-content` — that skill owns the blog, the
claim rules and the dignity line, and is authoritative wherever the two overlap. Load it for
any writing work.

## Read before acting

| File | What it settles |
|---|---|
| `docs/marketing/growth-doctrine.md` | The frameworks, applied, with their legal limits |
| `docs/marketing/measurement-spec.md` | What is measured, what is not, and the honest state |
| `docs/product/locked-commercial-facts.md` | Money facts. Overrides everything below |
| `docs/marketing/growth-log.md` | What has been tried, including what failed |
| `docs/BRAND_GUIDE.md` | Copy tone, and the banned words |

## The curated playbook skills — load the one that fits, don't reason from memory

| Skill | Load it for |
|---|---|
| `xoot-offer-design` | Offers, bundles, pricing, price rises, promotions |
| `xoot-demand` | Outreach, distribution, paid, nurture, harvesting proof |
| `xoot-retention` | Churn, cohorts, activation, Care+ honesty |
| `xoot-hooks` | Hooks, ad and video formats, retention gates |
| `xoot-paywall` | Care+ conversion surfaces, trials, price presentation |
| `xoot-content` | Anything written for the blog or for search/AEO |

Each carries the same Xoot constraint block: the legalised tactic forms, the R47/R54 floors,
Care+ breakeven at 2.54 bookings/month, supply-as-ceiling, the dignity line, SA English, and the
BRAND_GUIDE bans.

⚠️ **`ask-hormozi`'s CLI does not work here, but the corpus does.** Corrected 2026-09-02 — the
earlier claim that it "cannot retrieve anything" was wrong and cost real time. The repo clones
fine and **bundles the corpus**: 2,039 episodes, 9,330 timestamped Markdown segments with citation
URLs. Only `qmd`, the semantic indexer, is blocked (`static.crates.io`, 403), and the official CLI
routes every search through it.

Use **`node scripts/ops/ask-hormozi-search.mjs "<query>"`**, which reads the Markdown directly and
needs no `qmd`. It is keyword, not semantic, so an empty result is **not** proof the corpus is
silent — try other terms. Findings so far are in `docs/marketing/hormozi-findings.md`.

**Still: never cite a passage you have not actually retrieved.** That rule caused none of the
trouble; the untested claim of unavailability did.

## The team

| Agent | Owns |
|---|---|
| `growth-orchestrator` | Picks the constraint, dispatches, keeps the log |
| `content-strategist` | Blog, suburb pages, comparisons, AEO |
| `founder-voice` | Founder X + LinkedIn drafts — **approval required** |
| `company-social` | Company X, Instagram, YouTube |
| `community-responder` | Comments, reviews, DMs |
| `creative-director` | Hooks, ad variants, launch and store creative |
| `retention-analyst` | Churn, cohorts, activation, Care+ honesty |
| `competitor-analyst` | Market gaps, citation gaps, objections |

Dispatch with the Agent tool **only when the user asks for the team to run**. A single post or a
single question is faster answered directly with the relevant skill loaded.

## The weekly loop

1. **Measure.** Pull the funnel. If it is not instrumented, say so — do not estimate.
2. **Diagnose.** Name the binding constraint and the number proving it.
3. **Hypothesise.** One falsifiable statement, with the horizon and the threshold set in advance.
4. **Dispatch.** One agent, one brief.
5. **Judge at the horizon.** Against the pre-registered threshold, not against a story.
6. **Log it** — wins and losses both, in `growth-log.md`.

**Check supply before dispatching demand work.** Bookings that cannot be served are worse than
bookings that never happened.

## Standing rules

- **Founder posts are drafted, never published.** Approval is explicit, per post, on the exact text.
- **Every public claim traces to code, the ladder, or locked-commercial-facts.** A feature behind
  a readiness constant does not exist publicly.
- **No price in content** unless the founder asks; link the live page.
- **Written consent before any face, home or name appears.**
- **Give four times before asking once.**
- **Say "Xooter".** Never "cleaner", "maid" or "the help".
- **Escalate safety allegations to a human immediately** and post no public reply first.

## When the founder's voice profile does not exist

`founder-voice` must not guess. Drafts are marked `VOICE: UNCALIBRATED` and offered for
correction, not approval, until `my-writing-style` exists. Build it with the
`setup-writing-style` skill from real samples — unedited ones, which carry cadence that polished
writing does not.

## Credits

While Higgsfield credits are unavailable, creative work stops at the brief and queues in
`docs/marketing/creative-queue.md`. Real screenshots, consented photography and the design kit
(`src/lib/design-tokens.ts`, `src/components/kit/**`) cover static needs — and for a local
service brand they usually beat synthetic imagery anyway.
