# The goal, and the loop that gets there

Two prompts to paste. The first states the finish line and does not change. The second runs
repeatedly until the first is met.

They are written for a **fresh session with no memory of today**, which is the only way this
survives context limits, a new chat, or a week off.

> `/loop` is a real skill — `/loop <prompt>` self-paces, `/loop 20m <prompt>` fires on an interval.
> `/goal` is not a skill in this session, so the goal prompt below is simply pasted as the first
> message. Both work as plain text either way.

---

## The goal prompt

Paste once, at the start of a session.

```
GOAL — Xoot to full production.

Read /CLAUDE.md, /NEEDS-FOUNDER.md and docs/implementation/agent-worklog.md before doing
anything. Claim your work in the worklog and push the claim before you write code.

The finish line is all six of these, each proven by the check named, not by reasoning:

  1. LIVE SITE      Actions → "Verify live deploy" reports ✅ against the current main.
                    Both the marketing site (/) and the app (/app, /xooter, /admin) build from
                    this repo and ship together.
  2. PAYMENTS       A sandbox PayFast payment completes end to end and confirm-payment records
                    it. Then payments.provider_checkout is enabled in production.
  3. VOICE          One real two-party call has connected, with two legs in one Twilio
                    conference. Both twilio.* controls enabled in production.
  4. DESIGN         The marketing pages and the app screens both render from
                    src/components/kit/** and src/lib/design-tokens.ts. One product, not two.
  5. SECURITY       npm run security:scan clean; every private /xooter/* route serves noindex
                    and no-store on the LIVE site; no secret in any log; RLS audited.
  6. GREEN          npm run build, npm run security:scan and npx vitest run all pass, and the
                    deployed Edge Functions match the repo (no drift).

Constraints that are not negotiable:
  - Production deploys are a human act. Never dispatch one unasked.
  - Migrations to production go BEFORE their functions, with no gap. db-push refuses if the
    functions could not follow.
  - The displayed price is the price (Consumer Protection Act). Over-stating is survivable;
    under-stating is not.
  - A guard test is only worth having if it fails against the defect it describes. Plant the
    bug, watch it fail, restore.
  - Report what is, not what should be. If a check fails, say so with its output.

Anything that needs the founder goes in /NEEDS-FOUNDER.md with what it unblocks and how it is
proven done — then you carry on with the next unblocked item. Do not stop to ask.
```

---

## The loop prompt

Paste as `/loop <this>`. It is written to be safe to run when there is nothing to do.

```
Continue Xoot toward the GOAL above. One pass:

1. ORIENT. git pull. Read docs/implementation/agent-worklog.md for what the other session
   holds. Check the six finish-line conditions and pick the highest-value item that is NOT
   blocked on the founder.

2. DO IT. Smallest change that genuinely advances it. Prefer finishing something started over
   starting something new.

3. VERIFY BY RUNNING, NOT BY READING.
     npm run build          (not npx vite build — that skips prebuild)
     npm run security:scan
     npx vitest run
   For anything deployed, check the deployed state — Supabase MCP, or a workflow run — rather
   than assuming the repo reflects it. If you dispatched a workflow, READ ITS RESULT before
   reporting on it.

4. RECORD. Commit with a message saying what changed and why it could not wait. Push. Update
   the worklog. If you touched the other role's paths, flag it per CLAUDE.md rule 3.

5. BLOCKED? Add it to /NEEDS-FOUNDER.md — what it unblocks, how it is proven done — and go
   back to step 1 with the next item. Do not wait.

6. NOTHING LEFT? Say so plainly and stop. Do not invent work. "The unblocked queue is empty
   and here is what the founder owes" is a complete and correct answer.

Never: dispatch a production deploy unasked, weaken a guard to get a green tick, allowlist a
true positive in the secret scanner, or report a step as done without the output that proves
it.
```

---

## Why it is shaped like this

Three things in it are corrections to specific failures in this repo, not general advice.

**"Verify by running, not by reading"** — a session dispatched a workflow, never read the result,
and reported the deploy as verified. The run had failed. The booking it was supposed to arm sat with
a window that had already closed.

**"If you dispatched a workflow, read its result"** — same incident, stated separately because the
general rule did not prevent it.

**"Do not invent work"** — an empty queue is a correct answer, and a session that cannot say so will
fill the space with churn.

**"A guard is only worth having if it fails against the defect"** — this repo has shipped: a test
asserting a rule nobody implemented; a documented command calling a global that does not exist; and a
signature-verification test that was never collected by any runner for weeks. All three looked
exactly like coverage.
