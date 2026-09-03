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

## The three loops, and why only three

⚠️ **The failure mode here is eight cheap routines, not too few.** Every routine fires into a session
that costs money, re-derives context from cold, and produces output somebody has to read. A loop
nobody reads is worse than no loop: it manufactures the *appearance* of monitoring, which is the
exact defect that let `verify-live-deploy` pass for three weeks while the site was wrong.

**Three loops. Each has a named output file, so "did it run?" is answerable by looking.**

| Loop | Status as of 2026-09-02 | Armed by |
|---|---|---|
| 1. Daily journal pre-fill | 🟢 **Armed**, `trig_01WugvvyWzwPq5XoZLKgXRCx`, first fire 2026-09-03 05:04 UTC | This session |
| 2. Weekly reference sweep | 🔴 **Not armed** — needs the Eden connector, which a session-created routine cannot carry | Founder, via claude.ai Routines UI |
| 3. Higgsfield cancel reminder | ⚪ **Waiting** on the founder confirming the trial started | This session, on confirmation |

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
