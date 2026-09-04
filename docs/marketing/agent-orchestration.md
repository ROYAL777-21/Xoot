# Agent orchestration — who exists, what they own, when they fire, what they refuse

Written 2026-09-03 at the founder's request to *"lay out the detailed description of how all the
agents operate, when and why."*

## ⛔ What this file is not

**It does not decide what to work on.** `.claude/agents/growth-orchestrator.md` does that, and
`.claude/skills/xoot-growth/SKILL.md` is already a near-duplicate of it. A third copy of the
constraint table would guarantee at least one of the three is wrong within a month.

This file answers what neither of those answers: **which agent owns which channel, what wakes each
one, and what each one is structurally unable to do.**

| When two files disagree | Authority |
|---|---|
| Agent identity, model, tools | **The `.claude/agents/*.md` frontmatter** — it is executable; this file is prose |
| What to work on this week | `growth-orchestrator.md` |
| Channel ownership, triggers, refusals | **This file** |

---

# 1. The roster

Every field below was read from frontmatter on 2026-09-03, not recalled.

| Agent | Model | Web reach | Can dispatch | Owns | Output artefact |
|---|---|---|---|---|---|
| `growth-orchestrator` | opus | WebFetch + WebSearch | ✅ **the only one** | The constraint call | entry in `growth-log.md` |
| `founder-voice` | opus | WebSearch | — | Founder X, LinkedIn, Substack | drafts ending `APPROVE / EDIT / KILL` |
| `company-social` | opus | ⛔ **none** | — | TikTok, Instagram, FB Page, company X, YouTube | post + visual brief |
| `content-strategist` | opus | WebFetch + WebSearch | — | Blog, suburb pages, comparisons, AEO | page draft |
| `competitor-analyst` | opus | WebFetch + WebSearch | — | Citation / topic / objection gaps | ranked gap list |
| `creative-director` | opus | ⛔ **none** | — | Hooks, ad variants, store creative, the Indeed ad | brief in `creative-queue.md` |
| `retention-analyst` | opus | ⛔ **none** | — | Churn, cohorts, activation, Care+ honesty | cohort report, stated `n` |
| `community-responder` | **sonnet** | ⛔ **none** | — | Comments, DMs, review replies | reply text a human pastes |

### ⚠️ Three things this table makes visible that eight separate frontmatters do not

**a) The graph is star-shaped and one level deep.** Only `growth-orchestrator` holds the `Agent`
tool. No agent can chain to another, so every multi-agent flow returns to the orchestrator. A
`competitor-analyst` gap list does not become a content brief unless a human or the orchestrator
carries it across.

**b) Four of the eight have no web tool at all.** `company-social` owns TikTok **and cannot look at
TikTok**. `creative-director` writes hooks **and cannot see a hook perform**. That is a real limit
on what a dispatch can ask for, and it was invisible while it sat scattered across eight files.

**c) `community-responder` is the cheapest model on the most irreversible surface.** It is the only
`sonnet` agent, and the only one whose output is public, permanent and adversarially read — app
store replies get read during install decisions. Every other agent produces a draft a human reads
first.

> ⛔ **The only thing currently making that safe is a tool gap.** Its body names
> `playstore_reviews`, `appstore_reviews`, `playstore_reply_review`, `appstore_reply_review` — those
> are `mcp__Expo__*` tools, and its frontmatter grants `Read, Grep, Glob, Bash, Skill`. **It cannot
> read a review or reply to one.** The file reads as though the loop is closed. It is not.
>
> **Never add the reply tools without changing the model in the same commit.**

---

# 2. Channel ownership

The gap this section exists to close: `platform-playbooks.md` defines eight channels and **names no
owner for any of them**. Rows are in that file's order so the two can be diffed by eye.

