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

Without this, nothing automated has read #26. This is now optional rather than blocking:
`.github/workflows/semgrep.yml` reads every diff with no key at all, and its repo-local rules are a
blocking check. `CLAUDE_API_KEY` buys a second opinion of a different kind — a model reading intent
rather than a pattern matcher reading shapes — not the coverage itself.

**Already done, 2026-08-09:** `SUPABASE_ACCESS_TOKEN` is set as a repository secret. That is the
right home for it — see the next note for why it does not do anything yet.

### 1b. Why the deploy workflow is waiting on this merge

`.github/workflows/deploy-edge-functions.yml` deploys every Edge Function from disk with the
Supabase CLI, which is what clears the 26-function backlog in #30 in one dispatch.

**It cannot be triggered until it exists on `main`.** Measured 2026-08-09: dispatching it against
`claude/session-continuation-3upt0l` returns

```
POST /repos/.../actions/workflows/deploy-edge-functions.yml/dispatches → 404 Not Found
```

GitHub resolves a `workflow_dispatch` workflow from the **default branch** only; the `ref` input
chooses which branch's *code* runs, not which branch the workflow is *found* on. So the deploy
path and the merge are the same task — there is no way to do one before the other.

If you would rather not wait for the whole 452-file stack, cherry-picking that single file onto
`main` is enough to make the workflow dispatchable, and it deploys nothing on its own.

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

- **#30 — the deploy, which is now one dispatch.** Actions → *Deploy Edge Functions* → Run workflow.
  **Re-measured 2026-08-09: 27 functions are stale, not the 7 this line used to claim** — 22 of them
  only because they bundle their own copy of `_shared/action-utils.ts`, which moved on 6 August.
  Three more (`create-concierge-handoff`, `generate-booking-invoice`, `resend-booking-invoice`) have
  never been deployed at all, so any UI path calling one gets a 404 today.

  Run it **staging first**, with two function names typed into the `functions` box, and read the
  drift table it prints. Then staging with the box blank. Then production, which makes you type
  `mvlrkelahhsyjrwgsxaf` to confirm. The workflow re-checks `supabase/config.toml` before it
  uploads anything, because a missing `verify_jwt = false` on a Twilio webhook is a 401 at the
  gateway with nothing in the function's logs to explain it.

- **#31** — staging. Its DB side is already at parity: both wrapper migrations are applied and
  verified there. Its functions are on June and July builds, so the same dispatch fixes it.

- **#28** — `ENCRYPTION_KEY`, in **Supabase → Edge Functions → Secrets**, not GitHub. It is read by
  `Deno.env.get` inside `sensitive-access-read` and `sensitive-access-save`, and nothing in CI ever
  reads it. Ten minutes, and gate codes stay unstorable until it exists. `docs/SECRETS_INVENTORY.md`
  now opens with the rule for deciding this: ask who reads the value at the moment it is needed.

## Why `main` was left behind this long

Worth saying plainly, because it is the lesson rather than the incident: a PR that grows to 452 files
stops being reviewable by anything, and then the only options are merging it unread or never merging
it. `.github/pull_request_template.md` and the advisory drift check in `tests.yml` are the guards
added against a repeat. Neither helps a PR that is already this size.
