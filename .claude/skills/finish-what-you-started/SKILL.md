---
name: finish-what-you-started
description: >
  Drive a multi-step task to actual completion instead of to the last command that returned
  successfully. Covers resuming after an interruption, sequences that half-apply, "success"
  from a tool that did something other than what was asked, work applied to one environment
  and not the other, and the list of things a session cannot finish itself. Use when a task
  spans more than one system, when a session resumes mid-sequence, and before saying a phase
  is done.
user-invocable: true
---

# A task is done when its effect has been observed

Not when the command that should have caused the effect returned. Every item below is
something that actually happened on this repo, and in each one a step reported success while
the thing it was for did not happen.

`evidence-before-claims` is about how you *report*. This is about how you *finish*. They fail
together: work is abandoned one step early, and the report describes the step rather than the
outcome.

## The five ways work here has been left half-done

### 1. An interruption landed mid-sequence, and the resume trusted memory

Four migrations were being applied across two projects. The container restarted partway. The
obvious resume — "I had done three, so do the fourth" — would have been wrong in both
directions: some were applied but unrecorded, and the ledger disagreed with the schema.

**Rule: after any interruption, re-read live state before doing anything else.** Never resume
a sequence from what you remember, a plan file, or a task list. Those record intent. Only the
system records what happened.

### 2. The tool succeeded at something other than what was asked

`apply_migration` returned `success: true` four times while stamping its own wall-clock version
and ignoring the filename. Four green results, four wrong rows, and a `db push` that would
later re-run all four.

**Rule: tool success is not evidence of the intended effect.** Read the object back — the row,
the column, the trigger, the function version. Where a tool is known to do something adjacent
to what you asked, the correction belongs in the *same breath* as the call, never on a list
for later. (`xoot-supabase-ops` trap 2 is exactly this.)

### 3. The check passed without reading anything

`security-review` reported success in 4 seconds, then 16 seconds, then green again with
`ClaudeCode has already run on PR #39 (found marker file), forcing disable`. Three greens, zero
diffs read. It now runs 58 seconds because `run-every-commit: true` was added.

**Rule: for any check you are treating as coverage, look at its duration and its artefacts,
not its tick.** A check that cannot fail is not a check. If you cannot say what it read, it
read nothing.

### 4. The commit "succeeded" into a timeout

`git commit` returned an error the eye skips — `fatal: failed to write commit object`, from the
signing service timing out — and the work sat unpushed while the session moved on. It was
transient and a retry went through clean, which is exactly why it is easy to miss: nothing was
wrong with the change.

**Rule: verify the SHA moved.** `git log --oneline -1` after committing, and after pushing
confirm the remote ref, not the local one. Retry a signing timeout rather than reporting a
failure — but never assume the retry worked either.

### 5. Applied to staging, forgot production. Twice.

Two projects, and a task is only half-done at the first. The failure is asymmetric and worth
knowing which way: applying a **migration** to only one project leaves them divergent, while
deploying a **function** to only one leaves the other running old code against a new schema.

**Rule: name every environment in the task itself, and verify each separately.** "Applied the
migration" is not a status. "Applied on `fxmxyabdjqviqbcxmvlp` and `mvlrkelahhsyjrwgsxaf`,
version read back on both" is.

There is also an ordering rule inside this one, and it is not negotiable: **migration before
function, per project.** PostgREST rejects the whole statement on the first unknown column, so
a function writing a column its project lacks fails *every* insert rather than degrading.

## Before calling anything done

1. **Re-read the ask.** Six requests in one message means six answers. The one you did not
   plan for is the one that gets dropped — and it is usually the question, not the code.
2. **Was every branch of the sequence finished, or only the happy path?** A step that was
   skipped because a precondition failed is unfinished work, not a completed step.
3. **What did you observe?** Per item, name the read-back. If there isn't one, the item is
   in progress.
4. **What is genuinely blocked?** Distinguish *blocked* from *not attempted*. Blocked needs
   the blocker named and who can clear it; not-attempted needs doing.
5. **Say what you left out.** Scope you dropped is the user's call, not yours. An unfinished
   item stated plainly is a working relationship; an unfinished item omitted is a defect
   discovered later by someone who trusted you.

## What a session cannot finish, and must not imply it did

Being honest about this is part of finishing, not an excuse for not finishing. On this repo:

- **No Edge Function can be invoked.** The agent proxy denies `*.supabase.co`, and `pg_net`
  and `http` are not installed, so it cannot be called from SQL either. Bundling proves imports
  resolve; it proves nothing about behaviour.
- **A secret cannot be read back.** Supabase never returns a value, so "it is set" is not
  verifiable from any session — only presence of the *name* is, via `verify-secrets.yml`.
  Presence is not correctness.
- **A call has never connected.** Voice is code that has not run until two browsers hear each
  other.
- **An MCP connector can drop authorisation mid-task.** When it does, say which step it
  interrupted and what remains unclassified — do not let the sections already written imply the
  whole thing landed.

## The one-line version

Finish the sequence, on every environment, then go and look. If you cannot go and look, say
that instead of saying "done".