| Channel | Role | Owner | Support | Who publishes | Blocked by |
|---|---|---|---|---|---|
| TikTok | 🟢 primary | `company-social` | `creative-director` briefs it | founder, manually | — |
| Instagram | 🟢 secondary | `company-social` | — | founder, manually | — |
| Facebook **Page** | 🟡 | `company-social` | — | founder, manually | — |
| Facebook **Groups** | 🟡 | ⛔ **none, by design** | `competitor-analyst` listens; `community-responder` drafts on request | **founder only, as a person** | — |
| X — founder | 🟡 | `founder-voice` | — | founder | bio + `VOICE: UNCALIBRATED` |
| X — company | ⚪ last | `company-social` | — | founder | sequencing |
| Substack | 🟡 | `founder-voice` | — | founder, **manual paste, permanently** | 0 subscribers; no API |
| LinkedIn | 🟡 | `founder-voice` | — | founder | — |
| YouTube | ⚪ dormant | `company-social` *(owner-in-waiting)* | — | — | gate 6 |
| Indeed | ⚪ | `creative-director` | `growth-orchestrator` holds the gate | ⛔ **nobody — legal** | LRA s200A + gate 3 |

### The three channels that had no owner, and why they now do

**Facebook Groups → deliberately unowned.** `platform-playbooks.md` rule 1 is explicit: *the founder
participates as a person, from the personal account. Not the Page.* Assigning an agent to a channel
whose entire value is that it is **not** a brand would destroy the channel.

⚠️ **A channel map with every cell filled is a map that has stopped being honest.** The job is split
instead: `competitor-analyst` reads groups for objection language and has the web tools to do it;
`community-responder` drafts a single reply when asked; **the act of posting is unassignable.** This
is the pattern for anything where the persona is the product.

**Substack → `founder-voice`, and not a ninth agent.** Three reasons in order: the two-register rule
makes Substack's material founder-register by definition; `platform-playbooks.md` says Substack
Notes is X-shaped and repurposes the week's X drafts at near-zero cost, and those drafts are already
`founder-voice` output; and the four drafted essays are build-in-public defect stories, which is
exactly its stated subject. ⛔ **Do not create a long-form agent** — one essay a week means it is
idle six days in seven and needs its own copy of a voice calibration that does not yet exist.

**Indeed → `creative-director` owns the artefact, `growth-orchestrator` owns the release.** The ad
already exists in `xooter-hiring-ad.md`. What is missing is not a writer but a gate. ⚠️ **"Unassigned"
and "assigned but locked" look identical from outside, and only one of them is a bug** — hence an
owner *and* a lock.

### 🛑 A frontmatter defect this table exposes

