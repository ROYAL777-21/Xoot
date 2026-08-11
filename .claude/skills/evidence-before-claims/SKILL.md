---
name: evidence-before-claims
description: >
  Separate what was measured from what was assumed before reporting, and recognise the
  signals in this repo that look like evidence and are not — a green check that reviewed
  nothing, a doc asserting work is undone when it shipped, a passing test whose fixture
  cannot fail, a polling loop that never exits because the API returned 403. Use before
  writing a PR description, a commit message, a status report, or any sentence containing
  "works", "fixed", "verified" or "done".
user-invocable: true
---

# Say what you measured, and what you did not

Every failure in this repo's history has the same shape: something was *believed* and the
belief was never separated from the evidence. The pricing drift, the unreachable RPCs, the
stale palette doc — none was a missing test. Each was a claim nobody had checked.

## The rule

**Before writing "works", "fixed", "verified" or "done", name the observation that supports
it.** If there isn't one, say so instead. A stated gap can be weighed by a reader; an implied
guarantee cannot.

"`rate_limit_events` went 0 → 1" is measurement. "Rate limiting should now work" is not.

## Signals that look like evidence and are not

**A green check that read nothing.** Both are live in this repo right now:

- CodeRabbit reports `success` with *"Review skipped: 452 files exceed the limit of 150"* on
  #26, and *"reviews are disabled for this base branch"* on stacked PRs. GitHub renders both
  as a green tick.
- `security-review` completes in **~6 seconds**. That is too fast to have read a diff; it is
  short-circuiting for a missing `CLAUDE_API_KEY`, and still reports success.

**Check the duration and the message, not the colour.**

**A test whose fixture cannot fail.** `design-tokens.test.ts` claimed to cover shared-to-shared
imports; its fixture wrote the dependency *both* ways, so it passed on the spelling that already
worked and never exercised the one that was broken. A passing test proves the assertion ran, not
that it could have failed. When a test guards something important, ask what edit would make it
go red — and if the answer is "none", it is decoration.

**A document describing intent as status.** `palette-migration.md` said "Not yet done: steps
1–5" when steps 1, 2 and 4 had shipped weeks earlier. `blocker.md` listed functions as needing
redeployment that had never been deployed at all. **Docs record what someone believed when they
wrote them.** Verify against the code before repeating a doc's claim.

**A command that cannot succeed.** A polling loop against
`api.github.com/repos/.../actions/runs/...` with plain `curl` returns **403** — the Actions API
needs auth. `grep -q "completed"` therefore never matched, the `until` loop spun until timeout,
and it produced no output at all, which looks identical to "still running". Use
`mcp__github__pull_request_read` with `get_check_runs`; the MCP tools carry credentials that raw
`curl` does not.

Before arming any watcher, ask: **if this were already finished, would my command notice?**

## Two habits that catch most of it

**Read the code before describing it.** I reported that "the price screen does not show the R39
fee". `Book.tsx` renders it — the defect was one screen over, in `BookingConfirm.tsx`, which
prices from a different function. The right description was narrower *and* worse than the wrong
one. Reading first costs a minute; a wrong description outlives the conversation.

**Distrust your own last message.** When continuing work, re-verify the state you reported
earlier rather than building on it. Claims made confidently a few turns ago are exactly the ones
nobody re-checks.

## The shape to write in

Structured this way in commits, PRs and reports — `.github/pull_request_template.md` asks for
the same three:

- **What changed** — the change and why.
- **Measured, not inferred** — observations. Numbers, statuses, versions before and after. Mark
  anything derived from reading code rather than running it as inferred.
- **Not verified** — the checks you could not run, environments untouched, paths without tests.
  "Nothing" is valid only when true.

## Correcting yourself

When an earlier claim turns out wrong, correct it plainly in the next commit or message and move
on. No preamble, no apology, no tally. The correction is worth more than the discomfort: this
session's most useful findings were three corrections — the R39 defect was narrower and
worse-placed than reported, stacking a PR does not buy a CodeRabbit review, and Twilio Proxy's
EOL never gated voice-over-data at all.
