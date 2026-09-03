# Automation loops — what Eden and Claude can each actually do

Written 2026-09-02, at the founder's request to *"use Eden and Claude to orchestrate routine
automations."*

Everything below is **measured, not assumed**. The capability table came from calling the tools, not
from reading their descriptions — which matters here, because the descriptions are considerably more
optimistic than the account.

---

## The measured capability table

| Capability | Eden | Claude Routines | Measured |
|---|---|---|---|
| Read a creator's full performance history | ✅ | ✅ *(via Eden)* | `eden_analyze_creator` returned MrBeast's 295 posts and per-category outliers |
| Search the indexed post corpus | ✅ | — | `eden_search_social_content`, `eden_study_top_titles` |
| Read a URL that is egress-blocked here | ✅ | — | `eden_read_social_post` hydrated YouTube server-side while `youtube.com` was blocked |
| Boards, notes, tables as a swipe file | ✅ | — | Workspace `6a91ee30…` |
| **Schedule a post** | ❌ | — | **HTTP 402** on this plan |
| **Publish a post** | ❌ | ❌ | No social account connected; `eden_list_scheduled_posts` → `0` |
| **Run a job on a schedule** | ❌ | ✅ | `eden_list_schedules` → `[]`. Claude Routines fire reliably — one ran this session |
| Write to this repository | — | ✅ | Routines resume a session that has the working tree |

### ⚠️ The conclusion, stated plainly

**Eden cannot publish anything, and this is a plan limitation, not a configuration mistake.**
Scheduling returns **402 Payment Required** and no social account is connected to the workspace.

So the architecture is not "Eden posts for us." It is:

> **Claude schedules. Eden measures. A human publishes.**

That is also what `founder-voice.md` already requires, independently of what Eden can do — *no draft
reaches a timeline without the founder approving that exact text*. The tooling limit and the policy
happen to agree, which is convenient but is not why the rule exists.

---

## The four loops, and why only four

⚠️ **The failure mode here is eight cheap routines, not too few.** Every routine fires into a session
that costs money, re-derives context from cold, and produces output somebody has to read. A loop
nobody reads is worse than no loop: it manufactures the *appearance* of monitoring, which is the
exact defect that let `verify-live-deploy` pass for three weeks while the site was wrong.

**Four loops. Each has a named output file, so "did it run?" is answerable by looking.**

| Loop | Status as of 2026-09-03 | Armed by |
|---|---|---|
| 1. Daily journal pre-fill | 🔴 **Armed and its first fire FAILED** — see below | This session |
| 2. Weekly reference sweep | 🔴 **Not armed** — needs the Eden connector, which a session-created routine cannot carry | Founder, via claude.ai Routines UI |
| 3. Higgsfield cancel reminder | ⚪ **Waiting** on the founder confirming the trial started | This session, on confirmation |
| 4. Weekly idea sweep | 🟢 **Armed** — writes a proposal file, never code | This session |

---

## 🛑 Loop 1's first fire failed, and this document predicted the reason

The section below said, on the day it was written, *"judge a loop by its output, never by its
configuration."* Twenty-four hours later that is no longer a warning, it is a measurement.

`trig_01WugvvyWzwPq5XoZLKgXRCx` fired on schedule at **2026-09-03 05:07:26 UTC** and finished at
**06:47:52** — a hundred minutes later — with:

```
last_run.status = ROUTINE_RUN_STATUS_FAILED
session_id      = cse_01MdefHJb24qd3s8iF53Vhyw
last_served_model = claude-sonnet-5
context_usage   = 87,386 / 1,000,000 tokens
cost_usd        = 0.2388802
```

**What it produced: nothing.** `ls docs/journal/` still showed only `2026-09-02.md`, and
`git fetch --prune` showed no new branch. It spent a hundred minutes and 24 US cents and left no
trace in the repository.

⚠️ **The script is not the fault.** Run by hand in this session immediately afterwards:

```
$ node scripts/ops/new-journal-entry.mjs
Wrote /home/user/zoot-your-local-helpers/docs/journal/2026-09-03.md with 23 commit(s) pre-filled.
```

So step 1 of the prompt works. The failure is somewhere in steps 2–4 — the narrative fill, the
commit, or the push — and the routine surfaced no error message to say which. **That opacity is the
real finding.** A routine reports a status code and a session id; it does not report *what went
wrong* anywhere the repository can see.

**Three things follow, and they shape loop 4:**

1. **A loop must write its output early and incrementally**, not at the end of a long turn. Loop 1
   generated its file in the first tool call and still shipped nothing, because everything after it
   was one atomic "and then commit".
2. **A loop that must push to succeed can fail entirely on the push.** Loop 4 is designed so a
   partial run still leaves a readable artefact.
3. ⛔ **This is why loop 4 does not write code.** A code-writing routine that fails opaquely at 05:00
   and pushes a half-applied change is materially worse than one that never ran. The
   `finish-what-you-started` skill exists in this repo because half-applied sequences have already
   cost real time here.