`company-social.md`'s `description:` says **"X, Instagram, YouTube"** and **omits TikTok entirely**,
while its own body makes TikTok the primary engine (29.1M SA users vs Instagram's 8.6M) and builds X
last. The same wrong list is copied into `xoot-growth/SKILL.md`.

⚠️ **This is not cosmetic. `description` is the string a dispatcher matches on, so a request to plan
TikTok work does not select the agent that owns TikTok.** Three files, one error, two of them
copies. Fix all three in one commit; this file records the correct list meanwhile.

---

# 3. When each agent fires

| | Trigger | Mechanism | Who can | How you know it fired |
|---|---|---|---|---|
| **T1** | Founder asks directly | user names the agent or skill | any of the eight | the session transcript |
| **T2** | Orchestrator dispatches | the `Agent` tool | `growth-orchestrator` only | a **pre-registered** `growth-log.md` entry |
| **T3** | Scheduled loop fires | a Claude Routine | the four loops | the loop's named output file |
| **T4** | External event | — | ⛔ **none wired** | n/a |

**T2 has a precondition the table cannot show.** `growth-orchestrator.md` requires the constraint,
the number, the hypothesis and the success criterion to be written down *before* the agent starts.
**So a T2 that leaves no `growth-log.md` entry did not happen**, whatever output exists.

⛔ **T4 is empty, and saying so is the point.** No marketing agent is subscribed to any event. The
two workflows that do fire on events — `verify-live-deploy.yml` daily, `web-build.yml` on push —
invoke no agent. The nearest real T4 candidate is an app-store review arriving, and it is blocked by
the tool gap in §1(c). **Listing T4 as "none wired" names the gap instead of leaving it to be
rediscovered.**

### ⚠️ The T3 tax, stated once

**A routine created from a session carries no MCP connectors and starts cold.** Any agent triggered
by T3 has the repository, a shell, and nothing else. That is why loop 2 was armed and then deleted.

**An agent whose value depends on Eden, OpenRush or Supabase cannot be a T3 agent.** That sentence
prevents the next person arming `competitor-analyst` on a schedule and getting a green loop that
measures nothing.

---

# 4. Why each agent exists — and where the current design is wrong

The five constraints and the number that proves each are in `growth-orchestrator.md`. ⛔ **Not
copied here.** This is the inverse view, keyed by agent:

| Agent | Relieves | Gate | If it works, what moves |
|---|---|---|---|
| `competitor-analyst` | 1 nobody arrives | 7 | AI citations, addressable gaps |
| `content-strategist` | 1, 2 | 7 | sessions, booking-start rate |
| `creative-director` | 2 they leave · **5 supply** | 7 · **5** | booking-start rate · **applications** |
| `company-social` | 1 · **5 supply** | 7 · **5** | profile visits/1k · **applications** |
| `retention-analyst` | 4 pay once and go | 6 | 30/60/90 repeat, Care+ take-up |
| `community-responder` | 4, and reputation | — | review sentiment, response time |
| `founder-voice` | 1, indirectly | 2, 7 | subscribers per 1,000 X impressions |
| `growth-orchestrator` | picks which | all | — |

## 🥇 The finding that reorders this, and the rule it forces

**Constraint 5 is binding.** `growth-strategy-2026.md` and `hormozi-corpus-findings.md` both
establish that a done-for-you service business is supply constrained — *"you're actually not in the
cleaning business, you're in the recruiting cleaners business"* — corroborated in two independent
passages that both reach for a domestic-cleaning business as the example. `launch-protocol.md` gate
5 already ordered supply before demand. **So constraint 5 outranks 1, 2 and 4 in the current cycle.**

### 🛑 And the measurement layer will tell you to stop doing it

Eden measured the same channel that produced that advice, across 3,597 indexed posts:

| Topic | Avg views | Engagement | Outlier |
|---|---|---|---|
| Channel baseline | 6,775 | 2.50% | 1.16× |
| **Careers — hiring, recruiting, talent** | **3,081** | **0.75%** | **0.59×** |

**Recruiting content is the worst-performing topic on the channel** — 45% of the views, 30% of the
engagement rate, half the outlier score.

> ⛔ **The rule, which the orchestrator may not override:**
> **Recruiting output is judged on `xooter_applications`, never on reach, views or engagement.**
> A Xooter post with 400 views and two good applicants beats a customer post with 40,000 views and
> no bookings.

That metric already exists — `measurement-spec.md`'s funnel has *Supply | Xooter applications →
approved → active*. This is a pointer, not a new metric.

⚠️ **Pre-empting the other false alarm:** `promo` content averages a **0.49× outlier** on the same
3,597-post sample. When Xoot's promotional posts underperform its other posts by half, **that is the
shape of the thing, not a copy failure.**

### 🛑 The dispatch table routes the binding constraint to the wrong agent

`growth-orchestrator.md` row 5 sends *supply* → `content-strategist` — a blog / suburb-page / AEO
agent whose mandatory first load is `xoot-content`. **But supply lives on TikTok, in Facebook
work-seeking groups, and on Indeed.** The most important constraint is dispatched to the agent with
the least relevant channel surface.

**It should route to `company-social` + `creative-director`**, both of which already name Xooter
recruitment as a settled market, with `content-strategist` third for the evergreen "what a Xooter
earns" page. ⛔ **Flagged, not changed from here** — changing it in this file while the orchestrator
says otherwise would create the fourth live version of the same table.

---

# 5. Two rosters, bridged

`.claude/agents/**` is a **session-time** roster — eight subagents a Claude session invokes, whose
output is text. `docs/AGENT_OPERATING_MODEL.md` is a **runtime** roster — ten operational roles that
fire from source-of-truth events and write through typed Edge Functions. Neither is a subset of the
other. ⛔ **Do not merge them.** They share four seams.

| Seam | Marketing roster | Ops roster | Rule |
|---|---|---|---|
| Constraint 3 — start and don't finish | orchestrator refuses it: *"engineering — raise it, don't market at it"* | Codex Engineering Agent | The refusal is a **handoff**, not a dead end: name the funnel step, hand over via the worklog |
| **Blog / local SEO** | `content-strategist` | Marketing & SEO Agent (`npm run seo:daily`) | ⚠️ **Same job, two owners.** `content-strategist` is authoritative for *what to write*; the ops row for *the publish path and its editorial gate* |
| **Care+ / retention** | `retention-analyst` | Retention & Loyalty Agent | Diagnose vs execute. The **2.54-bookings breakeven** rule is set by the marketing agent and **binds** the ops agent's sends |
| **Safety escalation** | `community-responder` → the founder | Trust & Safety Agent → `admin_review_queue` | ⚠️ Two paths for one event class — see below |

## ⚠️ Safety escalation needs the second path, not one of them

`community-responder.md` names the founder as the sole escalation target and flags the risk itself:
*one founder is a single point of failure on a safety path… an allegation arriving at 22:00 on a
Saturday waits until they see it.*

The ops roster already defines a durable surface for exactly this — `admin_review_queue`, with Trust
& Safety owning verification.

> **A public safety allegation goes to the founder AND into the admin review queue**, so it survives
> the founder not seeing it.

That converts a documented single point of failure into a queue with an owner, without changing
either roster's authority.

---

# 6. The gates that are load-bearing

⚠️ **The last column is the real content.** A rule enforced by **tool-absence** cannot be violated.
A rule enforced by **prose** is one a model may reason past under pressure.

| Act | Who may | Who approves | Enforced by |
|---|---|---|---|
| Publish a founder post | nobody in this repo | founder, on **that exact text** | prose **+ tool-absence** |
| Approve a founder post | founder only | — | **prose** |
| Schedule a post | nobody | — | **plan-limit** — Eden returns HTTP 402 |
| Publish to Substack | nobody, ever | — | **structural** — no public posting API exists |
| Reply to a safety allegation | nobody | founder **+ queue** (§5) | **prose** |
| Reply to an app-store review | nobody today | — | **tool-absence** — §1(c) |
| Trigger a production deploy | nobody | — | **structural** — `workflow_dispatch` + typed project ref |
| State a price | anyone, from the locked table | founder, via decision log | **prose + test** — `locked-facts-parity.test.ts` |
| Write code from a loop | no loop | — | **prose**, in the loop 4 prompt |
| Invent a metric | nobody | — | **prose** |

**Six of ten are prose-only.** That is the honest security posture, and it was unstated anywhere
before this file.

⚠️ **The publish gate is double-locked by luck, not design.** `automation-loops.md` already makes
the point: policy (`founder-voice.md`) and tooling (Eden's 402) happen to agree, *"which is
convenient but is not why the rule exists."* **The day the Eden plan is upgraded, the tool lock
disappears and only prose remains.**

---

# 7. The loops, and whose job each does

| Loop | Status 2026-09-03 | Whose job | Writes |
|---|---|---|---|
| 1 journal pre-fill | 🔴 **first fire FAILED** — 100 min, $0.24, no file, no branch | none — repo hygiene | `docs/journal/` |
| 2 weekly reference sweep | 🔴 **not armed** — needs the Eden connector a session routine cannot carry | `founder-voice`'s reference table | `growth-log.md` |
| 3 Higgsfield cancel | ⚪ waiting on founder confirmation | none — a $49/mo deadline | messages the founder |
| 4 weekly idea sweep | 🟢 armed, first fire 2026-09-06 | **`growth-orchestrator`'s ranking job, minus the dispatch** | `idea-log.md` |

## ⚠️ Loop 4 is a fourth copy of the constraint logic

Its prompt independently re-encodes the orchestrator's core instruction — *"Rank against the binding
constraint, not against novelty. An idea that adds Xooter supply outranks an idea that adds customer
demand"* — and its kill rules re-encode the hard limits.

**So the ranking now exists in four places, and the fourth lives in a routine prompt nobody can
diff.** The invariant: *if the orchestrator's ranking changes, loop 4 is stale until someone edits it
in the routine UI, and nothing in the repo will tell you.* Combined with §4's proposed row-5
correction, **that is a live divergence, not a hypothetical.**

Check order, from `automation-loops.md`: **output file's date first, `git log` the file second, the
routine list last.** A routine that exists is not a routine that ran.

---

# 8. Maintenance

- **The frontmatter is executable; this file is prose. When they disagree, the frontmatter wins and
  this file is the bug.**
- Changing an agent's `name`, `model`, `tools` or `description` requires updating §1 and §2 **in the
  same commit**.
- A ninth agent needs a row in §1, §2, §3 and §4. **If four rows cannot be filled honestly, the
  agent is not ready.**
- ⛔ **Follow-up that makes this a net reduction in duplication:** reduce `xoot-growth/SKILL.md`'s
  team table to a pointer at this file. Otherwise the repo now holds *three* descriptions of the
  same eight agents instead of two, and this document has slightly worsened the problem it was
  written to solve.
- **Proposed check, not yet built:** a `scripts/ops/` script parsing `.claude/agents/*.md`
  frontmatter that fails when model, tools or channel keywords disagree with §1/§2. ⚠️ The
  `company-social` description drift is exactly the class of error prose review missed **three times
  across three files**, and this repo's own record — a green check that reviewed nothing, a fixture
  that could not fail — argues for a check over a convention.

---

## 📚 §6 — The reference library, and who reads what

Added 2026-09-04, when the founder supplied the `$100M Playbook` series and `$100M Money Models`
as source of truth. Extracted into
[`hormozi-playbooks.md`](./hormozi-playbooks.md).

**Why ownership is assigned rather than shared.** Eight agents with access to seven playbooks is
eight agents each free to reach for a pricing play. The reason this file exists at all is that
overlapping ownership produced three copies of the constraint logic; a shared library would do the
same to commercial strategy. So each playbook has one reader.

| Playbook | Reader | What they may do with it |
|---|---|---|
| **Hooks** | `creative-director` | Apply freely. Hooks change wording, not obligations. ⚠️ The one constraint: a call-out naming a suburb must name a **real launch suburb** — gate 5 |
| **Marketing Machine** | `growth-orchestrator` | Propose a promotion rule (organic outlier → paid). ⛔ **Never keyed to views alone** — the View Trap is measured seven times, and recruitment output is judged on applications |
| **Money Models** | `growth-orchestrator` | Propose offer *structures*. ⛔ Giveaways need CPA s36 compliance; Decoy and "Pay Less Now" risk s30/s41 |
| **Retention** · **Lead Nurture** | `retention-analyst` | Apply freely — these are measurement and follow-up, not claims. Lead Nurture's Speed pillar has **nothing measuring it yet** |
| **Pricing** · **Price Raise** | 🔒 **Correctness & Safety** | ⛔ **Read-only for every marketing agent.** These change locked commercial facts and engage CPA s30/s41. A play from here reaches production only through a decision-log entry the founder signs |

### ⛔ The refusal this adds to every marketing agent

> **A playbook is not an authorisation.** If a play would change a price, a term, a commitment
> period or a fee, the agent writes the proposal with its arithmetic and stops. It does not edit
> `xoot-pricing.ts`, `_shared/pricing.ts` or `locked-commercial-facts.md`.

This is not a new rule; it is the existing locked-facts rule stated where an agent holding a
playbook full of pricing plays will actually meet it. `marketing-claim-rules.test.ts` enforces the
pricing half automatically — it fails on any rand figure `basePrice()` does not produce. **A
structural play (a term, a fee, a giveaway) has no such guard and needs a human.**

### ⚠️ One correction already caught, recorded so it is not re-made

An earlier draft filed **Care+ as Hormozi's "Waived Fee Offer."** It is not. His waives a *setup fee
of 3–5× the monthly rate* in exchange for a *twelve-month commitment*, with the fee payable on early
cancellation — *"customers will stay longer if leaving costs more than staying."* Care+ waives a
**per-booking R39 fee**, every booking, with no term and nothing owed on cancellation. It is a
Continuity **Discount** Offer.

The mistake matters because the obvious way to "finish" a Waived Fee Offer is to add the commitment
term — and **CPA s14** lets a consumer cancel a fixed-term agreement on 20 business days' notice
with only a *reasonable* penalty, so the clawback that makes the play work is the part South African
law constrains most. Misfiling it would have pointed a future agent straight at that.
