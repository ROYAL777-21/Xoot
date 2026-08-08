# Getting this work onto `main`

Written 2026-08-08. The steps only you can do are marked **YOU**; the rest is done.

## Where things stand

```
main  54e7cfa
 └── claude/xoot-ios-build-setup-0te1sl   ← PR #26, 452 files, 87 commits
      └── claude/session-continuation-3upt0l  ← PR #27, stacked on #26
```

`main` is behind both. Everything reaches it through **#26**, so #26 is the gate.

## The thing to understand before you click merge

**PR #26 has never been reviewed, and its green tick does not mean it was.** Its only status is
CodeRabbit reporting *"Review skipped: 452 files exceed the limit of 150"* — a skip, rendered as a
success. GitHub shows a green check either way.

The same trap is on #27, differently: its CodeRabbit status reads *"Review skipped: reviews are
disabled for this base branch"*, because #27 targets #26's branch rather than `main`. Stacking kept
`main` clean; it did **not** buy an automated review, and I was wrong to imply it would.

And on both PRs the `security-review` check completes in about **6 seconds** — too fast to have read
a diff. Treat it as not-yet-running until step 1 proves otherwise.

So: three green ticks, none of which is evidence that 452 files were read by anything.

## Steps

### 1. **YOU** — set `CLAUDE_API_KEY` (issue #29)

Settings → Secrets and variables → Actions → New repository secret. The value must be an Anthropic
key enabled for **both** the Claude API and Claude Code usage; a plain API key is not enough.
`.github/workflows/claude-security-review.yml` says so in its own header.

Without this, nothing automated has read #26.

### 2. **YOU** — re-run the security workflow on #26 and read the output

Actions → *Claude Security Review* → the run for #26 → Re-run. If it finishes in seconds again, it
is still not running; check the secret rather than accepting the tick.

### 3. Confirm CI on #26 after the stack merges

`tests.yml` runs lint, typecheck, 433 unit tests and the build. It is the check that actually
exercises the code. Green there is meaningful in a way the review skips are not.

### 4. **YOU** — merge #26 into `main`

**Use a merge commit, not squash.** Squashing 87 commits collapses the reasoning into one message,
and this history is unusually worth keeping — it is where the record lives of what was measured
versus assumed. That record is what caught the pricing drift and the unreachable RPCs.

I have deliberately not done this step. Putting 452 unreviewed files into `main` is a decision that
should carry your name, not an agent's.

### 5. Verify `main` builds, then clean up

Let `tests.yml` run on `main`. Only once it is green should either branch be deleted.

## After main is green

- **#30** — redeploy the 7 stale `admin-*` Edge Functions (deployed 20/27 June; source moved 2 Aug).
  Do it from disk with the Supabase CLI, not by retyping files.
- **#31** — deploy the governance fix to staging. Its DB side is ready: both wrapper migrations are
  applied and verified there.
- **#28** — `ENCRYPTION_KEY`. Ten minutes, and gate codes stay unstorable until it exists.

## Why `main` was left behind this long

Worth saying plainly, because it is the lesson rather than the incident: a PR that grows to 452 files
stops being reviewable by anything, and then the only options are merging it unread or never merging
it. `.github/pull_request_template.md` and the advisory drift check in `tests.yml` are the guards
added against a repeat. Neither helps a PR that is already this size.
