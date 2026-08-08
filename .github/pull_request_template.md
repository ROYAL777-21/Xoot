<!--
This template exists because of what went wrong twice in this repo, not as ceremony.

2026-08-07: production had been charging a superseded pricing model and serving a retired domain
for weeks. Every guard in the suite was green, because every guard read the repo file and the repo
file was right. Nothing compared the repo to what was actually running.

2026-08-08: rate limiting had never executed once. The call threw on every invocation and a bare
`catch` swallowed it, so the Concierge answered 500 to every real question and nothing surfaced it.

Both were invisible for the same reason: what was *believed* and what was *measured* were never
written down separately. The three questions below are the ones that would have caught them. Delete
any section that genuinely does not apply — an empty heading helps nobody.
-->

## What changed

<!-- The change itself, and why. Link the blocker.md entry or issue if there is one. -->

## Measured, not inferred

<!--
What did you actually observe? Numbers, statuses, query results, versions before and after.

"`public.rate_limit_events` went 0 -> 1" is measurement. "rate limiting should now work" is not.
If a claim here came from reading code rather than running it, say so and mark it inferred.
-->

## Not verified

<!--
Required, and the most useful section in this template. What does this PR NOT prove?

Say it plainly: a check you could not run, an environment you did not touch, a path with no test,
a smoke test blocked by network policy. Reviewers can weigh a stated gap; they cannot weigh one
they do not know about. "Nothing" is a valid answer only if it is true.
-->

## Deploy impact

<!--
- [ ] Edge Functions: does anything need redeploying? Deployed functions bundle their own copy of
      `_shared`, so a change there reaches nothing until every function importing it is redeployed
      — including transitively, e.g. via `_shared/twilio-webhook.ts`.
      `node scripts/ops/check-deployed-drift.mjs` answers this.
- [ ] Migrations: applied where? Production and staging drift apart easily — staging has been
      missing wrappers that production had.
- [ ] Secrets or env: anything a human must set before this works? Name it here, not only in chat.
- [ ] `verify_jwt` unchanged for every function touched (check `supabase/config.toml`).
-->

## Risk and rollback

<!-- What breaks if this is wrong, and how would someone undo it? -->