**Not disabled.** One failure is a data point, not a verdict, and the cost of a failed run is 24
cents. It fires again 2026-09-04 05:00 UTC. If it fails twice more it gets turned off rather than
left green and empty.

### 1. Daily journal pre-fill — daily

**Runs:** `node scripts/ops/new-journal-entry.mjs`
**Writes:** `docs/journal/YYYY-MM-DD.md`

The script already exists and already works. It reads that day's `git log` and pre-fills the entry,
so the page opens with **evidence rather than a cursor** — which is the entire reason a daily journal
either survives or dies in week two.

**Why automate this one:** it is the only loop whose value is entirely in *never being skipped*. A
journal with gaps is not a journal.

### 2. Weekly reference sweep — Mondays — ⛔ **founder must arm this one, and here is why**

**Would run:** `eden_analyze_creator` across the six voice references, plus `@TheRealSkosana` itself
**Would write:** an appended entry in `docs/marketing/growth-log.md`

**I armed this and then deleted it, because it could not have worked.** A routine created from a
session stores no MCP connectors, so the session it fires has **no Eden tools at all**. It would have
woken weekly, found no way to measure anything, and written nothing — a loop that exists and does
not run, which is precisely the failure this document warns about two sections above. Better to have
no loop than a green one that measures nothing.

**To arm it properly:** create it from the **claude.ai Routines UI**, where the Eden connector can be
attached to the routine. Schedule `0 6 * * 1` (Mondays 08:00 SAST). The prompt:

```text
Weekly reference sweep for the Xoot repo (royal777-21/zoot-your-local-helpers).

1. Read .claude/agents/founder-voice.md for the six current voice references, and
   docs/marketing/reference-creators.md and growth-log.md for the last measured figures.
2. Use Eden (eden_resolve_creator then eden_analyze_creator) to re-measure each reference plus
   @TheRealSkosana: followers, post count, average engagement rate, median outlier, and
   per-category outlier scores.
3. Append ONE dated entry to docs/marketing/growth-log.md recording MOVEMENT since the last
   measurement, not a fresh snapshot. If a figure did not move, say so — a flat week is information.
4. Never compare outlierScore across creators. It is a multiple of that creator's own baseline.
5. If Eden returns HTTP 402 or an auth error, record that plainly and stop.
6. Commit on a branch (never main, never force-push) and push. Do not open a pull request.
7. Do NOT publish, schedule or queue any post.
```

Re-measuring records **movement** rather than a snapshot, and movement is the useful part: a
reference whose `promo` outlier climbs is telling us something a single measurement cannot.

⚠️ **Never compare `outlierScore` across creators.** It is a multiple of that creator's *own*
baseline. A 43× MrBeast post and a 43× post from a 1,000-follower account are not comparable
quantities, and the log says so at the top for this reason.

### 3. Higgsfield trial cancel reminder — one-shot

**Fires:** ~48 hours after the founder confirms the trial started
**Writes:** nothing — it messages the founder

The trial is **$0 today, 100 credits, card required, and auto-renews at $49/month unless
cancelled inside three days.** That is a real charge with a real deadline.

⚠️ **This one is armed on confirmation, not now.** The clock starts at Stripe checkout, not at the
moment the founder decided to click it. Arming it today would fire against a guess. Say *"trial
started"* and it is armed from that timestamp.

Cancelling is a sentence in this chat — *"cancel auto-renewal"* — so the reminder is worth having.

### 4. Weekly idea sweep — Sundays — the implementation loop

> Founder, 2026-09-03: *"Create a routine for implementation of ideas based on company data."*

**Runs:** Sundays `0 15 * * 0` (17:00 SAST)
**Writes:** one appended, dated entry in `docs/marketing/idea-log.md`
**Trigger:** `trig_01GZkAWJCuPdpx49s8ifdpXG` — armed 2026-09-03, first fire **2026-09-06 15:07 UTC**

#### ⚠️ What "company data" actually is right now, measured rather than hoped

The instinct is to point this loop at booking volume, conversion and cohort retention. **Those
tables are empty.** Xoot has **zero completed bookings**. A loop that reads them weekly would
produce a beautifully formatted report of nothing, every Sunday, forever — which is the
`verify-live-deploy` failure again in a new costume.

So the loop reads the data this company *does* have, all of which is in the repository:

| Source | What it tells the loop | Why it is real |
|---|---|---|
| `git log --since='7 days ago'` | What was actually built | Commits cannot be aspirational |
| `npx vitest run` counts | Whether the guard layer grew or shrank | A number, not an opinion |
| `docs/implementation/decision-log.md` | Which ZD decisions are open | The founder's own record |
| `docs/release/NEEDS-FOUNDER.md` | What is blocked on a human | Names the true constraint |
| `docs/release/launch-protocol.md` | Which of the eight gates are closed | Ordered, so "next" is decidable |
| `docs/marketing/growth-strategy-2026.md` | That the constraint is **supply, not demand** | Read from five full transcripts |
| `docs/product/locked-commercial-facts.md` | What may not be changed casually | Prevents an "idea" that breaks a locked fact |

#### ⛔ It proposes. It does not implement.

**This is the deliberate limit, and loop 1's failure is the argument for it.** A routine that writes
code fires unattended at 17:00, fails opaquely halfway, and leaves a half-applied change on a branch
nobody is watching. Loop 4 therefore ends at a **ranked, evidenced proposal** in `idea-log.md`.
Implementation is a human saying *"do number three"* in a session where someone is reading.

That is not a weaker loop. The scarce thing here has never been the ability to write the change — it
is **knowing which change is worth writing this week**, and that is exactly what a weekly read of the
company's own record produces.

#### The prompt, as armed

```text
Weekly idea sweep for the Xoot repo (royal777-21/zoot-your-local-helpers).
This is loop 4 in docs/marketing/automation-loops.md. Read that file first.

1. Read, in this order and no others:
   - git log --oneline --since='7 days ago'  (what actually shipped)
   - docs/marketing/growth-strategy-2026.md  (the binding constraint is SUPPLY, not demand)
   - docs/release/launch-protocol.md         (which of the eight gates are closed)
   - docs/release/NEEDS-FOUNDER.md           (what is blocked on a human)
   - docs/implementation/decision-log.md     (open ZD decisions)
   - docs/product/locked-commercial-facts.md (what may not be changed casually)
   Run: npx vitest run --reporter=dot  and record the file/test counts.

2. APPEND one dated entry to docs/marketing/idea-log.md containing AT MOST FIVE ideas,
   ranked. For each: the idea in one sentence, the evidence from the list above that
   produced it (quote the file), what it would cost, and what it is blocked by.
   Fewer than five is a correct answer. Zero is a correct answer in a quiet week —
   say so in one line rather than padding.

3. Rank against the binding constraint, not against novelty. An idea that adds Xooter
   supply outranks an idea that adds customer demand, because the strategy document
   says demand is not the constraint for a done-for-you service business.

4. Kill an idea in the entry if it: states a price (locked-commercial-facts.md
   §Current Pricing Conflict is OPEN), claims an outcome Xoot has not produced (CPA
   s41 — zero completed bookings exist), is recruitment-facing (LRA s200A is
   unsettled), or contradicts a locked commercial fact. Say which rule killed it.

5. Do NOT write code. Do NOT edit any file except docs/marketing/idea-log.md.
   Do NOT publish, schedule or queue anything. Do NOT trigger any deploy workflow.
   Do NOT open a pull request.

6. Commit the single file on a branch (never main, never force-push) and push.
   Write and commit the entry BEFORE anything else optional — loop 1 failed on
   2026-09-03 having produced nothing after 100 minutes, and the lesson recorded
   there is to land the artefact early rather than at the end of a long turn.
   Commit message ends with:
   Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>

Never include a model identifier in any commit message or pushed file.
```

⚠️ **Five ideas is a ceiling, not a quota.** A loop that must produce five things will invent the
fifth. The prompt says zero is a correct answer, in those words, because it will otherwise learn to
fill the space.

⚠️ **This routine carries no MCP connectors either** — same limitation as loop 2. It has the
repository and a shell, which is why every input in the table above is a file on disk. Nothing in
the prompt requires Eden, Supabase or GitHub beyond `git push`.

---

## What is deliberately not automated

| Not automated | Why |
|---|---|
| **Publishing anything, anywhere** | `founder-voice.md`, and Eden's 402 |
| **Substack** | No public posting API exists. Permanent, not pending |
| **Drafting posts on a schedule** | A weekly batch of unread drafts is a backlog, not a pipeline. Drafts are written when there is material |
| **Replying to comments** | `community-responder.md` exists as an agent for a reason: a wrong automated reply is public and permanent |
| **Production deploys** | `deploy-edge-functions.yml` is `workflow_dispatch` only and requires typing the project ref. Neither session triggers it unasked |

### Already automated, and worth not duplicating

- **`verify-live-deploy.yml`** runs daily at 06:00 UTC and now **fails** on a foreign `generator`
  meta rather than warning. That is the loop watching gate 2, and it does not need a Claude routine
  wrapped around it.
- **`web-build.yml`** runs the 1,102-test suite and the secret scan on every push.

---

## How to tell whether a loop is actually running

The honest check, in order of cost — the same order `go-live.md` §3-0 recommends for deploys:

1. **Look at the output file's date.** `ls docs/journal/` answers loop 1 in one second.
2. **`git log` the file the loop writes.** Answers loop 2.
3. Only then open the routine list.

⚠️ **A routine that exists is not a routine that ran.** This repo has already shipped a green check
that reviewed nothing, a test whose fixture could not fail, and a poll that exited before it could
observe anything. Judge a loop by its output, never by its configuration.
